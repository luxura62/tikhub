import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EMPTY_FORM = { name: '', title: '', caption: '', hashtags: '' };

export default function Captions() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/captions');
      setTemplates(res.data.templates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim()) return setError('Le nom du template est requis');
    if (!form.caption.trim() && !form.hashtags.trim()) {
      return setError('Ajoute au moins une légende ou des hashtags');
    }

    setSaving(true);
    try {
      if (editingId) {
        const res = await axios.put(`/api/captions/${editingId}`, form);
        setTemplates(templates.map(t => t.id === editingId ? res.data.template : t));
        setSuccess('Template modifié !');
      } else {
        const res = await axios.post('/api/captions', form);
        setTemplates([res.data.template, ...templates]);
        setSuccess('Template créé !');
      }
      resetForm();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (template) => {
    setEditingId(template.id);
    setForm({
      name: template.name,
      title: template.title || '',
      caption: template.caption || '',
      hashtags: template.hashtags?.join(', ') || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce template ?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/captions/${id}`);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (err) {
      alert('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  };

  const handleCopy = (template) => {
    const text = [
      template.title && `Titre: ${template.title}`,
      template.caption,
      template.hashtags?.length > 0 && template.hashtags.map(h => `#${h}`).join(' ')
    ].filter(Boolean).join('\n\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.caption?.toLowerCase().includes(search.toLowerCase()) ||
    t.hashtags?.some(h => h.toLowerCase().includes(search.toLowerCase()))
  );

  const hashtagList = (str) => str
    ? str.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean)
    : [];

  return (
    <div>
      {/* Header */}
      <div className="page-header fade-up" style={{
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
      }}>
        <div>
          <div className="page-title">Bibliothèque</div>
          <div className="page-subtitle">{templates.length} template{templates.length !== 1 ? 's' : ''} sauvegardé{templates.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <span>✦</span> <span>Nouveau template</span>
        </button>
      </div>

      {/* Alerts */}
      {error && <div className="alert alert-error">⚠️ {error}</div>}
      {success && <div className="alert alert-success">✓ {success}</div>}

      {/* Formulaire */}
      {showForm && (
        <div className="card fade-up" style={{ marginBottom: '28px', position: 'relative' }}>
          {/* Glow effect */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--purple2), transparent)'
          }} />

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '700' }}>
              {editingId ? '✏️ Modifier le template' : '✦ Nouveau template'}
            </div>
            <button onClick={resetForm} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', fontSize: '20px', padding: '4px',
              transition: 'color 0.2s'
            }}>×</button>
          </div>

          <div className="form-group">
            <label className="form-label">Nom du template *</label>
            <input className="form-input"
              placeholder="Ex: Post viral, Motivation du lundi..."
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="form-group">
            <label className="form-label">Titre (optionnel)</label>
            <input className="form-input"
              placeholder="Titre de la vidéo..."
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>

          <div className="form-group">
            <label className="form-label">Légende</label>
            <textarea className="form-textarea"
              placeholder="Écris ta légende ici..."
              value={form.caption}
              onChange={e => setForm({ ...form, caption: e.target.value })} />
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '6px', textAlign: 'right' }}>
              {form.caption.length} / 2200
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Hashtags</label>
            <input className="form-input"
              placeholder="#fyp, #viral, #tiktok..."
              value={form.hashtags}
              onChange={e => setForm({ ...form, hashtags: e.target.value })} />
            {form.hashtags && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                {hashtagList(form.hashtags).map(h => (
                  <span key={h} style={{
                    background: 'rgba(124,58,237,0.1)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    borderRadius: '8px', padding: '3px 10px',
                    fontSize: '12px', color: 'var(--purple3)', fontWeight: '500'
                  }}>#{h}</span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-ghost" onClick={resetForm} style={{ padding: '12px 20px' }}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}
              style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>
              {saving ? 'Sauvegarde...' : editingId ? '✓ Modifier' : '✦ Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {/* Recherche */}
      {templates.length > 0 && (
        <div className="fade-up-1" style={{ marginBottom: '20px' }}>
          <input
            className="form-input"
            placeholder="🔍 Rechercher un template..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '400px' }}
          />
        </div>
      )}

      {/* Liste des templates */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state fade-up">
          <span className="empty-icon">📝</span>
          <p>{search ? 'Aucun template trouvé' : 'Aucun template pour l\'instant'}</p>
          {!search && (
            <button className="btn btn-primary"
              onClick={() => { resetForm(); setShowForm(true); }}
              style={{ marginTop: '20px' }}>
              <span>✦</span> <span>Créer mon premier template</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px'
        }} className="fade-up-1">
          {filtered.map(template => (
            <div key={template.id} className="card" style={{
              transition: 'all 0.2s', cursor: 'default',
              borderColor: copiedId === template.id ? 'rgba(52,211,153,0.4)' : undefined
            }}>
              {/* Template header */}
              <div style={{
                display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between', marginBottom: '14px', gap: '8px'
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0
                }}>
                  <div style={{
                    width: '32px', height: '32px', flexShrink: 0,
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.2))',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px'
                  }}>📝</div>
                  <div style={{
                    fontWeight: '700', fontSize: '14px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {template.name}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleCopy(template)}
                    title="Copier"
                    style={{
                      background: copiedId === template.id ? 'rgba(52,211,153,0.15)' : 'var(--bg3)',
                      border: `1px solid ${copiedId === template.id ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
                      borderRadius: '8px', padding: '6px 10px',
                      cursor: 'pointer', fontSize: '13px',
                      color: copiedId === template.id ? '#34d399' : 'var(--text2)',
                      transition: 'all 0.2s'
                    }}>
                    {copiedId === template.id ? '✓' : '⎘'}
                  </button>
                  <button onClick={() => handleEdit(template)} title="Modifier"
                    style={{
                      background: 'var(--bg3)', border: '1px solid var(--border)',
                      borderRadius: '8px', padding: '6px 10px',
                      cursor: 'pointer', fontSize: '13px', color: 'var(--text2)',
                      transition: 'all 0.2s'
                    }}>✏️</button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    disabled={deleting === template.id}
                    title="Supprimer"
                    style={{
                      background: 'rgba(236,72,153,0.08)',
                      border: '1px solid rgba(236,72,153,0.2)',
                      borderRadius: '8px', padding: '6px 10px',
                      cursor: 'pointer', fontSize: '13px', color: 'var(--pink)',
                      transition: 'all 0.2s'
                    }}>
                    {deleting === template.id ? '...' : '🗑'}
                  </button>
                </div>
              </div>

              {/* Titre */}
              {template.title && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Titre</div>
                  <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{template.title}</div>
                </div>
              )}

              {/* Caption */}
              {template.caption && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Légende</div>
                  <div style={{
                    fontSize: '13px', color: 'var(--text)',
                    lineHeight: '1.5',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {template.caption}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {template.hashtags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px' }}>
                  {template.hashtags.slice(0, 6).map(h => (
                    <span key={h} style={{
                      background: 'rgba(124,58,237,0.08)',
                      border: '1px solid rgba(124,58,237,0.15)',
                      borderRadius: '6px', padding: '2px 8px',
                      fontSize: '11px', color: 'var(--purple3)', fontWeight: '500'
                    }}>#{h}</span>
                  ))}
                  {template.hashtags.length > 6 && (
                    <span style={{ fontSize: '11px', color: 'var(--text3)', padding: '2px 4px' }}>
                      +{template.hashtags.length - 6}
                    </span>
                  )}
                </div>
              )}

              {/* Date */}
              <div style={{
                fontSize: '11px', color: 'var(--text3)',
                marginTop: '14px', paddingTop: '12px',
                borderTop: '1px solid var(--border)'
              }}>
                Créé le {new Date(template.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
