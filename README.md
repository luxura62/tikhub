# TikHub — Planificateur TikTok automatique

## Variables d'environnement à configurer sur Railway

| Variable | Description |
|---|---|
| `TIKTOK_CLIENT_KEY` | Client Key depuis developers.tiktok.com |
| `TIKTOK_CLIENT_SECRET` | Client Secret depuis developers.tiktok.com |
| `REDIRECT_URI` | `https://tikhub.fr/auth/callback` |
| `SESSION_SECRET` | Clé aléatoire longue (ex: `TikHub2024AbcXyz789`) |

## Fonctionnalités

- Connexion TikTok OAuth sécurisée
- Upload de vidéos (MP4, MOV, AVI — max 500MB)
- Planification date/heure précise
- Compte à rebours en temps réel
- Publication automatique (cron toutes les minutes)
- Répétition quotidienne ou hebdomadaire
- Modification des vidéos planifiées
- Réessai automatique en cas d'échec
- Historique des publications
- Pages légales (Privacy + CGU) pour validation TikTok

## Pour publier en Public

Dans `server.js`, ligne `privacy_level`, remplace :
```
"SELF_ONLY" → "PUBLIC_TO_EVERYONE"
```
(nécessite validation de l'app par TikTok)
