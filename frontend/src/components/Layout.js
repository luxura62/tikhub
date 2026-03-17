import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import axios from 'axios';

export default function Layout() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await axios.post('/auth/logout');
    setUser(null);
    navigate('/');
  };

  // Fermer le menu si on resize en desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Bloquer le scroll quand le menu est ouvert
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const navItems = [
    { to: '/dashboard', icon: '⚡', label: 'Dashboard' },
    { to: '/schedule', icon: '✦', label: 'Planifier' },
    { to: '/posts', icon: '◈', label: 'Mes posts' },
  ];

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="app-layout">
      {/* Hamburger button */}
      <button
        className={`hamburger-btn ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
      >
        <div className="hamburger-line" />
        <div className="hamburger-line" />
        <div className="hamburger-line" />
      </button>

      {/* Overlay */}
      <div
        className={`sidebar-overlay ${menuOpen ? 'open' : ''}`}
        onClick={closeMenu}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-dot" />
          <span>TikHub</span>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="sidebar-user">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="avatar" className="user-avatar" />
          ) : (
            <div className="user-avatar-placeholder">
              {user?.display_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="user-info">
            <div className="user-name">{user?.display_name || 'Utilisateur'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>TikTok connecté</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Déconnexion">⏻</button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
