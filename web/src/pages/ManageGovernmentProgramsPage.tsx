import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { programApi } from '../api/program';
import { api, getImageUrl } from '../api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { getRegions, getProvinces, getMunicipalities } from '../data/philippineLocations';
import type { GovernmentProgram, ProgramApplication, ApplicationStatus } from '../types/program';

interface ProgramStats {
  total: number;
  pending: number;
  approved: number;
}

const REGION_DEFAULT = 'All Regions';
const PROVINCE_DEFAULT = 'All Provinces';
const MUNICIPALITY_DEFAULT = 'All Municipalities';

export const ManageGovernmentProgramsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const isLguStaff = user?.role === 'lgu_staff';
  const assignedMunicipality = user?.municipality || '';

  const [programs, setPrograms] = useState<GovernmentProgram[]>([]);
  const [selectedProgId, setSelectedProgId] = useState<string>('');
  const [applications, setApplications] = useState<ProgramApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApps, setLoadingApps] = useState(false);
  const [programStats, setProgramStats] = useState<Record<string, ProgramStats>>({});

  // Search & Filter state for Applications Awaiting Evaluation
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [copiedRsbsa, setCopiedRsbsa] = useState<string | null>(null);
  const [menuOpenProgId, setMenuOpenProgId] = useState<string | null>(null);

  // Program details preview modal
  const [viewingProgram, setViewingProgram] = useState<GovernmentProgram | null>(null);

  // Geographic cascading filters for Super Admin (Region -> Province -> Municipality)
  const [regionFilter, setRegionFilter] = useState(REGION_DEFAULT);
  const [provinceFilter, setProvinceFilter] = useState(PROVINCE_DEFAULT);
  const [municipalityFilter, setMunicipalityFilter] = useState(isLguStaff ? assignedMunicipality : MUNICIPALITY_DEFAULT);

  const regions = [REGION_DEFAULT, ...getRegions()];
  const provinces = regionFilter !== REGION_DEFAULT
    ? [PROVINCE_DEFAULT, ...getProvinces(regionFilter)]
    : [PROVINCE_DEFAULT];
  const municipalities = (regionFilter !== REGION_DEFAULT && provinceFilter !== PROVINCE_DEFAULT)
    ? [MUNICIPALITY_DEFAULT, ...getMunicipalities(regionFilter, provinceFilter)]
    : [MUNICIPALITY_DEFAULT];

  // New Program form state (Only accessible to LGU Staff)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agency, setAgency] = useState('Municipal Agriculture Office');
  const [targetMunicipality, setTargetMunicipality] = useState(assignedMunicipality || 'Malaybalay City');
  const [criteria, setCriteria] = useState('Registered in RSBSA, Smallholder farmer (< 3 hectares)');
  const [reqDocs, setReqDocs] = useState('RSBSA Card, Government ID');
  const [deadline, setDeadline] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Attached Image state for Program
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toastError('File Too Large', 'Please select an image smaller than 10MB.');
      return;
    }
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

  // Review modal state
  const [reviewApp, setReviewApp] = useState<ProgramApplication | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ApplicationStatus>('approved');
  const [remarks, setRemarks] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Fetch all programs and compute live application statistics
  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const filterMun = isLguStaff ? assignedMunicipality : undefined;
      const data = await programApi.listPrograms(undefined, filterMun || undefined);
      setPrograms(data);

      if (data.length > 0) {
        if (!selectedProgId || !data.some((p) => p.id === selectedProgId)) {
          setSelectedProgId(data[0].id);
        }

        // Fetch applications for each program to build stats
        const statsMap: Record<string, ProgramStats> = {};
        await Promise.all(
          data.map(async (p) => {
            try {
              const apps = await programApi.listProgramApplications(p.id);
              const total = apps.length;
              const pending = apps.filter((a) => a.status === 'submitted' || a.status === 'under_review').length;
              const approved = apps.filter((a) => a.status === 'approved').length;
              statsMap[p.id] = { total, pending, approved };
            } catch {
              statsMap[p.id] = { total: 0, pending: 0, approved: 0 };
            }
          })
        );
        setProgramStats(statsMap);
      } else {
        setSelectedProgId('');
        setApplications([]);
        setProgramStats({});
      }
    } catch (e) {
      console.error('Failed to fetch programs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assignedMunicipality) {
      setTargetMunicipality(assignedMunicipality);
      if (isLguStaff) setMunicipalityFilter(assignedMunicipality);
    }
  }, [assignedMunicipality, isLguStaff]);

  useEffect(() => {
    fetchPrograms();
  }, [assignedMunicipality]);

  // Filter programs based on region, province, and municipality filters
  const displayedPrograms = programs.filter((p) => {
    if (isLguStaff) return true;
    if (regionFilter !== REGION_DEFAULT && p.region && p.region !== regionFilter) {
      return false;
    }
    if (provinceFilter !== PROVINCE_DEFAULT && p.province && p.province !== provinceFilter) {
      return false;
    }
    if (municipalityFilter !== MUNICIPALITY_DEFAULT && p.municipality && p.municipality !== municipalityFilter) {
      return false;
    }
    return true;
  });

  // Keep selectedProgId in sync when location filters change
  useEffect(() => {
    if (displayedPrograms.length > 0) {
      if (!selectedProgId || !displayedPrograms.some((p) => p.id === selectedProgId)) {
        setSelectedProgId(displayedPrograms[0].id);
      }
    } else {
      setSelectedProgId('');
      setApplications([]);
    }
  }, [regionFilter, provinceFilter, municipalityFilter, programs]);

  // Fetch applications for the currently selected program
  const fetchApplications = async (progId: string) => {
    if (!progId) return;
    setLoadingApps(true);
    try {
      const apps = await programApi.listProgramApplications(progId);
      setApplications(apps);

      // Refresh stats map for this program
      const total = apps.length;
      const pending = apps.filter((a) => a.status === 'submitted' || a.status === 'under_review').length;
      const approved = apps.filter((a) => a.status === 'approved').length;
      setProgramStats((prev) => ({
        ...prev,
        [progId]: { total, pending, approved },
      }));
    } catch (e) {
      console.error('Failed to fetch applications:', e);
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    if (selectedProgId) {
      fetchApplications(selectedProgId);
    }
  }, [selectedProgId]);

  // Close card menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setMenuOpenProgId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLguStaff) {
      toastError('Unauthorized', 'Only LGU Staff have permission to publish local assistance programs.');
      return;
    }
    setCreating(true);
    try {
      let uploadedImageUrl: string | undefined = undefined;
      if (imageFile) {
        setUploadingImage(true);
        try {
          const uploadRes = await api.uploadImage(imageFile);
          uploadedImageUrl = uploadRes.url;
        } catch (uploadErr) {
          console.warn('Image upload failed, continuing with program creation:', uploadErr);
        } finally {
          setUploadingImage(false);
        }
      }

      const munToSave = assignedMunicipality || targetMunicipality || 'Malaybalay City';
      await programApi.createProgram({
        title,
        description,
        agency,
        imageUrl: uploadedImageUrl,
        municipality: munToSave,
        province: user?.province || 'Bukidnon',
        region: user?.region || 'Region X - Northern Mindanao',
        eligibilityCriteria: criteria.split(',').map((s) => s.trim()).filter(Boolean),
        requiredDocuments: reqDocs.split(',').map((s) => s.trim()).filter(Boolean),
        deadline,
      });
      success('Program Published!', `"${title}" is now open for farmer applications in ${munToSave}.`);
      setShowCreateForm(false);
      setTitle('');
      setDescription('');
      handleRemoveImage();
      fetchPrograms();
    } catch (err: any) {
      toastError('Failed to Create Program', err.response?.data?.error || 'Could not publish program.');
    } finally {
      setCreating(false);
      setUploadingImage(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewApp) return;
    setReviewing(true);
    try {
      await programApi.reviewApplication(reviewApp.id, {
        status: reviewStatus,
        remarks,
      });
      success('Application Updated!', `Marked application for ${reviewApp.farmerName} as ${reviewStatus}.`);
      setReviewApp(null);
      fetchApplications(selectedProgId);
    } catch (err: any) {
      toastError('Update Failed', err.response?.data?.error || 'Failed to update review status.');
    } finally {
      setReviewing(false);
    }
  };

  const handleCopyRsbsa = (rsbsa: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!rsbsa) return;
    navigator.clipboard.writeText(rsbsa);
    setCopiedRsbsa(rsbsa);
    success('Copied to Clipboard', `RSBSA ID ${rsbsa} copied!`);
    setTimeout(() => setCopiedRsbsa(null), 2000);
  };

  const handleSelectAndManage = (progId: string) => {
    setSelectedProgId(progId);
    const queueElem = document.getElementById('evaluation-queue');
    if (queueElem) {
      queueElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Curated imagery matching agricultural initiatives
  const getProgramImage = (program: GovernmentProgram | null, index: number): string => {
    if (program?.imageUrl) {
      return getImageUrl(program.imageUrl);
    }
    const t = (program?.title || '').toLowerCase();
    if (t.includes('rice') || t.includes('puhunan') || t.includes('cash') || t.includes('rffa') || t.includes('palay')) {
      return index % 2 === 0
        ? 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=600&q=80' // rice grain in hands
        : 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80'; // rice fields
    }
    if (t.includes('equipment') || t.includes('machinery') || t.includes('irrigation') || t.includes('spis') || t.includes('tractor')) {
      return 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=600&q=80'; // blue tractor
    }
    if (t.includes('organic') || t.includes('seed') || t.includes('fertilizer') || t.includes('corn')) {
      return 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=600&q=80'; // organic sprouts
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

  const getProgramBadge = (program: GovernmentProgram, index: number) => {
    if (program.status === 'closed') {
      return { label: 'CLOSED', bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' };
    }
    if (index === 2 || program.title.toLowerCase().includes('equipment') || program.title.toLowerCase().includes('support')) {
      return { label: 'OPEN FOR APPLICATIONS', bg: '#DBEAFE', color: '#1D4ED8', border: '#93C5FD' };
    }
    return { label: 'ACTIVE', bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' };
  };

  // Filtered applications based on search query & status filter
  const filteredApplications = applications.filter((app) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.farmerName?.toLowerCase().includes(q);
      const matchRsbsa = app.rsbsaNumber?.toLowerCase().includes(q);
      if (!matchName && !matchRsbsa) return false;
    }
    if (statusFilter === 'pending') {
      return app.status === 'submitted' || app.status === 'under_review';
    }
    if (statusFilter === 'approved') {
      return app.status === 'approved';
    }
    if (statusFilter === 'rejected') {
      return app.status === 'rejected';
    }
    return true;
  });

  return (
    <div className="app-container" style={{ paddingBottom: '50px' }}>
      {/* ─── Top Active Programs Section ─── */}
      <div style={{ marginBottom: '32px' }}>
        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0E4A27', margin: 0, lineHeight: 1.2 }}>
              Manage Government Programs
            </h1>
            <p style={{ color: '#64748B', fontSize: '13px', margin: '3px 0 0 0' }}>
              {isLguStaff
                ? `Manage and monitor ${assignedMunicipality ? assignedMunicipality + "'s" : "your LGU's"} agricultural assistance programs.`
                : "Manage and monitor your LGU's agricultural assistance programs."}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Only LGU Staff has permission to post new programs */}
            {isLguStaff && (
              <button
                onClick={() => {
                  setShowCreateForm((v) => {
                    if (v) handleRemoveImage();
                    return !v;
                  });
                }}
                className={showCreateForm ? 'btn btn-secondary' : 'btn btn-primary'}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: 'unset',
                }}
              >
                {showCreateForm ? '✕ Close Form' : '+ Post New Program'}
              </button>
            )}

            {/* View All Programs Link (Excluded for Super Admin) */}
            {isLguStaff && (
              <button
                type="button"
                onClick={() => navigate('/programs')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#166534',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  minHeight: 'unset',
                }}
              >
                View All Programs →
              </button>
            )}
          </div>
        </div>

        {/* ─── Super Admin Cascading Geographic Filter (Region -> Province -> Municipality) ─── */}
        {!isLguStaff && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 20px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              marginBottom: '22px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '6px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#166534',
                  fontSize: '15px',
                }}
              >
                📍
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0E4A27' }}>
                  Filter by Location
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  Showing {displayedPrograms.length} of {programs.length} programs
                </div>
              </div>
            </div>

            {/* Region Select */}
            <div style={{ flex: '1', minWidth: '170px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.3px' }}>
                REGION
              </label>
              <select
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setProvinceFilter(PROVINCE_DEFAULT);
                  setMunicipalityFilter(MUNICIPALITY_DEFAULT);
                }}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: '9px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  minHeight: 'unset',
                  cursor: 'pointer',
                }}
              >
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Province Select */}
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.3px' }}>
                PROVINCE
              </label>
              <select
                value={provinceFilter}
                disabled={regionFilter === REGION_DEFAULT}
                onChange={(e) => {
                  setProvinceFilter(e.target.value);
                  setMunicipalityFilter(MUNICIPALITY_DEFAULT);
                }}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: '9px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  backgroundColor: regionFilter === REGION_DEFAULT ? '#F8FAFC' : '#FFFFFF',
                  opacity: regionFilter === REGION_DEFAULT ? 0.6 : 1,
                  cursor: regionFilter === REGION_DEFAULT ? 'not-allowed' : 'pointer',
                  outline: 'none',
                  minHeight: 'unset',
                }}
              >
                {provinces.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Municipality Select */}
            <div style={{ flex: '1', minWidth: '160px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.3px' }}>
                MUNICIPALITY / CITY
              </label>
              <select
                value={municipalityFilter}
                disabled={provinceFilter === PROVINCE_DEFAULT}
                onChange={(e) => setMunicipalityFilter(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: '9px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  backgroundColor: provinceFilter === PROVINCE_DEFAULT ? '#F8FAFC' : '#FFFFFF',
                  opacity: provinceFilter === PROVINCE_DEFAULT ? 0.6 : 1,
                  cursor: provinceFilter === PROVINCE_DEFAULT ? 'not-allowed' : 'pointer',
                  outline: 'none',
                  minHeight: 'unset',
                }}
              >
                {municipalities.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            {(regionFilter !== REGION_DEFAULT || provinceFilter !== PROVINCE_DEFAULT || municipalityFilter !== MUNICIPALITY_DEFAULT) && (
              <div style={{ alignSelf: 'flex-end', marginBottom: '1px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setRegionFilter(REGION_DEFAULT);
                    setProvinceFilter(PROVINCE_DEFAULT);
                    setMunicipalityFilter(MUNICIPALITY_DEFAULT);
                  }}
                  style={{
                    height: '38px',
                    padding: '0 14px',
                    borderRadius: '9px',
                    border: '1.5px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    color: '#64748B',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    minHeight: 'unset',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>✕</span>
                  <span>Reset</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── LGU Staff Program Creation Form ─── */}
        {showCreateForm && isLguStaff && (
          <div
            className="card"
            style={{
              padding: '22px 26px',
              borderRadius: '18px',
              marginBottom: '24px',
              border: '1.5px solid #86EFAC',
              background: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
                  Create New Support Program
                </h2>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                  Publish agricultural assistance for farmers in {assignedMunicipality || 'your jurisdiction'}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); handleRemoveImage(); }}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProgram}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Program Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Free Certified Rice Seeds 2026"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Managing Agency *
                  </label>
                  <input
                    type="text"
                    required
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Target Municipality *
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`📍 ${assignedMunicipality || 'Malaybalay City'}`}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Program objectives, assistance details, and coverage..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* ─── Attach Program Photo / Banner (Optional) ─── */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Program Banner / Photo <span style={{ fontWeight: 500, color: '#64748B' }}>(Optional)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />

                {!imagePreview ? (
                  <div
                    className="program-upload-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #86EFAC',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      textAlign: 'center',
                      backgroundColor: '#F0FDF4',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{ fontSize: '26px' }}>🖼️</div>
                    <div style={{ textAlign: 'left' }}>
                      <div className="program-upload-title" style={{ fontWeight: 700, color: '#166534', fontSize: '13px' }}>
                        Click to attach program photo or banner
                      </div>
                      <div className="program-upload-desc" style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                        Upload official poster, infographic, or photo (JPG, PNG, WEBP up to 10MB)
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="program-upload-preview-box"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #BBF7D0',
                      backgroundColor: '#F0FDF4',
                    }}
                  >
                    <img
                      src={imagePreview}
                      alt="Program Banner Preview"
                      style={{
                        width: '64px',
                        height: '52px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        border: '1px solid #86EFAC',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="program-upload-filename"
                        style={{
                          fontWeight: 700,
                          fontSize: '13px',
                          color: '#0F172A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {imageFile?.name || 'Attached Photo'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span className="program-upload-badge" style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>
                          ✓ Ready to attach with program
                        </span>
                        {imageFile && (
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            • {(imageFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="program-upload-remove-btn"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #FECACA',
                        backgroundColor: '#FFFFFF',
                        color: '#DC2626',
                        fontWeight: 700,
                        fontSize: '11px',
                        cursor: 'pointer',
                        minHeight: 'unset',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Eligibility Criteria
                  </label>
                  <input
                    type="text"
                    value={criteria}
                    onChange={(e) => setCriteria(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Required Documents
                  </label>
                  <input
                    type="text"
                    value={reqDocs}
                    onChange={(e) => setReqDocs(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1.5px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '9px', border: '1.5px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating || uploadingImage}
                className="btn btn-primary"
                style={{ padding: '10px 22px', borderRadius: '10px', fontWeight: 800, fontSize: '13px' }}
              >
                {creating || uploadingImage ? 'Publishing Program & Image...' : '✓ Publish Program Listing'}
              </button>
            </form>
          </div>
        )}

        {/* ─── Program Cards Grid ─── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '14px' }}>
            Loading active agricultural programs...
          </div>
        ) : displayedPrograms.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '36px 20px',
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px dashed #CBD5E1',
              color: '#64748B',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌾</div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#334155' }}>No Active Programs Found</div>
            <p style={{ fontSize: '13px', margin: '4px 0 12px 0' }}>
              {isLguStaff ? 'Click "+ Post New Program" above to create an agricultural assistance program.' : 'No assistance programs found for the selected geographic filter.'}
            </p>
            {!isLguStaff && (regionFilter !== REGION_DEFAULT || provinceFilter !== PROVINCE_DEFAULT || municipalityFilter !== MUNICIPALITY_DEFAULT) && (
              <button
                type="button"
                onClick={() => {
                  setRegionFilter(REGION_DEFAULT);
                  setProvinceFilter(PROVINCE_DEFAULT);
                  setMunicipalityFilter(MUNICIPALITY_DEFAULT);
                }}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12px', minHeight: 'unset', fontWeight: 700 }}
              >
                Reset Location Filter
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(265px, 1fr))',
              gap: '16px',
            }}
          >
            {displayedPrograms.map((prog, idx) => {
              const badge = getProgramBadge(prog, idx);
              const stats = programStats[prog.id] || { total: 0, pending: 0, approved: 0 };
              const isSelected = selectedProgId === prog.id;

              return (
                <div
                  key={prog.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: isSelected ? '2px solid #166534' : '1.5px solid #E2E8F0',
                    boxShadow: isSelected ? '0 4px 16px rgba(22, 101, 52, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Card Cover Image Banner */}
                  <div style={{ position: 'relative', height: '125px', width: '100%', overflow: 'hidden' }}>
                    <img
                      src={getProgramImage(prog, idx)}
                      alt={prog.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />

                    {/* Status Pill Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        borderRadius: '20px',
                        padding: '3px 10px',
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.3px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                      }}
                    >
                      {badge.label}
                    </div>

                    {/* 3-Dots Menu Button */}
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <button
                        type="button"
                        aria-label="Program options"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenProgId(menuOpenProgId === prog.id ? null : prog.id);
                        }}
                        style={{
                          width: '28px',
                          height: '28px',
                          minWidth: '28px',
                          minHeight: 'unset',
                          padding: 0,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 255, 255, 0.92)',
                          border: '1px solid rgba(0, 0, 0, 0.08)',
                          color: '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                          lineHeight: 1,
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {menuOpenProgId === prog.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            top: '32px',
                            right: 0,
                            backgroundColor: '#FFFFFF',
                            borderRadius: '10px',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                            border: '1px solid #E2E8F0',
                            minWidth: '160px',
                            zIndex: 50,
                            overflow: 'hidden',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setViewingProgram(prog);
                              setMenuOpenProgId(null);
                            }}
                            style={{
                              width: '100%',
                              minHeight: 'unset',
                              textAlign: 'left',
                              padding: '9px 14px',
                              background: 'none',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#334155',
                              cursor: 'pointer',
                              borderBottom: '1px solid #F1F5F9',
                            }}
                          >
                            👁️ View Details
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectAndManage(prog.id);
                              setMenuOpenProgId(null);
                            }}
                            style={{
                              width: '100%',
                              minHeight: 'unset',
                              textAlign: 'left',
                              padding: '9px 14px',
                              background: 'none',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#166534',
                              cursor: 'pointer',
                            }}
                          >
                            📋 Manage Applications
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3
                      title={prog.title}
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#0F172A',
                        margin: '0 0 5px 0',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {prog.title}
                    </h3>
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#64748B',
                        margin: '0 0 14px 0',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        height: '34px',
                      }}
                    >
                      {prog.description || 'Agricultural assistance program for qualified farmers.'}
                    </p>

                    {/* 3 Metric Counters */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '6px',
                        padding: '8px 10px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '10px',
                        border: '1px solid #F1F5F9',
                        marginBottom: '14px',
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#166534' }}>
                          <span style={{ fontSize: '11px' }}>📄</span>
                          <strong style={{ fontSize: '13px', color: '#0F172A' }}>{stats.total}</strong>
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748B', marginTop: '1px' }}>Applications</div>
                      </div>

                      <div style={{ textAlign: 'center', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#D97706' }}>
                          <span style={{ fontSize: '11px' }}>🕒</span>
                          <strong style={{ fontSize: '13px', color: '#B45309' }}>{stats.pending}</strong>
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748B', marginTop: '1px' }}>Pending</div>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#16A34A' }}>
                          <span style={{ fontSize: '11px' }}>✓</span>
                          <strong style={{ fontSize: '13px', color: '#15803D' }}>{stats.approved}</strong>
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748B', marginTop: '1px' }}>Approved</div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                      <button
                        type="button"
                        onClick={() => setViewingProgram(prog)}
                        style={{
                          flex: 1.2,
                          minHeight: 'unset',
                          height: '36px',
                          backgroundColor: '#166534',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '9px',
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        View Program →
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectAndManage(prog.id)}
                        style={{
                          flex: 1,
                          minHeight: 'unset',
                          height: '36px',
                          backgroundColor: isSelected ? '#DCFCE7' : '#F8FAFC',
                          color: '#166534',
                          border: isSelected ? '1.5px solid #86EFAC' : '1px solid #CBD5E1',
                          borderRadius: '9px',
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s',
                        }}
                      >
                        {isSelected ? 'Managing' : 'Manage'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Bottom Section: Applications Awaiting Evaluation ─── */}
      <div
        id="evaluation-queue"
        className="card"
        style={{
          padding: '24px 26px',
          borderRadius: '20px',
          border: '1.5px solid #E2E8F0',
          background: '#FFFFFF',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        }}
      >
        {/* Section Header & Filters Toolbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {/* Title & Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0,
              }}
            >
              {/* Clipboard Checklist Icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M9 12h6" />
                <path d="M9 16h6" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Applications Awaiting Evaluation
                </h2>
                <span
                  style={{
                    backgroundColor: '#DCFCE7',
                    color: '#166534',
                    border: '1px solid #BBF7D0',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: '20px',
                  }}
                >
                  {filteredApplications.length} {filteredApplications.length === 1 ? 'application' : 'applications'}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0 0' }}>
                Review and evaluate farmer applications for your programs.
              </p>
            </div>
          </div>

          {/* Right Controls: Program Dropdown + Search + Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Program Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Program</label>
              <select
                value={selectedProgId}
                onChange={(e) => setSelectedProgId(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  outline: 'none',
                  maxWidth: '260px',
                }}
              >
                {displayedPrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.municipality ? `(${p.municipality})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                  fontSize: '13px',
                }}
              >
                🔍
              </span>
              <input
                type="text"
                placeholder="Search farmer name or RSBSA ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  height: '38px',
                  padding: '0 12px 0 34px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 500,
                  outline: 'none',
                  width: '230px',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>

            {/* Filter Button (cycles status filters) */}
            <button
              type="button"
              onClick={() => {
                const cycleOrder: Array<'all' | 'pending' | 'approved' | 'rejected'> = ['all', 'pending', 'approved', 'rejected'];
                const nextIndex = (cycleOrder.indexOf(statusFilter) + 1) % cycleOrder.length;
                setStatusFilter(cycleOrder[nextIndex]);
              }}
              style={{
                height: '38px',
                padding: '0 14px',
                borderRadius: '10px',
                border: statusFilter !== 'all' ? '1.5px solid #166534' : '1.5px solid #CBD5E1',
                backgroundColor: statusFilter !== 'all' ? '#F0FDF4' : '#FFFFFF',
                color: statusFilter !== 'all' ? '#166534' : '#475569',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>⏚</span>
              <span>Filter {statusFilter !== 'all' ? `(${statusFilter})` : ''}</span>
            </button>
          </div>
        </div>

        {/* ─── Evaluation Applications Table ─── */}
        {loadingApps ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontSize: '13px' }}>
            Loading applications queue...
          </div>
        ) : filteredApplications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '46px 20px', color: '#64748B' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#334155', marginBottom: '4px' }}>
              No applications found for this program
            </div>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search terms or status filter.'
                : 'Farmer submissions for this program will appear here for RSBSA document review and evaluation.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 14px' }}>FARMER</th>
                  <th style={{ padding: '12px 14px' }}>RSBSA ID</th>
                  <th style={{ padding: '12px 14px' }}>LOCATION</th>
                  <th style={{ padding: '12px 14px' }}>FARM SIZE</th>
                  <th style={{ padding: '12px 14px' }}>CROPS</th>
                  <th style={{ padding: '12px 14px' }}>STATUS</th>
                  <th style={{ padding: '12px 14px' }}>SUBMITTED</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s' }}>
                    {/* FARMER: Avatar + Name + RSBSA ID subtitle */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#E2E8F0',
                            color: '#166534',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            flexShrink: 0,
                            border: '1.5px solid #CBD5E1',
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>
                            {app.farmerName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                            RSBSA ID: {app.rsbsaNumber || 'Not specified'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* RSBSA ID: Monospace number + Copy Button */}
                    <td style={{ padding: '14px' }}>
                      {app.rsbsaNumber ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>
                            {app.rsbsaNumber}
                          </span>
                          <button
                            type="button"
                            title="Copy RSBSA ID"
                            onClick={(e) => handleCopyRsbsa(app.rsbsaNumber!, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              color: copiedRsbsa === app.rsbsaNumber ? '#16A34A' : '#94A3B8',
                              fontSize: '13px',
                            }}
                          >
                            {copiedRsbsa === app.rsbsaNumber ? '✓' : '📋'}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '12px' }}>—</span>
                      )}
                    </td>

                    {/* LOCATION: Pin icon + Municipality + Province */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                        <span style={{ color: '#166534', fontSize: '13px' }}>📍</span>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '12px' }}>
                            {app.farmerMunicipality || user?.municipality || 'Malaybalay City'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {app.farmerProvince || user?.province || 'Bukidnon'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* FARM SIZE: Seedling Icon + Size in ha */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#334155', fontWeight: 600 }}>
                        <span style={{ color: '#16A34A' }}>🌾</span>
                        <span>{app.farmSizeHectares || 1.5} ha</span>
                      </div>
                    </td>

                    {/* CROPS: Leaf Icon + Crop List */}
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#334155' }}>
                        <span style={{ color: '#166534' }}>🍃</span>
                        <span>{app.cropsGrown && app.cropsGrown.length > 0 ? app.cropsGrown.join(', ') : 'Rice (Palay)'}</span>
                      </div>
                    </td>

                    {/* STATUS: Badge Pill */}
                    <td style={{ padding: '14px' }}>
                      {app.status === 'approved' ? (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: '#DCFCE7',
                            color: '#166534',
                            border: '1px solid #BBF7D0',
                          }}
                        >
                          Approved
                        </span>
                      ) : app.status === 'rejected' ? (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: '#FEE2E2',
                            color: '#991B1B',
                            border: '1px solid #FECACA',
                          }}
                        >
                          Rejected
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: '#FEF3C7',
                            color: '#B45309',
                            border: '1px solid #FDE68A',
                          }}
                        >
                          Under Review
                        </span>
                      )}
                    </td>

                    {/* SUBMITTED: Calendar Icon + Date */}
                    <td style={{ padding: '14px', fontSize: '12px', color: '#64748B' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>📅</span>
                        <span>
                          {new Date(app.submittedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>

                    {/* ACTION: Evaluate -> button */}
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setReviewApp(app);
                          setReviewStatus(app.status);
                          setRemarks(app.remarks || '');
                        }}
                        style={{
                          backgroundColor: '#166534',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '7px 15px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        Evaluate →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Program Details Modal (View Program →) ─── */}
      {viewingProgram && (
        <div className="modal-backdrop" onClick={() => setViewingProgram(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', borderRadius: '24px', padding: '0', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header Image Banner */}
            <div style={{ position: 'relative', height: '160px', width: '100%' }}>
              <img
                src={getProgramImage(viewingProgram, 0)}
                alt={viewingProgram.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={() => setViewingProgram(null)}
                style={{
                  position: 'absolute',
                  top: '14px',
                  right: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: '#DCFCE7', color: '#166534' }}>
                  🏛️ {viewingProgram.agency || 'Municipal Agriculture Office'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#F1F5F9', color: '#475569' }}>
                  📍 {viewingProgram.municipality || 'All Municipalities'}
                </span>
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27', margin: '0 0 10px 0' }}>
                {viewingProgram.title}
              </h2>

              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, margin: '0 0 18px 0' }}>
                {viewingProgram.description}
              </p>

              {/* Requirements & Criteria */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534', marginBottom: '8px' }}>
                    ✓ Eligibility Criteria:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                    {viewingProgram.eligibilityCriteria?.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534', marginBottom: '8px' }}>
                    📄 Required Documents:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                    {viewingProgram.requiredDocuments?.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Deadline & Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Deadline: <strong style={{ color: '#0F172A' }}>{new Date(viewingProgram.deadline).toLocaleDateString()}</strong>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setViewingProgram(null)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectAndManage(viewingProgram.id);
                      setViewingProgram(null);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}
                  >
                    📋 Manage Applications
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Review Application Modal ─── */}
      {reviewApp && (
        <div className="modal-backdrop" onClick={() => setReviewApp(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', borderRadius: '24px', padding: '26px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
                  Evaluate Farmer Application
                </h2>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                  Review RSBSA eligibility and update submission status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewApp(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0', marginBottom: '16px', fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
              <div>👤 Farmer: <strong>{reviewApp.farmerName}</strong></div>
              {reviewApp.farmerPhone && <div>📞 Contact: <strong>{reviewApp.farmerPhone}</strong></div>}
              <div>🪪 RSBSA ID: <strong style={{ fontFamily: 'monospace', color: '#166534' }}>{reviewApp.rsbsaNumber || 'Not specified'}</strong></div>
              <div>📍 Location: <strong>{reviewApp.farmerMunicipality || user?.municipality || 'Malaybalay City'}{reviewApp.farmerProvince ? `, ${reviewApp.farmerProvince}` : ''}</strong></div>
              <div>🌾 Farm Specs: <strong>{reviewApp.farmSizeHectares} ha</strong> — {reviewApp.cropsGrown.join(', ')}</div>
            </div>

            {/* Attached RSBSA Document Preview */}
            {(() => {
              const imgDoc = reviewApp.submittedDocs?.find((d) =>
                d.startsWith('/uploads') || d.startsWith('http') || d.startsWith('data:image') || /\.(png|jpe?g|webp)$/i.test(d)
              );
              if (!imgDoc) return null;
              const fullUrl = getImageUrl(imgDoc);
              return (
                <div style={{ marginBottom: '18px', background: '#F0FDF4', padding: '12px', borderRadius: '12px', border: '1.5px solid #86EFAC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#166534' }}>
                      📸 Attached RSBSA Card / Document:
                    </span>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: '#15803D', fontWeight: 700, textDecoration: 'none' }}
                    >
                      Open Full ↗
                    </a>
                  </div>
                  <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={fullUrl}
                      alt="Attached RSBSA Document"
                      style={{
                        width: '100%',
                        maxHeight: '190px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    />
                  </a>
                </div>
              );
            })()}

            <form onSubmit={handleReviewSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Decision Status</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as ApplicationStatus)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', fontWeight: 600, backgroundColor: '#FFFFFF' }}
                >
                  <option value="under_review">⏳ Under Review</option>
                  <option value="approved">✓ Approved</option>
                  <option value="rejected">✕ Rejected</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Remarks / Feedback for Farmer</label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Provide instructions, pickup schedule, or reason..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setReviewApp(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontWeight: 800 }}
                >
                  {reviewing ? 'Saving...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
