import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Schedule() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({ caption: '', hashtags: '', scheduled_at: '', title: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFile = (f) => {
    if (f && f.type.startsWith('video/')) {
      setFile(f);
      setError('');
    } else {
      setError('Fichier non valide. Utilise MP4, MOV ou WEBM.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const minDate = () => {
    const d = new Date(Date.now() + 5 * 60000);
    return d.toISOString().slice(0, 16);
  };

  const handleSubmit = async () => {
    setError('');
    if (!file) return setError('Sélectionne une vidéo');
    if (!form.scheduled_at) return setError('Choisis une date de publication');
    if (!form.caption.trim()) return setError('Ajoute une légende');
    setLoading(true);
    try {
      const data = new FormData();
      data.append('video', file);
      data.append('title', form.title);
      data.append('caption', form.caption);
      data.append('hashtags', form.hashtags);
      data.append('scheduled_at', new Date(form.scheduled_at).toISOString());
      await axios.post('/api/posts', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Post planifié avec succès ! 🎉');
      setTimeout(() => navigate('/posts'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la planification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="page-header fade-up">
        <div className="page-title">Planifier un post</div>
        <div className="page-subtitle">Ton TikTok sera publié automatiquement à l'heure choisie</div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ marginBottom: '24px' }}>
        {!file ? (
          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onClick={() => fileRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="upload-icon">🎬</div>
            <div className="upload-title">Dépose ta vidéo ici</div>
            <div className="upload-sub">MP4, MOV, WEBM · Max 500MB</div>
            <input ref={fileRef} type="file" accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '32px' }}>🎬</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </div>
              <div style={{ color: 'var(--text2)', fontSize: '12px', marginTop: '2px' }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
            <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: '13px' }}
              onClick={() => setFile(null)}>Changer</button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">Titre (optionnel)</label>
          <input className="form-input" placeholder="Titre de ta vidéo..."
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Légende *</label>
          <textarea className="form-textarea" placeholder="Décris ta vidéo..."
            value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Hashtags</label>
          <input className="form-input" placeholder="#fyp, #viral, #tiktok..."
            value={form.hashtags} onChange={e => setForm({ ...form, hashtags: e.target.value })} />
          <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '6px' }}>
            Sépare les hashtags par des virgules
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Date & heure de publication *</label>
          <input type="datetime-local" className="form-input"
            min={minDate()} value={form.scheduled_at}
            onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
            style={{ colorScheme: 'dark' }} />
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }}>
          {loading ? 'Planification en cours...' : '✨ Planifier ce post'}
        </button>
      </div>
    </div>
  );
}