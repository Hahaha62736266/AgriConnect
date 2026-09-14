import React, { useState, useEffect, useRef } from 'react';
import { apiClient, getImageUrl } from '../api';
import { programApi } from '../api/program';
import type { ProgramApplication, ApplicationStatus } from '../types/program';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

interface UnifiedProgram {
  id: string;
  title: string;
  organization: string;
  description: string;
  imageUrl?: string;
  municipality?: string;
  province?: string;
  region?: string;
  deadline: string;
  deadlineDate?: Date;
  isExpired?: boolean;
  eligible: boolean;
  category: string;
  criteria?: string[];
  requiredDocs?: string[];
}

const samplePrograms: UnifiedProgram[] = [
  {
    id: 'prog-1',
    title: 'Rice Farmer Cash Assistance (RFFA)',
    organization: 'Department of Agriculture (DA)',
    description: 'Direct cash subsidy of ₱5,000 for smallholder rice farmers owning 2 hectares or less.',
    municipality: 'Malaybalay City',
    deadline: 'October 15, 2026',
    deadlineDate: new Date('2026-10-15T00:00:00Z'),
    isExpired: false,
    eligible: true,
    category: 'For You',
    criteria: ['Registered in RSBSA (Registry System for Basic Sectors in Agriculture)', 'Smallholder rice farmer (2 hectares or less)', 'Farming in covered provincial municipality'],
    requiredDocs: ['RSBSA Card / Certificate / Stub', 'Valid Government-issued ID'],
  },
  {
    id: 'prog-2',
    title: 'Corn Seed & Fertilizer Discount Voucher',
    organization: 'DA Region X - Northern Mindanao',
    description: 'Discount vouchers worth up to ₱3,000 for hybrid yellow corn seeds and inorganic fertilizer.',
    municipality: 'Malaybalay City',
    deadline: 'September 30, 2026',
    deadlineDate: new Date('2026-09-30T00:00:00Z'),
    isExpired: false,
    eligible: true,
    category: 'For You',
    criteria: ['Registered in RSBSA', 'Yellow or White Corn producer', 'Active farmer association member'],
    requiredDocs: ['RSBSA Enrollment stub', 'Barangay Certification of Farming'],
  },
  {
    id: 'prog-3',
    title: 'Solar-Powered Irrigation System (SPIS) Grant',
    organization: 'Bukidnon Provincial Agriculture Office',
    description: 'Free community solar irrigation installation for accredited farmer associations in Bukidnon.',
    municipality: 'Valencia City',
    deadline: 'November 1, 2026',
    deadlineDate: new Date('2026-11-01T00:00:00Z'),
    isExpired: false,
    eligible: false,
    category: 'Available',
    criteria: ['Accredited Farmer Cooperative or Irrigators Association', 'RSBSA registered members'],
    requiredDocs: ['Association RSBSA Masterlist', 'Sec / CDA Registration'],
  },
];

const getProgramImage = (title: string, index: number): string => {
  const t = (title || '').toLowerCase();
  if (t.includes('rice') || t.includes('puhunan') || t.includes('cash') || t.includes('rffa') || t.includes('palay')) {
    return index % 2 === 0
      ? 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=600&q=80'
      : 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('equipment') || t.includes('machinery') || t.includes('irrigation') || t.includes('spis') || t.includes('tractor')) {
    return 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=600&q=80';
  }
  if (t.includes('organic') || t.includes('seed') || t.includes('fertilizer') || t.includes('corn')) {
    return 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=600&q=80';
  }
  const fallbackList = [
    'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80',
  ];
  return fallbackList[index % fallbackList.length];
};

export const GovernmentProgramsPage: React.FC = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [selectedCat, setSelectedCat] = useState('All Programs');
  const [searchQuery, setSearchQuery] = useState('');
  const [municipalityScope, setMunicipalityScope] = useState<'my_municipality' | 'all'>(
    user?.municipality ? 'my_municipality' : 'all'
  );
  const [programs, setPrograms] = useState<UnifiedProgram[]>(samplePrograms);
  const [loading, setLoading] = useState(false);

  // Farmer Applications State & Lookup Map
  const [myApplications, setMyApplications] = useState<ProgramApplication[]>([]);
  const [appliedMap, setAppliedMap] = useState<Record<string, ProgramApplication>>({});
  const [trackingApp, setTrackingApp] = useState<{ program: UnifiedProgram; application: ProgramApplication } | null>(null);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  // Modals
  const [selectedProgram, setSelectedProgram] = useState<UnifiedProgram | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Application Form State
  const [rsbsaNumber, setRsbsaNumber] = useState('');
  const [farmSizeHectares, setFarmSizeHectares] = useState('1.5');
  const [cropsGrown, setCropsGrown] = useState('Rice (Palay)');
  const [remarks, setRemarks] = useState('');

  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successApp, setSuccessApp] = useState<{
    progTitle: string;
    refId: string;
    program?: UnifiedProgram;
    application?: ProgramApplication;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load programs from backend if available
  useEffect(() => {
    const fetchPrograms = async () => {
      setLoading(true);
      try {
        const backendPrograms = await programApi.listPrograms();
        if (backendPrograms && backendPrograms.length > 0) {
          const mapped: UnifiedProgram[] = backendPrograms.map((p) => {
            const rawDeadline = p.deadline ? new Date(p.deadline) : null;
            const isPast = rawDeadline ? rawDeadline.getTime() < Date.now() : false;
            return {
              id: p.id,
              title: p.title,
              organization: p.agency || 'Department of Agriculture',
              description: p.description,
              imageUrl: p.imageUrl,
              municipality: p.municipality || 'All Municipalities',
              province: p.province,
              region: p.region,
              deadline: rawDeadline ? rawDeadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Open',
              deadlineDate: rawDeadline || undefined,
              isExpired: isPast,
              eligible: true,
              category: isPast ? 'Past / Closed' : 'Available',
              criteria: p.eligibilityCriteria && p.eligibilityCriteria.length > 0 ? p.eligibilityCriteria : ['Registered in RSBSA', 'Smallholder farmer'],
              requiredDocs: p.requiredDocuments && p.requiredDocuments.length > 0 ? p.requiredDocuments : ['RSBSA Card / Stub', 'Valid Government ID'],
            };
          });

          setPrograms(mapped);
        } else {
          setPrograms(samplePrograms);
        }
      } catch (err) {
        console.warn('Using local government programs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  // Fetch current farmer's applications
  useEffect(() => {
    const fetchMyApps = async () => {
      if (user?.role !== 'farmer') return;
      try {
        const apps = await programApi.listMyApplications();
        const map: Record<string, ProgramApplication> = {};
        const mergedList: ProgramApplication[] = [...apps];

        apps.forEach((a) => {
          if (a.programId) {
            map[a.programId] = a;
          }
        });

        // Merge offline / cached local applications if any
        try {
          const stored = localStorage.getItem(`agriconnect_applied_programs_${user.id}`);
          if (stored) {
            const localApps: ProgramApplication[] = JSON.parse(stored);
            localApps.forEach((la) => {
              if (!map[la.programId]) {
                map[la.programId] = la;
                mergedList.push(la);
              }
            });
          }
        } catch (e) { }

        setMyApplications(mergedList);
        setAppliedMap(map);
      } catch (err) {
        console.warn('Could not fetch farmer applications from server, using local cache:', err);
        try {
          const stored = localStorage.getItem(`agriconnect_applied_programs_${user?.id}`);
          if (stored) {
            const localApps: ProgramApplication[] = JSON.parse(stored);
            const map: Record<string, ProgramApplication> = {};
            localApps.forEach((la) => { map[la.programId] = la; });
            setMyApplications(localApps);
            setAppliedMap(map);
          }
        } catch (e) { }
      }
    };

    fetchMyApps();
  }, [user?.id, user?.role]);

  // Helper formatting for statuses
  const getStatusLabel = (status: ApplicationStatus) => {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'under_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Not Approved';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case 'submitted':
        return '📋';
      case 'under_review':
        return '⏳';
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getStatusBadgeStyles = (status: ApplicationStatus): React.CSSProperties => {
    switch (status) {
      case 'submitted':
        return { background: '#FEF3C7', color: '#92400E', border: '1.5px solid #FDE68A' };
      case 'under_review':
        return { background: '#EEF2FF', color: '#4338CA', border: '1.5px solid #C7D2FE' };
      case 'approved':
        return { background: '#ECFDF5', color: '#065F46', border: '1.5px solid #A7F3D0' };
      case 'rejected':
        return { background: '#FFF1F2', color: '#9F1239', border: '1.5px solid #FECDD3' };
      default:
        return { background: '#F1F5F9', color: '#475569', border: '1.5px solid #CBD5E1' };
    }
  };

  const getStatusButtonStyles = (status: ApplicationStatus): React.CSSProperties => {
    switch (status) {
      case 'approved':
        return { background: '#166534', color: '#FFFFFF', border: 'none', boxShadow: '0 3px 10px rgba(22, 101, 52, 0.25)' };
      case 'rejected':
        return { background: '#BE123C', color: '#FFFFFF', border: 'none', boxShadow: '0 3px 10px rgba(190, 18, 60, 0.25)' };
      case 'under_review':
        return { background: '#4338CA', color: '#FFFFFF', border: 'none', boxShadow: '0 3px 10px rgba(67, 56, 202, 0.25)' };
      case 'submitted':
      default:
        return { background: '#0E4A27', color: '#FFFFFF', border: 'none', boxShadow: '0 3px 10px rgba(14, 74, 39, 0.2)' };
    }
  };

  const categories = [
    'All Programs',
    ...(user?.role === 'farmer' ? [`My Applications${myApplications.length > 0 ? ` (${myApplications.length})` : ''}`] : []),
    'Available',
    'For You',
    'Ending Soon',
    'Past / Closed',
  ];

  const filteredPrograms = programs.filter((prog) => {
    // 0. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (prog.title || '').toLowerCase().includes(q);
      const matchDesc = (prog.description || '').toLowerCase().includes(q);
      const matchOrg = (prog.organization || '').toLowerCase().includes(q);
      const matchMun = (prog.municipality || '').toLowerCase().includes(q);
      const matchCriteria = prog.criteria?.some((c) => c.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchOrg && !matchMun && !matchCriteria) {
        return false;
      }
    }

    // 1. Check "My Applications" tab
    if (selectedCat.startsWith('My Applications')) {
      return !!appliedMap[prog.id];
    }

    // 2. Municipality filter
    if (municipalityScope === 'my_municipality' && user?.municipality) {
      const userMun = user.municipality.trim().toLowerCase();
      const progMun = (prog.municipality || '').trim().toLowerCase();
      const isMatch = !progMun || progMun === 'all municipalities' || progMun === 'all' || progMun === userMun;
      if (!isMatch) return false;
    }

    // 3. Category filter
    if (selectedCat === 'All Programs') return true;
    if (selectedCat === 'Available') return !prog.isExpired;
    if (selectedCat === 'For You') return prog.eligible && !prog.isExpired;
    if (selectedCat === 'Ending Soon') {
      if (prog.isExpired || !prog.deadlineDate) return false;
      const daysLeft = (prog.deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft >= 0 && daysLeft <= 14;
    }
    if (selectedCat === 'Past / Closed') return prog.isExpired;
    return prog.category === selectedCat;
  });

  const isOutOfJurisdiction = (prog: UnifiedProgram) => {
    if (!user?.municipality || !prog.municipality) return false;
    const userMun = user.municipality.trim().toLowerCase();
    const progMun = prog.municipality.trim().toLowerCase();
    return progMun !== '' && progMun !== 'all' && progMun !== 'all municipalities' && userMun !== progMun;
  };

  const handleOpenDetails = (prog: UnifiedProgram) => {
    setSelectedProgram(prog);
    setIsApplying(false);
    setErrorMsg(null);
  };

  const handleOpenTracking = (prog: UnifiedProgram, app: ProgramApplication) => {
    setTrackingApp({ program: prog, application: app });
    setSelectedProgram(null);
    setIsApplying(false);
  };

  const handleStartApply = (prog: UnifiedProgram) => {
    const existingApp = appliedMap[prog.id];
    if (existingApp) {
      handleOpenTracking(prog, existingApp);
      return;
    }

    if (isOutOfJurisdiction(prog)) {
      toastError(
        'Out of Jurisdiction',
        `You cannot apply for this program. It is exclusively for farmers registered in ${prog.municipality} (your registered location is ${user?.municipality || 'different'}).`
      );
      return;
    }
    setSelectedProgram(prog);
    setIsApplying(true);
    setErrorMsg(null);
    setSuccessApp(null);
    setImageFile(null);
    setImagePreview('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 10MB.');
      return;
    }

    setErrorMsg(null);
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) return;

    if (!rsbsaNumber.trim()) {
      setErrorMsg('Please enter your RSBSA registration reference number.');
      return;
    }

    if (!imageFile && !imagePreview) {
      setErrorMsg('Please attach a clear photo of your RSBSA Card, Stub, or Certificate.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      let uploadedUrl = '';

      // Upload image to backend if a file was selected
      if (imageFile) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', imageFile);

        try {
          const uploadRes = await apiClient.post<{ url: string }>('/api/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          uploadedUrl = uploadRes.data.url;
        } catch (uploadErr: any) {
          console.warn('Backend upload encountered error, fallback to data URL:', uploadErr);
          uploadedUrl = imagePreview; // Fallback to base64 preview if offline
        } finally {
          setUploadingImage(false);
        }
      } else {
        uploadedUrl = imagePreview;
      }

      const submittedDocs = ['RSBSA Card / Stub Photo'];
      if (uploadedUrl) {
        submittedDocs.push(uploadedUrl);
      }
      if (remarks.trim()) {
        submittedDocs.push(`Farmer Remarks: ${remarks.trim()}`);
      }

      const payload = {
        rsbsaNumber: rsbsaNumber.trim(),
        farmSizeHectares: parseFloat(farmSizeHectares) || 1.0,
        cropsGrown: cropsGrown.split(',').map((c) => c.trim()).filter(Boolean),
        submittedDocs,
      };

      // Try submitting to backend API if it's a real backend ObjectID
      let createdApp: ProgramApplication | null = null;
      if (selectedProgram.id && selectedProgram.id.length === 24) {
        try {
          createdApp = await programApi.submitApplication(selectedProgram.id, payload);
        } catch (apiErr) {
          console.warn('Backend API submission returned error:', apiErr);
          throw apiErr;
        }
      }

      const newApplication: ProgramApplication = createdApp || {
        id: `app-local-${Date.now()}`,
        programId: selectedProgram.id,
        farmerId: user?.id || 'farmer-current',
        farmerName: `${user?.firstName || 'Farmer'} ${user?.lastName || ''}`.trim(),
        farmerPhone: user?.phone,
        farmerMunicipality: user?.municipality,
        farmSizeHectares: parseFloat(farmSizeHectares) || 1.0,
        cropsGrown: cropsGrown.split(',').map((c) => c.trim()).filter(Boolean),
        rsbsaNumber: rsbsaNumber.trim(),
        submittedDocs,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        programTitle: selectedProgram.title,
      };

      setAppliedMap((prev) => ({ ...prev, [selectedProgram.id]: newApplication }));
      setMyApplications((prev) => {
        const next = [newApplication, ...prev.filter((a) => a.programId !== selectedProgram.id)];
        if (user?.id) {
          try {
            localStorage.setItem(`agriconnect_applied_programs_${user.id}`, JSON.stringify(next));
          } catch (e) { }
        }
        return next;
      });

      // Show success modal state
      const refCode = newApplication.id.startsWith('app-local') || newApplication.id.startsWith('app-')
        ? `APP-${Math.floor(100000 + Math.random() * 900000)}`
        : `APP-${newApplication.id.slice(-6).toUpperCase()}`;

      setSuccessApp({
        progTitle: selectedProgram.title,
        refId: refCode,
        program: selectedProgram,
        application: newApplication,
      });
      toastSuccess('Applied Successfully!', `Application for "${selectedProgram.title}" submitted to LGU.`);
    } catch (err: any) {
      console.error('Submission failed:', err);
      const errMsg = err.response?.data?.error || err.message || 'Failed to submit application. Please try again.';
      setErrorMsg(errMsg);
      toastError('Application Failed', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-container" style={{ paddingBottom: '40px' }}>
      {/* ─── Page Header ─── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '26px' }}>🏛️</span>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
            Government Cash Assistance & Grants
          </h1>
        </div>
        <p style={{ fontSize: '18px', color: '#525450', marginTop: '4px', maxWidth: '800px' }}>
          Official government programs offering cash subsidies, fertilizer vouchers, fuel assistance, and irrigation grants for registered Filipino farmers.
        </p>
      </div>

      {/* ─── RSBSA Verification Notice Banner ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '16px 20px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #F0FDF4 0%, #E8F5E9 100%)',
          border: '1.5px solid #86EFAC',
          marginBottom: '28px',
        }}
      >
        <div style={{ fontSize: '28px', flexShrink: 0 }}>📋</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#14532D', marginBottom: '2px' }}>
            RSBSA Registration Required for All DA Programs
          </div>
          <div style={{ fontSize: '14px', color: '#166534', lineHeight: 1.4 }}>
            Prepare a clear photo or copy of your <strong>RSBSA Card / Stub</strong> or Farmers Registry Certificate before applying. Your Municipal Agriculture Office cross-checks this document during evaluation.
          </div>
        </div>
      </div>

      {/* ─── Search & Municipality Scope Filter Bar ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          background: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: '16px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
          marginBottom: '22px',
        }}
      >
        {/* Left: Search Bar */}
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '440px' }}>
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '15px',
              color: '#94A3B8',
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search programs, subsidies, seeds, fertilizer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '12px',
              border: '1.5px solid #CBD5E1',
              fontSize: '14px',
              color: '#1E293B',
              outline: 'none',
              boxSizing: 'border-box',
              background: '#F8FAFC',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#E2E8F0',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                cursor: 'pointer',
                color: '#64748B',
                minHeight: 'unset',
                padding: 0,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: Location Scope Toggle & Result Counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
            {filteredPrograms.length} {filteredPrograms.length === 1 ? 'Program' : 'Programs'}
          </span>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {user?.municipality && (
              <button
                onClick={() => setMunicipalityScope('my_municipality')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${municipalityScope === 'my_municipality' ? '#166534' : '#CBD5E1'}`,
                  background: municipalityScope === 'my_municipality' ? '#F0FDF4' : '#FFFFFF',
                  color: municipalityScope === 'my_municipality' ? '#166534' : '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  minHeight: 'unset',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                📍 My Town ({user.municipality})
              </button>
            )}
            <button
              onClick={() => setMunicipalityScope('all')}
              style={{
                padding: '7px 14px',
                borderRadius: '10px',
                border: `1.5px solid ${municipalityScope === 'all' ? '#166534' : '#CBD5E1'}`,
                background: municipalityScope === 'all' ? '#F0FDF4' : '#FFFFFF',
                color: municipalityScope === 'all' ? '#166534' : '#475569',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                minHeight: 'unset',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              🌐 All Municipalities
            </button>
          </div>
        </div>
      </div>

      {/* ─── Category Filter Tabs ─── */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '28px', paddingBottom: '4px' }}>
        {categories.map((cat) => {
          const isSelected = selectedCat === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              style={{
                padding: '8px 20px',
                borderRadius: '24px',
                border: `1.5px solid ${isSelected ? '#166534' : '#E2E8F0'}`,
                background: isSelected ? '#166534' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#334155',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                minHeight: 'unset',
                height: '40px',
                boxShadow: isSelected ? '0 2px 8px rgba(22, 101, 52, 0.25)' : 'none',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ─── Program Cards Feed ─── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748B' }}>
          Loading official government programs...
        </div>
      ) : selectedCat.startsWith('My Applications') && filteredPrograms.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 24px',
            background: '#FFFFFF',
            borderRadius: '24px',
            border: '2px dashed #CBD5E1',
            margin: '20px 0',
          }}
        >
          <div style={{ fontSize: '50px', marginBottom: '14px' }}>🌾</div>
          <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0E4A27', marginBottom: '8px' }}>
            No Submitted Applications Yet
          </h3>
          <p style={{ fontSize: '15px', color: '#64748B', maxWidth: '480px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
            You haven't submitted any applications for agricultural assistance programs yet. Browse our open government programs and apply using your RSBSA credentials!
          </p>
          <button
            onClick={() => setSelectedCat('All Programs')}
            className="btn btn-primary"
            style={{ padding: '12px 28px', borderRadius: '12px', fontWeight: 700, fontSize: '15px' }}
          >
            Explore All Programs →
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '22px' }}>
          {filteredPrograms.map((prog, idx) => {
            const myApp = appliedMap[prog.id];
            const progImg = prog.imageUrl ? getImageUrl(prog.imageUrl) : getProgramImage(prog.title, idx);
            return (
              <div
                key={prog.id}
                className="card card-interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '18px',
                  border: myApp
                    ? myApp.status === 'approved'
                      ? '1.5px solid #86EFAC'
                      : myApp.status === 'rejected'
                        ? '1.5px solid #FECDD3'
                        : '1.5px solid #FDE68A'
                    : '1.5px solid #E2E8F0',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
                  background: '#FFFFFF',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Visual Cover Photo Banner */}
                <div style={{ position: 'relative', height: '150px', width: '100%', overflow: 'hidden', background: '#E2E8F0' }}>
                  <img
                    src={progImg}
                    alt={prog.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.4s ease',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.22) 100%)',
                    }}
                  />

                  {/* Status Badges floating over image */}
                  <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap', zIndex: 1 }}>
                    {myApp ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          ...getStatusBadgeStyles(myApp.status),
                        }}
                      >
                        {getStatusIcon(myApp.status)} Applied ({getStatusLabel(myApp.status)})
                      </span>
                    ) : prog.isExpired ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: 'rgba(241, 245, 249, 0.95)',
                          backdropFilter: 'blur(4px)',
                          color: '#64748B',
                          border: '1px solid #CBD5E1',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      >
                        ⛔ Closed
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: 'rgba(220, 252, 231, 0.95)',
                          backdropFilter: 'blur(4px)',
                          color: '#15803D',
                          border: '1px solid #86EFAC',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      >
                        ACTIVE
                      </span>
                    )}

                    {prog.eligible && !myApp && !prog.isExpired && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 9px',
                          borderRadius: '20px',
                          background: 'rgba(219, 234, 254, 0.95)',
                          backdropFilter: 'blur(4px)',
                          color: '#1E40AF',
                          border: '1px solid #93C5FD',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      >
                        ✓ Pre-Qualified
                      </span>
                    )}
                  </div>

                  {/* Location Tag on top right */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.94)',
                      backdropFilter: 'blur(6px)',
                      color: '#0F172A',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      borderRadius: '20px',
                      padding: '3px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      zIndex: 1,
                    }}
                  >
                    <span>📍</span>
                    <span>{prog.municipality || 'All Municipalities'}</span>
                  </div>
                </div>

                {/* Card Content Body */}
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Managing Agency */}
                  <div style={{ marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#166534',
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      🏛️ {prog.organization}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    title={prog.title}
                    style={{
                      fontSize: '17px',
                      fontWeight: 800,
                      color: '#0E4A27',
                      margin: '2px 0 6px 0',
                      lineHeight: 1.35,
                      height: '46px',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {prog.title}
                  </h3>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#475569',
                      lineHeight: 1.5,
                      margin: '0 0 14px 0',
                      height: '40px',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {prog.description}
                  </p>

                  {/* Requirements / Criteria Chips */}
                  <div style={{ marginBottom: '14px', marginTop: 'auto' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                      Key Requirements:
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#F1F5F9', color: '#334155', fontWeight: 600 }}>
                        🆔 RSBSA Registration
                      </span>
                      {prog.criteria && prog.criteria.length > 1 ? (
                        <span
                          title={prog.criteria[1]}
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#F1F5F9',
                            color: '#334155',
                            fontWeight: 600,
                            maxWidth: '180px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          🌾 {prog.criteria[1]}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#F1F5F9', color: '#334155', fontWeight: 600 }}>
                          🌾 Smallholder
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Deadline Notice */}
                  <div style={{ marginBottom: '16px' }}>
                    {prog.isExpired ? (
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>⛔</span>
                        <span>Deadline Passed: {prog.deadline} (Closed)</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#B91C1C', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>⏳</span>
                        <span>Application Deadline: {prog.deadline}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleOpenDetails(prog)}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '9px 12px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', minHeight: 'unset', height: '38px' }}
                    >
                      Details
                    </button>
                    {myApp ? (
                      <button
                        onClick={() => handleOpenTracking(prog, myApp)}
                        style={{
                          flex: 1.6,
                          padding: '9px 12px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          minHeight: 'unset',
                          height: '38px',
                          ...getStatusButtonStyles(myApp.status),
                        }}
                      >
                        <span>{getStatusIcon(myApp.status)} View Status ↗</span>
                      </button>
                    ) : prog.isExpired ? (
                      <button
                        disabled
                        style={{
                          flex: 1.6,
                          padding: '9px 12px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '13px',
                          background: '#F1F5F9',
                          color: '#94A3B8',
                          border: '1px solid #E2E8F0',
                          cursor: 'not-allowed',
                          minHeight: 'unset',
                          height: '38px',
                        }}
                      >
                        Closed
                      </button>
                    ) : isOutOfJurisdiction(prog) ? (
                      <button
                        disabled
                        title={`This program is exclusively for farmers registered in ${prog.municipality}.`}
                        style={{
                          flex: 1.6,
                          padding: '9px 12px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '12px',
                          background: '#FEF3C7',
                          color: '#92400E',
                          border: '1px solid #FCD34D',
                          cursor: 'not-allowed',
                          minHeight: 'unset',
                          height: '38px',
                        }}
                      >
                        🔒 {prog.municipality} Only
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartApply(prog)}
                        className="btn btn-primary"
                        style={{
                          flex: 1.6,
                          padding: '9px 12px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '13px',
                          minHeight: 'unset',
                          height: '38px',
                          boxShadow: '0 2px 8px rgba(14, 74, 39, 0.25)',
                        }}
                      >
                        Apply Now →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Program Details Modal ─── */}
      {selectedProgram && !isApplying && !successApp && (
        <div className="modal-backdrop" onClick={() => setSelectedProgram(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', borderRadius: '24px', padding: '28px', overflow: 'hidden' }}>
            {/* Modal Cover Image Banner */}
            <div style={{ position: 'relative', height: '170px', borderRadius: '16px', overflow: 'hidden', marginBottom: '22px', background: '#E2E8F0' }}>
              <img
                src={selectedProgram.imageUrl ? getImageUrl(selectedProgram.imageUrl) : getProgramImage(selectedProgram.title, 0)}
                alt={selectedProgram.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.4) 100%)',
                }}
              />
              {/* Close button on top right */}
              <button
                onClick={() => setSelectedProgram(null)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(6px)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  minHeight: 'unset',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                ✕
              </button>
              {/* Floating badges on photo banner bottom */}
              <div style={{ position: 'absolute', bottom: '12px', left: '14px', right: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#166534',
                    backdropFilter: 'blur(4px)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  🏛️ {selectedProgram.organization}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#0F172A',
                    backdropFilter: 'blur(4px)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  📍 {selectedProgram.municipality || 'All Municipalities'}
                </span>
              </div>
            </div>

            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27', marginBottom: '14px', lineHeight: 1.3 }}>
              {selectedProgram.title}
            </h2>

            <p style={{ fontSize: '16px', color: '#334155', lineHeight: 1.6, marginBottom: '24px' }}>
              {selectedProgram.description}
            </p>

            {/* Application Status Banner (if already applied) */}
            {(() => {
              const myApp = appliedMap[selectedProgram.id];
              return myApp ? (
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: '16px',
                    marginBottom: '22px',
                    ...getStatusBadgeStyles(myApp.status),
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', opacity: 0.85 }}>
                        Your Application Status
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{getStatusIcon(myApp.status)}</span>
                        <span>{getStatusLabel(myApp.status)}</span>
                      </div>
                      <div style={{ fontSize: '13px', marginTop: '3px', opacity: 0.9 }}>
                        Submitted on {new Date(myApp.submittedAt || myApp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {myApp.rsbsaNumber ? ` · RSBSA: ${myApp.rsbsaNumber}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const p = selectedProgram;
                        const a = myApp;
                        setSelectedProgram(null);
                        handleOpenTracking(p, a);
                      }}
                      className="btn btn-primary"
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 800,
                      }}
                    >
                      Track Status ↗
                    </button>
                  </div>
                  {myApp.remarks && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed rgba(0,0,0,0.15)', fontSize: '13px' }}>
                      <strong>LGU Officer Note:</strong> <em>"{myApp.remarks}"</em>
                    </div>
                  )}
                </div>
              ) : null;
            })()}

            {isOutOfJurisdiction(selectedProgram) && (
              <div style={{ padding: '14px 18px', borderRadius: '14px', background: '#FEF3C7', border: '1.5px solid #FCD34D', color: '#92400E', fontSize: '13px', fontWeight: 600, marginBottom: '22px', lineHeight: 1.5 }}>
                ⚠️ <strong>Jurisdiction Restriction:</strong> This subsidy is exclusively reserved for farmers with registered farm parcels in <strong>{selectedProgram.municipality}</strong>. Your account is registered in <strong>{user?.municipality || 'another municipality'}</strong>.
              </div>
            )}

            <div style={{ padding: '20px', borderRadius: '16px', background: '#EAF6EE', border: '1.5px solid #176B3A', marginBottom: '24px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#176B3A', marginBottom: '8px' }}>
                ✓ Eligibility Criteria:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '15px', color: '#1A1C1A', lineHeight: 1.7 }}>
                {selectedProgram.criteria?.map((c, idx) => (
                  <li key={idx}>{c}</li>
                )) || (
                    <>
                      <li>Must be registered in the RSBSA (Registry System for Basic Sectors in Agriculture)</li>
                      <li>Must have active farming parcel in covered municipality</li>
                    </>
                  )}
              </ul>
            </div>

            <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '28px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                📄 Required Documents to Upload:
              </div>
              <div style={{ fontSize: '14px', color: '#0F172A' }}>
                • <strong>RSBSA Card / Official Stub Photo (Required)</strong><br />
                • Valid Government ID or Barangay Farmer Certificate
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px' }}>
              <button onClick={() => setSelectedProgram(null)} className="btn btn-secondary btn-large" style={{ flex: 1, borderRadius: '12px' }}>
                Close
              </button>
              {appliedMap[selectedProgram.id] ? (
                <button
                  onClick={() => {
                    const p = selectedProgram;
                    const a = appliedMap[p.id];
                    setSelectedProgram(null);
                    handleOpenTracking(p, a);
                  }}
                  className="btn btn-primary btn-large"
                  style={{ flex: 2, borderRadius: '12px', fontWeight: 800 }}
                >
                  Track Application Status ↗
                </button>
              ) : isOutOfJurisdiction(selectedProgram) ? (
                <button
                  disabled
                  className="btn btn-secondary btn-large"
                  style={{ flex: 2, borderRadius: '12px', opacity: 0.6, cursor: 'not-allowed', fontWeight: 700 }}
                >
                  🔒 Ineligible ({selectedProgram.municipality} Only)
                </button>
              ) : (
                <button
                  onClick={() => handleStartApply(selectedProgram)}
                  className="btn btn-primary btn-large"
                  style={{ flex: 2, borderRadius: '12px', fontWeight: 800 }}
                >
                  Proceed to Apply →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Interactive Application Modal with RSBSA Card Upload ─── */}
      {selectedProgram && isApplying && !successApp && (
        <div className="modal-backdrop" onClick={() => setIsApplying(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px', padding: '32px' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-info" style={{ fontSize: '13px' }}>
                  🏛️ {selectedProgram.organization}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                  Deadline: {selectedProgram.deadline}
                </span>
              </div>
              <button
                onClick={() => setIsApplying(false)}
                style={{
                  background: '#F8F7F3',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  minHeight: 'unset',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0E4A27', marginBottom: '6px' }}>
              Apply: {selectedProgram.title}
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '22px' }}>
              Please fill in your farm details and attach a clear image of your RSBSA card or stub for LGU verification.
            </p>

            {errorMsg && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #F87171',
                  color: '#991B1B',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '20px',
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitApplication}>
              {/* RSBSA ID Number */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                  RSBSA ID Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10-13-12-001-000456"
                  value={rsbsaNumber}
                  onChange={(e) => setRsbsaNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '15px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  Enter your unique RSBSA number from your Registry stub or Municipal Agriculture Office record.
                </div>
              </div>

              {/* Farm Size & Crops Grown (2 columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                    Farm Size (Hectares) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="e.g. 1.5"
                    value={farmSizeHectares}
                    onChange={(e) => setFarmSizeHectares(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '15px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                    Primary Crops Grown *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rice, Yellow Corn"
                    value={cropsGrown}
                    onChange={(e) => setCropsGrown(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '15px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* RSBSA Card Photo Attachment (MANDATORY) */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                  📷 Attach RSBSA Card / Stub Photo *
                </label>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 10px 0' }}>
                  Take a photo or upload an image of your RSBSA ID card, certificate, or official registry stub.
                </p>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  style={{ display: 'none' }}
                />

                {!imagePreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #94A3B8',
                      borderRadius: '16px',
                      padding: '28px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: '#F8FAFC',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#176B3A')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#94A3B8')}
                  >
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>🪪</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                      Click to Upload RSBSA Card Photo
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748B' }}>
                      Supports PNG, JPG, or WEBP (Max 10MB)
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '2px solid #86EFAC',
                      background: '#F0FDF4',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img
                        src={imagePreview}
                        alt="RSBSA Card Preview"
                        style={{
                          width: '140px',
                          height: '95px',
                          objectFit: 'cover',
                          borderRadius: '10px',
                          border: '1px solid #CBD5E1',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#166534', marginBottom: '4px' }}>
                          ✓ RSBSA Document Attached
                        </div>
                        <div style={{ fontSize: '13px', color: '#475569', marginBottom: '10px' }}>
                          {imageFile?.name || 'RSBSA_Card_Photo.png'}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Change Photo
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #FCA5A5',
                              background: '#FEF2F2',
                              color: '#991B1B',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Special Remarks / Notes */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                  Remarks / Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Member of Barangay Patpat Farmers Cooperative..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsApplying(false)}
                  disabled={submitting}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '16px' }}
                >
                  {submitting || uploadingImage ? 'Submitting Application...' : '🚀 Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Application Submitted Success Modal ─── */}
      {successApp && (
        <div className="modal-backdrop" onClick={() => { setSuccessApp(null); setSelectedProgram(null); setIsApplying(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '24px', padding: '36px', textAlign: 'center' }}>
            <div style={{ fontSize: '54px', marginBottom: '14px' }}>🎉</div>

            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0E4A27', marginBottom: '8px' }}>
              Application Submitted!
            </h2>

            <p style={{ fontSize: '16px', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
              Your application for <strong>{successApp.progTitle}</strong> has been received by the Municipal Agriculture Office.
            </p>

            <div style={{ padding: '16px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '4px' }}>Application Reference:</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#176B3A', fontFamily: 'monospace' }}>
                {successApp.refId}
              </div>
              <div style={{ marginTop: '10px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: '#DBEAFE', color: '#1E40AF', fontSize: '13px', fontWeight: 700 }}>
                  ● Status: Submitted (Awaiting LGU Review)
                </span>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, marginBottom: '28px' }}>
              The LGU Agriculture Officer will inspect your attached <strong>RSBSA Card</strong> and contact you via phone once your verification is completed.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {successApp.program && successApp.application && (
                <button
                  onClick={() => {
                    const prog = successApp.program!;
                    const app = successApp.application!;
                    setSuccessApp(null);
                    setSelectedProgram(null);
                    setIsApplying(false);
                    handleOpenTracking(prog, app);
                  }}
                  className="btn btn-primary btn-large btn-full"
                  style={{ borderRadius: '12px', fontWeight: 800, fontSize: '15px' }}
                >
                  Track Application Status ↗
                </button>
              )}
              <button
                onClick={() => { setSuccessApp(null); setSelectedProgram(null); setIsApplying(false); }}
                className="btn btn-secondary btn-large btn-full"
                style={{ borderRadius: '12px', fontWeight: 700, fontSize: '15px' }}
              >
                Return to Programs Feed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Application Status Tracker Modal ─── */}
      {trackingApp && (
        <div className="modal-backdrop" onClick={() => setTrackingApp(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '680px',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: '24px',
              padding: '32px',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge badge-info" style={{ fontSize: '13px' }}>
                    🏛️ {trackingApp.program.organization}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                    📍 {trackingApp.program.municipality || 'All Municipalities'}
                  </span>
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
                  {trackingApp.program.title}
                </h2>
              </div>
              <button
                onClick={() => setTrackingApp(null)}
                style={{
                  background: '#F8F7F3',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  minHeight: 'unset',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Main Status Hero Card */}
            <div
              style={{
                padding: '20px 24px',
                borderRadius: '18px',
                marginBottom: '26px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                ...getStatusBadgeStyles(trackingApp.application.status),
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              <span style={{ fontSize: '38px' }}>
                {getStatusIcon(trackingApp.application.status)}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.85 }}>
                  Official Application Status
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>
                  {trackingApp.application.status === 'submitted' && 'Application Submitted & Queued'}
                  {trackingApp.application.status === 'under_review' && 'Under Active LGU Review'}
                  {trackingApp.application.status === 'approved' && 'Application Approved! 🎉'}
                  {trackingApp.application.status === 'rejected' && 'Application Not Approved'}
                </div>
                <div style={{ fontSize: '14px', marginTop: '4px', lineHeight: 1.4, opacity: 0.9 }}>
                  {trackingApp.application.status === 'submitted' && 'Your documents are currently waiting in the Municipal Agriculture Office review queue.'}
                  {trackingApp.application.status === 'under_review' && 'An LGU staff officer is verifying your RSBSA registry and farm parcel details.'}
                  {trackingApp.application.status === 'approved' && 'Congratulations! Your farm subsidy / grant has been granted by the LGU.'}
                  {trackingApp.application.status === 'rejected' && 'Your application did not meet eligibility or quota requirements for this cycle.'}
                </div>
              </div>
            </div>

            {/* 3-Step Progress Stepper */}
            <div style={{ padding: '22px', borderRadius: '18px', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '26px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '18px' }}>
                Application Progress Timeline
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Step 1 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#166534',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}>
                    ✓
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                      1. Application Submitted
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                      Recorded on {new Date(trackingApp.application.submittedAt || trackingApp.application.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · RSBSA ID: {trackingApp.application.rsbsaNumber || 'On file'}
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: trackingApp.application.status === 'submitted' ? '#FDE68A' : '#166534',
                    color: trackingApp.application.status === 'submitted' ? '#92400E' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}>
                    {trackingApp.application.status === 'submitted' ? '2' : '✓'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                      2. LGU Document & RSBSA Verification
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                      {trackingApp.application.status === 'submitted'
                        ? 'Awaiting screening by Municipal Agriculture staff.'
                        : trackingApp.application.status === 'under_review'
                          ? 'Active evaluation in progress by authorized officer.'
                          : 'Verification completed by LGU Agriculture Office.'}
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: trackingApp.application.status === 'approved' ? '#166534' : trackingApp.application.status === 'rejected' ? '#BE123C' : '#E2E8F0',
                    color: trackingApp.application.status === 'approved' || trackingApp.application.status === 'rejected' ? '#FFFFFF' : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}>
                    {trackingApp.application.status === 'approved' ? '✓' : trackingApp.application.status === 'rejected' ? '✕' : '3'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                      3. Official Decision & Disbursement
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                      {trackingApp.application.status === 'approved' && 'Approved · Ready for distribution or voucher collection.'}
                      {trackingApp.application.status === 'rejected' && 'Application declined. Please read remarks below.'}
                      {(trackingApp.application.status === 'submitted' || trackingApp.application.status === 'under_review') && 'Pending completion of document verification.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LGU Staff Evaluation Remarks (if present) */}
            {trackingApp.application.remarks && (
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: '16px',
                  background: trackingApp.application.status === 'approved' ? '#F0FDF4' : trackingApp.application.status === 'rejected' ? '#FFF1F2' : '#F8FAFC',
                  border: `1.5px solid ${trackingApp.application.status === 'approved' ? '#86EFAC' : trackingApp.application.status === 'rejected' ? '#FECDD3' : '#CBD5E1'}`,
                  marginBottom: '26px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  🏛️ Municipal Agriculture Office Evaluation Notes:
                </div>
                <div style={{ fontSize: '15px', color: '#1E293B', fontStyle: 'italic', lineHeight: 1.5, background: '#FFFFFF', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  "{trackingApp.application.remarks}"
                </div>
              </div>
            )}

            {/* Next Steps Guide */}
            {trackingApp.application.status === 'approved' && (
              <div style={{ padding: '18px 20px', borderRadius: '16px', background: '#ECFDF5', border: '1.5px solid #6EE7B7', marginBottom: '26px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#065F46', marginBottom: '6px' }}>
                  🌾 Next Steps to Claim Subsidy / Assistance:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13.5px', color: '#047857', lineHeight: 1.6 }}>
                  <li>Please bring your physical <strong>RSBSA Card or Certificate</strong> and <strong>1 valid Government ID</strong>.</li>
                  <li>Proceed to the <strong>Municipal Agriculture Office</strong> in {trackingApp.program.municipality || user?.municipality || 'your municipality'}.</li>
                  <li>Keep your phone active ({trackingApp.application.farmerPhone || user?.phone || 'registered number'}) for SMS scheduling.</li>
                </ul>
              </div>
            )}

            {/* Submitted Details Summary */}
            <div style={{ padding: '20px', borderRadius: '18px', background: '#FFFFFF', border: '1.5px solid #E2E8F0', marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0E4A27', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📋 Submitted Application Summary
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '13.5px', marginBottom: '16px' }}>
                <div>
                  <div style={{ color: '#64748B', fontSize: '12px', fontWeight: 600 }}>RSBSA ID Number</div>
                  <div style={{ fontWeight: 800, color: '#1E293B', fontFamily: 'monospace', fontSize: '14px' }}>
                    {trackingApp.application.rsbsaNumber || 'Not specified'}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontSize: '12px', fontWeight: 600 }}>Farm Size (Hectares)</div>
                  <div style={{ fontWeight: 800, color: '#1E293B' }}>
                    {trackingApp.application.farmSizeHectares} ha
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontSize: '12px', fontWeight: 600 }}>Crops Grown</div>
                  <div style={{ fontWeight: 700, color: '#1E293B' }}>
                    {trackingApp.application.cropsGrown?.join(', ') || 'Rice'}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748B', fontSize: '12px', fontWeight: 600 }}>Applicant Name</div>
                  <div style={{ fontWeight: 700, color: '#1E293B' }}>
                    {trackingApp.application.farmerName || `${user?.firstName} ${user?.lastName}`}
                  </div>
                </div>
              </div>

              {/* Attached Document Image Preview */}
              {(() => {
                const docUrl = trackingApp.application.submittedDocs?.find((d) => d.startsWith('http') || d.startsWith('/api') || d.startsWith('data:image'));
                return docUrl ? (
                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                      Attached RSBSA Verification Document:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={docUrl}
                        alt="Attached RSBSA Card"
                        onClick={() => setPreviewDocUrl(docUrl)}
                        style={{
                          width: '120px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          cursor: 'pointer',
                        }}
                        title="Click to zoom image"
                      />
                      <div style={{ fontSize: '12px', color: '#64748B' }}>
                        <span style={{ fontWeight: 700, color: '#166534' }}>✓ Document on file</span>
                        <div style={{ marginTop: '4px' }}>
                          <button
                            type="button"
                            onClick={() => setPreviewDocUrl(docUrl)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: '#0E4A27',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              fontSize: '12px',
                            }}
                          >
                            🔍 Click to view full size
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setTrackingApp(null)}
                className="btn btn-secondary btn-large"
                style={{ padding: '12px 28px', borderRadius: '12px', fontWeight: 700 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Full-Size Document Image Preview Modal ─── */}
      {previewDocUrl && (
        <div className="modal-backdrop" onClick={() => setPreviewDocUrl(null)} style={{ zIndex: 1100 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              padding: '16px',
              borderRadius: '16px',
              background: '#0F172A',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 8px' }}>
              <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700 }}>
                RSBSA Attached Verification Document
              </span>
              <button
                onClick={() => setPreviewDocUrl(null)}
                style={{
                  background: '#334155',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  minHeight: 'unset',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
            <img
              src={previewDocUrl}
              alt="RSBSA Document Full"
              style={{
                maxWidth: '100%',
                maxHeight: '78vh',
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto',
                borderRadius: '8px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
