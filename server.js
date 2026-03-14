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

// ─── CONFIGURATION DES CHEMINS (ADAPTÉE À VOTRE GITHUB) ──────
const DATA_DIR    = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const PUBLIC_DIR  = path.join(__dirname, "public");

const DB_FILE     = path.join(DATA_DIR, "db.json");
const TOKEN_FILE  = path.join(DATA_DIR, "token.json");

const CLIENT_KEY     = process.env.TIKTOK_CLIENT_KEY    || "";
const CLIENT_SECRET  = process.env.TIKTOK_CLIENT_SECRET || "";
const REDIRECT_URI   = process.env.REDIRECT_URI         || `http://localhost:${PORT}/auth/callback`;
const SESSION_SECRET = process.env.SESSION_SECRET       || "tikhub_secret_change_me";

// Création des dossiers de stockage sur le serveur
fse.ensureDirSync(DATA_DIR);
fse.ensureDirSync(UPLOADS_DIR);

// ─── FONCTIONS BASE DE DONNÉES ───────────────────────────────
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

// ─── GESTION DES TOKENS ──────────────────────────────────────
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

// ─── CONFIGURATION UPLOAD ────────────────────────────────────
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

// ─── MIDDLEWARES ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Servir les fichiers du dossier public (CSS, JS, Images)
app.use(express.static(PUBLIC_DIR));

app.use(session({
  secret: SESSION_SECRET, 
  resave: false, 
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 30 * 24 * 3600 * 1000 },
}));

// ─── ROUTE RACINE (LA SOLUTION AU 404) ───────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// ─── AUTH TIKTOK ─────────────────────────────────────────────
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
      avatar_


// Cette route "fourre-tout" redirige n'importe quelle erreur vers votre site
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
