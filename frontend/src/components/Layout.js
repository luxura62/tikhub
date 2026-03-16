import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-dot" />
          <span>TikHub</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="icon">📊</span>
            Dashboard
          </NavLink>
          <NavLink to="/schedule" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="icon">➕</span>
            Planifier
          </NavLink>
          <NavLink to="/posts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="icon">📅</span>
            Mes posts
          </NavLink>
        </nav>

        {/* Utilisateur connecté */}
        <div className="sidebar-user">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="user-avatar" />
          ) : (
            <div className="user-avatar-placeholder">
              {user?.display_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}

          <div className="user-info">
            <div className="user-name">{user?.display_name || 'Utilisateur'}</div>
          </div>

          <button className="logout-btn" onClick={handleLogout} title="Déconnexion">
            ↪
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
