import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { api } from '../api';
import { chatApi } from '../api/chat';
import type { Role } from '../types/auth';
import type { Conversation } from '../types/chat';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Lang = 'en' | 'tl' | 'bis';

const translations = {
  en: {
    title: 'Contact AgriConnect Support',
    subtitle: 'Connect directly with LGU Agri Staff or Super Admin Support.',
    searchPlaceholder: 'Search help topics, FAQs, or guides...',
    tabs: {
      contact: '💬 Contact Admin',
      guides: '📖 User Guides',
      faqs: '❓ FAQs',
      report: '📝 Report Issue',
    },
    hotlineTitle: 'Call Support Hotline',
    hotlineDesc: 'Speak directly to our friendly support team. Available 7:00 AM – 7:00 PM daily.',
    callNow: 'Call Hotline',
    copied: '✓ Copied!',
    chatTitle: 'Chat Directly with LGU Agriculture Desk',
    chatDesc: 'Connect directly with your municipal LGU Agriculture Office for local farming aid, RSBSA verification, and municipal programs.',
    startChat: 'Message Admin Now',
    liveTechTitle: 'Live Platform Tech Support',
    liveTechDesc: 'Encountered a bug, account issue, or platform error? Chat directly with Super Admin for real-time troubleshooting.',
    videoTitle: 'Watch Easy Video Guides',
    videoDesc: 'Watch 2-minute video demonstrations in Tagalog and Bisaya.',
    watchVideos: 'Watch Videos',
    reportSuccess: '✓ Thank you! Your report has been submitted directly to Super Admin.',
  },
  tl: {
    title: 'Makipag-ugnayan sa AgriConnect Support',
    subtitle: 'Direktang makipag-usap sa LGU Agri Staff o Super Admin Support.',
    searchPlaceholder: 'Maghanap ng paksa, sagot, o gabay...',
    tabs: {
      contact: '💬 Kausapin ang Admin',
      guides: '📖 Gabay sa Paggamit',
      faqs: '❓ Mga Tanong (FAQs)',
      report: '📝 Mag-ulat ng Problema',
    },
    hotlineTitle: 'Tumawag sa Support Hotline',
    hotlineDesc: 'Kausapin ang aming koponan. Bukas mula 7:00 AM hanggang 7:00 PM araw-araw.',
    callNow: 'Tumawag Agad',
    copied: '✓ Nakopya!',
    chatTitle: 'Makipag-usap sa LGU Agriculture Desk',
    chatDesc: 'Kausapin ang iyong lokal na LGU Agriculture Office para sa tulong sa pagsasaka, RSBSA, at mga programa.',
    startChat: 'I-chat ang Admin',
    liveTechTitle: 'Live Platform Tech Support',
    liveTechDesc: 'May nakitang bug o problema sa platform? I-chat ang Super Admin para sa mabilis na teknikal na tulong.',
    videoTitle: 'Manood ng Maikling Video',
    videoDesc: 'Panoorin ang 2-minutong palabas sa Tagalog at Bisaya.',
    watchVideos: 'Panoorin',
    reportSuccess: '✓ Salamat! Naisumite na ang iyong ulat sa Super Admin.',
  },
  bis: {
    title: 'Pakig-ugnayan sa AgriConnect Support',
    subtitle: 'Direktang makig-sulti sa LGU Agri Staff o Super Admin Support.',
    searchPlaceholder: 'Pangitaa ang mga topiko, FAQs, o giya...',
    tabs: {
      contact: '💬 Kausapin ang Admin',
      guides: '📖 Mga Giya sa Paggamit',
      faqs: '❓ Kanunayng Pangutana',
      report: '📝 I-report ang Problema',
    },
    hotlineTitle: 'Tawag sa Support Hotline',
    hotlineDesc: 'Pakigsulti sa among suporta. Abertas 7:00 AM – 7:00 PM adlaw-adlaw.',
    callNow: 'Tawag Karon',
    copied: '✓ Nakopya!',
    chatTitle: 'Pakig-sulti sa LGU Agriculture Desk',
    chatDesc: 'Direktang makig-storya sa imong municipal LGU Agriculture Office alang sa tabang sa pag-uma, RSBSA, ug suporta.',
    startChat: 'I-chat ang Admin',
    liveTechTitle: 'Live Platform Tech Support',
    liveTechDesc: 'Nakahatag ug bug o problema sa app? I-chat ang Super Admin alang sa paspas nga teknikal nga tabang.',
    videoTitle: 'Tan-aw ug Video Giya',
    videoDesc: 'Tan-awa ang 2-minutos nga video sa Tagalog ug Bisaya.',
    watchVideos: 'Tan-awa',
    reportSuccess: '✓ Salamat! Na-submit na ang imong report sa Super Admin.',
  },
};

interface GuideItem {
  id: string;
  role: Role;
  title: string;
  desc: string;
  icon: string;
}

const guideData: GuideItem[] = [
  // Farmer
  {
    id: 'f1',
    role: 'farmer',
    title: '1. How to list a crop for sale',
    desc: 'Tap the big green "+" Add Crop button on your mobile bottom nav. Enter your crop name, price/kg, available harvest quantity, and tap "Publish Listing".',
    icon: '🥦',
  },
  {
    id: 'f2',
    role: 'farmer',
    title: '2. How to track daily crop market prices',
    desc: 'Go to Market Prices in the menu to check official DA trading post prices for Cagayan de Oro and Bukidnon updated daily.',
    icon: '📈',
  },
  {
    id: 'f3',
    role: 'farmer',
    title: '3. Record farm expenses & harvest schedule',
    desc: 'Use the Farm Financial Tracker to log seeds, fertilizer expenses, and schedule upcoming planting or harvest dates.',
    icon: '💸',
  },
  // Buyer
  {
    id: 'b1',
    role: 'buyer',
    title: '1. How to buy fresh crops directly from farmers',
    desc: 'Open the Marketplace page, filter by crop type or province, and tap "Direct Message" or "Order" to initiate a trade with verified farmers.',
    icon: '🥬',
  },
  {
    id: 'b2',
    role: 'buyer',
    title: '2. How to purchase agri-supplies & seeds',
    desc: 'Navigate to Agri-Supply Store to add certified seeds, fertilizers, or tools to your cart and checkout with Cash on Delivery or GCash.',
    icon: '🛍️',
  },
  // Supplier
  {
    id: 's1',
    role: 'supplier',
    title: '1. How to list seeds, fertilizer & machinery',
    desc: 'Go to Manage Supply Store, click "+ Add Supply Product", upload photos, set price and inventory, then publish your product.',
    icon: '📦',
  },
  {
    id: 's2',
    role: 'supplier',
    title: '2. How to manage customer orders & delivery',
    desc: 'Check Supply Orders to review pending orders, update delivery status, and notify buyers upon shipment.',
    icon: '📋',
  },
  // LGU Staff
  {
    id: 'l1',
    role: 'lgu_staff',
    title: '1. How to publish government assistance programs',
    desc: 'Go to Manage Gov\'t Programs, enter subsidy/grant details, eligibility requirements, and application deadlines for farmers.',
    icon: '🏛️',
  },
  {
    id: 'l2',
    role: 'lgu_staff',
    title: '2. How to verify regional farmer & buyer accounts',
    desc: 'Open Approvals tab to review RSBSA numbers and LGU certificates, then click "Approve Account" to grant verified badges.',
    icon: '🛡️',
  },
];

interface FAQItem {
  q: Record<Lang, string>;
  a: Record<Lang, string>;
  tags: string[];
}

const faqsData: FAQItem[] = [
  {
    tags: ['free', 'cost', 'fee', 'charge', 'farmer'],
    q: {
      en: 'Is AgriConnect free for farmers to use?',
      tl: 'Libre ba ang AgriConnect para sa mga magsasaka?',
      bis: 'Libre ba ang AgriConnect para sa mga mag-uuma?',
    },
    a: {
      en: 'Yes! AgriConnect is 100% free for all registered Filipino farmers. There are no listing fees or hidden transaction charges.',
      tl: 'Oo! Ang AgriConnect ay 100% libre para sa lahat ng rehistradong magsasaka. Walang listing fees o nakatagong bayarin.',
      bis: 'Oo! Ang AgriConnect 100% libre para sa tanang nakarehistro nga mag-uuma. Walay bayad sa pag-list o hidden fees.',
    },
  },
  {
    tags: ['verified', 'badge', 'rsbsa', 'lgu', 'certification'],
    q: {
      en: 'How do I get the "✓ Verified Farmer" badge?',
      tl: 'Paano makuha ang "✓ Verified Farmer" badge?',
      bis: 'Unsaon pagkuha sa "✓ Verified Farmer" badge?',
    },
    a: {
      en: 'Upload your RSBSA ID number or LGU Farmer Certification in your Profile settings. Your local agriculture office will verify your record within 24 hours.',
      tl: 'I-upload ang iyong RSBSA ID number o LGU Farmer Certificate sa Settings. Ibe-verify ito ng lokal na opisina ng agrikultura sa loob ng 24 oras.',
      bis: 'I-upload ang imong RSBSA ID number o LGU Farmer Certificate sa Settings. I-verify kini sa lokal nga opisina sa agrikultura sa sulod sa 24 oras.',
    },
  },
  {
    tags: ['payment', 'cod', 'gcash', 'cash', 'delivery', 'bank'],
    q: {
      en: 'What payment options are supported?',
      tl: 'Anong mga paraan ng pagbabayad ang tinatanggap?',
      bis: 'Unsa nga mga paagi sa pagbayad ang gidawat?',
    },
    a: {
      en: 'AgriConnect supports Cash on Delivery (COD), GCash, Maya, and direct Bank Transfers upon harvest or supply inspection.',
      tl: 'Tinatanggap ang Cash on Delivery (COD), GCash, Maya, at direktang Bank Transfer kapag natanggap na ang ani o produkto.',
      bis: 'Gidawat ang Cash on Delivery (COD), GCash, Maya, ug direct Bank Transfer inig dawat sa ani o supply.',
    },
  },
  {
    tags: ['prices', 'market', 'da', 'trading', 'bukidnon', 'cdo'],
    q: {
      en: 'Where do daily market prices come from?',
      tl: 'Saan nanggagaling ang araw-araw na presyo ng mazasaka?',
      bis: 'Diin gikan ang adlaw-adlaw nga presyo sa merkado?',
    },
    a: {
      en: 'Prices are sourced directly from Department of Agriculture (DA) official price monitoring posts across Northern Mindanao, updated daily.',
      tl: 'Ang mga presyo ay direktang nanggagaling sa opisyal na price monitoring ng Department of Agriculture (DA) sa Hilagang Mindanao.',
      bis: 'Ang presyo gikan diretso sa opisyal nga price monitoring sa Department of Agriculture (DA) sa Hilagang Mindanao.',
    },
  },
];

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { conversations, openConversation, openChatWith } = useChat();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'options' | 'howTo' | 'faqs' | 'report'>('options');
  const [lang, setLang] = useState<Lang>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role>(user?.role || 'farmer');
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Issue reporting form state
  const [reportSubject, setReportSubject] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  if (!isOpen) return null;

  const t = translations[lang];

  const handleCallSupport = () => {
    navigator.clipboard?.writeText?.('0917-123-4567');
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 3000);
  };

  const handleStartChatWithRole = async (
    targetRole: 'super_admin' | 'lgu_staff',
    initialMsg?: string
  ) => {
    // 1. Look for existing conversation with recipient of targetRole
    const existing = conversations.find((c) =>
      c.participants.some((p) => p.userId !== user?.id && p.role === targetRole)
    );

    if (existing) {
      if (initialMsg && !existing.id.startsWith('support_')) {
        try {
          await chatApi.sendMessage(existing.id, { content: initialMsg });
        } catch (err) {
          console.warn('Could not send initial report message:', err);
        }
      }
      onClose();
      openConversation(existing);
      navigate('/messages');
      return;
    }

    // 2. Look for recipient ID in any existing participant lists
    const targetUser = conversations
      .flatMap((c) => c.participants)
      .find((p) => p.userId !== user?.id && p.role === targetRole);

    if (targetUser) {
      onClose();
      await openChatWith(targetUser.userId, { type: 'general', title: 'AgriConnect Support' }, initialMsg);
      navigate('/messages');
      return;
    }

    // 3. Query backend API for real registered support/LGU accounts in MongoDB
    try {
      const supportContacts = await api.getSupportContacts(targetRole);
      if (supportContacts && supportContacts.length > 0) {
        // For LGU Staff, try to find an officer matching user's municipality or province
        let selectedOfficer = supportContacts[0];
        if (targetRole === 'lgu_staff' && user?.municipality) {
          const localMatch = supportContacts.find(
            (c) => c.municipality?.toLowerCase() === user.municipality?.toLowerCase()
          );
          if (localMatch) selectedOfficer = localMatch;
        }

        onClose();
        const chatTitle = targetRole === 'super_admin'
          ? 'Super Admin Support'
          : `LGU Agri Office – ${selectedOfficer.municipality || user?.municipality || 'Municipal Desk'}`;

        await openChatWith(selectedOfficer.id, { type: 'general', title: chatTitle }, initialMsg);
        navigate('/messages');
        return;
      }
    } catch (err) {
      console.warn('Could not fetch real support contacts:', err);
    }

    // 4. Fallback if zero real support users exist in database:
    const userLocation = [user?.municipality, user?.province].filter(Boolean).join(', ');
    const isLgu = targetRole === 'lgu_staff';

    const targetTitle = isLgu
      ? userLocation ? `LGU Agri Office – ${userLocation}` : 'LGU Agriculture Office Desk'
      : 'Super Admin Platform & Tech Support';

    const targetName = isLgu
      ? user?.municipality ? `${user.municipality} LGU Agri Desk` : 'LGU Agriculture Office'
      : 'Super Admin Support';

    const welcomeMsg = isLgu
      ? user?.municipality
        ? `Kumusta! How can the ${user.municipality} Agriculture Office assist you with local farming programs, RSBSA registration, or municipal aid today?`
        : 'Kumusta! How can your local LGU Agriculture Office assist you with agricultural programs, subsidies, or RSBSA registration today?'
      : 'Hello! How can the AgriConnect support team assist you with platform or technical issues today?';

    const lastMsgContent = initialMsg
      ? `📝 **TICKET REPORT:** ${initialMsg.replace(/^📝 \*\*SUBMITTED TICKET REPORT\*\*\n\n/, '')}`
      : welcomeMsg;

    const supportConv: Conversation = {
      id: `support_${targetRole}_${user?.id || 'guest'}`,
      participantIds: [user?.id || 'guest', `support_${targetRole}_id`],
      participants: [
        {
          userId: user?.id || 'guest',
          name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'User',
          role: user?.role || 'farmer',
          photoUrl: user?.photoUrl,
        },
        {
          userId: `support_${targetRole}_id`,
          name: targetName,
          role: targetRole,
        },
      ],
      context: {
        type: 'general',
        title: targetTitle,
      },
      lastMessage: {
        senderId: initialMsg ? (user?.id || 'guest') : `support_${targetRole}_id`,
        content: lastMsgContent,
        createdAt: new Date().toISOString(),
      },
      unreadCounts: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onClose();
    openConversation(supportConv);
    navigate('/messages');
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportSubject.trim() || !reportMessage.trim()) return;

    const formattedReport = `📝 **SUBMITTED TICKET REPORT**\n\n📌 **Subject:** ${reportSubject.trim()}\n\n💬 **Details:**\n${reportMessage.trim()}`;

    setReportSubmitted(true);
    setTimeout(async () => {
      setReportSubmitted(false);
      setReportSubject('');
      setReportMessage('');
      await handleStartChatWithRole('super_admin', formattedReport);
    }, 1000);
  };

  // Search filtering
  const q = searchQuery.toLowerCase().trim();

  const filteredGuides = guideData.filter((g) => {
    const matchesRole = g.role === roleFilter;
    if (!q) return matchesRole;
    return matchesRole && (g.title.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q));
  });

  const filteredFAQs = faqsData.filter((f) => {
    if (!q) return true;
    const questionText = (f.q[lang] || f.q.en).toLowerCase();
    const answerText = (f.a[lang] || f.a.en).toLowerCase();
    const tagMatch = f.tags.some((tag) => tag.toLowerCase().includes(q));
    return questionText.includes(q) || answerText.includes(q) || tagMatch;
  });

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 999 }}>
      <div
        className="modal-content help-support-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '620px',
          width: '94%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 20px',
          borderRadius: '20px',
        }}
      >
        {/* Mobile Pull Handle Indicator */}
        <div className="help-modal-mobile-handle" />

        {/* Modal Top Action Bar (Language Switcher + Close Button) */}
        <div className="help-modal-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          {/* Language Switcher */}
          <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '10px', gap: '2px' }}>
            {(['en', 'tl', 'bis'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  border: 'none',
                  background: lang === l ? '#FFFFFF' : 'transparent',
                  color: lang === l ? '#15803D' : '#64748B',
                  fontWeight: lang === l ? 800 : 600,
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  boxShadow: lang === l ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="help-modal-close-btn"
            aria-label="Close help modal"
            style={{
              background: '#F8F7F3',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#6F716C',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Header Title & Subtitle */}
        <div className="help-modal-header-wrap" style={{ marginBottom: '14px' }}>
          <h2 className="help-modal-title" style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27', margin: 0, lineHeight: 1.25 }}>
            ❓ {t.title}
          </h2>
          <p className="help-modal-subtitle" style={{ fontSize: '13px', color: '#6F716C', margin: '4px 0 0 0', lineHeight: 1.35 }}>
            {t.subtitle}
          </p>
        </div>

        {/* Live Search Input */}
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{
              width: '100%',
              padding: '11px 38px 11px 40px',
              borderRadius: '12px',
              border: '1.5px solid #E2E8F0',
              background: '#F8FAFC',
              fontSize: '14px',
              color: '#0F172A',
              outline: 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Modern Segmented Control Tab Bar */}
        <div
          className="help-modal-segmented-control"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '4px',
            background: '#F1F5F9',
            padding: '4px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            marginBottom: '16px',
          }}
        >
          {[
            { id: 'options', label: t.tabs.contact, shortLabel: '💬 Contact' },
            { id: 'howTo', label: t.tabs.guides, shortLabel: '📖 Guides' },
            { id: 'faqs', label: t.tabs.faqs, shortLabel: '❓ FAQs' },
            { id: 'report', label: t.tabs.report, shortLabel: '📝 Report' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`help-modal-tab ${activeTab === tab.id ? 'active' : ''}`}
              style={{
                padding: '9px 4px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === tab.id ? '#176B3A' : 'transparent',
                color: activeTab === tab.id ? '#FFFFFF' : '#475569',
                fontWeight: activeTab === tab.id ? 800 : 600,
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'center',
                justifyContent: 'center',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                boxShadow: activeTab === tab.id ? '0 2px 8px rgba(23, 107, 58, 0.25)' : 'none',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <span className="tab-label-full">{tab.label}</span>
              <span className="tab-label-short">{tab.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Scrollable Main Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {/* Tab 1: Contact Options */}
          {activeTab === 'options' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Primary Hero Action: Direct LGU Messaging */}
              <div
                className="help-card-hotline"
                style={{
                  padding: '20px',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, #EAF6EE 0%, #DCFCE7 100%)',
                  border: '2px solid #176B3A',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, background: '#176B3A', color: '#FFFFFF', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>
                        RECOMMENDED
                      </span>
                    </div>
                    <div className="help-card-hotline-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0E4A27', marginTop: '4px' }}>
                      💬 {t.chatTitle}
                    </div>
                    <div className="help-card-hotline-desc" style={{ fontSize: '13px', color: '#1C513D', marginTop: '4px', lineHeight: 1.4 }}>
                      {t.chatDesc}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleStartChatWithRole('lgu_staff')}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: '1.5px solid #176B3A',
                    background: '#FFFFFF',
                    color: '#0E4A27',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(23, 107, 58, 0.15)',
                    transition: 'all 0.15s ease',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: '24px', flexShrink: 0 }}>🏛️</span>
                  <div>
                    <div style={{ color: '#0E4A27', fontWeight: 800, fontSize: '15px' }}>Message LGU Staff</div>
                    <div style={{ fontSize: '11px', color: '#6F716C', fontWeight: 500 }}>Local Agriculture & RSBSA Support</div>
                  </div>
                </button>
              </div>

              {/* Secondary Option: Call Hotline */}
              <div
                className="help-card-item"
                style={{
                  padding: '18px',
                  borderRadius: '16px',
                  background: '#FFFFFF',
                  border: '1.5px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div className="help-card-title" style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                    📞 {t.hotlineTitle}
                  </div>
                  <div className="help-card-desc" style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                    {t.hotlineDesc}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#176B3A', marginTop: '4px' }}>
                    0917-123-4567 (Toll Free)
                  </div>
                </div>

                <div className="help-card-hotline-actions" style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <a
                    href="tel:09171234567"
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      background: '#176B3A',
                      color: '#FFFFFF',
                      textDecoration: 'none',
                      fontWeight: 800,
                      fontSize: '13px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    📞 {t.callNow}
                  </a>
                  <button
                    onClick={handleCallSupport}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      background: '#F8FAFC',
                      color: '#334155',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedPhone ? t.copied : '📋 Copy'}
                  </button>
                </div>
              </div>

              <div
                className="help-card-item"
                style={{
                  padding: '18px',
                  borderRadius: '16px',
                  background: '#FFFFFF',
                  border: '1.5px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div className="help-card-title" style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                    🎥 {t.videoTitle}
                  </div>
                  <div className="help-card-desc" style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                    {t.videoDesc}
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/community?tab=guides');
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {t.watchVideos}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: How to Use (With Role Filter) */}
          {activeTab === 'howTo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Role filter selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', flexShrink: 0 }}>Filter Role:</span>
                {[
                  { r: 'farmer', label: '🧑‍🌾 Farmer' },
                  { r: 'buyer', label: '🛒 Buyer' },
                  { r: 'supplier', label: '📦 Supplier' },
                  { r: 'lgu_staff', label: '🏛️ LGU Staff' },
                ].map((item) => (
                  <button
                    key={item.r}
                    onClick={() => setRoleFilter(item.r as Role)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '14px',
                      border: 'none',
                      background: roleFilter === item.r ? '#DCFCE7' : '#F1F5F9',
                      color: roleFilter === item.r ? '#15803D' : '#64748B',
                      fontWeight: roleFilter === item.r ? 800 : 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {filteredGuides.length > 0 ? (
                filteredGuides.map((guide) => (
                  <div
                    key={guide.id}
                    className="help-guide-item"
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '24px' }}>{guide.icon}</span>
                      <div className="help-guide-title" style={{ fontWeight: 800, fontSize: '16px', color: '#0E4A27' }}>
                        {guide.title}
                      </div>
                    </div>
                    <div className="help-guide-text" style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5, paddingLeft: '34px' }}>
                      {guide.desc}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748B' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                  <p style={{ margin: 0, fontWeight: 700 }}>No user guides match "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: FAQs */}
          {activeTab === 'faqs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((faq, i) => (
                  <details
                    key={i}
                    open={Boolean(q)}
                    className="help-faq-item"
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      cursor: 'pointer',
                    }}
                  >
                    <summary className="help-faq-summary" style={{ fontWeight: 700, fontSize: '15px', color: '#0E4A27', outline: 'none' }}>
                      {faq.q[lang] || faq.q.en}
                    </summary>
                    <p className="help-faq-answer" style={{ marginTop: '10px', fontSize: '14px', color: '#334155', lineHeight: 1.5, margin: '10px 0 0 0' }}>
                      {faq.a[lang] || faq.a.en}
                    </p>
                  </details>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748B' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                  <p style={{ margin: 0, fontWeight: 700 }}>No FAQs match "{searchQuery}"</p>
                  <button
                    onClick={() => handleStartChatWithRole('super_admin')}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#176B3A',
                      color: '#FFF',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    💬 Ask Support Agent
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Report Issue / Feedback */}
          {activeTab === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Hero Action for Tab 4: Live Tech Support with Super Admin */}
              <div
                style={{
                  padding: '18px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
                  border: '1.5px solid #0284C7',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, background: '#0284C7', color: '#FFFFFF', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>
                      INSTANT HELP
                    </span>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#0C4A6E', marginTop: '4px' }}>
                    🛡️ {t.liveTechTitle}
                  </div>
                  <div style={{ fontSize: '13px', color: '#0369A1', marginTop: '4px', lineHeight: 1.4 }}>
                    {t.liveTechDesc}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartChatWithRole('super_admin')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                    transition: 'all 0.15s ease',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>🛡️</span>
                  <span>Message Super Admin Now</span>
                </button>
              </div>

              {/* Form Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: '#CBD5E1' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  OR SUBMIT A TICKET REPORT
                </span>
                <div style={{ flex: 1, height: '1px', background: '#CBD5E1' }} />
              </div>

              {reportSubmitted ? (
                <div
                  style={{
                    padding: '24px',
                    borderRadius: '14px',
                    background: '#DCFCE7',
                    border: '1px solid #86EFAC',
                    textAlign: 'center',
                    color: '#15803D',
                  }}
                >
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</div>
                  <div style={{ fontSize: '17px', fontWeight: 800 }}>{t.reportSuccess}</div>
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Subject / Issue Type
                    </label>
                    <input
                      type="text"
                      required
                      value={reportSubject}
                      onChange={(e) => setReportSubject(e.target.value)}
                      placeholder="e.g. Price update issue, GCash question, listing error"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #E2E8F0',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Detailed Description
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={reportMessage}
                      onChange={(e) => setReportMessage(e.target.value)}
                      placeholder="Describe what happened or what help you need..."
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #E2E8F0',
                        fontSize: '14px',
                        outline: 'none',
                        resize: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#176B3A',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    Submit Report
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
            AgriConnect Support • Northern Mindanao
          </span>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
