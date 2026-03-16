require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const path = require('path');
const { pool, initDB } = require('./db');
const { router: authRouter } = require('./routes/auth');
const statsRouter = require('./routes/stats');
const postsRouter = require('./routes/posts');
const { startScheduler } = require('./jobs/scheduler');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
    }));

    app.use(session({
      store: new pgSession({
          pool: pool,
              tableName: 'session',
                  createTableIfMissing: true
                    }),
                      secret: process.env.SESSION_SECRET || 'dev-secret',
                        resave: false,
                          saveUninitialized: false,
                            cookie: {
                                secure: process.env.NODE_ENV === 'production',
                                    httpOnly: true,
                                        maxAge: 7 * 24 * 60 * 60 * 1000
                                          }
                                          }));

                                          app.use('/auth', authRouter);
                                          app.use('/api/stats', statsRouter);
                                          app.use('/api/posts', postsRouter);

                                          app.get('/health', (req, res) => {
                                            res.json({ status: 'ok', app: 'tikhub' });
                                            });

                                            if (process.env.NODE_ENV === 'production') {
                                              app.use(express.static(path.join(__dirname, 'frontend/build')));
                                                app.get('*', (req, res) => {
                                                    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
                                                      });
                                                      }

                                                      async function start() {
                                                        await initDB();
                                                          startScheduler();
                                                            app.listen(PORT, () => {
                                                                console.log('TikHub port ' + PORT);
                                                                    console.log('Environnement : ' + (process.env.NODE_ENV || 'development'));
                                                                      });
                                                                      }

                                                                      start();