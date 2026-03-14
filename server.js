require("dotenv").config();
const express   = require("express");
const session   = require("express-session");
const multer    = require("multer");
const axios     = require("axios");
const cron      = require("node-cron");
const { v4: uuidv4 } = require("uuid");
const fs        = require("fs");
const fse       = require("fs-extra");
const path      = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── CONFIG ──────────────────────────────────────────────────
const CLIENT_KEY     = process.env.TIKTOK_CLIENT_KEY    || "";
const CLIENT_SECRET  = process.env.TIKTOK_CLIENT_SECRET || "";
const REDIRECT_URI   = process.env.REDIRECT_URI         || `http://localhost:${PORT}/auth/callback`;
const SESSION_SECRET = process.env.SESSION_SECRET       || "tikhub_secret_change_me";

const DB_FILE     = path.join(__dirname, "data", "db.json");
const TOKEN_FILE  = path.join(__dirname, "data", "token.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");
fse.ensureDirSync(path.join(__dirname, "data"));
fse.ensureDirSync(UPLOADS_DIR);

// ─── DB ──────────────────────────────────────────────────────
function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return { videos: [], settings: {} }; }
}
function writeDB(d) { fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2)); }
function getVideos() { return readDB().videos || []; }
function saveVideo(v) {
  const db = readDB();
  db.videos = db.videos.filter(x => x.id !== v.id);
  db.videos.unshift(v);
  writeDB(db);
}
function deleteVideo(id) {
  const db  = readDB();
  const vid = db.videos.find(v => v.id === id);
  if (vid?.filepath && fs.existsSync(vid.filepath)) fs.unlinkSync(vid.filepath);
  db.videos = db.videos.filter(v => v.id !== id);
  writeDB(db);
}

// ─── TOKEN ───────────────────────────────────────────────────
function saveToken(t) { fs.writeFileSync(TOKEN_FILE, JSON.stringify(t, null, 2)); }
function loadToken()  { try { return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8")); } catch { return null; } }

async function getValidToken() {
  const t = loadToken();
  if (!t) return null;
  if (t.expires_at < Date.now() + 3600000) {
    try {
      const res = await axios.post("https://open.tiktokapis.com/v2/oauth/token/",
        new URLSearchParams({
          client_key: CLIENT_KEY, client_secret: CLIENT_SECRET,
          grant_type: "refresh_token", refresh_token: t.refresh_token,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      const nt = { ...t, access_token: res.data.access_token,
        refresh_token: res.data.refresh_token || t.refresh_token,
        expires_at: Date.now() + res.data.expires_in * 1000 };
      saveToken(nt);
      return nt.access_token;
    } catch { return null; }
  }
  return t.access_token;
}

// ─── MULTER ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename:    (_, f, cb)  => cb(null, uuidv4() + path.extname(f.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_, f, cb) =>
    cb(null, ["video/mp4","video/webm","video/quicktime","video/x-msvideo","video/avi"].includes(f.mimetype)),
});

// ─── MIDDLEWARE ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  secret: SESSION_SECRET, resave: false, saveUninitialized: false,
  cookie: { secure: false, maxAge: 30 * 24 * 3600 * 1000 },
}));

// Keep token accessible for cron
let cachedToken = null;
app.use((req, _, next) => {
  if (req.session?.tiktok?.access_token) cachedToken = req.session.tiktok.access_token;
  next();
});

// ─── AUTH ─────────────────────────────────────────────────────

// Initier la connexion TikTok
app.get("/auth/tiktok", (req, res) => {
  const state = uuidv4();
  req.session.oauthState = state;
  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    scope: "user.info.basic,video.upload,video.publish",
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    state,
  });
  res.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params}`);
});

// Callback OAuth
app.get("/auth/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error)  return res.redirect("/?error=" + encodeURIComponent(error));
  if (!code)  return res.redirect("/?error=no_code");
  if (state !== req.session.oauthState) return res.redirect("/?error=state_mismatch");
  delete req.session.oauthState;

  try {
    const tokenRes = await axios.post("https://open.tiktokapis.com/v2/oauth/token/",
      new URLSearchParams({
        client_key: CLIENT_KEY, client_secret: CLIENT_SECRET,
        code, grant_type: "authorization_code", redirect_uri: REDIRECT_URI,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const { access_token, refresh_token, open_id, expires_in } = tokenRes.data;

    const userRes = await axios.get(
      "https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,follower_count,following_count,video_count",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const user = userRes.data.data?.user || {};

    const tokenData = {
      access_token, refresh_token, open_id,
      expires_at:    Date.now() + expires_in * 1000,
      display_name:  user.display_name  || "Utilisateur",
      avatar_url:    user.avatar_url    || "",
      follower_count:user.follower_count || 0,
      video_count:   user.video_count   || 0,
    };
    saveToken(tokenData);
    cachedToken = access_token;

    req.session.tiktok = tokenData;
    res.redirect("/?connected=1");
  } catch (err) {
    console.error("OAuth error:", err.response?.data || err.message);
    res.redirect("/?error=token_failed");
  }
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy();
  cachedToken = null;
  if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
  res.json({ ok: true });
});

// ─── API STATUS ───────────────────────────────────────────────
app.get("/api/status", (req, res) => {
  const token = loadToken();
  if (token) {
    res.json({
      connected:     true,
      display_name:  token.display_name,
      avatar_url:    token.avatar_url,
      follower_count:token.follower_count,
      video_count:   token.video_count,
    });
  } else {
    res.json({ connected: false });
  }
});

// ─── API VIDEOS ───────────────────────────────────────────────
app.get("/api/videos", (_, res) => {
  const videos = getVideos().sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  res.json({ videos });
});

// Planifier une vidéo
app.post("/api/videos", upload.single("video"), (req, res) => {
  if (!loadToken()) return res.status(401).json({ error: "Non connecté" });
  if (!req.file)    return res.status(400).json({ error: "Fichier manquant" });

  const { title, caption, scheduledAt, repeat } = req.body;
  if (!scheduledAt) return res.status(400).json({ error: "Date requise" });

  const video = {
    id:          uuidv4(),
    title:       title || req.file.originalname,
    caption:     caption || "#fyp #tiktok",
    scheduledAt: new Date(scheduledAt).toISOString(),
    repeat:      repeat || "none",   // none | daily | weekly
    status:      "scheduled",
    filename:    req.file.filename,
    filepath:    req.file.path,
    size:        req.file.size,
    mimetype:    req.file.mimetype,
    createdAt:   new Date().toISOString(),
    publishedAt: null,
    tiktokId:    null,
    retries:     0,
    error:       null,
  };
  saveVideo(video);
  res.json({ ok: true, video });
});

// Modifier une vidéo planifiée
app.put("/api/videos/:id", (req, res) => {
  const videos = getVideos();
  const video  = videos.find(v => v.id === req.params.id);
  if (!video || video.status !== "scheduled") return res.status(400).json({ error: "Non modifiable" });

  const { title, caption, scheduledAt, repeat } = req.body;
  if (title)       video.title       = title;
  if (caption)     video.caption     = caption;
  if (scheduledAt) video.scheduledAt = new Date(scheduledAt).toISOString();
  if (repeat)      video.repeat      = repeat;
  saveVideo(video);
  res.json({ ok: true, video });
});

// Supprimer
app.delete("/api/videos/:id", (req, res) => {
  const video = getVideos().find(v => v.id === req.params.id);
  if (!video)                    return res.status(404).json({ error: "Introuvable" });
  if (video.status === "publishing") return res.status(400).json({ error: "En cours de publication" });
  deleteVideo(req.params.id);
  res.json({ ok: true });
});

// Publier immédiatement
app.post("/api/videos/:id/publish", async (req, res) => {
  if (!loadToken()) return res.status(401).json({ error: "Non connecté" });
  const video = getVideos().find(v => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: "Introuvable" });
  res.json({ ok: true, message: "Publication démarrée" });
  await doPublish(video);
});

// Réessayer une vidéo en échec
app.post("/api/videos/:id/retry", async (req, res) => {
  if (!loadToken()) return res.status(401).json({ error: "Non connecté" });
  const video = getVideos().find(v => v.id === req.params.id);
  if (!video || video.status !== "failed") return res.status(400).json({ error: "Non réessayable" });
  video.status = "scheduled";
  video.error  = null;
  saveVideo(video);
  res.json({ ok: true });
});

// Stats globales
app.get("/api/stats", (_, res) => {
  const videos    = getVideos();
  const scheduled = videos.filter(v => v.status === "scheduled").length;
  const published = videos.filter(v => v.status === "published").length;
  const failed    = videos.filter(v => v.status === "failed").length;
  const totalSize = videos.reduce((a, v) => a + (v.size || 0), 0);
  res.json({ scheduled, published, failed, totalSize, total: videos.length });
});

// ─── PUBLICATION TIKTOK ───────────────────────────────────────
async function doPublish(video) {
  const db    = readDB();
  const idx   = db.videos.findIndex(v => v.id === video.id);
  if (idx < 0) return;

  db.videos[idx].status = "publishing";
  writeDB(db);

  try {
    const accessToken = await getValidToken() || cachedToken;
    if (!accessToken) throw new Error("Token invalide — reconnecte-toi sur tikhub.fr");

    const filepath = video.filepath;
    if (!fs.existsSync(filepath)) throw new Error("Fichier vidéo introuvable sur le serveur");

    const fileSize = fs.statSync(filepath).size;

    // 1. Init upload TikTok
    const initRes = await axios.post(
      "https://open.tiktokapis.com/v2/post/video/init/",
      {
        post_info: {
          title:            video.title.substring(0, 150),
          privacy_level:    "SELF_ONLY",  // ← change en PUBLIC_TO_EVERYONE après validation
          disable_duet:     false,
          disable_comment:  false,
          disable_stitch:   false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source:             "FILE_UPLOAD",
          video_size:         fileSize,
          chunk_size:         fileSize,
          total_chunk_count:  1,
        },
      },
      {
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        timeout: 30000,
      }
    );

    if (!initRes.data?.data?.upload_url) {
      throw new Error(initRes.data?.error?.message || "Échec init TikTok");
    }

    const { upload_url, publish_id } = initRes.data.data;

    // 2. Upload du fichier
    const fileBuffer = fs.readFileSync(filepath);
    await axios.put(upload_url, fileBuffer, {
      headers: {
        "Content-Type":   "video/mp4",
        "Content-Length": fileSize,
        "Content-Range":  `bytes 0-${fileSize - 1}/${fileSize}`,
      },
      maxBodyLength:    Infinity,
      maxContentLength: Infinity,
      timeout:          600000,
    });

    // 3. Succès
    const dbNow = readDB();
    const i2    = dbNow.videos.findIndex(v => v.id === video.id);
    if (i2 >= 0) {
      dbNow.videos[i2].status      = "published";
      dbNow.videos[i2].publishedAt = new Date().toISOString();
      dbNow.videos[i2].tiktokId    = publish_id;
      dbNow.videos[i2].error       = null;

      // Gestion répétition
      if (dbNow.videos[i2].repeat !== "none") {
        const orig = dbNow.videos[i2];
        const nextDate = new Date(orig.scheduledAt);
        if (orig.repeat === "daily")  nextDate.setDate(nextDate.getDate() + 1);
        if (orig.repeat === "weekly") nextDate.setDate(nextDate.getDate() + 7);

        const newVideo = {
          ...orig,
          id:          uuidv4(),
          status:      "scheduled",
          scheduledAt: nextDate.toISOString(),
          publishedAt: null,
          tiktokId:    null,
          error:       null,
          retries:     0,
          createdAt:   new Date().toISOString(),
        };
        dbNow.videos.push(newVideo);
      }
      writeDB(dbNow);
    }

    // Supprimer le fichier local après succès
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    console.log(`✅ Publié : ${video.title} (${publish_id})`);

  } catch (err) {
    console.error(`❌ Échec : ${video.title} —`, err.response?.data || err.message);
    const dbNow = readDB();
    const i2    = dbNow.videos.findIndex(v => v.id === video.id);
    if (i2 >= 0) {
      dbNow.videos[i2].retries = (dbNow.videos[i2].retries || 0) + 1;
      dbNow.videos[i2].status  = "failed";
      dbNow.videos[i2].error   =
        err.response?.data?.error?.message || err.message || "Erreur inconnue";
      writeDB(dbNow);
    }
  }
}

// ─── CRON — vérifier chaque minute ───────────────────────────
cron.schedule("* * * * *", async () => {
  const now  = Date.now();
  const due  = getVideos().filter(
    v => v.status === "scheduled" && new Date(v.scheduledAt).getTime() <= now
  );
  for (const v of due) {
    console.log(`⏰ Publication auto : ${v.title}`);
    await doPublish(v);
  }
});

// ─── START ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 TikHub démarré → http://localhost:${PORT}`);
  if (!CLIENT_KEY || !CLIENT_SECRET) {
    console.warn("⚠️  Variables TIKTOK_CLIENT_KEY / SECRET manquantes !");
  }
});
