import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const STATUS_LABELS = {
  pending:    { label: 'Planifié',  cls: 'badge-pending',    icon: '⏳' },
  processing: { label: 'En cours', cls: 'badge-processing',  icon: '⚙️' },
  published:  { label: 'Publié',   cls: 'badge-published',   icon: '✅' },
  failed:     { label: 'Échoué',   cls: 'badge-failed',      icon: '❌' }
};

export default function Posts() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchPosts();
    intervalRef.current = setInterval(() => {
      fetchPostsSilently();
    }, 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/posts');
      setPosts(res.data.posts);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostsSilently = async () => {
    setIsPolling(true);
    try {
      const res = await axios.get('/api/posts');
      const newPosts = res.data.posts;
      setPosts(prev => {
        const hasChanges = newPosts.some(np => {
          const old = prev.find(p => p.id === np.id);
          return old && old.status !== np.status;
        });
        if (hasChanges) setLastUpdated(new Date());
        return newPosts;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsPolling(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce post planifié ?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/posts/${id}`);
      setPosts(posts.filter(p => p.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter);

  const formatDate = (d) => new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const formatLastUpdated = (d) => {
    if (!d) return '';
    const diff = Math.floor((new Date() - d) / 1000);
    if (diff < 10) return "à l'instant";
    if (diff < 60) return `il y a ${diff}s`;
    return `il y a ${Math.floor(diff / 60)}min`;
  };

  const hasPending = posts.some(p => p.status === 'pending' || p.status === 'processing');

  const filters = [
    { key: 'all', label: 'Tous' },
    { key: 'pending', label: 'Planifiés' },
    { key: 'published', label: 'Publiés' },
    { key: 'failed', label: 'Échoués' }
  ];

  return (
    <div>
      <div className="page-header fade-up" style={{
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
      }}>
        <div>
          <div className="page-title">Mes posts</div>
          <div className="page-subtitle">{posts.length} post{posts.length !== 1 ? 's' : ''} au total</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/schedule')}>
          <span>✦</span> <span>Nouveau post</span>
        </button>
      </div>

      <div className="fade-up-1" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px', flexWrap: 'wrap', gap: '8px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className="btn" style={{
              padding: '8px 16px', fontSize: '13px',
              background: filter === f.key ? 'rgba(124,58,237,0.15)' : 'var(--card)',
              border: filter === f.key ? '1px solid rgba(124,58,237,0.35)' : '1px solid var(--border)',
              color: filter === f.key ? 'var(--purple3)' : 'var(--text2)',
              boxShadow: filter === f.key ? '0 0 12px rgba(124,58,237,0.15)' : 'none'
            }}>
              {f.label}
              <span style={{
                background: filter === f.key ? 'rgba(124,58,237,0.2)' : 'var(--bg3)',
                borderRadius: '10px', padding: '1px 7px', fontSize: '11px', marginLeft: '4px'
              }}>
                {f.key === 'all' ? posts.length : posts.filter(p => p.status === f.key).length}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasPending && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: '8px', padding: '5px 10px', fontSize: '12px', color: 'var(--purple3)'
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: 'var(--purple2)', animation: 'pulse 1.5s infinite'
              }} />
              Live
            </div>
          )}
          <button onClick={fetchPostsSilently} disabled={isPolling} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '5px 10px', cursor: 'pointer',
            fontSize: '12px', color: 'var(--text3)',
            display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
          }}>
            <span style={{ display: 'inline-block', animation: isPolling ? 'spin 0.8s linear infinite' : 'none' }}>↻</span>
            {lastUpdated ? formatLastUpdated(lastUpdated) : 'Actualiser'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state fade-up">
          <span className="empty-icon">📭</span>
          <p>Aucun post pour l'instant</p>
          <button className="btn btn-primary" onClick={() => navigate('/schedule')} style={{ marginTop: '20px' }}>
            <span>✦</span> <span>Planifier un post</span>
          </button>
        </div>
      ) : (
        <>
          <div className="card fade-up-1" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="posts-table">
              <thead>
                <tr>
                  <th>Vidéo</th>
                  <th>Légende</th>
                  <th>Programmé le</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(post => {
                  const s = STATUS_LABELS[post.status] || STATUS_LABELS.pending;
                  const isPending = post.status === 'pending' || post.status === 'processing';
                  return (
                    <tr key={post.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px', height: '40px',
                            background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.2))',
                            borderRadius: '10px', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '18px', flexShrink: 0
                          }}>🎬</div>
                          <div style={{ fontSize: '12px', color: 'var(--text2)' }}>#{post.id}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {post.caption || '—'}
                        </div>
                        {post.hashtags?.length > 0 && (
                          <div style={{ fontSize: '12px', color: 'var(--purple3)', marginTop: '3px' }}>
                            {post.hashtags.slice(0, 3).map(h => `#${h}`).join(' ')}
                          </div>
                        )}
                      </td>
                      <td style={{ color: 'var(--text2)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {formatDate(post.scheduled_at)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isPending && (
                            <div style={{
                              width: '6px', height: '6px', borderRadius: '50%',
                              background: 'var(--purple2)', animation: 'pulse 1.5s infinite', flexShrink: 0
                            }} />
                          )}
                          <span className={`badge ${s.cls}`}>{s.label}</span>
                        </div>
                        {post.error_message && (
                          <div style={{ fontSize: '11px', color: 'var(--pink)', marginTop: '4px', maxWidth: '150px' }}>
                            {post.error_message.slice(0, 40)}...
                          </div>
                        )}
                      </td>
                      <td>
                        {post.status === 'pending' && (
                          <button className="btn btn-danger" style={{ padding: '7px 14px', fontSize: '12px' }}
                            onClick={() => handleDelete(post.id)} disabled={deleting === post.id}>
                            {deleting === post.id ? '...' : '🗑'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(post => {
              const s = STATUS_LABELS[post.status] || STATUS_LABELS.pending;
              const isPending = post.status === 'pending' || post.status === 'processing';
              return (
                <div key={post.id} className="post-card-mobile fade-up">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '36px', height: '36px',
                        background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.2))',
                        borderRadius: '10px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '16px', flexShrink: 0
                      }}>🎬</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {isPending && (
                          <div style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: 'var(--purple2)', animation: 'pulse 1.5s infinite'
                          }} />
                        )}
                        <span className={`badge ${s.cls}`}>{s.label}</span>
                      </div>
                    </div>
                    {post.status === 'pending' && (
                      <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleDelete(post.id)} disabled={deleting === post.id}>
                        {deleting === post.id ? '...' : '🗑'}
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>
                    {post.caption || '—'}
                  </div>
                  {post.hashtags?.length > 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--purple3)', marginBottom: '8px' }}>
                      {post.hashtags.slice(0, 3).map(h => `#${h}`).join(' ')}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>📅 {formatDate(post.scheduled_at)}</div>
                  {post.error_message && (
                    <div style={{
                      fontSize: '12px', color: 'var(--pink)', marginTop: '8px',
                      padding: '8px', background: 'rgba(236,72,153,0.08)', borderRadius: '8px'
                    }}>
                      ⚠️ {post.error_message.slice(0, 80)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
