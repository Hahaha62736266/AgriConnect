import React, { useState } from 'react';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'options' | 'howTo' | 'faqs'>('options');
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!isOpen) return null;

  const handleCallSupport = () => {
    navigator.clipboard?.writeText?.('1-800-AGRI-HELP (0917-123-4567)');
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 3000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content help-support-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 className="help-modal-title" style={{ fontSize: '24px', fontWeight: 800, color: '#0E4A27', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>❓</span> Need Help with AgriConnect?
            </h2>
            <p className="help-modal-subtitle" style={{ fontSize: '15px', color: '#6F716C' }}>
              We are here to assist you every step of the way.
            </p>
          </div>
          <button
            onClick={onClose}
            className="help-modal-close-btn"
            style={{
              background: '#F8F7F3',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              color: '#6F716C',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="help-modal-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #E4E2DC', paddingBottom: '10px' }}>
          <button
            onClick={() => setActiveTab('options')}
            className={`help-modal-tab ${activeTab === 'options' ? 'active' : ''}`}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'options' ? '#EAF6EE' : 'transparent',
              color: activeTab === 'options' ? '#176B3A' : '#6F716C',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Contact Options
          </button>
          <button
            onClick={() => setActiveTab('howTo')}
            className={`help-modal-tab ${activeTab === 'howTo' ? 'active' : ''}`}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'howTo' ? '#EAF6EE' : 'transparent',
              color: activeTab === 'howTo' ? '#176B3A' : '#6F716C',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            How to Use
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`help-modal-tab ${activeTab === 'faqs' ? 'active' : ''}`}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'faqs' ? '#EAF6EE' : 'transparent',
              color: activeTab === 'faqs' ? '#176B3A' : '#6F716C',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Frequently Asked Questions
          </button>
        </div>

        {/* Tab 1: Contact Options */}
        {activeTab === 'options' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              className="help-card-hotline"
              style={{
                padding: '20px',
                borderRadius: '16px',
                background: '#EAF6EE',
                border: '2px solid #176B3A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div className="help-card-hotline-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0E4A27' }}>
                  📞 Call Support Hotline
                </div>
                <div className="help-card-hotline-desc" style={{ fontSize: '15px', color: '#222522', marginTop: '4px' }}>
                  Speak directly to our friendly support team. Available 7:00 AM – 7:00 PM daily.
                </div>
                <div className="help-card-hotline-num" style={{ fontSize: '16px', fontWeight: 800, color: '#176B3A', marginTop: '6px' }}>
                  0917-123-4567 (Toll Free)
                </div>
              </div>
              <button onClick={handleCallSupport} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                {copiedPhone ? '✓ Copied!' : 'Call Support'}
              </button>
            </div>

            <div
              className="help-card-item"
              style={{
                padding: '20px',
                borderRadius: '16px',
                background: '#FFFFFF',
                border: '2px solid #E4E2DC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div className="help-card-title" style={{ fontSize: '18px', fontWeight: 800, color: '#222522' }}>
                  💬 Chat with Support Agent
                </div>
                <div className="help-card-desc" style={{ fontSize: '15px', color: '#6F716C', marginTop: '4px' }}>
                  Send us a text message anytime. Average reply time: 5 minutes.
                </div>
              </div>
              <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                Start Chat
              </button>
            </div>

            <div
              className="help-card-item"
              style={{
                padding: '20px',
                borderRadius: '16px',
                background: '#FFFFFF',
                border: '2px solid #E4E2DC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div className="help-card-title" style={{ fontSize: '18px', fontWeight: 800, color: '#222522' }}>
                  🎥 Watch Easy Video Guides
                </div>
                <div className="help-card-desc" style={{ fontSize: '15px', color: '#6F716C', marginTop: '4px' }}>
                  Watch 2-minute video demonstrations in Tagalog and Bisaya.
                </div>
              </div>
              <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                Watch Videos
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: How to Use */}
        {activeTab === 'howTo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="help-guide-item" style={{ padding: '16px', borderRadius: '12px', background: '#F8F7F3', border: '1px solid #E4E2DC' }}>
              <div className="help-guide-title" style={{ fontWeight: 800, fontSize: '17px', color: '#0E4A27' }}>
                1. How to list a crop for sale:
              </div>
              <div className="help-guide-text" style={{ fontSize: '15px', color: '#222522', marginTop: '6px' }}>
                Tap the big green <strong>"+ Add Crop"</strong> button on your dashboard. Type your crop name, price per kilogram, quantity, and tap <strong>"Publish Listing"</strong>.
              </div>
            </div>

            <div className="help-guide-item" style={{ padding: '16px', borderRadius: '12px', background: '#F8F7F3', border: '1px solid #E4E2DC' }}>
              <div className="help-guide-title" style={{ fontWeight: 800, fontSize: '17px', color: '#0E4A27' }}>
                2. How to check daily crop market prices:
              </div>
              <div className="help-guide-text" style={{ fontSize: '15px', color: '#222522', marginTop: '6px' }}>
                Click on <strong>"Market Prices"</strong> in the menu to view official DA market monitoring prices updated daily for Cagayan de Oro and Bukidnon.
              </div>
            </div>

            <div className="help-guide-item" style={{ padding: '16px', borderRadius: '12px', background: '#F8F7F3', border: '1px solid #E4E2DC' }}>
              <div className="help-guide-title" style={{ fontWeight: 800, fontSize: '17px', color: '#0E4A27' }}>
                3. How to check government assistance programs:
              </div>
              <div className="help-guide-text" style={{ fontSize: '15px', color: '#222522', marginTop: '6px' }}>
                Click on <strong>"Government Programs"</strong> to view rice farmer cash assistance, fertilizer subsidies, and equipment grants.
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: FAQs */}
        {activeTab === 'faqs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <details className="help-faq-item" style={{ padding: '14px', borderRadius: '10px', background: '#F8F7F3', border: '1px solid #E4E2DC', cursor: 'pointer' }}>
              <summary className="help-faq-summary" style={{ fontWeight: 700, fontSize: '16px', color: '#0E4A27' }}>
                Is AgriConnect free for farmers to use?
              </summary>
              <p className="help-faq-answer" style={{ marginTop: '8px', fontSize: '15px', color: '#222522' }}>
                Yes! AgriConnect is 100% free for all registered Filipino farmers. There are no listing fees or hidden charges.
              </p>
            </details>

            <details className="help-faq-item" style={{ padding: '14px', borderRadius: '10px', background: '#F8F7F3', border: '1px solid #E4E2DC', cursor: 'pointer' }}>
              <summary className="help-faq-summary" style={{ fontWeight: 700, fontSize: '16px', color: '#0E4A27' }}>
                How do I get the "✓ Verified Farmer" badge?
              </summary>
              <p className="help-faq-answer" style={{ marginTop: '8px', fontSize: '15px', color: '#222522' }}>
                Upload your RSBSA ID number or LGU Farmer Certification in your Settings page. Your local agriculture office will verify your record within 24 hours.
              </p>
            </details>

            <details className="help-faq-item" style={{ padding: '14px', borderRadius: '10px', background: '#F8F7F3', border: '1px solid #E4E2DC', cursor: 'pointer' }}>
              <summary className="help-faq-summary" style={{ fontWeight: 700, fontSize: '16px', color: '#0E4A27' }}>
                Can I receive cash payments on delivery (COD)?
              </summary>
              <p className="help-faq-answer" style={{ marginTop: '8px', fontSize: '15px', color: '#222522' }}>
                Yes! Buyers can pay via Cash on Delivery (COD), GCash, or direct bank transfer upon receiving your harvest.
              </p>
            </details>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
