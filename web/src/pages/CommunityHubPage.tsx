import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { communityApi } from '../api/community';
import { getImageUrl } from '../api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import type { Post, PostCategory, ReactionType, Comment, UpdatePostPayload } from '../types/community';
import { ReactionPicker, ReactionBadgeList } from '../components/community/ReactionPicker';
import { VideoPlayer } from '../components/community/VideoPlayer';
import { ReactionModal } from '../components/community/ReactionModal';
import { ShareModal } from '../components/community/ShareModal';

interface FarmingGuide {
  id: string;
  category: 'pest' | 'crop' | 'soil' | 'water' | 'postharvest';
  categoryLabel: string;
  badgeColor: string;
  title: string;
  readTime: string;
  author: string;
  authorRole: string;
  summary: string;
  keySteps: string[];
  fullContent: {
    overview: string;
    materials: string[];
    steps: { stepTitle: string; stepDesc: string }[];
    warnings: string;
  };
}

const sampleGuides: FarmingGuide[] = [
  {
    id: 'guide-1',
    category: 'pest',
    categoryLabel: '🐛 Pest & Disease Control',
    badgeColor: '#BA3C3C',
    title: 'Fall Armyworm (Spodoptera frugiperda) Management in Corn',
    readTime: '6 min read',
    author: 'Dr. Ramon Santos',
    authorRole: 'Licensed Agronomist • DA Region X',
    summary: 'A field handbook for early scout detection, mechanical trap installation, biological wasp release, and organic repellent spraying.',
    keySteps: [
      'Scout fields twice a week starting at V2 seedling emergence.',
      'Check the whorl of corn plants for "window-pane" feeding holes and moist frass.',
      'Apply Trichogramma chilonis beneficial biocontrol cards at 70 cards per hectare.',
      'Target organic Bacillus thuringiensis (Bt) sprays directly into the whorl in the evening.',
    ],
    fullContent: {
      overview: 'Fall Armyworm can devastate up to 80% of corn yield if not addressed before the 3rd larval instar stage. Integrated Pest Management (IPM) balances biological prevention with timely bio-pesticides.',
      materials: [
        'Trichogramma biocontrol cards (free from local DA-BAR or MAO office)',
        'Neem seed kernel extract or Neem oil (cold pressed)',
        'Handheld knapsack sprayer with cone nozzle',
        'Yellow sticky traps for monitoring adult moths',
      ],
      steps: [
        {
          stepTitle: 'Step 1: Early Scouting & Egg Cluster Removal',
          stepDesc: 'Inspect 20 consecutive plants in 5 different quadrants of your field. Look under lower leaves for felt-like, cream-colored egg masses and crush them manually.',
        },
        {
          stepTitle: 'Step 2: Biocontrol Deployment',
          stepDesc: 'Attach Trichogramma cards to the underside of middle leaves spaced 10 meters apart across the field when plants are knee-high.',
        },
        {
          stepTitle: 'Step 3: Targeted Botanical Spraying',
          stepDesc: 'If whorl infestation exceeds 10%, spray Neem extract (50ml/16L knapsack) at 4:30 PM to 6:00 PM so UV sunlight does not degrade the active Azadirachtin compound.',
        },
      ],
      warnings: 'Avoid spraying broad-spectrum pyrethroid chemicals that kill beneficial ladybugs, spiders, and parasitoid wasps.',
    },
  },
  {
    id: 'guide-2',
    category: 'crop',
    categoryLabel: '🌱 Crop Care & Planting',
    badgeColor: '#176B3A',
    title: 'High-Yield Rainy Season Tomato Production & Drainage Guide',
    readTime: '5 min read',
    author: 'Maria Clara, MSc',
    authorRole: 'Horticulture Specialist',
    summary: 'Best practices for raised bed preparation, nylon trellis support, mulching, and prevention of bacterial wilt in wet tropical conditions.',
    keySteps: [
      'Build raised beds at least 25–30cm high with 50cm furrow trenches for rapid water runoff.',
      'Install silver-black plastic mulch to prevent soil splashing onto bottom leaves.',
      'Staking with bamboo trellises allows optimal airflow and reduces fungal spores.',
      'Prune lower suckers up to 20cm above the soil line after first fruit cluster.',
    ],
    fullContent: {
      overview: 'Wet season tomato production offers peak market prices (up to ₱80/kg), but requires rigorous field sanitation and elevated drainage beds to prevent fungal blight and bacterial wilt.',
      materials: [
        'Bacterial wilt-resistant tomato seedlings (e.g. Diamante Max)',
        'Silver-black polyethylene mulch film (1.2m width)',
        'Bamboo poles (1.5m length) and plastic twine',
        'Copper hydroxide fungicide for rainy day protection',
      ],
      steps: [
        {
          stepTitle: 'Step 1: Bed Preparation & Furrowing',
          stepDesc: 'Plow and rotovate the soil twice. Construct raised planting beds 1 meter wide and 30cm high. Space beds 60cm apart for deep drainage furrows.',
        },
        {
          stepTitle: 'Step 2: Mulch Installation & Spacing',
          stepDesc: 'Stretch plastic mulch tightly over beds with silver side facing up. Punch holes 50cm apart in a double-row staggered layout.',
        },
        {
          stepTitle: 'Step 3: Staking and Trellising',
          stepDesc: 'Erect bamboo stakes 2 weeks after transplanting. Tie main stems loosely with twine using figure-8 knots to support heavy fruit clusters.',
        },
      ],
      warnings: 'Never handle or prune wet tomato vines to prevent mechanical transmission of Xanthomonas bacterial spot.',
    },
  },
  {
    id: 'guide-3',
    category: 'soil',
    categoryLabel: '🧪 Soil & Fertilizers',
    badgeColor: '#D97706',
    title: 'Low-Cost Organic Foliar Fertilizer & Compost Tea Preparation',
    readTime: '7 min read',
    author: 'Engr. Dan Bautista',
    authorRole: 'Soil & Plant Nutritionist',
    summary: 'Step-by-step fermentation recipe using local banana trunks, molasses, and aged manure to provide bioavailable nitrogen and potassium.',
    keySteps: [
      'Chop fresh tender banana pseudo-stems or bamboo shoots finely.',
      'Mix 1 part plant material with 1 part crude molasses or brown sugar in an airtight container.',
      'Ferment for 7 days in a shaded, well-ventilated area.',
      'Dilute 2 tablespoons of extracted liquid per 1 liter of non-chlorinated water for foliar spraying.',
    ],
    fullContent: {
      overview: 'Fermented Plant Juice (FPJ) and Fermented Fruit Juice (FFJ) provide beneficial microorganisms, plant growth hormones, and readily absorbable macronutrients at minimal input costs.',
      materials: [
        'Fresh tender vegetative tips (Banana shoot, Kangkong, or Madre de Cacao)',
        'Crude sugarcane molasses or raw muscovado sugar',
        'Food-grade plastic bucket with airtight lid and breather hole',
        'Cheesecloth or fine strainer',
      ],
      steps: [
        {
          stepTitle: 'Step 1: Harvesting Plant Tissues',
          stepDesc: 'Harvest plant materials before sunrise when plant vigor and microbial counts are at their daily peak. Do not wash with chlorinated tap water.',
        },
        {
          stepTitle: 'Step 2: Layering & Compacting',
          stepDesc: 'Chop materials into 1-inch pieces. Layer alternately with molasses in the container. Press down firmly until container is 80% full.',
        },
        {
          stepTitle: 'Step 3: Fermentation & Extraction',
          stepDesc: 'Seal with porous paper or cloth. Store in cool dark room for 7 days. Strain liquid into sanitized glass or plastic bottles with loose caps.',
        },
      ],
      warnings: 'Do not spray foliar nutrients under intense midday sun to prevent leaf scorching. Apply between 6:00 AM – 8:00 AM.',
    },
  },
  {
    id: 'guide-4',
    category: 'water',
    categoryLabel: '💧 Water & Irrigation',
    badgeColor: '#0284C7',
    title: 'Gravity-Fed Drip Irrigation for Smallholder Vegetable Plots',
    readTime: '4 min read',
    author: 'Engr. Rafael Gomez',
    authorRole: 'Agri-Infrastructure Consultant',
    summary: 'Design and assemble an efficient low-cost irrigation system using an elevated 200L drum and perforated drip lines.',
    keySteps: [
      'Elevate a 200-liter drum 1.5 to 2.0 meters above bed level to produce natural 0.2 bar water head.',
      'Install a 120-mesh screen filter at the tank outlet to prevent emitter clogging.',
      'Run a 16mm PE mainline connecting to 12mm lateral lines with 20cm emitter spacing.',
      'Saves up to 60% water compared to furrow flooding and eliminates soil erosion.',
    ],
    fullContent: {
      overview: 'Gravity-fed drip systems deliver uniform root-zone moisture without requiring diesel or electric water pumps, dramatically lowering production costs.',
      materials: [
        '200-liter plastic drum on sturdy timber/concrete stand',
        '1-inch PVC ball valve and threaded bulkhead fitting',
        '120-mesh T-filter (disc or screen)',
        '16mm Polyethylene tubing and micro-drip lateral tapes',
      ],
      steps: [
        {
          stepTitle: 'Step 1: Tank Setup and Elevation',
          stepDesc: 'Place water reservoir on a raised platform at the highest elevation point in your garden. Cover top with fine mosquito netting.',
        },
        {
          stepTitle: 'Step 2: Filter and Sub-main Assembly',
          stepDesc: 'Connect ball valve and mesh filter immediately after the tank drain. Direct mainline along the head of the planting rows.',
        },
        {
          stepTitle: 'Step 3: Laying Drip Lines',
          stepDesc: 'Unroll lateral drip tapes with emitters facing upward. Anchor ends with plastic stakes and flush the lines before sealing the ends with figure-8 clips.',
        },
      ],
      warnings: 'Flush lateral lines every 2 weeks by uncapping ends for 60 seconds to discharge silt and algae accumulations.',
    },
  },
];

interface CommunityHubPageProps {
  initialTab?: 'community' | 'guides' | 'myposts';
}

export const CommunityHubPage: React.FC<CommunityHubPageProps> = ({ initialTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error } = useToast();
  const { user } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<'community' | 'guides' | 'myposts'>(() => {
    if (initialTab) return initialTab;
    if (location.pathname.includes('/guides') || location.hash === '#guides') return 'guides';
    return 'community';
  });

  useEffect(() => {
    if (location.pathname.includes('/guides') || location.hash === '#guides') {
      setActiveTab('guides');
    } else if (location.hash === '#community' || location.pathname === '/community') {
      setActiveTab('community');
    }
  }, [location.hash, location.pathname]);

  const handleTabChange = (tab: 'community' | 'guides' | 'myposts') => {
    setActiveTab(tab);
    if (tab === 'guides') {
      navigate('/community#guides', { replace: true });
    } else if (tab === 'myposts') {
      navigate('/community#myposts', { replace: true });
    } else {
      navigate('/community', { replace: true });
    }
  };

  // Community Forum State
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [forumCategory, setForumCategory] = useState<string>('all');

  // Facebook-Style Composer State
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [composerTitle, setComposerTitle] = useState('');
  const [composerBody, setComposerBody] = useState('');
  const [composerCategory, setComposerCategory] = useState<PostCategory>('crop_advice');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [publishingPost, setPublishingPost] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline Comment State (per post)
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [showInlineCommentsList, setShowInlineCommentsList] = useState<Record<string, boolean>>({});
  const [inlineCommentInputs, setInlineCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [inlineComments, setInlineComments] = useState<Record<string, Comment[]>>({});
  const [loadingInlineComments, setLoadingInlineComments] = useState<Record<string, boolean>>({});

  // Reactions Modal State
  const [activeReactionModalPost, setActiveReactionModalPost] = useState<Post | null>(null);

  // Share Modal State
  const [activeShareModalPost, setActiveShareModalPost] = useState<Post | null>(null);

  // Guides State
  const [guidesSearch, setGuidesSearch] = useState('');
  const [selectedGuideCategory, setSelectedGuideCategory] = useState('all');
  const [activeGuideModal, setActiveGuideModal] = useState<FarmingGuide | null>(null);

  // My Posts State
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loadingMyPosts, setLoadingMyPosts] = useState(false);

  // Edit Post State
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCategory, setEditCategory] = useState<PostCategory>('crop_advice');
  const [savingEdit, setSavingEdit] = useState(false);

  // Post Kebab Menu State (stores the postId of the open menu)
  const [postMenuOpen, setPostMenuOpen] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Fetch posts from backend
  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const data = await communityApi.listPosts(forumCategory === 'all' ? undefined : forumCategory);
      setPosts(data || []);
    } catch (err) {
      console.error('Failed to fetch community posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [forumCategory]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Close kebab menu when clicking outside
  useEffect(() => {
    if (!postMenuOpen) return;
    const handleClickAway = () => setPostMenuOpen(null);
    document.addEventListener('click', handleClickAway);
    return () => document.removeEventListener('click', handleClickAway);
  }, [postMenuOpen]);

  // Load My Posts
  const loadMyPosts = useCallback(async () => {
    setLoadingMyPosts(true);
    try {
      const data = await communityApi.listMyPosts();
      setMyPosts(data || []);
    } catch (err) {
      console.error('Failed to fetch my posts:', err);
    } finally {
      setLoadingMyPosts(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'myposts') loadMyPosts();
  }, [activeTab, loadMyPosts]);

  // Open Edit Modal pre-filled with post data
  const handleOpenEdit = (post: Post) => {
    setPostMenuOpen(null);
    setEditingPost(post);
    setEditTitle(post.title || '');
    setEditBody(post.body || '');
    setEditCategory((post.category as PostCategory) || 'general');
  };

  // Save edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    if (!editBody.trim()) {
      error('Content Required', 'Post text cannot be empty.');
      return;
    }
    setSavingEdit(true);
    try {
      const payload: UpdatePostPayload = {
        title: editTitle.trim() || undefined,
        body: editBody.trim(),
        category: editCategory,
      };
      const updated = await communityApi.updatePost(editingPost.id, payload);
      // Update in main feed
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      // Update in my posts if loaded
      setMyPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingPost(null);
      success('Post Updated', 'Your post has been updated successfully.');
    } catch (err: any) {
      error('Update Failed', err.response?.data?.error || 'Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete post with confirmation
  const handleDeletePost = async (postId: string) => {
    setPostMenuOpen(null);
    setDeletingPostId(postId);
  };

  const confirmDeletePost = async () => {
    if (!deletingPostId) return;
    try {
      await communityApi.deletePost(deletingPostId);
      setPosts((prev) => prev.filter((p) => p.id !== deletingPostId));
      setMyPosts((prev) => prev.filter((p) => p.id !== deletingPostId));
      success('Post Deleted', 'Your post has been removed.');
    } catch (err: any) {
      error('Delete Failed', err.response?.data?.error || 'Please try again.');
    } finally {
      setDeletingPostId(null);
    }
  };

  // Handle LinkedIn-Style Reaction (Optimistic)
  const handleReact = async (postId: string, reaction: ReactionType) => {
    const prevPosts = posts;

    // Optimistically update post reactions
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;

        const currentReaction = p.myReaction;
        const counts = { ...(p.reactionCounts || {} as Record<ReactionType, number>) };
        let total = p.totalReactions || 0;
        let newReaction: ReactionType | undefined = reaction;

        if (currentReaction === reaction) {
          // Toggle off
          newReaction = undefined;
          counts[reaction] = Math.max(0, (counts[reaction] || 1) - 1);
          total = Math.max(0, total - 1);
        } else {
          // If replacing previous reaction
          if (currentReaction) {
            counts[currentReaction] = Math.max(0, (counts[currentReaction] || 1) - 1);
          } else {
            total += 1;
          }
          counts[reaction] = (counts[reaction] || 0) + 1;
        }

        return {
          ...p,
          myReaction: newReaction,
          reactionCounts: counts,
          totalReactions: total,
        };
      })
    );

    try {
      const updated = await communityApi.reactToPost(postId, reaction);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    } catch (err) {
      console.error('Failed to react to post:', err);
      // Rollback on failure
      setPosts(prevPosts);
    }
  };

  // Open Share Dialog
  const handleShare = (e: React.MouseEvent, post: Post) => {
    e.stopPropagation();
    setActiveShareModalPost(post);
  };

  // File Picker Trigger
  const triggerFileSelect = (acceptType: 'image/*' | 'video/*') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 60MB)
    if (file.size > 60 * 1024 * 1024) {
      error('File Too Large', 'Maximum upload size is 60MB. Please choose a smaller photo or video.');
      return;
    }

    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    setMediaFile(file);
    setMediaType(isVideo ? 'video' : 'image');
    setMediaPreview(URL.createObjectURL(file));
    setComposerExpanded(true);
  };

  const clearMediaAttachment = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Publish Post via Facebook-style Composer
  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerBody.trim() && !mediaFile) {
      error('Post Content Required', 'Please write something or attach a photo/video.');
      return;
    }

    setPublishingPost(true);
    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;

      // Upload media if present
      if (mediaFile) {
        setUploadingMedia(true);
        const uploadRes = await communityApi.uploadMedia(mediaFile);
        if (uploadRes.fileType === 'video' || mediaType === 'video') {
          videoUrl = uploadRes.url;
        } else {
          imageUrl = uploadRes.url;
        }
        setUploadingMedia(false);
      }

      const newPost = await communityApi.createPost({
        title: composerTitle.trim() || undefined,
        body: composerBody.trim(),
        category: composerCategory,
        imageUrl,
        videoUrl,
      });

      // Prepend to posts list
      setPosts((prev) => [newPost, ...prev]);

      // Reset composer
      setComposerTitle('');
      setComposerBody('');
      setComposerCategory('crop_advice');
      clearMediaAttachment();
      setComposerExpanded(false);

      success('Post Published!', 'Your post has been shared with the community.');
    } catch (err: any) {
      console.error('Failed to create post:', err);
      error('Failed to Post', err.response?.data?.error || 'Please check your connection and try again.');
    } finally {
      setPublishingPost(false);
      setUploadingMedia(false);
    }
  };

  const loadInlineComments = async (postId: string) => {
    setLoadingInlineComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const data = await communityApi.listComments(postId);
      setInlineComments((prev) => ({ ...prev, [postId]: data || [] }));
    } catch (err) {
      console.error('Failed to load inline comments:', err);
    } finally {
      setLoadingInlineComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // User clicks on existing comments count ("2 comments", "1 comment"):
  // Show Image 1 UI: existing comments list + reply input + view full thread link
  const handleClickExistingComments = (postId: string) => {
    if (activeCommentPostId === postId && showInlineCommentsList[postId]) {
      // Toggle close
      setActiveCommentPostId(null);
      setShowInlineCommentsList((prev) => ({ ...prev, [postId]: false }));
    } else {
      setActiveCommentPostId(postId);
      setShowInlineCommentsList((prev) => ({ ...prev, [postId]: true }));
      if (!inlineComments[postId]) {
        loadInlineComments(postId);
      }
    }
  };

  // User clicks on "Comment" action button:
  // Show Image 2 UI: ONLY the comment input composer box!
  const handleClickCommentButton = (postId: string) => {
    if (activeCommentPostId === postId && !showInlineCommentsList[postId]) {
      // Toggle close if already open in input-only mode
      setActiveCommentPostId(null);
    } else {
      setActiveCommentPostId(postId);
      setShowInlineCommentsList((prev) => ({ ...prev, [postId]: false }));
      setTimeout(() => {
        document.getElementById(`comment-input-${postId}`)?.focus();
      }, 50);
    }
  };

  // Inline comment submission
  const handleInlineCommentSubmit = async (postId: string) => {
    const text = inlineCommentInputs[postId]?.trim();
    if (!text) return;

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const newComment = await communityApi.createComment(postId, { body: text });
      setInlineCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p))
      );
      setInlineComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));
      success('Comment Posted', 'Your reply has been added.');
    } catch (err: any) {
      error('Failed to post reply', err.response?.data?.error || 'Please try again.');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'farmer':
        return { label: '🌾 Farmer', bg: '#dcfce7', color: '#15803d' };
      case 'supplier':
        return { label: '🏪 Supplier', bg: '#e0f2fe', color: '#0369a1' };
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
        return '🌱 Crop Care';
      case 'pest_control':
        return '🐛 Pest Control';
      case 'market_talk':
        return '💰 Market & Prices';
      case 'equipment':
        return '🚜 Equipment';
      case 'general':
      default:
        return '🌾 General Farming';
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
      return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Filtered Guides
  const filteredGuides = sampleGuides.filter((g) => {
    const matchesCat = selectedGuideCategory === 'all' || g.category === selectedGuideCategory;
    const matchesSearch =
      !guidesSearch.trim() ||
      g.title.toLowerCase().includes(guidesSearch.toLowerCase()) ||
      g.summary.toLowerCase().includes(guidesSearch.toLowerCase()) ||
      g.author.toLowerCase().includes(guidesSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="app-container" style={{ paddingBottom: '60px' }}>
      {/* ─── Page Header ─── */}
      <div className="community-header-wrap" style={{ marginBottom: '24px' }}>
        <div className="community-header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <h1 className="community-title" style={{ fontSize: '32px', fontWeight: 800, color: '#0E4A27', margin: 0 }}>
              {activeTab === 'community' ? 'Agricultural Community & Media Feed'
                : activeTab === 'myposts' ? 'My Posts'
                : 'Agricultural Learning Hub & Field Guides'}
            </h1>
            <p className="community-subtitle" style={{ fontSize: '16px', color: '#525450', marginTop: '6px', marginBottom: 0, maxWidth: '780px', lineHeight: 1.5 }}>
              {activeTab === 'community'
                ? 'Share crop videos, field photos, discuss wholesale market prices, and connect with farmers, suppliers, and agronomists across regions.'
                : activeTab === 'myposts'
                ? 'Manage all the posts you have shared with the community. Edit or delete your posts here.'
                : 'Practical, step-by-step agricultural handbooks, pest identification sheets, and crop management manuals.'}
            </p>
          </div>
        </div>

        {/* ─── Top Segregated Navigation Tabs ─── */}
        <div
          className="community-tabs-bar segmented-tabs-bar"
          style={{
            display: 'inline-flex',
            background: '#EAECE9',
            padding: '5px',
            borderRadius: '16px',
            gap: '4px',
          }}
        >
          <button
            onClick={() => handleTabChange('community')}
            className={`segmented-tab-btn ${activeTab === 'community' ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'community' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'community' ? '#0E4A27' : '#525450',
              boxShadow: activeTab === 'community' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <span>🌾</span>
            <span>Community Feed</span>
          </button>

          <button
            onClick={() => handleTabChange('guides')}
            className={`segmented-tab-btn ${activeTab === 'guides' ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'guides' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'guides' ? '#0E4A27' : '#525450',
              boxShadow: activeTab === 'guides' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <span>📖</span>
            <span>Learn & Field Guides</span>
          </button>

          {user && (
            <button
              onClick={() => handleTabChange('myposts')}
              className={`segmented-tab-btn ${activeTab === 'myposts' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '12px',
                border: 'none',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === 'myposts' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'myposts' ? '#0E4A27' : '#525450',
                boxShadow: activeTab === 'myposts' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <span>📝</span>
              <span>My Posts</span>
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 1: COMMUNITY FORUM & FACEBOOK-STYLE MEDIA FEED
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'community' && (
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          {/* Hidden File Input for Image/Video Attachments */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* ─── Facebook-Style Rich Feed Composer Card ─── */}
          <div
            className={`card community-composer-card ${composerExpanded ? 'expanded' : 'collapsed'}`}
            style={{
              padding: '20px',
              marginBottom: '24px',
              borderRadius: '20px',
              border: '1.5px solid #D1E7D8',
              background: '#FFFFFF',
              boxShadow: '0 4px 18px rgba(14, 74, 39, 0.06)',
            }}
          >
            <form onSubmit={handlePublishPost}>
              {/* Top Row: User Avatar & Input / Textarea */}
              <div className="community-composer-row" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div
                  className="community-composer-avatar"
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0E4A27',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '18px',
                    border: '2px solid #C8E6D2',
                  }}
                >
                  {user?.photoUrl ? (
                    <img
                      src={getImageUrl(user.photoUrl)}
                      alt={user.firstName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    user?.firstName ? user.firstName.charAt(0).toUpperCase() : '👨‍🌾'
                  )}
                </div>

                <div className="community-composer-main" style={{ flex: 1 }}>
                  {!composerExpanded ? (
                    <div
                      className="community-composer-pill"
                      onClick={() => setComposerExpanded(true)}
                      style={{
                        background: '#F8FAFC',
                        borderRadius: '24px',
                        padding: '12px 20px',
                        border: '1px solid #CBD5E1',
                        color: '#64748B',
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F1F5F9';
                        e.currentTarget.style.borderColor = '#176B3A';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#CBD5E1';
                      }}
                    >
                      <span className="community-composer-placeholder-full">What's happening on your farm, {user?.firstName || 'farmer'}? Share photo, video or advice...</span>
                      <span className="community-composer-placeholder-compact">What's happening on your farm? Share update...</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <input
                        type="text"
                        placeholder="Post Title (optional)"
                        value={composerTitle}
                        onChange={(e) => setComposerTitle(e.target.value)}
                        className="community-composer-title-input"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: '1.5px solid #E2E8F0',
                          fontSize: '16px',
                          fontWeight: 700,
                          outline: 'none',
                        }}
                      />
                      <textarea
                        rows={3}
                        autoFocus
                        placeholder={`What's happening on your farm, ${user?.firstName || 'farmer'}? Write details, ask questions, or describe your video/photo...`}
                        value={composerBody}
                        onChange={(e) => setComposerBody(e.target.value)}
                        className="community-composer-body-input"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1.5px solid #E2E8F0',
                          fontSize: '15px',
                          outline: 'none',
                          resize: 'vertical',
                          lineHeight: 1.5,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Media Attachment Live Preview (Image or Video) */}
              {mediaPreview && (
                <div
                  style={{
                    position: 'relative',
                    marginTop: '16px',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    border: '1px solid #E2E8F0',
                    background: '#000000',
                  }}
                >
                  {mediaType === 'video' ? (
                    <video
                      src={mediaPreview}
                      controls
                      style={{ width: '100%', maxHeight: '380px', objectFit: 'contain' }}
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Upload preview"
                      style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', background: '#F8FAFC' }}
                    />
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={clearMediaAttachment}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(0, 0, 0, 0.7)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 800,
                    }}
                    title="Remove attachment"
                  >
                    ✕
                  </button>

                  <div
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '12px',
                      background: 'rgba(0,0,0,0.7)',
                      color: '#FFFFFF',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {mediaType === 'video' ? '🎥 Video Attached' : '📷 Photo Attached'}
                    {mediaFile && ` • ${(mediaFile.size / (1024 * 1024)).toFixed(1)} MB`}
                  </div>
                </div>
              )}

              {/* Upload Progress Alert */}
              {uploadingMedia && (
                <div
                  style={{
                    marginTop: '14px',
                    padding: '10px 14px',
                    background: '#EAF6EE',
                    borderRadius: '10px',
                    color: '#0E4A27',
                    fontSize: '14px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span className="animate-spin">⏳</span>
                  <span>Uploading media to Cloudflare R2 storage... please wait.</span>
                </div>
              )}

              {/* Bottom Quick Attachment & Post Controls */}
              <div
                className="community-composer-actions"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid #F1F5F9',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                {/* Left Attachment Buttons */}
                <div className="community-composer-tools" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => triggerFileSelect('image/*')}
                    className="community-composer-tool-btn community-composer-btn-photo"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#15803d',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#DCFCE7'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                  >
                    <span>📷</span>
                    <span>Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerFileSelect('video/*')}
                    className="community-composer-tool-btn community-composer-btn-video"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#2563EB',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#DBEAFE'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                  >
                    <span>🎥</span>
                    <span>Video</span>
                  </button>

                  {/* Category Selector */}
                  <select
                    value={composerCategory}
                    onChange={(e) => {
                      setComposerCategory(e.target.value as PostCategory);
                      setComposerExpanded(true);
                    }}
                    className="community-composer-category-select"
                    style={{
                      padding: '8px 12px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      background: '#F8FAFC',
                      color: '#334155',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="crop_advice">🌱 Crop Care</option>
                    <option value="pest_control">🐛 Pest Control</option>
                    <option value="market_talk">💰 Market & Prices</option>
                    <option value="equipment">🚜 Equipment</option>
                    <option value="general">🌾 General Farming</option>
                  </select>
                </div>

                {/* Right Post Trigger Button */}
                <div className="community-composer-submit-wrap" style={{ display: 'flex', gap: '8px' }}>
                  {composerExpanded && (
                    <button
                      type="button"
                      onClick={() => {
                        setComposerExpanded(false);
                        clearMediaAttachment();
                      }}
                      className="btn btn-secondary community-composer-cancel-btn"
                      style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '14px' }}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={publishingPost || (!composerBody.trim() && !mediaFile)}
                    className="btn btn-primary community-composer-post-btn"
                    style={{
                      padding: '8px 22px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 800,
                      boxShadow: '0 2px 8px rgba(23, 107, 58, 0.25)',
                      opacity: publishingPost || (!composerBody.trim() && !mediaFile) ? 0.6 : 1,
                      cursor: publishingPost || (!composerBody.trim() && !mediaFile) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {publishingPost ? 'Publishing...' : 'Post Update'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* ─── Streamlined Category Filter Bar ─── */}
          <div
            className="community-filter-bar"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div className="community-category-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All Feeds' },
                { key: 'crop_advice', label: '🌱 Crop Care' },
                { key: 'pest_control', label: '🐛 Pest Control' },
                { key: 'market_talk', label: '💰 Market & Prices' },
                { key: 'equipment', label: '🚜 Equipment' },
                { key: 'general', label: '🌾 General' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setForumCategory(cat.key)}
                  className={`community-category-pill ${forumCategory === cat.key ? 'active' : ''}`}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '20px',
                    border: forumCategory === cat.key ? '2px solid #0E4A27' : '1.5px solid #CBD5E1',
                    background: forumCategory === cat.key ? '#0E4A27' : '#FFFFFF',
                    color: forumCategory === cat.key ? '#FFFFFF' : '#475569',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    boxShadow: forumCategory === cat.key ? '0 2px 8px rgba(14, 74, 39, 0.2)' : 'none',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </div>
          </div>

          {/* ─── Feed Posts List ─── */}
          {loadingPosts ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '18px', fontWeight: 600 }}>Loading community feed...</div>
            </div>
          ) : posts.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌱</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27', marginBottom: '8px' }}>
                No Posts in this Category Yet
              </div>
              <p style={{ fontSize: '16px', marginBottom: '20px' }}>
                Be the first to share a farm photo, video update, or agricultural question!
              </p>
              <button onClick={() => setComposerExpanded(true)} className="btn btn-primary">
                + Write the First Post
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {posts.map((post) => {
                const rBadge = getRoleBadge(post.authorRole);
                const isLGU = post.authorRole === 'lgu_staff';
                const isCommentOpen = activeCommentPostId === post.id;

                return (
                  <div
                    key={post.id}
                    className="feed-post-card"
                    style={{
                      borderLeft: isLGU ? '6px solid #0D9488' : '4px solid #16a34a',
                    }}
                  >
                    {/* Author Header */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '14px',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            backgroundColor: isLGU ? '#0D9488' : '#16a34a',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '17px',
                            position: 'relative',
                            flexShrink: 0,
                          }}
                        >
                          <span>{post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U'}</span>
                          {post.authorPhotoUrl && (
                            <img
                              src={getImageUrl(post.authorPhotoUrl)}
                              alt={post.authorName}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                              {post.authorName}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                color: rBadge.color,
                                backgroundColor: rBadge.bg,
                                padding: '2px 8px',
                                borderRadius: '10px',
                              }}
                            >
                              {rBadge.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{formatTimeAgo(post.createdAt)}</span>
                            <span>•</span>
                            <span
                              style={{
                                color: '#0E4A27',
                                fontWeight: 700,
                              }}
                            >
                              {getCategoryLabel(post.category)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ⋯ Kebab menu — only for the post author */}
                      {user && post.authorId === user.id && (
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPostMenuOpen(postMenuOpen === post.id ? null : post.id);
                            }}
                            title="Post options"
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: '22px', color: '#94A3B8', lineHeight: 1,
                              padding: '4px 8px', borderRadius: '8px',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                          >
                            ⋯
                          </button>
                          {postMenuOpen === post.id && (
                            <div
                              style={{
                                position: 'absolute', top: '100%', right: 0, zIndex: 50,
                                background: '#FFFFFF', borderRadius: '14px',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.14)',
                                border: '1px solid #E2E8F0',
                                minWidth: '160px', overflow: 'hidden', marginTop: '4px',
                              }}
                            >
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenEdit(post); }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '10px',
                                  width: '100%', padding: '12px 16px', border: 'none',
                                  background: 'none', textAlign: 'left', cursor: 'pointer',
                                  fontSize: '14px', color: '#15803D', fontWeight: 700,
                                  transition: 'background 0.12s ease',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#F0FDF4'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                              >
                                ✏️ Edit Post
                              </button>
                              <div style={{ height: '1px', background: '#F1F5F9', margin: '0 12px' }} />
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '10px',
                                  width: '100%', padding: '12px 16px', border: 'none',
                                  background: 'none', textAlign: 'left', cursor: 'pointer',
                                  fontSize: '14px', color: '#BE123C', fontWeight: 700,
                                  transition: 'background 0.12s ease',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF1F2'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                              >
                                🗑️ Delete Post
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Post Title (if custom title provided and differs from short body) */}
                    {post.title && post.title !== post.body && !post.title.startsWith('Shared a') && (
                      <h2
                        onClick={() => navigate(`/community/posts/${post.id}`)}
                        style={{
                          fontSize: '19px',
                          fontWeight: 800,
                          color: '#0E4A27',
                          marginBottom: '8px',
                          lineHeight: 1.35,
                          cursor: 'pointer',
                        }}
                      >
                        {post.title}
                      </h2>
                    )}

                    {/* Post Text Description */}
                    {post.body && (
                      <p
                        style={{
                          fontSize: '15px',
                          color: '#334155',
                          lineHeight: 1.6,
                          marginBottom: '16px',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {post.body}
                      </p>
                    )}

                    {/* Video Player Media Rendering */}
                    {post.videoUrl && (
                      <div style={{ marginBottom: '16px' }}>
                        <VideoPlayer src={post.videoUrl} />
                      </div>
                    )}

                    {/* Image Media Rendering */}
                    {!post.videoUrl && post.imageUrl && (
                      <div
                        onClick={() => navigate(`/community/posts/${post.id}`)}
                        style={{
                          marginBottom: '16px',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          background: '#000000',
                        }}
                      >
                        <img
                          src={getImageUrl(post.imageUrl)}
                          alt={post.title || 'Post attachment'}
                          style={{
                            width: '100%',
                            maxHeight: '520px',
                            objectFit: 'contain',
                            display: 'block',
                            margin: '0 auto',
                          }}
                        />
                      </div>
                    )}

                    {/* Embedded Quoted Post (if this is a repost) */}
                    {post.sharedPost && (
                      <div
                        onClick={() => navigate(`/community/posts/${post.sharedPost?.id}`)}
                        style={{
                          marginBottom: '16px',
                          border: '1.5px solid #E2E8F0',
                          borderRadius: '16px',
                          padding: '16px',
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
                              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
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
                            <span style={{ fontSize: '11px', color: '#64748B' }}>
                              {formatTimeAgo(post.sharedPost.createdAt)}
                            </span>
                          </div>
                        </div>

                        {post.sharedPost.title && post.sharedPost.title !== post.sharedPost.body && !post.sharedPost.title.startsWith('Shared a') && (
                          <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 800, color: '#0E4A27' }}>
                            {post.sharedPost.title}
                          </h4>
                        )}

                        {post.sharedPost.body && (
                          <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {post.sharedPost.body}
                          </p>
                        )}

                        {post.sharedPost.videoUrl && (
                          <div style={{ marginTop: '10px' }} onClick={(e) => e.stopPropagation()}>
                            <VideoPlayer src={post.sharedPost.videoUrl} />
                          </div>
                        )}

                        {!post.sharedPost.videoUrl && post.sharedPost.imageUrl && (
                          <div style={{ marginTop: '10px', borderRadius: '12px', overflow: 'hidden', maxHeight: '350px', background: '#000' }}>
                            <img
                              src={getImageUrl(post.sharedPost.imageUrl)}
                              alt={post.sharedPost.title || 'Attached media'}
                              style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* LinkedIn-Style Reaction Counts & Comment Metrics Bar */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 4px 12px 4px',
                        borderBottom: '1px solid #F1F5F9',
                        fontSize: '13px',
                        color: '#64748B',
                      }}
                    >
                      <div>
                        <ReactionBadgeList
                          reactionCounts={post.reactionCounts}
                          totalReactions={post.totalReactions || post.upvotes || 0}
                          onClick={() => setActiveReactionModalPost(post)}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '14px' }}>
                        <span
                          onClick={() => handleClickExistingComments(post.id)}
                          style={{ cursor: 'pointer', fontWeight: 600 }}
                          className="hover:underline"
                          title="View existing comments"
                        >
                          {post.commentsCount || 0} {post.commentsCount === 1 ? 'comment' : 'comments'}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Action Bar: LinkedIn Multi-Reaction + Comment + Share */}
                    <div className="post-action-bar">
                      {/* LinkedIn Multi-Reaction Picker */}
                      <ReactionPicker
                        myReaction={post.myReaction}
                        totalReactions={post.totalReactions}
                        reactionCounts={post.reactionCounts}
                        onReact={(r) => handleReact(post.id, r)}
                      />

                      {/* Comment Button (Opens input-only composer: Image 2) */}
                      <button
                        type="button"
                        onClick={() => handleClickCommentButton(post.id)}
                        className={`post-action-btn ${isCommentOpen && !showInlineCommentsList[post.id] ? 'active-like' : ''}`}
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

                      {/* Share Button */}
                      <button
                        type="button"
                        onClick={(e) => handleShare(e, post)}
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

                    {/* Inline Comment Thread & Input Box (Facebook-style) */}
                    {isCommentOpen && (
                      <div
                        style={{
                          marginTop: '14px',
                          paddingTop: '14px',
                          borderTop: '1px solid #F1F5F9',
                        }}
                      >
                        {/* Inline Comments from Others: ONLY displayed if user clicked existing comments (Image 1) */}
                        {showInlineCommentsList[post.id] && (
                          loadingInlineComments[post.id] ? (
                            <div style={{ padding: '12px 0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                              Loading comments...
                            </div>
                          ) : inlineComments[post.id] && inlineComments[post.id].length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                              {inlineComments[post.id].map((c) => {
                                const cBadge = getRoleBadge(c.authorRole);
                                return (
                                  <div key={c.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <div
                                      style={{
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        backgroundColor: c.authorRole === 'lgu_staff' ? '#0D9488' : '#0E4A27',
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
                                      <span>{c.authorName ? c.authorName.charAt(0).toUpperCase() : 'U'}</span>
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
                                    <div
                                      style={{
                                        flex: 1,
                                        backgroundColor: '#F1F5F9',
                                        borderRadius: '16px',
                                        padding: '8px 14px',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                                          {c.authorName}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '10px',
                                            fontWeight: 800,
                                            color: cBadge.color,
                                            backgroundColor: cBadge.bg,
                                            padding: '1px 6px',
                                            borderRadius: '8px',
                                          }}
                                        >
                                          {cBadge.label}
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: 'auto' }}>
                                          {formatTimeAgo(c.createdAt)}
                                        </span>
                                      </div>
                                      <p style={{ margin: 0, fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                                        {c.body}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ padding: '8px 0 14px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                              No comments yet. Be the first to share your thoughts!
                            </div>
                          )
                        )}

                        {/* Comment Input Composer (Image 2 portion) */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: 0 }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              backgroundColor: '#0E4A27',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '14px',
                              flexShrink: 0,
                              position: 'relative',
                            }}
                          >
                            <span>{user?.firstName ? user.firstName.charAt(0).toUpperCase() : '👨‍🌾'}</span>
                            {user?.photoUrl && (
                              <img
                                src={getImageUrl(user.photoUrl)}
                                alt={user.firstName}
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

                          <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                            <input
                              id={`comment-input-${post.id}`}
                              type="text"
                              placeholder={`Comment as ${user?.firstName || 'farmer'}...`}
                              value={inlineCommentInputs[post.id] || ''}
                              onChange={(e) =>
                                setInlineCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleInlineCommentSubmit(post.id);
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: '9px 16px',
                                borderRadius: '20px',
                                border: '1px solid #CBD5E1',
                                background: '#F8FAFC',
                                fontSize: '14px',
                                outline: 'none',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleInlineCommentSubmit(post.id)}
                              disabled={submittingComment[post.id] || !inlineCommentInputs[post.id]?.trim()}
                              className="btn btn-primary"
                              style={{
                                padding: '8px 16px',
                                borderRadius: '18px',
                                fontSize: '13px',
                                fontWeight: 800,
                              }}
                            >
                              {submittingComment[post.id] ? 'Posting...' : 'Reply'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 2: LEARN & FIELD GUIDES (Handbooks, Pest ID, & Agronomic Manuals)
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'guides' && (
        <div>
          {/* Guides Search & Category Filters */}
          <div className="card guides-filter-card" style={{ padding: '24px', marginBottom: '32px' }}>
            <div className="guides-search-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '18px' }}>
              <div className="guides-search-col">
                <label className="form-label guides-filter-label" style={{ fontWeight: 800 }}>Search Agricultural Guides</label>
                <div className="guides-search-box" style={{ position: 'relative' }}>
                  <span className="guides-search-icon" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#94a3b8' }}>🔍</span>
                  <input
                    type="text"
                    value={guidesSearch}
                    onChange={(e) => setGuidesSearch(e.target.value)}
                    placeholder="Search guides, pests, crops, manuals..."
                    className="form-input guides-search-input"
                    style={{ fontSize: '17px', height: '52px', paddingLeft: '40px' }}
                  />
                </div>
              </div>

              <div className="guides-topic-col">
                <label className="form-label guides-filter-label" style={{ fontWeight: 800 }}>Category Topic</label>
                <select
                  value={selectedGuideCategory}
                  onChange={(e) => setSelectedGuideCategory(e.target.value)}
                  className="form-input guides-topic-select"
                  style={{ fontSize: '17px', height: '52px' }}
                >
                  <option value="all">All Guide Topics (4)</option>
                  <option value="pest">Pest & Disease Control</option>
                  <option value="crop">Crop Care & Planting</option>
                  <option value="soil">Soil & Organic Fertilizers</option>
                  <option value="water">Water & Irrigation</option>
                </select>
              </div>
            </div>

            {/* Quick Filter Tags */}
            <div className="guides-category-scroll" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All Guides' },
                { key: 'pest', label: '🐛 Pest Control' },
                { key: 'crop', label: '🌱 Crop Production' },
                { key: 'soil', label: '🧪 Soil & Fertilizers' },
                { key: 'water', label: '💧 Irrigation' },
              ].map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setSelectedGuideCategory(pill.key)}
                  className={`guides-category-chip ${selectedGuideCategory === pill.key ? 'active' : ''}`}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: selectedGuideCategory === pill.key ? '2px solid #0E4A27' : '1px solid #E2E8F0',
                    background: selectedGuideCategory === pill.key ? '#EAF6EE' : '#FFFFFF',
                    color: selectedGuideCategory === pill.key ? '#0E4A27' : '#525450',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Guides Catalog Cards */}
          <div className="guides-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '26px' }}>
            {filteredGuides.map((guide) => (
              <div
                key={guide.id}
                className="card guide-catalog-card"
                onClick={() => setActiveGuideModal(guide)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '28px',
                  borderTop: `6px solid ${guide.badgeColor}`,
                  borderRadius: '18px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div className="guide-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span
                      className="guide-card-badge"
                      style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        background: '#F1F5F9',
                        color: guide.badgeColor,
                        fontWeight: 800,
                        fontSize: '13px',
                      }}
                    >
                      {guide.categoryLabel}
                    </span>
                    <span className="guide-card-time" style={{ fontSize: '14px', color: '#525450', fontWeight: 600 }}>
                      ⏱️ {guide.readTime}
                    </span>
                  </div>

                  <h3 className="guide-card-title" style={{ fontSize: '22px', fontWeight: 800, color: '#0E4A27', marginBottom: '10px', lineHeight: 1.3 }}>
                    {guide.title}
                  </h3>

                  <div className="guide-card-author" style={{ fontSize: '14px', color: '#525450', marginBottom: '14px', fontWeight: 600 }}>
                    ✍️ By <strong>{guide.author}</strong> ({guide.authorRole})
                  </div>

                  <p className="guide-card-summary" style={{ fontSize: '16px', color: '#334155', lineHeight: 1.5, marginBottom: '18px' }}>
                    {guide.summary}
                  </p>

                  <div className="guide-card-checklist" style={{ background: '#F8FAF8', padding: '14px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0E4A27', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Key Field Action Checklist:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
                      {guide.keySteps.slice(0, 3).map((s, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveGuideModal(guide);
                  }}
                  className="btn btn-primary btn-full guide-card-btn"
                  style={{ fontSize: '16px', fontWeight: 800 }}
                >
                  <span className="guide-card-btn-text-full">Read Full Guide & Protocol →</span>
                  <span className="guide-card-btn-text-compact">Read Guide →</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Guide Reader Modal ─── */}
      {activeGuideModal && (
        <div className="modal-backdrop" onClick={() => setActiveGuideModal(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '36px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span
                  style={{
                    padding: '6px 14px',
                    borderRadius: '12px',
                    background: '#F1F5F9',
                    color: activeGuideModal.badgeColor,
                    fontWeight: 800,
                    fontSize: '14px',
                  }}
                >
                  {activeGuideModal.categoryLabel}
                </span>
                <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0E4A27', margin: '12px 0 6px 0' }}>
                  {activeGuideModal.title}
                </h2>
                <div style={{ fontSize: '15px', color: '#525450', fontWeight: 600 }}>
                  👨‍🌾 Prepared by <strong>{activeGuideModal.author}</strong> ({activeGuideModal.authorRole}) • ⏱️ {activeGuideModal.readTime}
                </div>
              </div>

              <button
                onClick={() => setActiveGuideModal(null)}
                style={{ background: '#F8F7F3', border: 'none', fontSize: '22px', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '18px', background: '#F8FAF8', borderRadius: '14px', borderLeft: `6px solid ${activeGuideModal.badgeColor}`, marginBottom: '24px' }}>
              <div style={{ fontWeight: 800, fontSize: '16px', color: '#0E4A27', marginBottom: '4px' }}>
                Protocol Overview:
              </div>
              <p style={{ margin: 0, fontSize: '16px', color: '#334155', lineHeight: 1.6 }}>
                {activeGuideModal.fullContent.overview}
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27', marginBottom: '12px' }}>
                🛠️ Required Inputs & Materials
              </h3>
              <ul style={{ margin: 0, paddingLeft: '22px', fontSize: '16px', color: '#334155', lineHeight: 1.6 }}>
                {activeGuideModal.fullContent.materials.map((m, idx) => (
                  <li key={idx} style={{ marginBottom: '6px' }}>{m}</li>
                ))}
              </ul>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0E4A27', marginBottom: '14px' }}>
                📋 Practical Step-by-Step Procedure
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activeGuideModal.fullContent.steps.map((st, idx) => (
                  <div key={idx} style={{ padding: '18px', borderRadius: '14px', background: '#FFFFFF', border: '1.5px solid #E2E8F0' }}>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#0E4A27', marginBottom: '6px' }}>
                      {st.stepTitle}
                    </div>
                    <p style={{ margin: 0, fontSize: '16px', color: '#475569', lineHeight: 1.6 }}>
                      {st.stepDesc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Critical Field Warning */}
            <div style={{ padding: '18px', borderRadius: '14px', background: '#FEF2F2', border: '2px solid #F87171', marginBottom: '28px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> Critical Field Safety Warning:
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '15px', color: '#7F1D1D', lineHeight: 1.5 }}>
                {activeGuideModal.fullContent.warnings}
              </p>
            </div>

            <button
              onClick={() => setActiveGuideModal(null)}
              className="btn btn-secondary btn-full btn-large"
              style={{ fontSize: '17px' }}
            >
              Close Guide Reader
            </button>
          </div>
        </div>
      )}

      {/* ─── Reaction Details Modal ─── */}
      {activeReactionModalPost && (
        <ReactionModal
          postId={activeReactionModalPost.id}
          isOpen={!!activeReactionModalPost}
          onClose={() => setActiveReactionModalPost(null)}
          initialReactions={activeReactionModalPost.reactions}
        />
      )}

      {/* ─── Social Share Modal ─── */}
      {activeShareModalPost && (
        <ShareModal
          post={activeShareModalPost}
          isOpen={!!activeShareModalPost}
          onClose={() => setActiveShareModalPost(null)}
          onPostShared={(newPost) => setPosts((prev) => [newPost, ...prev])}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════
          MY POSTS TAB PANEL
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'myposts' && (
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          {loadingMyPosts ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
              <p style={{ fontSize: '16px', margin: 0 }}>Loading your posts…</p>
            </div>
          ) : myPosts.length === 0 ? (
            <div
              style={{
                textAlign: 'center', padding: '60px 20px',
                background: '#FFFFFF', borderRadius: '20px',
                border: '1.5px dashed #C8E6D2',
              }}
            >
              <div style={{ fontSize: '52px', marginBottom: '12px' }}>🌾</div>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#0E4A27', margin: '0 0 6px' }}>No Posts Yet</p>
              <p style={{ fontSize: '15px', color: '#64748B', margin: 0 }}>You haven't shared anything with the community yet.</p>
            </div>
          ) : (
            myPosts.map((post) => (
              <div
                key={post.id}
                style={{
                  background: '#FFFFFF', borderRadius: '20px',
                  border: '1.5px solid #E2EBE6', marginBottom: '20px',
                  boxShadow: '0 4px 18px rgba(14,74,39,0.06)', overflow: 'visible',
                  position: 'relative',
                }}
              >
                {/* Post Author Row + Edit/Delete controls */}
                <div style={{ padding: '18px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden',
                      background: '#0E4A27', color: '#fff', fontWeight: 800, fontSize: '18px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {post.authorPhotoUrl
                        ? <img src={getImageUrl(post.authorPhotoUrl)} alt={post.authorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : post.authorName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>{post.authorName}</div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{formatTimeAgo(post.createdAt)}</div>
                    </div>
                  </div>
                  {/* Edit / Delete buttons always visible on My Posts */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleOpenEdit(post)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '7px 14px', borderRadius: '10px',
                        background: '#F0FDF4', border: '1px solid #BBF7D0',
                        color: '#15803D', fontWeight: 700, fontSize: '13px',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#DCFCE7'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#F0FDF4'; }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '7px 14px', borderRadius: '10px',
                        background: '#FFF1F2', border: '1px solid #FECDD3',
                        color: '#BE123C', fontWeight: 700, fontSize: '13px',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FFE4E6'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#FFF1F2'; }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* Post Body */}
                <div style={{ padding: '14px 20px 16px' }}>
                  {post.title && (
                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#1E293B', marginBottom: '6px' }}>{post.title}</div>
                  )}
                  {post.body && (
                    <p style={{ fontSize: '15px', color: '#334155', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{post.body}</p>
                  )}
                </div>

                {/* Post Image */}
                {post.imageUrl && (
                  <div style={{ padding: '0 20px 16px' }}>
                    <img src={getImageUrl(post.imageUrl)} alt="Post" style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', maxHeight: '360px' }} />
                  </div>
                )}

                {/* Post Video */}
                {post.videoUrl && (
                  <div style={{ padding: '0 20px 16px' }}>
                    <VideoPlayer src={getImageUrl(post.videoUrl)} />
                  </div>
                )}

                {/* Stats row */}
                <div style={{
                  padding: '10px 20px 14px', borderTop: '1px solid #F1F5F9',
                  display: 'flex', gap: '16px', fontSize: '13px', color: '#64748B',
                }}>
                  <span>❤️ {post.totalReactions || 0} reactions</span>
                  <span>💬 {post.commentsCount || 0} comments</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: '12px',
                    background: '#F1F5F9', borderRadius: '8px', padding: '3px 10px',
                  }}>{getCategoryLabel(post.category)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Edit Post Modal ─── */}
      {editingPost && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditingPost(null); }}
        >
          <div
            style={{
              background: '#FFFFFF', borderRadius: '24px',
              padding: '32px', width: '100%', maxWidth: '580px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0E4A27' }}>✏️ Edit Post</h2>
              <button
                onClick={() => setEditingPost(null)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94A3B8', lineHeight: 1 }}
              >×</button>
            </div>

            <form onSubmit={handleSaveEdit}>
              {/* Category */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as PostCategory)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '12px',
                    border: '1.5px solid #D1E7D8', fontSize: '14px', color: '#1E293B',
                    background: '#F8FAFC', outline: 'none',
                  }}
                >
                  <option value="general">🌾 General Farming</option>
                  <option value="crop_advice">🌱 Crop Care & Advice</option>
                  <option value="pest_control">🐛 Pest & Disease Control</option>
                  <option value="market_talk">💰 Market & Prices</option>
                  <option value="equipment">🚜 Equipment & Tools</option>
                </select>
              </div>

              {/* Optional title */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>Title (optional)</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Give your post a headline…"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '12px',
                    border: '1.5px solid #D1E7D8', fontSize: '14px', color: '#1E293B',
                    background: '#F8FAFC', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Body */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>Post Content *</label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={5}
                  placeholder="What would you like to share…"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '12px',
                    border: '1.5px solid #D1E7D8', fontSize: '14px', color: '#1E293B',
                    background: '#F8FAFC', outline: 'none', resize: 'vertical',
                    lineHeight: 1.6, boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    border: '1.5px solid #D1FAE5', background: '#F0FDF4',
                    color: '#15803D', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    border: 'none', background: savingEdit ? '#86EFAC' : '#0E4A27',
                    color: '#FFFFFF', fontWeight: 700, fontSize: '15px',
                    cursor: savingEdit ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease',
                  }}
                >
                  {savingEdit ? 'Saving…' : '✅ Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {deletingPostId && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1001,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeletingPostId(null); }}
        >
          <div
            style={{
              background: '#FFFFFF', borderRadius: '24px',
              padding: '32px', width: '100%', maxWidth: '440px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '52px', marginBottom: '16px' }}>🗑️</div>
            <h2 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: 800, color: '#1E293B' }}>Delete Post?</h2>
            <p style={{ margin: '0 0 28px', fontSize: '15px', color: '#64748B', lineHeight: 1.6 }}>
              This post will be removed from the community feed. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeletingPostId(null)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  border: '1.5px solid #E2E8F0', background: '#F8FAFC',
                  color: '#475569', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePost}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  border: 'none', background: '#DC2626',
                  color: '#FFFFFF', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
