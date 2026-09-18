import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { communityApi } from '../api/community';
import { getImageUrl } from '../api';
import { useToast } from '../contexts/ToastContext';
import type { Post, Comment, ReactionType } from '../types/community';
import { ReactionPicker, ReactionBadgeList } from '../components/community/ReactionPicker';
import { VideoPlayer } from '../components/community/VideoPlayer';
import { ReactionModal } from '../components/community/ReactionModal';
import { ShareModal } from '../components/community/ShareModal';

export const CommunityPostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // New comment state
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadThread = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        communityApi.getPostByID(id),
        communityApi.listComments(id),
      ]);
      setPost(p);
      setComments(c || []);
    } catch (e) {
      console.error('Failed to load thread:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (!loading && (window.location.hash === '#comments' || window.location.hash === '#discussion')) {
      setTimeout(() => {
        const el = document.getElementById('comments');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  }, [loading]);

  const handleReact = async (reaction: ReactionType) => {
    if (!id || !post) return;
    const prevPost = post;

    // Optimistically update post reaction
    const currentReaction = post.myReaction;
    const counts = { ...(post.reactionCounts || {} as Record<ReactionType, number>) };
    let total = post.totalReactions || 0;
    let newReaction: ReactionType | undefined = reaction;

    if (currentReaction === reaction) {
      // Toggle off
      newReaction = undefined;
      counts[reaction] = Math.max(0, (counts[reaction] || 1) - 1);
      total = Math.max(0, total - 1);
    } else {
      if (currentReaction) {
        counts[currentReaction] = Math.max(0, (counts[currentReaction] || 1) - 1);
      } else {
        total += 1;
      }
      counts[reaction] = (counts[reaction] || 0) + 1;
    }

    setPost({
      ...post,
      myReaction: newReaction,
      reactionCounts: counts,
      totalReactions: total,
    });

    try {
      const updated = await communityApi.reactToPost(id, reaction);
      setPost(updated);
    } catch (e) {
      console.error('Failed to react:', e);
      // Rollback on failure
      setPost(prevPost);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentText.trim()) return;
    setSubmitting(true);
    try {
      await communityApi.createComment(id, { body: commentText.trim() });
      setCommentText('');
      await loadThread();
      success('Reply Posted Successfully!', 'Your response has been added to the discussion thread.');
    } catch (err: any) {
      error('Failed to post reply', err.response?.data?.error || 'Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'farmer':
        return { label: '🌾 Farmer', bg: '#dcfce7', color: '#15803d' };
      case 'supplier':
        return { label: '🏪 Agri Supplier', bg: '#e0f2fe', color: '#0369a1' };
      case 'lgu':
      case 'lgu_staff':
      case 'lgu_officer':
        return { label: '🏛️ LGU Staff', bg: '#fef3c7', color: '#b45309' };
      case 'buyer':
        return { label: '🛒 Buyer', bg: '#f1f5f9', color: '#475569' };
      default:
        return { label: '👤 Member', bg: '#f1f5f9', color: '#475569' };
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'crop_advice':
        return '🌱 Crop Care & Health';
      case 'pest_control':
        return '🐛 Pest & Disease Control';
      case 'market_talk':
        return '💰 Market Prices & Sales';
      case 'equipment':
        return '🚜 Tools & Equipment';
      case 'general':
      default:
        return '🌾 General Farming';
    }
  };

  if (loading) {
    return (
      <div className="app-container" style={{ padding: '48px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#64748b', fontWeight: 600 }}>Loading discussion thread...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="app-container" style={{ padding: '48px 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0E4A27' }}>Post Not Found</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>This discussion thread may have been removed or does not exist.</p>
        <button onClick={() => navigate('/community')} className="btn btn-primary">
          ← Return to Community Feed
        </button>
      </div>
    );
  }

  const authorBadge = getRoleBadge(post.authorRole);

  return (
    <div className="app-container" style={{ paddingBottom: '60px', maxWidth: '820px', margin: '0 auto' }}>
      {/* ── Navigation Breadcrumb ── */}
      <button
        onClick={() => navigate('/community')}
        style={{
          background: 'none',
          border: 'none',
          color: '#16a34a',
          fontWeight: 800,
          fontSize: '15px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px',
          padding: 0,
        }}
      >
        ← Back to Community Feed
      </button>

      {/* ── Main Post Card ── */}
      <div
        className="card"
        style={{
          padding: '28px',
          borderRadius: '20px',
          marginBottom: '28px',
          borderLeft: post.authorRole === 'lgu_staff' ? '6px solid #0D9488' : '6px solid #16a34a',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: post.authorRole === 'lgu_staff' ? '#0D9488' : '#16a34a',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '18px',
              }}
            >
              {post.authorPhotoUrl ? (
                <img src={getImageUrl(post.authorPhotoUrl)} alt={post.authorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                post.authorName ? post.authorName[0]?.toUpperCase() : 'U'
              )}
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>{post.authorName}</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: authorBadge.color,
                    backgroundColor: authorBadge.bg,
                    padding: '2px 10px',
                    borderRadius: '12px',
                  }}
                >
                  {authorBadge.label}
                </span>
              </div>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Posted on {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#0E4A27',
              backgroundColor: '#EAF6EE',
              padding: '6px 14px',
              borderRadius: '14px',
              border: '1px solid #C8E6D0',
            }}
          >
            {getCategoryLabel(post.category)}
          </span>
        </div>

        {post.title && post.title !== post.body && !post.title.startsWith('Shared a') && (
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0E4A27', margin: '0 0 14px 0', lineHeight: 1.3 }}>
            {post.title}
          </h1>
        )}

        {post.body && (
          <p style={{ fontSize: '16px', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: '20px' }}>
            {post.body}
          </p>
        )}

        {/* Video Player */}
        {post.videoUrl && (
          <div style={{ marginBottom: '20px' }}>
            <VideoPlayer src={post.videoUrl} />
          </div>
        )}

        {/* Image Attachment */}
        {!post.videoUrl && post.imageUrl && (
          <div style={{ marginBottom: '20px', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
            <img
              src={getImageUrl(post.imageUrl)}
              alt={post.title || 'Attachment'}
              style={{ width: '100%', maxHeight: '550px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
            />
          </div>
        )}

        {/* Embedded Quoted Post (if this is a repost) */}
        {post.sharedPost && (
          <div
            onClick={() => navigate(`/community/posts/${post.sharedPost?.id}`)}
            style={{
              marginBottom: '20px',
              border: '1.5px solid #E2E8F0',
              borderRadius: '16px',
              padding: '18px',
              backgroundColor: '#F8FAFC',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#16A34A'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: '#0E4A27',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                <span>{post.sharedPost.authorName ? post.sharedPost.authorName.charAt(0).toUpperCase() : 'U'}</span>
                {post.sharedPost.authorPhotoUrl && (
                  <img
                    src={getImageUrl(post.sharedPost.authorPhotoUrl)}
                    alt={post.sharedPost.authorName}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                    {post.sharedPost.authorName}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: getRoleBadge(post.sharedPost.authorRole).color,
                      backgroundColor: getRoleBadge(post.sharedPost.authorRole).bg,
                      padding: '1px 6px',
                      borderRadius: '8px',
                    }}
                  >
                    {getRoleBadge(post.sharedPost.authorRole).label}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  {new Date(post.sharedPost.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            {post.sharedPost.title && post.sharedPost.title !== post.sharedPost.body && !post.sharedPost.title.startsWith('Shared a') && (
              <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: '#0E4A27' }}>
                {post.sharedPost.title}
              </h4>
            )}

            {post.sharedPost.body && (
              <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {post.sharedPost.body}
              </p>
            )}

            {post.sharedPost.videoUrl && (
              <div style={{ marginTop: '12px' }} onClick={(e) => e.stopPropagation()}>
                <VideoPlayer src={post.sharedPost.videoUrl} />
              </div>
            )}

            {!post.sharedPost.videoUrl && post.sharedPost.imageUrl && (
              <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', maxHeight: '400px', background: '#000' }}>
                <img
                  src={getImageUrl(post.sharedPost.imageUrl)}
                  alt={post.sharedPost.title || 'Attached media'}
                  style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Reaction Metrics & Stats Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderTop: '1px solid #F1F5F9',
            borderBottom: '1px solid #F1F5F9',
            marginBottom: '8px',
          }}
        >
          <ReactionBadgeList
            reactionCounts={post.reactionCounts}
            totalReactions={post.totalReactions || post.upvotes || 0}
            onClick={() => setShowReactionModal(true)}
          />
          <span
            onClick={() => {
              document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{ fontSize: '14px', color: '#64748B', fontWeight: 600, cursor: 'pointer' }}
            className="hover:underline"
            title="Jump to discussion"
          >
            {comments.length} {comments.length === 1 ? 'Response' : 'Responses'}
          </span>
        </div>

        {/* Interactive LinkedIn Reactions & Actions */}
        <div className="post-action-bar" style={{ maxWidth: '420px', marginTop: '4px' }}>
          <ReactionPicker
            myReaction={post.myReaction}
            totalReactions={post.totalReactions}
            reactionCounts={post.reactionCounts}
            onReact={handleReact}
          />
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('comment-input');
              el?.focus();
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="post-action-btn"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>Comment</span>
          </button>
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="post-action-btn"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* ── Add Comment / Discussion Input Box ── */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px', borderRadius: '18px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0E4A27', marginBottom: '14px' }}>
          Leave a Reply
        </h3>
        <form onSubmit={handleAddComment}>
          <textarea
            id="comment-input"
            rows={3}
            placeholder="Share your advice, questions, or perspectives with the agricultural community..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid #CBD5E1',
              fontSize: '15px',
              fontFamily: 'inherit',
              marginBottom: '12px',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: '14px', fontWeight: 800, borderRadius: '12px' }}
            >
              {submitting ? 'Posting...' : 'Post Reply →'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Responses Thread ── */}
      <div id="comments" style={{ scrollMarginTop: '85px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27', marginBottom: '18px' }}>
          Community Discussion ({comments.length})
        </h2>

        {comments.length === 0 ? (
          <div className="card" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#0E4A27', marginBottom: '4px' }}>No Replies Yet</div>
            <p style={{ fontSize: '14px', margin: 0 }}>Be the first to share your knowledge or experience with this farmer!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {comments.map((c) => {
              const cBadge = getRoleBadge(c.authorRole);
              return (
                <div
                  key={c.id}
                  className="card"
                  style={{
                    padding: '20px',
                    borderRadius: '16px',
                    background: c.authorRole === 'lgu_staff' ? '#F0FDF4' : '#FFFFFF',
                    border: c.authorRole === 'lgu_staff' ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          backgroundColor: c.authorRole === 'lgu_staff' ? '#0D9488' : '#16a34a',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '15px',
                          position: 'relative',
                          flexShrink: 0,
                        }}
                      >
                        <span>{c.authorName ? c.authorName[0]?.toUpperCase() : 'U'}</span>
                        {c.authorPhotoUrl && (
                          <img
                            src={getImageUrl(c.authorPhotoUrl)}
                            alt={c.authorName}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{c.authorName}</span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              color: cBadge.color,
                              backgroundColor: cBadge.bg,
                              padding: '1px 8px',
                              borderRadius: '10px',
                            }}
                          >
                            {cBadge.label}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '15px', color: '#334155', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {c.body}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Reaction Details Modal ── */}
      {showReactionModal && (
        <ReactionModal
          postId={post.id}
          isOpen={showReactionModal}
          onClose={() => setShowReactionModal(false)}
          initialReactions={post.reactions}
        />
      )}

      {/* ── Social Share Modal ── */}
      {showShareModal && (
        <ShareModal
          post={post}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          onPostShared={(newPost) => navigate(`/community/posts/${newPost.id}`)}
        />
      )}
    </div>
  );
};
