require('dotenv').config();
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 8080;

// --- CONFIGURATION TIKTOK ---
const TIKTOK_CLIENT_KEY = 'sbawbd1pr0vxz33uyx';
const TIKTOK_CLIENT_SECRET = 'hj2dGstMTC1ViWecJMYttbtQ1f0sedVr';
const REDIRECT_URI = 'https://tikshub.fr/auth/callback';

// --- SESSION ---
app.use(session({
  secret: 'tikhub_secret_aleatoire',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // true si HTTPS
}));

// --- ROUTE LOGIN ---
app.get('/auth/tiktok', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.state = state;