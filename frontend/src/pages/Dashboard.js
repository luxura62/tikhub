import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useAuth } from '../App';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [postsSummary, setPostsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSandbox, setIsSandbox] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get('/api/stats'),
      axios.get('/api/stats/history'),
      axios.get('/api/stats/posts-summary')
    ])
      .then(([statsRes, historyRes, summaryRes]) => {
        setStats(statsRes.data);
        setIsSandbox(statsRes.data.sandbox || historyRes.data.sandbox);

        const formatted = historyRes.data.history.map((h, i) => ({
          name: i % 5 === 0 ? h.date?.slice(5) || `J-${historyRes.data.history.length - 1 - i}` : '',
          fullDate: h.date,
          Followers: h.followers_count,
          Likes: Math.round(h.likes_count / 10) // Normaliser pour affichage
        }));
        setHistory(formatted);
        setPostsSummary(summaryRes.data);
      })
      .catch(() => setError('Impossible de charger les statistiques'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = n => {
    if (n === undefined || n === null) return '—';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg3)',
          border: '1px solid var(--border2)',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '13px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <p style={{ color: 'var(--text3)', marginBottom: '8px', fontSize: '11px' }}>
            {payload[0]?.payload?.fullDate || label}
          </p>
          {payload.map(p => (
            <p key={p.name} style={{ color: p.color, fontWeight: '600' }}>
              {p.name}: {fmt(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ color: 'var(--text3)', marginTop: '16px', fontSize: '14px' }}>
            Chargement des stats...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">⚠️ {error}</div>;
  }

  const statCards = [
    { label: 'Followers', value: fmt(stats?.followers), icon: '👥', color: 'var(--purple2)', bg: 'rgba(124,58,237,0.1)' },
    { label: 'Likes totaux', value: fmt(stats?.likes), icon: '❤️', color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
    { label: 'Vidéos postées', value: fmt(stats?.videos), icon: '🎬', color: '#22d3ee', bg: 'rgba(34,211,238,0.1)' },
    { label: 'Abonnements', value: fmt(stats?.following), icon: '🔔', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header fade-up" style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
      }}>
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Vue d'ensemble de ton compte TikTok</div>
        </div>

        {/* Profil + badge sandbox */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isSandbox && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: '8px', padding: '6px 12px',
              fontSize: '12px', color: '#fbbf24', fontWeight: '600'
            }}>
              <span>🧪</span> Mode sandbox
            </div>
          )}
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="avatar" style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: '2px solid var(--purple)', boxShadow: '0 0 16px rgba(124,58,237,0.4)'
            }} />
          ) : (
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--purple), var(--pink))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: '700',
              boxShadow: '0 0 16px rgba(124,58,237,0.4)'
            }}>
              {user?.display_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="card-grid fade-up-1" style={{ marginBottom: '28px' }}>
        {statCards.map((s, i) => (
          <div key={s.label} className="stat-card" style={{ animationDelay: `${i * 0.08}s` }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '10px',
              background: s.bg, marginBottom: '14px', fontSize: '18px'
            }}>
              {s.icon}
            </div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts + Summary grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '20px',
        marginBottom: '24px'
      }} className="fade-up-2 dashboard-grid">

        {/* Graphique followers */}
        <div className="chart-card">
          <div className="chart-title">Évolution des followers</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="followersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} tickFormatter={fmt} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="Followers"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#followersGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#a855f7', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Posts summary */}
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="chart-title">Mes posts</div>

          {[
            { label: 'Planifiés', value: postsSummary?.pending || 0, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
            { label: 'Publiés', value: postsSummary?.published || 0, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
            { label: 'Échoués', value: postsSummary?.failed || 0, color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
            { label: 'Total', value: postsSummary?.total || 0, color: 'var(--purple3)', bg: 'rgba(124,58,237,0.1)' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              background: item.bg,
              borderRadius: '10px',
              border: `1px solid ${item.color}22`
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: '500' }}>
                {item.label}
              </span>
              <span style={{ fontSize: '18px', fontWeight: '800', color: item.color, fontFamily: 'var(--font-display)' }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Graphique likes */}
      <div className="chart-card fade-up-3">
        <div className="chart-title">Évolution des likes</div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={history} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="likesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} tickFormatter={fmt} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="Likes"
              stroke="#ec4899"
              strokeWidth={2}
              fill="url(#likesGrad)"
              dot={false}
              activeDot={{ r: 5, fill: '#ec4899', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Note sandbox */}
      {isSandbox && (
        <div className="fade-up-4" style={{
          marginTop: '20px',
          padding: '14px 18px',
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.15)',
          borderRadius: '12px',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          fontSize: '13px', color: '#fbbf24'
        }}>
          <span style={{ flexShrink: 0, marginTop: '1px' }}>💡</span>
          <div>
            <strong>Données de démonstration</strong> — Les statistiques affichées sont simulées car l'app est en mode sandbox.
            Une fois approuvée par TikTok, tes vraies stats apparaîtront ici automatiquement.
          </div>
        </div>
      )}
    </div>
  );
}
