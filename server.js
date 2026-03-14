require("dotenv").config();
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const axios = require("axios");
const cron = require("node-cron");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION ---
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

fse.ensureDirSync(DATA_DIR);
fse.ensureDirSync(UPLOADS_DIR);

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR)); // Sert le CSS/JS/Images

app.use(session({
    secret: process.env.SESSION_SECRET || "tikhub_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 30 * 24 * 3600 * 1000 }
}));

// --- ROUTES DU SITE (IMPORTANT) ---

// Affiche le site sur l'adresse principale
app.get("/", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// --- STATISTIQUES (API) ---
app.get("/api/stats", (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
        const videos = db.videos || [];
        res.json({
            scheduled: videos.filter(v => v.status === "scheduled").length,
            published: videos.filter(v => v.status === "published").length,
            failed:    videos.filter(v => v.status === "failed").length,
            total:     videos.length
        });
    } catch (e) {
        res.json({ scheduled: 0, published: 0, failed: 0, total: 0 });
    }
});

// --- LE RESTE DE VOTRE LOGIQUE (Auth TikTok, Upload, Cron) ---
// (Gardez vos fonctions doPublish et vos routes /auth ici)

// --- REDIRECTION DE SÉCURITÉ ---
// Si l'utilisateur tape une mauvaise adresse, on le ramène à l'accueil
app.get("*", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
    console.log(`🚀 TikHub opérationnel sur le port ${PORT}`);
});
