import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useToast } from '../contexts/ToastContext';
import { chatApi } from '../api/chat';
import { api, getImageUrl } from '../api';
import type { ChatMessage, ProductCard } from '../types/chat';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    openConversation,
    refreshConversations,
    refreshUnreadCount,
  } = useChat();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'produce' | 'supply' | 'orders'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInspector, setShowInspector] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const msgs = await chatApi.listMessages(convId);
      setMessages(msgs);
      await chatApi.markAsRead(convId);
      refreshUnreadCount();
    } catch {
      // ignore network glitches
    }
  }, [refreshUnreadCount]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (!activeConversation) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    fetchMessages(activeConversation.id);

    pollIntervalRef.current = window.setInterval(() => {
      fetchMessages(activeConversation.id);
    }, 3500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [activeConversation, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return null;

  const handleSendMessage = async (textToSend?: string, attachedCard?: ProductCard) => {
    const text = (textToSend ?? inputText).trim();
    if (!text && !attachedCard) return;
    if (!activeConversation || isSending) return;

    setIsSending(true);
    setInputText('');

    try {
      const created = await chatApi.sendMessage(activeConversation.id, {
        content: text,
        productCard: attachedCard,
      });
      setMessages((prev) => [...prev, created]);
      refreshConversations();
    } catch (err) {
      console.error('Failed to send message:', err);
      toastError('Send Failed', 'Could not deliver your message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    if (!file.type.startsWith('image/')) {
      toastError('Invalid File', 'Please select an image file (JPG, PNG, WebP).');
      return;
    }

    setIsUploading(true);
    try {
      const res = await api.uploadImage(file);
      const imageUrl = getImageUrl(res.url);

      await handleSendMessage('📷 Photo attached:', {
        type: 'general',
        id: res.filename,
        title: 'Shared Photo',
        image: imageUrl,
        price: 0,
      });
      toastSuccess('Photo Sent', 'Your image was uploaded and sent.');
    } catch (err) {
      console.error('Image upload failed', err);
      toastError('Upload Failed', 'Failed to upload photo. Please check your file size.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const otherParticipant = activeConversation?.participants.find((p) => p.userId !== user.id);

  const filteredConversations = conversations.filter((c) => {
    if (filterType === 'produce' && c.context?.type !== 'produce') return false;
    if (filterType === 'supply' && c.context?.type !== 'supply') return false;
    if (filterType === 'orders' && c.context?.type !== 'produce_order' && c.context?.type !== 'supply_order') {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const other = c.participants.find((p) => p.userId !== user.id);
      const nameMatch = other?.name.toLowerCase().includes(q);
      const titleMatch = c.context?.title?.toLowerCase().includes(q);
      const msgMatch = c.lastMessage?.content?.toLowerCase().includes(q);
      return nameMatch || titleMatch || msgMatch;
    }
    return true;
  });

  // Helper to format date groups
  const formatMessageDateGroup = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Group messages by date
  const groupedMessages: { date: string; items: ChatMessage[] }[] = [];
  messages.forEach((msg) => {
    const dateGroup = formatMessageDateGroup(msg.createdAt);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (!lastGroup || lastGroup.date !== dateGroup) {
      groupedMessages.push({ date: dateGroup, items: [msg] });
    } else {
      lastGroup.items.push(msg);
    }
  });

  // Dynamic quick reply suggestion chips based on context
  const getContextChips = () => {
    if (!activeConversation?.context) {
      return [
        'Is this still available?',
        'Can I pick this up today?',
        'What is your best wholesale price?',
        'Do you accept Cash on Delivery (COD)?',
      ];
    }
    if (activeConversation.context.type === 'produce') {
      return [
        'Is this available for bulk delivery?',
        'When was this harvested?',
        'Can we negotiate on 50kg+?',
        'Can you provide photos of the harvest batch?',
      ];
    }
    if (activeConversation.context.type === 'supply') {
      return [
        'Do you have this in stock now?',
        'What is the recommended application dosage?',
        'Is shipping available to Northern Mindanao?',
        'Do you offer volume discounts for cooperatives?',
      ];
    }
    if (activeConversation.context.type === 'produce_order' || activeConversation.context.type === 'supply_order') {
      return [
        'What is the latest status of this order?',
        'When will this order be dispatched?',
        'I have confirmed receipt of delivery.',
        'Please share the courier tracking / driver info.',
      ];
    }
    return ['Hello, I am inquiring about this listing.', 'Can you share more details?'];
  };

  return (
    <div
      className={`messages-hub-page msg-page-container ${activeConversation ? 'has-active-conv' : 'no-active-conv'}`}
      style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '16px 20px 24px 20px',
        height: 'calc(100vh - 110px)',
        minHeight: '680px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* ─── Top Header Bar ─── */}
      <div
        className="msg-header-banner"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexShrink: 0,
        }}
      >
        <div className="msg-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>💬</span>
            <h1
              className="msg-header-title"
              style={{
                fontSize: '24px',
                fontWeight: 900,
                color: '#0E4A27',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Negotiation & Messages Hub
            </h1>
            <span
              className="msg-header-badge"
              style={{
                background: '#EFFDF5',
                color: '#15803D',
                fontSize: '12px',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '14px',
                border: '1px solid #BBF7D0',
              }}
            >
              {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
            </span>
          </div>
          <p className="msg-header-desc" style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0 36px' }}>
            Coordinate crop purchases, agricultural inputs, and direct delivery terms with verified participants.
          </p>
        </div>

        <div className="msg-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => refreshConversations()}
            className="msg-refresh-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            ↻ Refresh Inbox
          </button>
          <button
            onClick={() => navigate('/produce')}
            className="market-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: 'none',
              background: '#0E4A27',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(14, 74, 39, 0.25)',
            }}
          >
            🌾 Browse Marketplace
          </button>
        </div>
      </div>

      {/* ─── Main 3-Column Desktop Chat Experience ─── */}
      <div
        className={`msg-grid-container ${activeConversation ? 'has-active-conv' : 'no-active-conv'}`}
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: showInspector && activeConversation ? '340px 1fr 310px' : '340px 1fr',
          background: '#FFFFFF',
          borderRadius: '18px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          transition: 'grid-template-columns 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ─── COLUMN 1: Inbox Sidebar ─── */}
        <div
          className="msg-col-sidebar"
          style={{
            borderRight: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            background: '#F8FAFC',
            overflow: 'hidden',
          }}
        >
          {/* Search Bar */}
          <div style={{ padding: '14px 14px 10px 14px', background: '#FFFFFF', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                  fontSize: '14px',
                }}
              >
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by name, crop, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#F8FAFC',
                  color: '#1E293B',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Segmented Filter Pills */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                marginTop: '10px',
                background: '#F1F5F9',
                padding: '3px',
                borderRadius: '9px',
              }}
            >
              {[
                { key: 'all', label: 'All' },
                { key: 'produce', label: '🌾 Crops' },
                { key: 'supply', label: '🏪 Supplies' },
                { key: 'orders', label: '🧾 Orders' },
              ].map((tab) => {
                const isActive = filterType === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilterType(tab.key as any)}
                    style={{
                      flex: 1,
                      padding: '6px 2px',
                      borderRadius: '7px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: isActive ? 800 : 600,
                      cursor: 'pointer',
                      background: isActive ? '#FFFFFF' : 'transparent',
                      color: isActive ? '#0E4A27' : '#64748B',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversations Scroll List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94A3B8' }}>
                <span style={{ fontSize: '38px', display: 'block', marginBottom: '10px' }}>🌱</span>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#475569', margin: '0 0 4px 0' }}>
                  No discussions found
                </h4>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  Click <strong>"Chat Now"</strong> on any marketplace crop listing or store item to start talking.
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const other = c.participants.find((p) => p.userId !== user.id);
                const isSelected = activeConversation?.id === c.id;
                const unread = (c.unreadCounts?.[user.id] || 0) > 0;
                const unreadCountForMe = c.unreadCounts?.[user.id] || 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => openConversation(c)}
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #F1F5F9',
                      background: isSelected ? '#EFFDF5' : unread ? '#F0FDF4' : '#FFFFFF',
                      borderLeft: isSelected ? '4px solid #0E4A27' : '4px solid transparent',
                      transition: 'background 0.15s ease, transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = unread ? '#F0FDF4' : '#FFFFFF';
                    }}
                  >
                    {/* User Avatar with Presence Dot */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #0E4A27 0%, #166534 100%)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '16px',
                          overflow: 'hidden',
                          border: '2px solid #E2E8F0',
                        }}
                      >
                        {other?.photoUrl ? (
                          <img
                            src={getImageUrl(other.photoUrl)}
                            alt={other.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          (other?.name?.[0] || 'U').toUpperCase()
                        )}
                      </div>
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '0',
                          right: '0',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#22C55E',
                          border: '2px solid #FFFFFF',
                        }}
                      />
                    </div>

                    {/* Content Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: unread ? 800 : 700,
                              color: '#0F172A',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {other?.name || 'AgriConnect User'}
                          </span>
                        </div>
                        {c.lastMessage && (
                          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, flexShrink: 0 }}>
                            {new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      {/* Role & Item Context Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '6px',
                            background: '#F1F5F9',
                            color: '#475569',
                            textTransform: 'capitalize',
                          }}
                        >
                          {other?.role === 'farmer' ? '👨‍🌾 Farmer' : other?.role === 'supplier' ? '🏢 Supplier' : '🛒 Buyer'}
                        </span>

                        {c.context?.title && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#0E4A27',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            • {c.context.title}
                          </span>
                        )}
                      </div>

                      {/* Last Message Preview */}
                      <div
                        style={{
                          fontSize: '12px',
                          color: unread ? '#0F172A' : '#64748B',
                          fontWeight: unread ? 700 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '3px',
                        }}
                      >
                        {c.lastMessage?.senderId === user.id ? 'You: ' : ''}
                        {c.lastMessage?.content || 'Inquiry started'}
                      </div>
                    </div>

                    {/* Unread Counter Pill */}
                    {unread && (
                      <span
                        style={{
                          background: '#0E4A27',
                          color: '#FFFFFF',
                          borderRadius: '12px',
                          padding: '2px 7px',
                          fontSize: '11px',
                          fontWeight: 800,
                          boxShadow: '0 2px 4px rgba(14, 74, 39, 0.3)',
                          flexShrink: 0,
                        }}
                      >
                        {unreadCountForMe}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── COLUMN 2: Active Chat Room ─── */}
        <div className="msg-col-chat" style={{ display: 'flex', flexDirection: 'column', background: '#FFFFFF', overflow: 'hidden' }}>
          {activeConversation ? (
            <>
              {/* Active Chat Top Header */}
              <div
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#FFFFFF',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => setActiveConversation(null)}
                    className="msg-mobile-back-btn"
                    title="Back to conversations list"
                  >
                    ← Back
                  </button>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0E4A27 0%, #166534 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '16px',
                      flexShrink: 0,
                    }}
                  >
                    {otherParticipant?.photoUrl ? (
                      <img
                        src={getImageUrl(otherParticipant.photoUrl)}
                        alt={otherParticipant.name}
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      (otherParticipant?.name?.[0] || 'U').toUpperCase()
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '16px',
                          fontWeight: 900,
                          color: '#0F172A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {otherParticipant?.name || 'AgriConnect User'}
                      </h3>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: '#EFFDF5',
                          color: '#15803D',
                          border: '1px solid #BBF7D0',
                          textTransform: 'capitalize',
                        }}
                      >
                        {otherParticipant?.role || 'user'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E' }}></span>
                      <span className="msg-header-status" style={{ fontSize: '12px', color: '#64748B' }}>Verified AgriConnect Member · Online</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => setShowInspector(!showInspector)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: showInspector ? '#EFFDF5' : '#FFFFFF',
                      color: showInspector ? '#0E4A27' : '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Toggle Item & Seller Information Panel"
                  >
                    <span>ℹ️</span>
                    <span className="msg-details-btn-text">{showInspector ? 'Hide Details' : 'View Item Info'}</span>
                  </button>
                </div>
              </div>

              {/* Sticky Commerce Negotiation Banner */}
              {activeConversation.context && activeConversation.context.title && (
                <div
                  className="msg-commerce-banner"
                  style={{
                    background: 'linear-gradient(90deg, #F0FDF4 0%, #FFFFFF 100%)',
                    borderBottom: '1px solid #DCFCE7',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexShrink: 0,
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    {activeConversation.context.image ? (
                      <img
                        src={getImageUrl(activeConversation.context.image)}
                        alt={activeConversation.context.title}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          border: '1px solid #BBF7D0',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          background: '#DCFCE7',
                          color: '#15803D',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          flexShrink: 0,
                        }}
                      >
                        📦
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: '#DCFCE7',
                            color: '#15803D',
                            textTransform: 'uppercase',
                            flexShrink: 0,
                          }}
                        >
                          {activeConversation.context.type.replace('_', ' ')}
                        </span>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: '#0F172A',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            minWidth: 0,
                          }}
                        >
                          {activeConversation.context.title}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#0E4A27', fontWeight: 800, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        ₱{activeConversation.context.price?.toLocaleString()}
                        {activeConversation.context.unit ? ` / ${activeConversation.context.unit}` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        const card: ProductCard = {
                          type: activeConversation.context!.type,
                          id: activeConversation.context!.referenceId || '',
                          title: activeConversation.context!.title || '',
                          image: activeConversation.context!.image || '',
                          price: activeConversation.context!.price || 0,
                          unit: activeConversation.context!.unit,
                        };
                        handleSendMessage('Here is the item I am inquiring about:', card);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #16A34A',
                        background: '#FFFFFF',
                        color: '#0E4A27',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span>📎</span> <span className="msg-share-btn-text">Share Item</span>
                    </button>
                    {activeConversation.context.type === 'produce' && (
                      <button
                        onClick={() => navigate('/produce')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#0E4A27',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ⚡ View Listing
                      </button>
                    )}
                    {activeConversation.context.type === 'supply' && (
                      <button
                        onClick={() => navigate('/supply')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#0E4A27',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ⚡ View Supply
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Message Stream Area */}
              <div
                className="msg-stream-area"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '18px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: '#F8FAFC',
                }}
              >
                {groupedMessages.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    {/* Date Divider Pill */}
                    <div
                      className="msg-date-divider"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '10px 0 6px 0',
                      }}
                    >
                      <span
                        className="msg-date-pill"
                        style={{
                          background: '#E2E8F0',
                          color: '#475569',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 12px',
                          borderRadius: '12px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                      >
                        {group.date}
                      </span>
                    </div>

                    {group.items.map((msg) => {
                      const isMe = msg.senderId === user.id;
                      return (
                        <div
                          key={msg.id}
                          className={`msg-item-wrap ${isMe ? 'is-me' : 'is-other'}`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                          }}
                        >
                          {/* Sender name for other participant */}
                          {!isMe && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#64748B',
                                marginBottom: '3px',
                                marginLeft: '8px',
                              }}
                            >
                              {msg.senderName}
                            </span>
                          )}

                          {/* Embedded Product Card */}
                          {msg.productCard && msg.productCard.title && (
                            <div
                              className="msg-product-card-inline"
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '6px',
                                maxWidth: '75%',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                              }}
                            >
                              {msg.productCard.image && (
                                <img
                                  src={getImageUrl(msg.productCard.image)}
                                  alt={msg.productCard.title}
                                  style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '8px',
                                    objectFit: 'cover',
                                    border: '1px solid #E2E8F0',
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    color: '#0F172A',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {msg.productCard.title}
                                </div>
                                {msg.productCard.price > 0 && (
                                  <div style={{ fontSize: '13px', color: '#0E4A27', fontWeight: 800, marginTop: '2px' }}>
                                    ₱{msg.productCard.price?.toLocaleString()}
                                    {msg.productCard.unit ? ` / ${msg.productCard.unit}` : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Chat Message Bubble */}
                          {msg.content && (
                            <div
                              className={`msg-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`}
                              style={{
                                background: isMe ? 'linear-gradient(135deg, #0E4A27 0%, #15803D 100%)' : '#FFFFFF',
                                color: isMe ? '#FFFFFF' : '#0F172A',
                                padding: '11px 16px',
                                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                maxWidth: '72%',
                                fontSize: '14px',
                                lineHeight: '1.5',
                                wordBreak: 'break-word',
                                boxShadow: isMe
                                  ? '0 2px 8px rgba(14, 74, 39, 0.25)'
                                  : '0 2px 8px rgba(0, 0, 0, 0.05)',
                                border: isMe ? 'none' : '1px solid #E2E8F0',
                              }}
                            >
                              {msg.content}
                            </div>
                          )}

                          {/* Timestamp & Read Indicator */}
                          <div
                            style={{
                              fontSize: '10px',
                              color: '#94A3B8',
                              marginTop: '3px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '0 6px',
                              fontWeight: 600,
                            }}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMe && (
                              <span style={{ color: msg.isRead ? '#10B981' : '#94A3B8', fontSize: '11px' }}>
                                {msg.isRead ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Dynamic Quick Reply Chips */}
              <div
                className="msg-quick-reply-bar"
                style={{
                  padding: '8px 16px',
                  background: '#FFFFFF',
                  borderTop: '1px solid #F1F5F9',
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  flexShrink: 0,
                }}
              >
                {getContextChips().map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip)}
                    className="msg-quick-reply-chip"
                    style={{
                      background: '#F8FAFC',
                      color: '#334155',
                      border: '1px solid #E2E8F0',
                      borderRadius: '16px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#EFFDF5';
                      e.currentTarget.style.borderColor = '#86EFAC';
                      e.currentTarget.style.color = '#0E4A27';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.color = '#334155';
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Modern Message Input Area */}
              <div
                className="msg-input-area"
                style={{
                  padding: '12px 18px',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#FFFFFF',
                  flexShrink: 0,
                }}
              >
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                {/* Attach Photo Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="msg-attach-btn"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#475569',
                    fontSize: '18px',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                  title="Upload / Send Photo"
                >
                  {isUploading ? '⏳' : '📷'}
                </button>

                {/* Input Field */}
                <input
                  type="text"
                  placeholder={`Write a message or make an offer to ${otherParticipant?.name || ''}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isSending}
                  className="msg-input-field"
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    borderRadius: '24px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    background: '#F8FAFC',
                    color: '#0F172A',
                    transition: 'border-color 0.15s ease, background 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#16A34A';
                    e.currentTarget.style.background = '#FFFFFF';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.background = '#F8FAFC';
                  }}
                />

                {/* Send Button */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isSending}
                  className="msg-send-btn"
                  style={{
                    height: '42px',
                    padding: '0 20px',
                    borderRadius: '24px',
                    border: 'none',
                    background: inputText.trim() && !isSending ? '#0E4A27' : '#CBD5E1',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: inputText.trim() && !isSending ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: inputText.trim() ? '0 3px 8px rgba(14, 74, 39, 0.3)' : 'none',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <span className="msg-send-text">Send</span>
                  <span style={{ fontSize: '14px' }}>➤</span>
                </button>
              </div>
            </>
          ) : (
            /* Empty State when no conversation is selected */
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                padding: '40px',
                textAlign: 'center',
                background: '#FAFAFA',
              }}
            >
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: '#F0FDF4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '44px',
                  marginBottom: '18px',
                  border: '2px dashed #86EFAC',
                }}
              >
                💬
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0E4A27', margin: '0 0 8px 0' }}>
                Your Direct Trade Discussions
              </h2>
              <p style={{ fontSize: '14px', maxWidth: '440px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
                Select a conversation from the left sidebar, or initiate inquiries with farmers and suppliers directly
                from crop cards and supply products.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => navigate('/produce')}
                  className="btn btn-primary"
                  style={{ padding: '10px 20px', fontWeight: 800, fontSize: '14px' }}
                >
                  🌾 Explore Fresh Crops
                </button>
                <button
                  onClick={() => navigate('/supply')}
                  className="btn btn-secondary"
                  style={{ padding: '10px 20px', fontWeight: 800, fontSize: '14px' }}
                >
                  🏪 Agri-Supply Store
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── COLUMN 3: Context & Participant Inspector ─── */}
        {showInspector && activeConversation && (
          <div
            className="msg-col-inspector"
            style={{
              borderLeft: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: '16px',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                paddingBottom: '10px',
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase' }}>
                Participant & Deal Info
              </h4>
              <button
                onClick={() => setShowInspector(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
                title="Close Inspector"
              >
                ✕
              </button>
            </div>

            {/* Profile Card */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '16px',
                border: '1px solid #E2E8F0',
                textAlign: 'center',
                marginBottom: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0E4A27 0%, #166534 100%)',
                  color: '#FFFFFF',
                  margin: '0 auto 10px auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 900,
                  overflow: 'hidden',
                  border: '2px solid #BBF7D0',
                }}
              >
                {otherParticipant?.photoUrl ? (
                  <img
                    src={getImageUrl(otherParticipant.photoUrl)}
                    alt={otherParticipant.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  (otherParticipant?.name?.[0] || 'U').toUpperCase()
                )}
              </div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                {otherParticipant?.name}
              </h3>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: '#EFFDF5',
                  color: '#15803D',
                  fontSize: '12px',
                  fontWeight: 800,
                  textTransform: 'capitalize',
                  marginBottom: '10px',
                }}
              >
                <span>✓</span>
                <span>Verified {otherParticipant?.role || 'User'}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>📍 Northern Mindanao, Philippines</span>
                <span>🛡️ AgriConnect Trust Verified</span>
              </div>
            </div>

            {/* Context Item Specs Card */}
            {activeConversation.context && activeConversation.context.title && (
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  padding: '16px',
                  border: '1px solid #E2E8F0',
                  marginBottom: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Referenced Item
                </div>
                {activeConversation.context.image && (
                  <img
                    src={getImageUrl(activeConversation.context.image)}
                    alt={activeConversation.context.title}
                    style={{
                      width: '100%',
                      height: '140px',
                      borderRadius: '10px',
                      objectFit: 'cover',
                      marginBottom: '10px',
                      border: '1px solid #E2E8F0',
                    }}
                  />
                )}
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A', marginBottom: '4px' }}>
                  {activeConversation.context.title}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#0E4A27', marginBottom: '12px' }}>
                  ₱{activeConversation.context.price?.toLocaleString()}
                  {activeConversation.context.unit ? ` / ${activeConversation.context.unit}` : ''}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activeConversation.context.type === 'produce' && (
                    <button
                      onClick={() => navigate('/produce')}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '9px 0', fontSize: '13px', fontWeight: 800 }}
                    >
                      ⚡ Buy This Crop
                    </button>
                  )}
                  {activeConversation.context.type === 'supply' && (
                    <button
                      onClick={() => navigate('/supply')}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '9px 0', fontSize: '13px', fontWeight: 800 }}
                    >
                      ⚡ Order Supply Input
                    </button>
                  )}
                  {activeConversation.context.type === 'produce_order' && (
                    <button
                      onClick={() => navigate('/produce/orders')}
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '9px 0', fontSize: '13px', fontWeight: 800 }}
                    >
                      🧾 View Order History
                    </button>
                  )}
                  {activeConversation.context.type === 'supply_order' && (
                    <button
                      onClick={() => navigate('/supply/orders')}
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '9px 0', fontSize: '13px', fontWeight: 800 }}
                    >
                      🧾 View Supply Order
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Trading Guidelines / Safety Tips */}
            <div
              style={{
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '12px',
                color: '#92400E',
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span>💡</span>
                <span>Safe Trading Tip</span>
              </div>
              For produce batches, verify unit quantities (kg/sacks) and agree on COD or pickup terms prior to
              fulfillment.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
