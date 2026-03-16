import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Posts from './pages/Posts';
import Layout from './components/Layout';

// Contexte utilisateur global
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

axios.defaults.withCredentials = true;

export default function App() {
  const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

      useEffect(() => {
          // Vérifie si l'utilisateur est connecté au chargement
              axios.get('/auth/me')
                    .then(res => setUser(res.data.user))
                          .catch(() => setUser(null))
                                .finally(() => setLoading(false));
                                  }, []);

                                    const logout = async () => {
                                        await axios.post('/auth/logout');
                                            setUser(null);
                                              };

                                                if (loading) {
                                                    return (
                                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                                                                  <div className="spinner" />
                                                                        </div>
                                                                            );
                                                                              }

                                                                                return (
                                                                                    <AuthContext.Provider value={{ user, setUser, logout }}>
                                                                                          <BrowserRouter>
                                                                                                  <Routes>
                                                                                                            {/* Page d'accueil publique */}
                                                                                                                      <Route path="/" element={!user ? <Home /> : <Navigate to="/dashboard" />} />

                                                                                                                                {/* Pages protégées */}
                                                                                                                                          <Route element={user ? <Layout /> : <Navigate to="/" />}>
                                                                                                                                                      <Route path="/dashboard" element={<Dashboard />} />
                                                                                                                                                                  <Route path="/schedule" element={<Schedule />} />
                                                                                                                                                                              <Route path="/posts" element={<Posts />} />
                                                                                                                                                                                        </Route>
                                                                                                                                                                                                </Routes>
                                                                                                                                                                                                      </BrowserRouter>
                                                                                                                                                                                                          </AuthContext.Provider>
                                                                                                                                                                                                            );
                                                                                                                                                                                                            }
                                                                                                                                                                                                            