// UserProfile.tsx - Facebook-style professional layout with infinite scroll
import React, { useEffect, useState, useRef, useMemo, useContext, useCallback } from 'react';
import { User, Post as PostType, ReactionType, Reel, AudioTrack, Product, Group, Brand } from '../types';
import { ChatsList } from './ChatsList';
import { MarketplaceContext } from '../App';
import { VerifiedBadge } from './VerifiedBadge';

// Import from Feed.tsx
import {
  EventPost,
  PeopleYouMayKnowGrid,
  SuggestedProductsWidget,
  ShareBottomSheet,
  CommentsSheet,
  ReactionsSheet,
  GalleryViewer,
  CreatePost,
  CreatePostModal,
  avatarFrom,
  formatRelativeTime,
  getMediaTypeInfo,
  safeArray,
  safeNumber,
  safeString,
  safePostId,
  safeUserId,
  safeParseJsonArray,
  getMarketplaceProductId,
  getMarketplaceImages,
  getMarketplacePriceLine,
  normalizeEventFromFeed,
  Post,
  normalizeReelFromFeed,
  formatReelCount,
  getReelAuthorName,
  getPostMediaList,
  MediaGrid,
  ProgressiveFeedImage
} from './Feed';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const safeArrayHelper = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
const safeNumberHelper = (v: any, fallback = 0) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const safeStringHelper = (v: any, fallback = '') => (typeof v === 'string' ? v : fallback);
const safePostIdHelper = (p: any) => safeNumberHelper(p?.id ?? p?.post_id ?? p?.postId, 0);
const safeUserIdHelper = (u: any) => safeNumberHelper(u?.id ?? u?.user_id ?? u?.userId, 0);

// Add CSS for hiding scrollbar
const scrollbarHideStyles = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('user-profile-styles')) {
  const style = document.createElement('style');
  style.id = 'user-profile-styles';
  style.textContent = scrollbarHideStyles;
  document.head.appendChild(style);
}

interface EditProfileModalProps {
  user: User;
  onClose: () => void;
  onSave: (updatedData: Partial<User>) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onSave }) => {
  const [bio, setBio] = useState(safeStringHelper((user as any).bio, ''));
  const [work, setWork] = useState(safeStringHelper((user as any).work, ''));
  const [education, setEducation] = useState(safeStringHelper((user as any).education, ''));
  const [location, setLocation] = useState(safeStringHelper((user as any).location, ''));
  const [website, setWebsite] = useState(safeStringHelper((user as any).website, ''));

  const handleSave = () => {
    onSave({ bio, work, education, location, website });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-[#0F172A] w-full max-w-[600px] rounded-xl border border-[#1E293B] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-[#1E293B] flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#F8FAFC]">Edit Profile</h2>
          <div
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1E293B] hover:bg-[#334155] flex items-center justify-center cursor-pointer"
          >
            <i className="fas fa-times text-[#94A3B8]"></i>
          </div>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          <div>
            <label className="text-[#F8FAFC] font-bold text-sm block mb-1">Bio</label>
            <textarea
              className="w-full bg-[#1E293B] border border-[#1E293B] rounded-lg p-3 text-[#F8FAFC] outline-none focus:border-[#1877F2] text-center"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe yourself..."
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-[#F8FAFC] font-bold text-lg">Details</h3>

            <div>
              <div className="flex items-center gap-2 mb-1 text-[#94A3B8]">
                <i className="fas fa-briefcase w-5 text-center"></i>
                <span className="text-sm">Work</span>
              </div>
              <input
                type="text"
                className="w-full bg-[#1E293B] border border-[#1E293B] rounded-lg p-2.5 text-[#F8FAFC] outline-none focus:border-[#1877F2]"
                value={work}
                onChange={(e) => setWork(e.target.value)}
                placeholder="Add a workplace"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 text-[#94A3B8]">
                <i className="fas fa-graduation-cap w-5 text-center"></i>
                <span className="text-sm">Education</span>
              </div>
              <input
                type="text"
                className="w-full bg-[#1E293B] border border-[#1E293B] rounded-lg p-2.5 text-[#F8FAFC] outline-none focus:border-[#1877F2]"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="Add a high school or university"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 text-[#94A3B8]">
                <i className="fas fa-map-marker-alt w-5 text-center"></i>
                <span className="text-sm">Location</span>
              </div>
              <input
                type="text"
                className="w-full bg-[#1E293B] border border-[#1E293B] rounded-lg p-2.5 text-[#F8FAFC] outline-none focus:border-[#1877F2]"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add current city"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 text-[#94A3B8]">
                <i className="fas fa-link w-5 text-center"></i>
                <span className="text-sm">Website</span>
              </div>
              <input
                type="text"
                className="w-full bg-[#1E293B] border border-[#1E293B] rounded-lg p-2.5 text-[#F8FAFC] outline-none focus:border-[#1877F2]"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="Add website link"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#1E293B] bg-[#0F172A] rounded-b-xl">
          <button
            onClick={handleSave}
            className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-2.5 rounded-lg font-bold shadow-md transition-colors active:scale-95 active:shadow-inner"
          >
            Save Details
          </button>
        </div>
      </div>
    </div>
  );
};

interface UserProfileProps {
  user: User;
  currentUser: User | null;
  users: User[];
  posts: PostType[];
  reels?: Reel[];
  stories?: any[];
  products?: Product[];
  groups?: Group[];
  brands?: Brand[];
  onProfileClick: (id: number) => void;

  // FB-logic actions (caller blocks guests)
  onFollow: (id: number) => void;
  onReact: (postId: number, type: ReactionType) => void;
  onComment: (postId: number, text: string) => void;
  onShare: (postId: number, newShareCount: number) => void;
  onMessage: (id: number) => void;

  onCreatePost: (text: string, files: File[], meta?: any) => void;
  onUpdateProfileImage: (file: File) => void;
  onUpdateCoverImage: (file: File) => void;
  onUpdateUserDetails: (data: Partial<User>) => void;
  onDeletePost: (postId: number) => void;
  onEditPost: (postId: number, content: string) => void;

  getCommentAuthor?: (id: number) => User | undefined;
  onViewImage: (url: string) => void;
  onCreateEventClick?: () => void;
  onOpenComments: (postOrId: any) => void;
  onVideoClick: (post: PostType) => void;
  onPlayAudioTrack?: (track: AudioTrack) => void;

  onHashtagClick?: (tag: string) => void;
  onVerifyUser?: (id: number) => void;
  onRestrictUser?: (id: number, duration: "24h" | "5d" | "30d" | "manual") => void;
  onDeleteUser?: (id: number) => void;
  onMakeModerator?: (id: number, make: boolean) => void;
  onCreateStoryClick?: () => void;
  
  fetchProfilePosts?: (profileUserId: number, viewerId: number | null) => Promise<PostType[]>;
  
  // Marketplace handlers
  onViewProduct?: (productId: number) => void;
  onViewProductFromPost?: (productId: number) => void;
  getProductData?: (productId: number) => any;
  
  // Audio player handler
  onOpenAudio?: (item: any) => void;

  // RSVP handler for events
  onRSVP?: (eventId: number, status: 'going' | 'interested' | 'not_going') => Promise<void>;

  // Chat control props
  onOpenChat?: (recipient: User) => void;
  isChatOpen?: boolean;
  activeChatRecipient?: User | null;

  // ChatsList control props
  onOpenChatsList?: () => void;
  isChatsListOpen?: boolean;

  // People suggestions
  peopleSuggestions?: any[];

  // Open Reel handler
  onOpenReel?: (reelId: number | string) => void;
  onBack?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  currentUser,
  users,
  posts,
  reels = [],
  stories = [],
  products = [],
  groups = [],
  brands = [],
  onProfileClick,
  onFollow,
  onReact,
  onComment,
  onShare,
  onMessage,
  onCreatePost,
  onUpdateProfileImage,
  onUpdateCoverImage,
  onUpdateUserDetails,
  onDeletePost,
  onEditPost,
  getCommentAuthor,
  onViewImage,
  onCreateEventClick,
  onOpenComments,
  onVideoClick,
  onPlayAudioTrack,
  onHashtagClick,
  onVerifyUser,
  onRestrictUser,
  onDeleteUser,
  onMakeModerator,
  onCreateStoryClick,
  fetchProfilePosts,
  onViewProduct,
  onViewProductFromPost,
  getProductData,
  onOpenAudio,
  onRSVP,
  onOpenChat,
  isChatOpen,
  activeChatRecipient,
  onOpenChatsList,
  isChatsListOpen,
  peopleSuggestions = [],
  onOpenReel,
  onBack,
}) => {
  // Get MarketplaceContext
  const marketplaceContext = useContext(MarketplaceContext);
  
  const [activeTab, setActiveTab] = useState<'Posts' | 'Videos' | 'Stories' | 'About' | 'Followers' | 'Photos'>('Posts');
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  
  // Pagination states for photos and videos (6 per page + see more)
  const [photosPageSize, setPhotosPageSize] = useState(6);
  const [videosPageSize, setVideosPageSize] = useState(6);
  
  const [isFollowButtonClicked, setIsFollowButtonClicked] = useState(false);

  // ========== INFINITE SCROLL STATES ==========
  const [profileNextCursor, setProfileNextCursor] = useState<string | null>(null);
  const [profileHasMore, setProfileHasMore] = useState(true);
  const [profileLoadingMore, setProfileLoadingMore] = useState(false);
  const profileMoreRef = useRef<HTMLDivElement | null>(null);
  const profileLoadingRef = useRef(false);
  const lastProfileFetchTimeRef = useRef(0);

  // ========== FIX 1: STABLE FOLLOWERS CACHE ==========
  const [stableFollowers, setStableFollowers] = useState<number[]>(() =>
    safeArrayHelper<number>((user as any)?.followers || [])
  );

  // ========== FIX 2: TRACK PROPS SEEDING ==========
  const seededFromPropsRef = useRef(false);
  
  // ========== FIX 3: TRACK INITIAL LOAD ==========
  const hasLoadedPostsRef = useRef(false);

  // ========== MODAL STATES ==========
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  
  const [showReactionsSheet, setShowReactionsSheet] = useState(false);
  const [selectedPostForReactions, setSelectedPostForReactions] = useState<number | null>(null);
  
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState<any>(null);
  
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Post menu state for edit/delete
  const [postMenuOpen, setPostMenuOpen] = useState<number | null>(null);
  
  // Edit post state
  const [editingPost, setEditingPost] = useState<PostType | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const closeMenu = () => setPostMenuOpen(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const isCurrentUser = Boolean(currentUser && Number(user?.id) === Number(currentUser?.id));
  const isSelf = isCurrentUser;

  // ========== FIX 1: STABLE FOLLOWERS EFFECT ==========
  useEffect(() => {
    const next = safeArrayHelper<number>((user as any)?.followers || []);

    setStableFollowers((prev) => {
      const prevHas = Array.isArray(prev) && prev.length > 0;
      const nextHas = Array.isArray(next) && next.length > 0;

      if (nextHas) return next;
      if (!prevHas && !nextHas) return next;
      return prev;
    });
  }, [user]);

  // Use stableFollowers for all follower calculations
  const followerCount = stableFollowers.length;

  // Follow logic using stableFollowers
  const isFollowing = useMemo(() => {
    if (!currentUser) return false;
    return stableFollowers.includes(currentUser.id);
  }, [currentUser, stableFollowers]);

  // Role checks
  const roleOf = (u: any) => String(u?.role || "").trim().toLowerCase();
  const isAdmin = currentUser ? roleOf(currentUser) === "admin" : false;
  const isModerator = currentUser ? roleOf(currentUser) === "moderator" : false;
  const isAdminOrModerator = isAdmin || isModerator;

  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Local state for profile posts
  const [profilePosts, setProfilePosts] = useState<PostType[]>(() => safeArrayHelper(posts));

  // ========== FILTER OUT GROUP POSTS - MOVED UP BEFORE USAGE ==========
  const filteredProfilePosts = useMemo(() => {
    return (profilePosts || []).filter((p: any) => {
      const meta = p?.meta || {};
      const hasGroup =
        !!p?.group_id ||
        !!p?.groupId ||
        !!meta?.group_id ||
        !!meta?.groupId ||
        p?.type === 'group_post' ||
        p?.post_type === 'group_post' ||
        meta?.type === 'group_post';
      return !hasGroup;
    });
  }, [profilePosts]);

  // ========== FIX 2: GUARDED PROPS SYNC ==========
  useEffect(() => {
    const incoming = safeArrayHelper(posts);

    if (incoming.length > 0) {
      setProfilePosts(incoming);
      seededFromPropsRef.current = true;
      return;
    }

    if (!seededFromPropsRef.current && !hasLoadedPostsRef.current) {
      setProfilePosts(incoming);
    }
  }, [posts]);

  // ========== API FETCH HELPER ==========
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('unera_token');
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, { 
        ...options, 
        headers,
        signal: controller.signal 
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;

      try {
        if (contentType.includes('application/json')) {
          data = await res.json();
        } else {
          const text = await res.text();
          try {
            data = JSON.parse(text);
          } catch {
            data = { error: text };
          }
        }
      } catch (e: any) {
        data = { error: e?.message || 'Failed to parse response' };
      }

      if (!res.ok) {
        const msg = data?.error || data?.message || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // ========== FETCH SINGLE POST FROM BACKEND ==========
  const fetchPostById = useCallback(async (postId: number): Promise<any | null> => {
    if (!postId) return null;
    
    try {
      const viewerId = currentUser?.id ?? 0;
      const url = `/api/posts/${postId}?viewerId=${viewerId}`;
      console.log('📡 Fetching single post:', url);
      
      const data = await apiFetch(url);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch post:', error);
      return null;
    }
  }, [currentUser?.id]);

  // ========== REFRESH A SINGLE POST IN THE PROFILE ==========
  const refreshPost = useCallback(async (postId: number) => {
    console.log('🔄 Refreshing post:', postId);
    const updatedPost = await fetchPostById(postId);
    
    if (updatedPost) {
      setProfilePosts(prev => 
        prev.map(p => 
          safePostIdHelper(p) === postId 
            ? { 
                ...p, 
                ...updatedPost,
                comments_count: updatedPost.comments_count || 0,
                reactions_count: updatedPost.reactions_count || 0,
                shares: updatedPost.shares || 0
              } 
            : p
        )
      );
      console.log('✅ Post refreshed:', postId);
    }
  }, [fetchPostById]);

  // ========== FETCH PROFILE POSTS FROM BACKEND WITH CURSOR ==========
  const fetchProfilePostsFromBackend = async (
    profileUserId: number, 
    cursor?: string | null, 
    limit = 20
  ): Promise<PostType[]> => {
    if (!profileUserId) return [];
    
    setIsLoadingPosts(true);
    
    try {
      const viewerId = currentUser?.id ?? 0;
      const params = new URLSearchParams({
        userId: String(profileUserId),
        viewerId: String(viewerId),
        limit: String(limit),
      });
      
      if (cursor) params.set("cursor", cursor);
      
      const url = `/api/posts/by-user?${params.toString()}`;
      console.log('📡 Fetching profile posts from:', url);
      
      const data = await apiFetch(url);
      console.log('📥 Profile posts response:', data);
      
      let postsArray = [];
      if (Array.isArray(data)) {
        postsArray = data;
      } else if (data?.posts && Array.isArray(data.posts)) {
        postsArray = data.posts;
      } else if (data?.data && Array.isArray(data.data)) {
        postsArray = data.data;
      } else if (data?.results && Array.isArray(data.results)) {
        postsArray = data.results;
      }
      
      const normalized = postsArray.map((post: any) => ({
        ...post,
        id: safeNumberHelper(post?.id ?? post?.post_id),
        user_id: safeNumberHelper(post?.user_id),
        content: safeStringHelper(post?.content),
        media_url: post?.media_url ?? null,
        media_type: post?.media_type ?? null,
        media_urls: Array.isArray(post?.media_urls) ? post.media_urls : [],
        images: Array.isArray(post?.images) ? post.images : [],
        reactions: safeArrayHelper(post?.reactions),
        comments: safeArrayHelper(post?.comments),
        shares: safeNumberHelper(post?.shares),
        views: safeNumberHelper(post?.views),
        my_reaction: post?.my_reaction ?? null,
        reactions_count: safeNumberHelper(post?.reactions_count, 0),
        comments_count: safeNumberHelper(post?.comments_count, 0),
        created_at: post?.created_at ?? new Date().toISOString(),
        type: post?.type || post?.post_type || 'post',
        meta: post?.meta || {},
        product_id: post?.product_id,
        marketplace: post?.marketplace,
        event_id: post?.event_id,
        event: post?.event
      }));

      normalized.sort((a: any, b: any) => 
        String(b.created_at).localeCompare(String(a.created_at))
      );

      return normalized;
    } catch (error) {
      console.error('❌ Failed to fetch profile posts:', error);
      return [];
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // ========== LOAD MORE PROFILE POSTS (INFINITE SCROLL) ==========
  const loadMoreProfilePosts = useCallback(async () => {
    if (profileLoadingRef.current) return;
    if (!profileHasMore) return;
    if (!user?.id) return;
    if (activeTab !== "Posts") return;

    const now = Date.now();
    if (now - lastProfileFetchTimeRef.current < 2500) return;
    lastProfileFetchTimeRef.current = now;
    
    profileLoadingRef.current = true;
    setProfileLoadingMore(true);
    
    try {
      const oldestCreatedAt = profileNextCursor || 
        filteredProfilePosts
          .map((p: any) => String(p?.created_at || ""))
          .filter(Boolean)
          .sort()[0];
      
      if (!oldestCreatedAt && filteredProfilePosts.length > 0) return;
      
      const morePosts = await fetchProfilePostsFromBackend(
        Number(user.id),
        oldestCreatedAt,
        20
      );
      
      if (!morePosts.length) {
        setProfileHasMore(false);
        return;
      }
      
      setProfilePosts(prev => {
        const map = new Map<number, PostType>();
        [...prev, ...morePosts].forEach((p: any) => {
          const id = safePostIdHelper(p);
          if (id && !map.has(id)) map.set(id, p);
        });
        return Array.from(map.values()).sort((a: any, b: any) => 
          String(b.created_at).localeCompare(String(a.created_at))
        );
      });
      
      const nextOldest = morePosts
        .map((p: any) => String(p?.created_at || ""))
        .filter(Boolean)
        .sort()[0];
      
      setProfileNextCursor(nextOldest || oldestCreatedAt);
      setProfileHasMore(morePosts.length >= 20);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      profileLoadingRef.current = false;
      setProfileLoadingMore(false);
    }
  }, [
    user?.id, 
    activeTab, 
    profileHasMore, 
    profileNextCursor, 
    filteredProfilePosts
  ]);

  // ========== LOAD INITIAL PROFILE POSTS ==========
  useEffect(() => {
    let cancelled = false;
    
    const loadProfilePosts = async () => {
      if (!user?.id) return;
      
      try {
        let list: PostType[] = [];
        
        if (fetchProfilePosts) {
          const viewerId = currentUser?.id ?? null;
          list = await fetchProfilePosts(Number(user.id), viewerId);
        } else {
          list = await fetchProfilePostsFromBackend(Number(user.id), null, 20);
        }
        
        if (!cancelled) {
          if (list.length > 0) {
            setProfilePosts(list);
            hasLoadedPostsRef.current = true;
            seededFromPropsRef.current = true;
            setProfileHasMore(list.length >= 20);
          } else if (!hasLoadedPostsRef.current) {
            setProfilePosts(list);
            setProfileHasMore(false);
          }
        }
      } catch (error) {
        console.error('Error loading profile posts:', error);
      }
    };
    
    loadProfilePosts();
    
    return () => { cancelled = true; };
  }, [user?.id, currentUser?.id]);

  // ========== RESET INFINITE SCROLL WHEN USER CHANGES ==========
  useEffect(() => {
    setProfileNextCursor(null);
    setProfileHasMore(true);
    setProfileLoadingMore(false);
    profileLoadingRef.current = false;
  }, [user?.id]);

  // ========== INFINITE SCROLL DETECTOR (HIGH PERFORMANCE OBSERVER, NO SPAM TIMER) ==========
  useEffect(() => {
    if (activeTab !== "Posts") return;
    const el = profileMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreProfilePosts();
        }
      },
      {
        root: null,
        rootMargin: "600px 0px",
        threshold: 0,
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [activeTab, loadMoreProfilePosts]);

  // User reels
  const userReels = useMemo(
    () => safeArrayHelper<Reel>(reels).filter((reel: any) => Number(reel?.user_id ?? reel?.userId) === Number(user?.id)),
    [reels, user?.id]
  );

  // All user videos (reels + video posts) - purely chronological, no algorithm required
  const allUserVideos = useMemo(() => {
    const isVidUrl = (u?: string | null) => {
      if (!u || typeof u !== 'string') return false;
      return /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i.test(u) || u.includes('/video/');
    };

    const fromReels = userReels.map((reel: any) => {
      const v = reel.video_url || reel.videoUrl || reel.video || reel.media_url || '';
      return {
        id: `reel_${reel.id}`,
        rawId: reel.id,
        isReel: true,
        video: v,
        thumbnail: reel.thumbnail_url || reel.thumbnail || reel.cover_url || '',
        caption: reel.caption || reel.title || '',
        views: safeNumberHelper(reel.views ?? reel.views_count, 0),
        created_at: reel.created_at || reel.createdAt || '',
        rawReel: reel,
      };
    });

    const fromPosts = safeArrayHelper(profilePosts)
      .filter((p: any) => {
        return (
          p?.video_url ||
          p?.video ||
          p?.media_type === 'video' ||
          p?.type === 'video' ||
          (Array.isArray(p?.media_urls) && p.media_urls.some((u: string) => isVidUrl(u)))
        );
      })
      .map((post: any) => {
        const vUrl =
          post.video_url ||
          post.video ||
          (post.media_type === 'video' ? post.media_url : null) ||
          (Array.isArray(post.media_urls) ? post.media_urls.find((u: string) => isVidUrl(u)) : '') ||
          '';

        return {
          id: `post_${post.id}`,
          rawId: post.id,
          isReel: false,
          video: vUrl,
          thumbnail: post.thumbnail_url || post.cover_url || post.image_url || '',
          caption: post.content || post.text || '',
          views: safeNumberHelper(post.views, 0),
          created_at: post.created_at || '',
          rawPost: post,
        };
      });

    // Merge and sort chronologically (newest first) - no ranking algorithm needed
    const combined = [...fromReels, ...fromPosts];
    combined.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    return combined;
  }, [userReels, profilePosts]);

  // User stories
  const userStories = useMemo(
    () => safeArrayHelper(stories).filter((story: any) => Number(story?.user_id) === Number(user?.id)),
    [stories, user?.id]
  );

  // Stats calculations
  const totalViews = useMemo(
    () => profilePosts.reduce((acc, curr: any) => acc + safeNumberHelper(curr?.views, 0), 0),
    [profilePosts]
  );

  const totalLikes = useMemo(() => {
    const postLikes = profilePosts.reduce((acc, curr: any) => {
      const reactionsCount = safeNumberHelper((curr as any)?.reactions_count, 0);
      const reactionsArray = safeArrayHelper(curr?.reactions);
      return acc + (reactionsCount > 0 ? reactionsCount : reactionsArray.length);
    }, 0);
    const reelLikes = userReels.reduce((acc, curr: any) => acc + safeArrayHelper(curr?.reactions).length, 0);
    return postLikes + reelLikes;
  }, [profilePosts, userReels]);

  const totalShares = useMemo(() => {
    const postShares = profilePosts.reduce((acc, curr: any) => acc + safeNumberHelper(curr?.shares, 0), 0);
    const reelShares = userReels.reduce((acc, curr: any) => acc + safeNumberHelper((curr as any)?.shares, 0), 0);
    return postShares + reelShares;
  }, [profilePosts, userReels]);

  const totalComments = useMemo(() => {
    const postComments = profilePosts.reduce((acc, curr: any) => {
      const commentsCount = safeNumberHelper((curr as any)?.comments_count, 0);
      const commentsArray = safeArrayHelper(curr?.comments);
      return acc + (commentsCount > 0 ? commentsCount : commentsArray.length);
    }, 0);
    const reelComments = userReels.reduce((acc, curr: any) => acc + safeArrayHelper((curr as any)?.comments).length, 0);
    return postComments + reelComments;
  }, [profilePosts, userReels]);

  const totalEngagement = totalLikes + totalComments + totalShares;

  const safeProfileImage = safeStringHelper((user as any)?.profile_image_url, '');
  const safeCoverImage = safeStringHelper((user as any)?.cover_image_url, '');
  const safeBio = safeStringHelper((user as any)?.bio, '');

  // Image validation
  const validateAndUploadImage = (file: File, uploadCallback: (file: File) => void) => {
    if (!file.type || !file.type.startsWith('image/')) {
      setLoginError('Only image files are allowed.');
      setTimeout(() => setLoginError(''), 3000);
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setLoginError('Image size should be less than 10MB.');
      setTimeout(() => setLoginError(''), 3000);
      return;
    }
    
    setLoginError('');
    uploadCallback(file);
  };

  const handleFollowClick = () => {
    if (!currentUser) return;
    setIsFollowButtonClicked(true);
    onFollow(user.id);
    setTimeout(() => {
      setIsFollowButtonClicked(false);
    }, 300);
  };

  const handleSelfMessageClick = () => {
    if (!currentUser) return;
    if (onOpenChatsList) {
      onOpenChatsList();
    }
  };

  const handleOtherMessageClick = () => {
    if (!currentUser) return;
    if (onOpenChat) {
      onOpenChat(user);
    } else {
      onMessage(user.id);
    }
  };

  // Handle post menu toggle
  const togglePostMenu = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPostMenuOpen(postMenuOpen === postId ? null : postId);
  };

  // ========== FIXED: EDIT POST WITH MODAL ==========
  const handleEditPost = (postId: number) => {
    const post = profilePosts.find(p => safePostIdHelper(p) === postId);
    if (!post) return;

    setEditingPost(post);
    setShowCreatePostModal(true);
    setPostMenuOpen(null);
  };

  // ========== FIXED: DELETE POST WITH OPTIMISTIC UPDATE ==========
  const handleDeletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    // Optimistic UI removal
    setProfilePosts(prev => prev.filter(p => safePostIdHelper(p) !== postId));

    try {
      await onDeletePost(postId);
    } catch (err) {
      console.error("Delete failed:", err);
      // Restore correct list on error
      const freshPosts = await fetchProfilePostsFromBackend(Number(user.id));
      setProfilePosts(freshPosts);
    }

    setPostMenuOpen(null);
  };

  // ========== HANDLE CREATE/EDIT POST SUBMIT ==========
  const handleCreateOrEditPost = (text: string, files: File[], meta?: any) => {
    if (editingPost) {
      // Optimistic update for edit
      setProfilePosts(prev =>
        prev.map(p =>
          safePostIdHelper(p) === editingPost.id
            ? { ...p, content: text }
            : p
        )
      );

      onEditPost(editingPost.id, text);
      setEditingPost(null);
    } else {
      onCreatePost(text, files, meta);
    }

    setShowCreatePostModal(false);
  };

  // ========== PROFILE-SPECIFIC REACT HANDLER WITH OPTIMISTIC UPDATE ==========
  const handleProfileReact = (postId: number, type: ReactionType) => {
    if (!currentUser) return;

    const pid = Number(postId);

    setProfilePosts(prev =>
      prev.map((p: any) => {
        if (safePostIdHelper(p) !== pid) return p;

        const current = (p as any).my_reaction ?? null;
        const nextMy = current === type ? null : type;

        const currentCount = Number((p as any).reactions_count ?? 0) || 0;
        const nextCount = current
          ? (nextMy ? currentCount : Math.max(0, currentCount - 1))
          : (nextMy ? currentCount + 1 : currentCount);

        const prevArr = safeArrayHelper<any>((p as any).reactions);
        const withoutMe = prevArr.filter((r: any) => Number(r.user_id) !== Number(currentUser.id));
        const nextArr = nextMy ? [...withoutMe, { user_id: currentUser.id, type: nextMy }] : withoutMe;

        return { 
          ...p, 
          my_reaction: nextMy, 
          reactions_count: nextCount,
          reactions: nextArr
        };
      })
    );

    onReact(pid, type);
  };

  // ========== SHARE HANDLER ==========
  const handleShareComplete = (destination: string, data?: any) => {
    if (selectedPostForShare && data?.success) {
      const newShares = data?.shares || 0;
      onShare(safePostIdHelper(selectedPostForShare), newShares);
      
      setProfilePosts(prev =>
        prev.map(p => 
          safePostIdHelper(p) === safePostIdHelper(selectedPostForShare)
            ? { ...p, shares: newShares }
            : p
        )
      );
    }
    setShowShareSheet(false);
    setSelectedPostForShare(null);
  };

  // ========== OPEN COMMENTS SHEET WITH REFRESH FUNCTION ==========
  const handleOpenComments = (postOrId: any) => {
    let targetPost: PostType | undefined;
    if (postOrId && typeof postOrId === 'object' && postOrId.id) {
      targetPost = postOrId;
    } else {
      const id = Number(postOrId);
      targetPost = profilePosts.find(p => safePostIdHelper(p) === id) || posts.find(p => safePostIdHelper(p) === id);
    }

    if (onOpenComments) {
      onOpenComments(targetPost || postOrId);
      return;
    }

    if (targetPost) {
      setSelectedPostForComments({
        ...targetPost,
        onCommentAdded: () => {
          refreshPost(safePostIdHelper(targetPost));
        }
      });
      setShowCommentsSheet(true);
    }
  };

  // ========== OPEN REACTIONS SHEET ==========
  const handleOpenReactions = (postId: number) => {
    setSelectedPostForReactions(postId);
    setShowReactionsSheet(true);
  };

  // ========== OPEN GALLERY ==========
  const openGallery = (urls: string[], index: number) => {
    setGalleryUrls(urls);
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  // ========== RENDER VIDEOS TAB (Chronological, all user videos, no algorithm required) ==========
  const renderVideos = () => {
    if (allUserVideos.length === 0) {
      return (
        <div className="text-center p-8">
          <div className="text-[#B0B3B8] text-lg mb-2">No videos yet</div>
          <p className="text-[#B0B3B8] text-sm">
            {isCurrentUser ? "Create your first reel or video post!" : "This user hasn't uploaded any videos yet."}
          </p>
          {isCurrentUser && (
            <button
              onClick={() => {
                if (onCreateStoryClick) {
                  onCreateStoryClick();
                }
              }}
              className="mt-4 bg-[#1877F2] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#166FE5] transition-colors"
            >
              Create Video
            </button>
          )}
        </div>
      );
    }

    const visibleVideos = allUserVideos.slice(0, videosPageSize);
    const hasMoreVideos = videosPageSize < allUserVideos.length;

    return (
      <div className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
          {visibleVideos.map((item) => (
            <div
              key={item.id}
              className="aspect-[9/16] bg-black relative cursor-pointer group rounded-lg overflow-hidden"
              onClick={() => {
                if (item.isReel) {
                  if (onOpenReel) {
                    onOpenReel(item.rawId);
                  } else if (onVideoClick) {
                    onVideoClick(item.rawReel as any);
                  }
                } else {
                  if (onVideoClick) {
                    onVideoClick(item.rawPost as any);
                  } else if (onOpenReel) {
                    onOpenReel(item.rawId);
                  }
                }
              }}
            >
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.caption || "Video preview"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={item.video}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center border-2 border-white">
                  <i className="fas fa-play text-white text-xl ml-1"></i>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 text-white text-xs flex items-center gap-1 drop-shadow-lg font-medium">
                <i className="fas fa-eye"></i>
                {formatReelCount(item.views)}
              </div>
              <div className="absolute top-2 right-2 text-white text-[11px] bg-black/60 px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm border border-white/10 font-semibold">
                <i className={`fas ${item.isReel ? 'fa-bolt text-[#FBBF24]' : 'fa-video text-[#38BDF8]'} text-[9px]`}></i>
                <span>{item.isReel ? 'Reel' : 'Video'}</span>
              </div>
            </div>
          ))}
        </div>

        {hasMoreVideos && (
          <div className="p-4 flex justify-center">
            <button
              onClick={() => setVideosPageSize((prev) => prev + 6)}
              className="bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] font-semibold px-6 py-2.5 rounded-lg text-[14px] transition-colors flex items-center gap-2 border border-[#334155] shadow-sm"
            >
              <span>See more videos</span>
              <i className="fas fa-chevron-down text-xs"></i>
            </button>
          </div>
        )}
      </div>
    );
  };

  // ========== RENDER STORIES TAB ==========
  const renderStories = () => {
    if (userStories.length === 0) {
      return (
        <div className="text-center p-8">
          <div className="text-[#B0B3B8] text-lg mb-2">No stories yet</div>
          <p className="text-[#B0B3B8] text-sm">
            {isCurrentUser ? "Share your first story!" : "This user hasn't shared any stories yet."}
          </p>
          {isCurrentUser && (
            <button
              onClick={onCreateStoryClick}
              className="mt-4 bg-[#1877F2] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#166FE5] transition-colors"
            >
              Create Story
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="w-full">
        <div className="grid grid-cols-3 gap-[2px]">
          {userStories.map((story: any) => {
            const isVideo = String(story.media_type || story.type || '').includes("video") || 
                            story.is_video === true ||
                            (story.media_url && story.media_url.match(/\.(mp4|webm|mov|m4v|avi|mkv)$/i));

            return (
              <div
                key={story.id}
                className="aspect-[9/16] bg-black relative cursor-pointer group"
                onClick={() => {
                  if (isVideo && onVideoClick) {
                    onVideoClick(story);
                  } else if (story.media_url) {
                    onViewImage(story.media_url);
                  }
                }}
              >
                {isVideo ? (
                  <video
                    src={story.media_url || story.video_url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={story.media_url || story.image_url}
                    className="w-full h-full object-cover"
                    alt="Story"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {isVideo && (
                  <div className="absolute top-2 right-2 text-white text-xs bg-black/50 px-2 py-1 rounded-full">
                    <i className="fas fa-play mr-1"></i>
                    Video
                  </div>
                )}

                {story.created_at && (
                  <div className="absolute bottom-2 left-2 text-white text-xs drop-shadow-lg">
                    {formatRelativeTime(story.created_at)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ========== RENDER ABOUT TAB ==========
  const renderAbout = () => (
    <div className="p-6 text-[#E4E6EB]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">About</h2>
        {isCurrentUser && (
          <button
            onClick={() => setShowEditProfile(true)}
            className="text-[#1877F2] font-semibold hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      <p className="text-[#B0B3B8] text-lg italic mb-6">
        "{safeStringHelper((user as any).bio, 'No bio available')}"
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold">Work & Education</h3>
          {(user as any).work && (
            <div className="flex items-center gap-3">
              <i className="fas fa-briefcase text-[#B0B3B8] w-6 text-center"></i>
              <span>Works at {(user as any).work}</span>
            </div>
          )}
          {(user as any).education && (
            <div className="flex items-center gap-3">
              <i className="fas fa-graduation-cap text-[#B0B3B8] w-6 text-center"></i>
              <span>Studied at {(user as any).education}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold">Contact & Basic Info</h3>
          {(user as any).location && (
            <div className="flex items-center gap-3">
              <i className="fas fa-map-marker-alt text-[#B0B3B8] w-6 text-center"></i>
              <span>{(user as any).location}</span>
            </div>
          )}
          {(user as any).website && (
            <div className="flex items-center gap-3">
              <i className="fas fa-link text-[#B0B3B8] w-6 text-center"></i>
              <span>
                <a
                  href={(user as any).website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1877F2] hover:underline"
                >
                  {(user as any).website}
                </a>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ========== RENDER FOLLOWERS TAB ==========
  const renderFollowers = () => (
    <div className="p-4">
      <h2 className="text-xl font-bold text-[#F8FAFC] mb-4">Followers</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {users
          .filter((u) => stableFollowers.includes(u.id))
          .map((follower) => (
            <div
              key={follower.id}
              className="flex items-start gap-3 p-3 hover:bg-[#1E293B] cursor-pointer transition-all duration-200 active:scale-95"
              onClick={() => onProfileClick(follower.id)}
            >
              <img
                src={avatarFrom(follower)}
                alt=""
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div>
                <h4 className="font-semibold text-[#F8FAFC]">{(follower as any).name}</h4>
                <span className="text-[#94A3B8] text-sm">{(follower as any).location}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  // ========== RENDER PHOTOS TAB ==========
  const renderPhotos = () => {
    const photoPosts = filteredProfilePosts.filter((p: any) => {
      const mediaInfo = getMediaTypeInfo(p);
      return mediaInfo.isImage && mediaInfo.mediaUrl && mediaInfo.mediaUrl.trim() !== '';
    });

    const visiblePhotos = photoPosts.slice(0, photosPageSize);
    const hasMorePhotos = photosPageSize < photoPosts.length;

    return (
      <div className="w-full">
        <h2 className="text-xl font-bold text-[#E4E6EB] p-4 pb-2">Photos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2 p-2">
          {visiblePhotos.map((p: any) => {
            const mediaInfo = getMediaTypeInfo(p);
            return (
              <div
                key={p.id}
                className="aspect-square cursor-pointer overflow-hidden relative group rounded-lg bg-[#0B1120] border border-[#1E293B]"
                onClick={() => mediaInfo.mediaUrl && onViewImage(mediaInfo.mediaUrl)}
              >
                <img
                  src={mediaInfo.mediaUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    console.error('Failed to load photo in UserProfile:', mediaInfo.mediaUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            );
          })}
        </div>

        {hasMorePhotos && (
          <div className="p-4 flex justify-center">
            <button
              onClick={() => setPhotosPageSize((prev) => prev + 6)}
              className="bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] font-semibold px-6 py-2.5 rounded-lg text-[14px] transition-colors flex items-center gap-2 border border-[#334155] shadow-sm"
            >
              <span>See more photos</span>
              <i className="fas fa-chevron-down text-xs"></i>
            </button>
          </div>
        )}

        {photoPosts.length === 0 && (
          <div className="text-center py-8">
            <i className="fas fa-images text-[#B0B3B8] text-4xl mb-4"></i>
            <p className="text-[#B0B3B8]">No photos available</p>
          </div>
        )}
      </div>
    );
  };

  // ========== RENDER POSTS TAB ==========
  const renderPosts = () => (
    <div className="max-w-[1095px] mx-auto w-full flex flex-col md:flex-row gap-4 px-0 md:px-4 mt-4">
      {/* Left Sidebar */}
      <div className="w-full md:w-[380px] flex-shrink-0 flex flex-col gap-4 px-4 md:px-0">
        {/* Suggested Products Widget */}
        {!isCurrentUser && products.length > 0 && currentUser && (
          <SuggestedProductsWidget
            products={products}
            currentUser={currentUser}
            onViewProduct={(product) => onViewProduct?.(product.id)}
            onSeeAll={() => console.log('See all products')}
          />
        )}
      </div>

      {/* Main Content - Posts Feed */}
      <div className="flex-1 min-w-0">
        {/* Error display */}
        {loginError && (
          <div className="mb-4 p-3 bg-red-900/80 border border-red-700 rounded-lg text-red-200 text-sm">
            <div className="flex items-center gap-2">
              <i className="fas fa-exclamation-circle"></i>
              <span>{loginError}</span>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoadingPosts && filteredProfilePosts.length === 0 && (
          <div className="text-center p-8 mb-4">
            <div className="flex justify-center items-center gap-2">
              <i className="fas fa-spinner fa-spin text-[#1877F2] text-xl"></i>
              <span className="text-[#B0B3B8]">Loading posts...</span>
            </div>
          </div>
        )}

        {/* Stats for current user */}
        {isCurrentUser && !isLoadingPosts && filteredProfilePosts.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1E293B] p-3 rounded-lg">
                <div className="text-[#94A3B8] text-xs font-medium mb-1">Total Views</div>
                <div className="text-[#F8FAFC] font-bold text-xl">
                  {safeNumberHelper(totalViews).toLocaleString()}
                </div>
              </div>
              <div className="bg-[#1E293B] p-3 rounded-lg">
                <div className="text-[#94A3B8] text-xs font-medium mb-1">Engagement</div>
                <div className="text-[#F8FAFC] font-bold text-xl">
                  {safeNumberHelper(totalEngagement).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Post for current user */}
        {isCurrentUser && currentUser && (
          <>
            <CreatePost
              currentUser={currentUser}
              onProfileClick={onProfileClick}
              onClick={() => setShowCreatePostModal(true)}
              onCreateEventClick={onCreateEventClick || (() => {})}
              onPhotoClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.multiple = true;
                input.onchange = (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || []);
                  if (files.length > 0) {
                    onCreatePost('', files, { type: 'image' });
                  }
                };
                input.click();
              }}
              onVideoClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'video/*';
                input.onchange = (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || []);
                  if (files.length > 0) {
                    onCreatePost('', files, { type: 'video' });
                  }
                };
                input.click();
              }}
            />
            {showCreatePostModal && (
              <CreatePostModal
                currentUser={currentUser}
                users={users}
                editPost={editingPost}
                onClose={() => {
                  setShowCreatePostModal(false);
                  setEditingPost(null);
                }}
                onCreatePost={handleCreateOrEditPost}
                onCreateEventClick={onCreateEventClick}
              />
            )}
          </>
        )}

        {/* People You May Know */}
        {!isCurrentUser && peopleSuggestions.length > 0 && filteredProfilePosts.length === 0 && (
          <div className="mb-4">
            <PeopleYouMayKnowGrid
              users={peopleSuggestions}
              onFollow={onFollow}
              currentUser={currentUser}
              onLoginClick={() => alert('Please login to follow users')}
              maxDisplay={6}
            />
          </div>
        )}

        {/* Posts Feed */}
        {!isLoadingPosts && filteredProfilePosts.length > 0 ? (
          <>
            {filteredProfilePosts.map((post: any) => {
              // Check if it's an event post
              const isEventPost =
                post?.item_type === "event" ||
                String(post?.feed_key || "").startsWith("event:") ||
                post?.source === "event" ||
                post?.type === 'event' ||
                post?.post_type === 'event' ||
                !!post?.event_id ||
                !!post?.meta?.event;

              if (isEventPost) {
                const event = normalizeEventFromFeed(post);
                return (
                  <div key={post.id} className="mb-4">
                    <EventPost
                      event={event}
                      author={user}
                      currentUser={currentUser}
                      users={users}
                      onProfileClick={onProfileClick}
                      onRSVP={onRSVP}
                      onFollow={onFollow}
                      isFollowing={isFollowing}
                      groups={groups}
                      brands={brands}
                      onEventClick={(eventId) => console.log('Event clicked:', eventId)}
                    />
                  </div>
                );
              }

              // Regular post with edit/delete menu
              const isAuthor = currentUser && Number(post.user_id) === Number(currentUser.id);
              
              return (
                <div key={post.id} className="relative">
                  {/* Three-dot menu for post author */}
                  {isAuthor && (
                    <div className="absolute top-4 right-4 z-10">
                      <button
                        onClick={(e) => togglePostMenu(post.id, e)}
                        className="w-8 h-8 rounded-full bg-black/20 hover:bg-[#1E293B] flex items-center justify-center transition-colors"
                      >
                        <i className="fas fa-ellipsis-h text-[#F8FAFC]"></i>
                      </button>

                      {postMenuOpen === post.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-[#0F172A] border border-[#1E293B] rounded-lg shadow-lg z-50">
                          <button
                            onClick={() => handleEditPost(post.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1E293B] transition-colors text-left"
                          >
                            <i className="fas fa-edit text-[#1877F2] w-5"></i>
                            <span className="text-[#F8FAFC] font-medium">Edit Post</span>
                          </button>
                          
                          <div className="h-[1px] bg-[#1E293B] my-1"></div>
                          
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1E293B] transition-colors text-left"
                          >
                            <i className="fas fa-trash text-red-500 w-5"></i>
                            <span className="text-red-400 font-medium">Delete Post</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <Post
                    post={post}
                    author={user}
                    currentUser={currentUser}
                    users={users}
                    onProfileClick={onProfileClick}
                    onReact={handleProfileReact}
                    onShare={(id, newCount) => {
                      onShare(id, newCount);
                      setProfilePosts(prev =>
                        prev.map(p => safePostIdHelper(p) === id ? { ...p, shares: newCount } : p)
                      );
                    }}
                    onDelete={onDeletePost}
                    onEdit={onEditPost}
                    onViewImage={onViewImage}
                    onOpenComments={handleOpenComments}
                    onVideoClick={onVideoClick}
                    onPlayAudioTrack={onPlayAudioTrack}
                    onHashtagClick={onHashtagClick}
                    onViewProductFromPost={onViewProductFromPost}
                    onViewProduct={onViewProduct}
                    getProductData={getProductData || marketplaceContext?.getProductData}
                    onOpenAudio={onOpenAudio}
                    onRSVP={onRSVP}
                    groups={groups}
                    brands={brands}
                    chats={[]}
                    isFollowing={isFollowing}
                    onFollow={onFollow}
                    followLoading={false}
                    onOpenReactions={handleOpenReactions}
                  />
                </div>
              );
            })}
            
            {/* Hidden infinite scroll trigger (no visible loader) */}
            {profileHasMore && activeTab === "Posts" && (
              <div ref={profileMoreRef} className="h-1 w-full opacity-0 pointer-events-none" aria-hidden="true" />
            )}
          </>
        ) : !isLoadingPosts && filteredProfilePosts.length === 0 && (
          <div className="bg-[#0F172A] rounded-xl p-8 text-center border border-[#1E293B]">
            <div className="text-[#94A3B8] text-lg mb-2">No posts yet</div>
            <p className="text-[#94A3B8] text-sm">
              {isCurrentUser ? "Create your first post!" : "This user hasn't posted anything yet."}
            </p>
            {isCurrentUser && (
              <button
                onClick={() => setShowCreatePostModal(true)}
                className="mt-4 bg-[#1877F2] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#166FE5] transition-colors"
              >
                Create Post
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full bg-[#050B18] min-h-screen">
      {/* Profile Top Navigation Bar with Back Button */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-30 bg-[#0F172A]/95 backdrop-blur-md border-b border-[#1E293B] px-4 py-2.5 flex items-center gap-3">
        <button
          onClick={() => {
            if (onBack) {
              onBack();
            } else if (typeof window !== 'undefined' && window.history.length > 1) {
              window.history.back();
            }
          }}
          className="w-10 h-10 rounded-full bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] flex items-center justify-center transition-colors shadow-sm shrink-0"
          aria-label="Back"
        >
          <i className="fas fa-arrow-left text-lg"></i>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-[#F8FAFC] font-bold text-base truncate">{user.name || user.username}</h2>
          <p className="text-[#94A3B8] text-xs">@{user.username}</p>
        </div>
      </div>

      {/* File inputs for profile/cover images */}
      <input
        type="file"
        ref={profileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            validateAndUploadImage(file, onUpdateProfileImage);
          }
          if (e.target) e.target.value = '';
        }}
      />
      <input
        type="file"
        ref={coverInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            validateAndUploadImage(file, onUpdateCoverImage);
          }
          if (e.target) e.target.value = '';
        }}
      />

      {/* Profile Header */}
      <div className="bg-[#0F172A] shadow-sm">
        <div className="max-w-[1095px] mx-auto w-full relative">
          {/* Cover Image */}
          <div className="h-[200px] md:h-[350px] w-full bg-gray-700 relative overflow-hidden md:rounded-b-xl">
            {safeCoverImage ? (
              <img
                src={safeCoverImage}
                alt="Cover"
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => onViewImage(safeCoverImage)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">No Cover</div>
            )}

            {isCurrentUser && (
              <>
                <div
                  className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-md cursor-pointer hover:bg-white/20 font-semibold text-white text-[15px] flex items-center gap-2 transition-all active:scale-95 active:shadow-inner"
                  onClick={() => coverInputRef.current?.click()}
                >
                  <i className="fas fa-camera"></i> Edit cover photo
                </div>
                
                {!safeCoverImage && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer hover:bg-black/50 active:scale-95 transition-transform"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <div className="text-center">
                      <i className="fas fa-camera text-white text-3xl mb-2"></i>
                      <p className="text-white font-semibold">Add Cover Photo</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Profile Picture and Info - Facebook Style */}
          <div className="px-4 pb-0 bg-[#0F172A]">
            <div className="relative z-10">
              {/* Avatar + Name Row */}
              <div className="flex items-end gap-4 -mt-[70px] md:-mt-[86px]">
                <div className="w-[142px] h-[142px] md:w-[168px] md:h-[168px] rounded-full border-[5px] border-[#0F172A] bg-[#0F172A] overflow-hidden cursor-pointer relative group flex-shrink-0 shadow-lg">
                  {safeProfileImage ? (
                    <img
                      src={safeProfileImage}
                      alt={safeStringHelper((user as any).name, "User")}
                      className="w-full h-full object-cover"
                      onClick={() => onViewImage(safeProfileImage)}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1E293B] flex items-center justify-center text-[#94A3B8]">
                      <i className="fas fa-user text-5xl"></i>
                    </div>
                  )}
                  {isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => profileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1E293B] border-2 border-[#0F172A] flex items-center justify-center active:scale-95"
                    >
                      <i className="fas fa-camera text-white text-lg"></i>
                    </button>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 pb-2">
                  <h1 className="text-[28px] md:text-[32px] leading-tight font-extrabold text-[#F8FAFC] flex items-center gap-2 truncate">
                    {safeStringHelper((user as any).name, "User")}
                    {(user as any).is_verified && (
                      <VerifiedBadge size={28} className="flex-shrink-0" />
                    )}
                  </h1>
                  
                  {/* Stats Row - Following removed */}
                  <div className="text-[#F8FAFC] text-[16px] md:text-[17px] mt-1 leading-snug">
                    <span className="font-bold">{followerCount.toLocaleString()}</span>
                    <span className="text-[#94A3B8]"> followers</span>
                    <span className="mx-1 text-[#94A3B8]">·</span>
                    <span className="font-bold">
                      {filteredProfilePosts.length.toLocaleString()}
                    </span>
                    <span className="text-[#94A3B8]"> posts</span>
                  </div>
                </div>
              </div>

              {/* Bio / About positioned like Facebook */}
              <div className="mt-3">
                {safeBio ? (
                  <p className="text-[#F8FAFC] text-[20px] leading-snug whitespace-pre-line">
                    {safeBio}
                  </p>
                ) : isCurrentUser ? (
                  <button onClick={() => setShowEditProfile(true)} className="text-[#1877F2] text-[15px] font-semibold">
                    Add bio
                  </button>
                ) : null}
                
                {(user as any).work && (
                  <div className="flex items-center gap-2 mt-3 text-[#F8FAFC] text-[15px]">
                    <i className="fas fa-briefcase text-[#94A3B8] w-5 text-center"></i>
                    <span className="font-semibold">{(user as any).work}</span>
                  </div>
                )}
                
                {(user as any).location && (
                  <div className="flex items-center gap-2 mt-2 text-[#F8FAFC] text-[15px]">
                    <i className="fas fa-map-marker-alt text-[#94A3B8] w-5 text-center"></i>
                    <span>{(user as any).location}</span>
                  </div>
                )}
              </div>

              {/* Followed by row / profile social proof */}
              {!isCurrentUser && users.length > 0 && (
                <div className="flex items-center gap-2 mt-4">
                  <div className="flex -space-x-2">
                    {users.slice(0, 3).map((u) => (
                      <img
                        key={u.id}
                        src={avatarFrom(u)}
                        alt=""
                        className="w-8 h-8 rounded-full border-2 border-[#0F172A] object-cover"
                      />
                    ))}
                  </div>
                  <p className="text-[#F8FAFC] text-[15px] leading-snug">
                    Followed by{" "}
                    <span className="font-bold">
                      {safeStringHelper((users[0] as any)?.name, "someone")}
                    </span>
                    {users[1] && (
                      <> ,{" "}
                      <span className="font-bold">
                        {safeStringHelper((users[1] as any)?.name, "someone")}
                      </span>
                      </>
                    )}
                    {users.length > 2 && (
                      <> {" "} and <span className="font-bold">{users.length - 2} others</span>
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Action Buttons - Facebook Style */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                {isCurrentUser ? (
                  <>
                    <button
                      onClick={() => {
                        if (onCreateStoryClick) onCreateStoryClick();
                        else setShowCreatePostModal(true);
                      }}
                      className="h-11 rounded-lg bg-[#1877F2] text-white font-bold text-[17px] flex items-center justify-center gap-2 active:scale-95"
                    >
                      <i className="fas fa-plus"></i>
                      Add to story
                    </button>
                    
                    <button
                      onClick={handleSelfMessageClick}
                      className="h-11 rounded-lg bg-[#1E293B] text-[#F8FAFC] font-bold text-[17px] flex items-center justify-center gap-2 active:scale-95"
                    >
                      <i className="fas fa-comment"></i>
                      Messages
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleOtherMessageClick}
                      className="h-11 rounded-lg bg-[#1E293B] text-[#F8FAFC] font-bold text-[17px] flex items-center justify-center gap-2 active:scale-95"
                    >
                      <i className="fab fa-facebook-messenger"></i>
                      Message
                    </button>
                    
                    <button
                      onClick={handleFollowClick}
                      disabled={isFollowButtonClicked}
                      className={`h-11 rounded-lg font-bold text-[17px] flex items-center justify-center gap-2 active:scale-95 ${
                        isFollowing ? "bg-[#1E293B] text-[#F8FAFC]" : "bg-[#1877F2] text-white"
                      }`}
                    >
                      <i className={isFollowing ? "fas fa-check" : "fas fa-user-plus"}></i>
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  </>
                )}
              </div>

              {/* Things in common / About Card */}
              {!isCurrentUser && (
                <div className="mt-4 rounded-2xl border border-[#1E293B] bg-[#0F172A] p-4">
                  <div className="flex items-start gap-3">
                    <i className="fas fa-user-friends text-[#F8FAFC] text-2xl mt-1"></i>
                    <div className="min-w-0">
                      <h3 className="text-[#F8FAFC] font-extrabold text-[20px]">
                        Things in common
                      </h3>
                      <p className="text-[#F8FAFC] text-[16px] mt-1 leading-snug">
                        You both are part of UNERA community
                        {groups.length > 0 && (
                          <> {" "}and joined{" "}
                          <span className="font-bold">
                            {safeStringHelper((groups[0] as any)?.name, "groups")}
                          </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="h-[8px] bg-[#1E293B] -mx-4 mt-5"></div>
              <div className="flex items-center justify-around overflow-x-auto whitespace-nowrap scrollbar-hide bg-[#0F172A] -mx-4 px-2">
                {(["Posts", "Videos", "Photos", "About", "Followers"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 min-w-[90px] px-4 py-3 text-[16px] font-semibold border-b-[3px] transition-colors ${
                      activeTab === tab
                        ? "text-[#1877F2] border-[#1877F2]"
                        : "text-[#94A3B8] border-transparent"
                    }`}
                  >
                    {tab === "Posts" ? "All" : tab === "Videos" ? "Reels" : tab}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin/Moderator Controls */}
      {isAdminOrModerator && (
        <div className="max-w-[1095px] mx-auto mt-6 px-4">
          <div className="bg-[#0F172A] rounded-xl p-4 shadow-sm border border-red-900/50">
            <h2 className="text-xl font-bold text-red-500 mb-4">
              {isAdmin ? 'Admin Controls' : 'Moderator Controls'}
            </h2>
            <div className="flex flex-col gap-2">
              {isAdmin && (
                <button
                  disabled={isSelf}
                  onClick={() => !isSelf && onVerifyUser?.(user.id)}
                  className={`w-full py-2 rounded font-semibold transition-colors active:scale-95 active:shadow-inner ${
                    isSelf
                      ? "bg-[#263951]/40 text-[#2D88FF]/40 cursor-not-allowed"
                      : "bg-[#263951] text-[#2D88FF] hover:bg-[#2A3F5A]"
                  }`}
                >
                  {(user as any).is_verified ? 'Remove Verification' : 'Verify User'} {isSelf ? "(Self)" : ""}
                </button>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={isSelf}
                  onClick={() => !isSelf && onRestrictUser?.(user.id, "24h")}
                  className={`py-2 rounded font-semibold transition-colors active:scale-95 active:shadow-inner ${
                    isSelf
                      ? "bg-yellow-900/40 text-yellow-200/40 cursor-not-allowed"
                      : "bg-yellow-900/80 text-yellow-200 hover:bg-yellow-800"
                  }`}
                >
                  Suspend 24h {isSelf ? "(Self)" : ""}
                </button>
                <button
                  disabled={isSelf}
                  onClick={() => !isSelf && onRestrictUser?.(user.id, "5d")}
                  className={`py-2 rounded font-semibold transition-colors active:scale-95 active:shadow-inner ${
                    isSelf
                      ? "bg-yellow-900/40 text-yellow-200/40 cursor-not-allowed"
                      : "bg-yellow-900/80 text-yellow-200 hover:bg-yellow-800"
                  }`}
                >
                  Suspend 5d {isSelf ? "(Self)" : ""}
                </button>
                <button
                  disabled={isSelf}
                  onClick={() => !isSelf && onRestrictUser?.(user.id, "30d")}
                  className={`py-2 rounded font-semibold transition-colors active:scale-95 active:shadow-inner ${
                    isSelf
                      ? "bg-yellow-900/40 text-yellow-200/40 cursor-not-allowed"
                      : "bg-yellow-900/80 text-yellow-200 hover:bg-yellow-800"
                  }`}
                >
                  Suspend 30d {isSelf ? "(Self)" : ""}
                </button>
                <button
                  disabled={isSelf}
                  onClick={() => !isSelf && onRestrictUser?.(user.id, "manual")}
                  className={`py-2 rounded font-semibold transition-colors active:scale-95 active:shadow-inner ${
                    isSelf
                      ? "bg-yellow-900/40 text-yellow-200/40 cursor-not-allowed"
                      : "bg-yellow-900/80 text-yellow-200 hover:bg-yellow-800"
                  }`}
                >
                  Suspend Manual {isSelf ? "(Self)" : ""}
                </button>
              </div>

              {isAdmin && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    disabled={isSelf}
                    onClick={() => !isSelf && onMakeModerator?.(user.id, true)}
                    className={`py-2 rounded font-semibold transition-colors active:scale-95 active:shadow-inner ${
                      isSelf
                        ? "bg-[#1E293B]/40 text-[#F8FAFC]/40 cursor-not-allowed"
                        : "bg-[#1E293B] text-[#F8FAFC] hover:bg-[#334155]"
                    }`}
                  >
                    Make Moderator {isSelf ? "(Self)" : ""}
                  </button>
                  <button
                    disabled={isSelf}
                    onClick={() => !isSelf && onMakeModerator?.(user.id, false)}
                    className={`py-2 rounded font-semibold transition-colors active:scale-95 active:shadow-inner ${
                      isSelf
                        ? "bg-[#1E293B]/40 text-[#F8FAFC]/40 cursor-not-allowed"
                        : "bg-[#1E293B] text-[#F8FAFC] hover:bg-[#334155]"
                    }`}
                  >
                    Remove Moderator {isSelf ? "(Self)" : ""}
                  </button>
                </div>
              )}

              {isAdmin && (
                <button
                  disabled={isSelf}
                  onClick={() => !isSelf && onDeleteUser?.(user.id)}
                  className={`w-full py-2 rounded font-semibold mt-2 transition-colors active:scale-95 active:shadow-inner ${
                    isSelf
                      ? "bg-red-900/40 text-white/40 cursor-not-allowed"
                      : "bg-red-900/80 text-white hover:bg-red-800"
                  }`}
                >
                  Delete Account {isSelf ? "(Cannot delete self)" : ""}
                </button>
              )}
              
              <div className="mt-2 pt-2 border-t border-[#1E293B]">
                <p className="text-[#94A3B8] text-xs">
                  Viewing as: <span className="font-semibold text-[#F8FAFC]">{isAdmin ? "Admin" : "Moderator"}</span>
                </p>
                <p className="text-[#94A3B8] text-xs mt-1">
                  Profile Role: <span className="font-semibold text-[#F8FAFC] capitalize">{user.role || 'user'}</span>
                </p>
                {isSelf && (
                  <p className="text-yellow-300 text-xs mt-1">
                    ⚠️ Some actions disabled for your own account
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Render active tab */}
      {activeTab === 'Posts' && renderPosts()}
      {activeTab === 'Videos' && renderVideos()}
      {activeTab === 'Stories' && renderStories()}
      {activeTab === 'About' && renderAbout()}
      {activeTab === 'Followers' && renderFollowers()}
      {activeTab === 'Photos' && renderPhotos()}

      {/* Edit Profile Modal */}
      {showEditProfile && isCurrentUser && (
        <EditProfileModal user={user} onClose={() => setShowEditProfile(false)} onSave={onUpdateUserDetails} />
      )}

      {/* ========== MODALS FROM FEEDS ========== */}

      {/* Comments Sheet */}
      {showCommentsSheet && selectedPostForComments && currentUser && (
        <CommentsSheet
          post={selectedPostForComments}
          currentUser={currentUser}
          users={users}
          onClose={() => {
            setShowCommentsSheet(false);
            setSelectedPostForComments(null);
          }}
          onComment={onComment}
          onCommentAdded={selectedPostForComments?.onCommentAdded}
          getCommentAuthor={getCommentAuthor}
          onProfileClick={onProfileClick}
          onHashtagClick={onHashtagClick}
          onFollow={onFollow}
          checkIsFollowing={(id) => {
            if (!currentUser) return false;
            const userFollowers = safeArrayHelper<number>((users.find(u => u.id === id) as any)?.followers || []);
            return userFollowers.includes(currentUser.id);
          }}
          onViewProductFromPost={onViewProductFromPost}
          onOpenAudio={onOpenAudio}
          onReact={handleProfileReact}
          onShare={(id, newCount) => {
            onShare(id, newCount);
            refreshPost(id);
          }}
          onVideoClick={onVideoClick}
          groups={groups}
          brands={brands}
          chats={[]}
          onOpenGroup={() => {}}
          onRSVP={onRSVP}
          onEventClick={() => {}}
          onOpenReactions={handleOpenReactions}
        />
      )}

      {/* Reactions Sheet */}
      {showReactionsSheet && selectedPostForReactions && (
        <ReactionsSheet
          isOpen={showReactionsSheet}
          onClose={() => {
            setShowReactionsSheet(false);
            setSelectedPostForReactions(null);
          }}
          post={profilePosts.find(p => safePostIdHelper(p) === selectedPostForReactions) as PostType}
          onProfileClick={onProfileClick}
          onOpenComments={handleOpenComments}
        />
      )}

      {/* Share Bottom Sheet */}
      {showShareSheet && selectedPostForShare && (
        <ShareBottomSheet
          isOpen={showShareSheet}
          onClose={() => {
            setShowShareSheet(false);
            setSelectedPostForShare(null);
          }}
          post={selectedPostForShare}
          currentUser={currentUser}
          users={users}
          groups={groups}
          brands={brands}
          onShareComplete={handleShareComplete}
        />
      )}

      {/* Gallery Viewer */}
      {galleryOpen && (
        <GalleryViewer
          isOpen={galleryOpen}
          urls={galleryUrls}
          startIndex={galleryIndex}
          onClose={() => setGalleryOpen(false)}
          post={{ id: 0, content: '', created_at: new Date().toISOString() } as PostType}
          currentUser={currentUser}
          reactionCount={0}
          commentCount={0}
          shareCount={0}
          myReaction={undefined}
          onReact={() => {}}
          onOpenComments={() => {}}
          onShare={() => {}}
          onOpenReactions={() => {}}
        />
      )}
    </div>
  );
};
