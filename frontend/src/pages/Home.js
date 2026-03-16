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
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '20%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(255,45,85,0.12) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%', right: '20%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(0,242,234,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ textAlign: 'center', maxWidth: '580px', position: 'relative', zIndex: 1 }}>

        <div className="fade-up" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.2)',
          borderRadius: '20px', padding: '6px 16px', marginBottom: '32px',
          fontSize: '13px', color: 'var(--pink)', fontWeight: '500'
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--pink)', display: 'inline-block'
          }} />
          Automatise tes TikToks
        </div>

        <h1 className="fade-up-1" style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(42px, 8vw, 72px)',
          fontWeight: '800',
          lineHeight: '1.05',
          marginBottom: '24px',
          letterSpacing: '-0.02em'
        }}>
          Poste sur TikTok
          <br />
          <span style={{
            background: 'linear-gradient(135deg, var(--pink) 0%, var(--cyan) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            en automatique
          </span>
        </h1>

        <p className="fade-up-2" style={{
          fontSize: '17px', color: 'var(--text2)',
          lineHeight: '1.7', marginBottom: '44px',
          fontWeight: '300'
        }}>
          Planifie tes vidéos TikTok, suis tes statistiques
          et publie automatiquement à l'heure exacte.
        </p>

        <div className="fade-up-3">
          <a
            href="/auth/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: 'linear-gradient(135deg, var(--pink), #ff6b6b)',
              color: 'white',
              padding: '14px 32px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(255,45,85,0.3)'
            }}
          >
            <span>▶</span>
            Connecter TikTok
          </a>
        </div>

        <div className="fade-up-4" style={{
          display: 'flex', gap: '32px', justifyContent: 'center',
          marginTop: '64px', flexWrap: 'wrap'
        }}>
          {[
            { icon: '🤖', text: 'Publication auto' },
            { icon: '📊', text: 'Statistiques live' },
            { icon: '📅', text: 'Calendrier de posts' }
          ].map(f => (
            <div key={f.text} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              color: 'var(--text2)', fontSize: '14px'
            }}>
              <span>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}