
import React from 'react';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--bg)'
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'absolute',
        top: '15%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '700px', height: '700px',
        background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 65%)',
        pointerEvents: 'none',
        animation: 'gradientOrb 8s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%', right: '10%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 65%)',
        pointerEvents: 'none',
        animation: 'gradientOrb 10s ease-in-out infinite reverse'
      }} />
      <div style={{
        position: 'absolute',
        top: '60%', left: '5%',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 65%)',
        pointerEvents: 'none'
      }} />

      {/* Grid pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(124,58,237,0.03) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        pointerEvents: 'none'
      }} />

      <div style={{ textAlign: 'center', maxWidth: '620px', position: 'relative', zIndex: 1 }}>

        {/* Badge */}
        <div className="fade-up" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(124,58,237,0.1)',
          border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: '20px', padding: '6px 16px', marginBottom: '36px',
          fontSize: '12px', color: 'var(--purple3)', fontWeight: '600',
          letterSpacing: '0.05em', textTransform: 'uppercase'
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--purple2)',
            boxShadow: '0 0 8px var(--purple2)',
            display: 'inline-block',
            animation: 'pulse 2s infinite'
          }} />
          Automatise tes TikToks
        </div>

        {/* Title */}
        <h1 className="fade-up-1" style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(40px, 9vw, 76px)',
          fontWeight: '900',
          lineHeight: '1.02',
          marginBottom: '24px',
          letterSpacing: '-0.04em'
        }}>
          Poste sur TikTok
          <br />
          <span style={{
            background: 'linear-gradient(135deg, var(--purple3) 0%, var(--pink) 50%, var(--purple2) 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shimmer 3s linear infinite'
          }}>
            en automatique
          </span>
        </h1>

        {/* Description */}
        <p className="fade-up-2" style={{
          fontSize: '17px',
          color: 'var(--text2)',
          lineHeight: '1.75',
          marginBottom: '48px',
          fontWeight: '300',
          maxWidth: '480px',
          margin: '0 auto 48px'
        }}>
          Planifie tes vidéos TikTok, suis tes statistiques
          et publie automatiquement — pendant que tu dors.
        </p>

        {/* CTA */}
        <div className="fade-up-3">
          <button
            onClick={() => { window.location.href = '/auth/login'; }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              background: 'linear-gradient(135deg, var(--purple) 0%, var(--pink) 100%)',
              color: 'white',
              padding: '16px 36px',
              borderRadius: '14px',
              fontSize: '16px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
              transition: 'all 0.25s',
              fontFamily: 'var(--font-body)',
              letterSpacing: '-0.01em'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(124,58,237,0.55)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.4)';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z"/>
            </svg>
            Connecter TikTok
          </button>
        </div>

        {/* Features */}
        <div className="fade-up-4" style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          marginTop: '56px',
          flexWrap: 'wrap'
        }}>
          {[
            { icon: '🤖', text: 'Publication auto' },
            { icon: '📊', text: 'Stats en temps réel' },
            { icon: '📅', text: 'Calendrier de posts' }
          ].map(f => (
            <div key={f.text} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(124,58,237,0.06)',
              border: '1px solid rgba(124,58,237,0.12)',
              borderRadius: '10px',
              padding: '8px 16px',
              color: 'var(--text2)',
              fontSize: '13px',
              fontWeight: '500'
            }}>
              <span style={{ fontSize: '16px' }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
