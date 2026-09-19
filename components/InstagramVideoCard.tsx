import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../utils/api';
import {
  safeUserId,
  avatarFrom,
  formatRelativeTime,
  ReactionButton,
  ReactionsSheet,
  topReactionEmojis,
  formatReactionText,
  pickStableReactorName,
} from './Feed';
import { useIsPostSaved, toggleSavePost } from '../utils/savedPosts';
import { VerifiedBadge } from './VerifiedBadge';
import type { ReactionType } from '../types';

const formatCount = (count: number): string => {
  if (!count || count <= 0) return '0';
  if (count >= 1000000) {
    const val = (count / 1000000).toFixed(1);
    return `${val.endsWith('.0') ? val.slice(0, -2) : val}M`;
  }
  if (count >= 1000) {
    const val = (count / 1000).toFixed(1);
    return `${val.endsWith('.0') ? val.slice(0, -2) : val}K`;
  }
  return count.toString();
};

interface InstagramVideoCardProps {
  post?: any;
  reel?: any;
  author?: any;
  currentUser?: any;
  users?: any[];
  stories?: any[];
  hasStory?: boolean;
  autoplay?: boolean;
  onProfileClick: (userId: number) => void;
  onStoryClick?: (userId: number) => void;
  onReact?: (postOrId: any, type: any) => void;
  onShare?: (postId: number, count: number) => void;
  onVideoClick?: (post: any) => void;
  onDelete?: (postId: number) => void;
  onEdit?: (postId: number, text: string) => void;
  isFollowing?: boolean;
  onFollow?: (userId: number) => void;
  onHashtagClick?: (tag: string) => void;
  onOpenComments?: (post: any) => void;
  onOpenReactions?: (post: any) => void;
}

interface ReelComment {
  id: number;
  user_id: number;
  text: string;
  created_at: string;
  name?: string;
  username?: string;
  profile_image_url?: string;
  user?: {
    id: number;
    name?: string;
    username?: string;
    profile_image_url?: string;
  };
}

export const InstagramVideoCard: React.FC<InstagramVideoCardProps> = ({
  post,
  reel,
  author,
  currentUser,
  users = [],
  stories = [],
  hasStory,
  autoplay = true,
  onProfileClick,
  onStoryClick,
  onReact,
  onShare,
  onVideoClick,
  onDelete,
  onEdit,
  isFollowing = false,
  onFollow,
  onHashtagClick,
  onOpenComments,
  onOpenReactions,
}) => {
  const activePost = post || reel || {};
  const activePostId = Number(
    activePost?.id || activePost?.reel_id || activePost?.reelId || 0
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  // Author details
  const resolvedAuthor = author || activePost?.user || activePost?.author || { id: activePost?.user_id };
  const authorId = safeUserId(resolvedAuthor);

  // Verification check - ONLY show if really verified, NEVER faked
  const isVerified = Boolean(
    resolvedAuthor?.is_verified ||
    resolvedAuthor?.verified ||
    activePost?.user?.is_verified ||
    activePost?.user?.verified ||
    activePost?.author?.is_verified ||
    activePost?.author?.verified ||
    activePost?.is_verified ||
    activePost?.verified
  );

  // Authentic story check - only show story ring/dots if user has active stories
  const userHasStory = useMemo(() => {
    if (typeof hasStory === 'boolean') return hasStory;
    if (resolvedAuthor?.has_story || resolvedAuthor?.hasStory || activePost?.user?.has_story || activePost?.user?.hasStory) return true;
    if (Array.isArray(stories) && stories.length > 0) {
      return stories.some((s: any) => {
        const sUid = Number(s?.user_id ?? s?.user?.id ?? 0);
        return sUid > 0 && sUid === authorId;
      });
    }
    return false;
  }, [hasStory, resolvedAuthor, activePost, stories, authorId]);

  // Online status check
  const isOnline = Boolean(
    resolvedAuthor?.is_online ||
    resolvedAuthor?.isOnline ||
    activePost?.user?.is_online ||
    activePost?.user?.isOnline
  );

  // Video URL resolution
  const videoUrl =
    activePost?.media_url ||
    activePost?.video_url ||
    (Array.isArray(activePost?.media_urls) ? activePost.media_urls.find((u: string) => typeof u === 'string' && u.match(/\.(mp4|webm|mov|m4v)/i)) : null) ||
    activePost?.media_urls?.[0] ||
    activePost?.meta?.video_url ||
    '';

  const reelId = activePostId;

  // Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  // Reaction states - matching standard posts
  const initialReaction = (activePost?.my_reaction || activePost?.myReaction || activePost?.reaction || undefined) as ReactionType | undefined;
  const [myReaction, setMyReaction] = useState<ReactionType | undefined>(initialReaction);
  const [serverReactions, setServerReactions] = useState<any[]>([]);

  const initialReactionCount = Number(
    activePost?.reactions_count ??
    activePost?.reaction_count ??
    activePost?.likes_count ??
    (Array.isArray(activePost?.reactions) ? activePost.reactions.length : 0)
  );
  const [reactionCount, setReactionCount] = useState<number>(initialReactionCount);
  const [showReactionsSheet, setShowReactionsSheet] = useState(false);

  // Sync state if activePost changes (e.g. on feed re-render or refresh)
  useEffect(() => {
    if (activePost?.my_reaction !== undefined) {
      setMyReaction(activePost.my_reaction || undefined);
    }
    const count = Number(
      activePost?.reactions_count ??
      activePost?.reaction_count ??
      activePost?.likes_count ??
      (Array.isArray(activePost?.reactions) ? activePost.reactions.length : 0)
    );
    setReactionCount(count);
  }, [
    activePost?.my_reaction,
    activePost?.myReaction,
    activePost?.reaction,
    activePost?.reactions_count,
    activePost?.reaction_count,
    activePost?.likes_count,
    activePost?.reactions,
  ]);

  const [sharesCount, setSharesCount] = useState<number>(
    Number(activePost?.shares ?? activePost?.shares_count ?? 0)
  );
  const [commentsCount, setCommentsCount] = useState<number>(
    Number(
      activePost?.comments_count ??
      activePost?.comment_count ??
      (Array.isArray(activePost?.comments) ? activePost.comments.length : 0)
    )
  );

  // Sync shares and comments count if activePost updates
  useEffect(() => {
    if (activePost?.shares !== undefined || activePost?.shares_count !== undefined) {
      setSharesCount(Number(activePost?.shares ?? activePost?.shares_count ?? 0));
    }
    if (activePost?.comments_count !== undefined || activePost?.comments !== undefined) {
      setCommentsCount(
        Number(
          activePost?.comments_count ??
          activePost?.comment_count ??
          (Array.isArray(activePost?.comments) ? activePost.comments.length : 0)
        )
      );
    }
  }, [activePost?.shares, activePost?.shares_count, activePost?.comments_count, activePost?.comments]);

  // Normal Post Reactions endpoint: GET /api/posts/:id/reactions
  const fetchReactions = useCallback(async () => {
    if (!activePostId) return;
    try {
      const viewerId = currentUser?.id || 0;
      const res = await apiFetch(`/api/posts/${activePostId}/reactions?viewerId=${viewerId}&limit=100`);
      if (res && (res.success || Array.isArray(res.reactions))) {
        if (typeof res.reactions_count === 'number') {
          setReactionCount(res.reactions_count);
        }
        if (Array.isArray(res.reactions)) {
          setServerReactions(res.reactions);
          if (viewerId) {
            const found = res.reactions.find((r: any) => Number(r.user_id) === Number(viewerId));
            if (found?.type) {
              setMyReaction(found.type as ReactionType);
            }
          }
        }
        if (res.my_reaction !== undefined) {
          setMyReaction((res.my_reaction || undefined) as ReactionType | undefined);
        } else if (res.reaction !== undefined) {
          setMyReaction((res.reaction || undefined) as ReactionType | undefined);
        }
      }
    } catch (err) {
      console.warn('Failed to load reactions:', err);
    }
  }, [activePostId, currentUser?.id]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Reaction emojis and summary text (identical to normal post)
  const reactionsArr = serverReactions.length > 0
    ? serverReactions
    : Array.isArray(activePost?.reactions)
    ? activePost.reactions
    : [];
  const reactionsPreview = Array.isArray(activePost?.reactions_preview) ? activePost.reactions_preview : [];
  const combinedReactions = reactionsArr.length > 0 ? reactionsArr : reactionsPreview;

  const emojiList = useMemo(() => {
    return topReactionEmojis(combinedReactions, 3);
  }, [combinedReactions]);

  const reactorName = useMemo(() => {
    return (
      activePost?.reactor_name ||
      activePost?.reactorName ||
      pickStableReactorName(activePostId, combinedReactions, users)
    );
  }, [activePost?.reactor_name, activePost?.reactorName, activePostId, combinedReactions, users]);

  const reactionText = useMemo(() => {
    return formatReactionText(reactionCount, reactorName);
  }, [reactionCount, reactorName]);

  // Discuss modal & comments state
  const [showDiscussModal, setShowDiscussModal] = useState(false);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Caption expand state
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const isSaved = useIsPostSaved(reelId || activePost?.id);
  const [showShareToast, setShowShareToast] = useState(false);

  const authorName = resolvedAuthor?.name || activePost?.user?.name || activePost?.author_name || 'Creator';
  const authorUsername = resolvedAuthor?.username || activePost?.user?.username || authorName.toLowerCase().replace(/\s+/g, '_');
  const authorAvatar = avatarFrom(resolvedAuthor || activePost?.user);

  // Unique video ID for global single-playback coordination
  const cardVideoId = useMemo(() => {
    return String(reelId || post?.reel_id || post?.id || post?.video_url || Math.random());
  }, [reelId, post?.reel_id, post?.id, post?.video_url]);

  // Global single-video playback coordinator: pause immediately if another video starts
  useEffect(() => {
    const handleGlobalVideoPlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ videoId: string }>;
      if (customEvent.detail?.videoId && customEvent.detail.videoId !== cardVideoId) {
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    };

    window.addEventListener('unera-video-play', handleGlobalVideoPlay);
    return () => {
      window.removeEventListener('unera-video-play', handleGlobalVideoPlay);
    };
  }, [cardVideoId]);

  // Auto-play / pause when visible via IntersectionObserver:
  // - In Feed (autoplay=false): Automatically stops playing when user scrolls away to other posts
  // - In Videos page (autoplay=true): Plays active video in center, stops previous when scrolled away
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!videoRef.current) return;

          if (autoplay) {
            // Videos page feed: auto-play when centered
            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
              window.dispatchEvent(
                new CustomEvent('unera-video-play', { detail: { videoId: cardVideoId } })
              );
              videoRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => {});
            } else if (!entry.isIntersecting || entry.intersectionRatio < 0.45) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          } else {
            // Home Feed: if user was playing and scrolls away, STOP automatically
            if (!entry.isIntersecting || entry.intersectionRatio < 0.25) {
              if (!videoRef.current.paused) {
                videoRef.current.pause();
                setIsPlaying(false);
              }
            }
          }
        });
      },
      { threshold: [0, 0.25, 0.45, 0.6, 0.8] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [autoplay, cardVideoId]);

  // Update progress bar
  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(pct);
    }
  };

  // Toggle play/pause
  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      // Broadcast to pause any other playing videos so only one plays
      window.dispatchEvent(
        new CustomEvent('unera-video-play', { detail: { videoId: cardVideoId } })
      );
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 700);
  };

  // Handle double tap to like (Instagram iconic feature)
  const handleVideoAreaClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap!
      handleDoubleTapLike();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Single tap after delay if not double tapped
      setTimeout(() => {
        if (lastTapRef.current === now) {
          togglePlay();
        }
      }, 300);
    }
  };

  const handleDoubleTapLike = () => {
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 900);
    handleReact('love');
  };

  // Toggle audio mute
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  // ==========================================
  // NORMAL POST ENDPOINT: REACT (/api/posts/[id]/react)
  // ==========================================
  const handleReact = async (type: ReactionType) => {
    if (!currentUser) {
      alert('Please log in to react');
      return;
    }

    const prevReaction = myReaction;
    const prevCount = reactionCount;

    const isTogglingOff = prevReaction === type;
    const nextReaction: ReactionType | undefined = isTogglingOff ? undefined : type;
    const nextCount = isTogglingOff
      ? Math.max(0, prevCount - 1)
      : prevReaction
      ? prevCount
      : prevCount + 1;

    setMyReaction(nextReaction);
    setReactionCount(nextCount);

    try {
      // Standard post react endpoint: POST /api/posts/${postId}/react
      const res = await apiFetch(`/api/posts/${activePostId}/react`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: currentUser.id,
          type: type,
          post_id: activePostId,
        }),
      });

      if (res) {
        if (typeof res.reactions_count === 'number') {
          setReactionCount(res.reactions_count);
        }
        if (res.my_reaction !== undefined) {
          setMyReaction((res.my_reaction || undefined) as ReactionType | undefined);
        } else if (res.reaction !== undefined) {
          setMyReaction((res.reaction || undefined) as ReactionType | undefined);
        }
      }

      // Re-fetch reactions list: GET /api/posts/:id/reactions
      await fetchReactions();

      if (onReact) {
        try {
          onReact(activePost, type);
        } catch {
          (onReact as any)(activePostId, type);
        }
      }
    } catch (err) {
      console.warn('Post react endpoint error:', err);
      // rollback on error
      setMyReaction(prevReaction);
      setReactionCount(prevCount);
    }
  };

  // ==========================================
  // NORMAL POST ENDPOINT: DISCUSS / COMMENTS (/api/posts/[id]/comments)
  // ==========================================
  const fetchVideoComments = useCallback(async () => {
    if (!activePostId) return;

    setIsLoadingComments(true);
    try {
      // Standard post comments endpoint: /api/posts/${postId}/comments?viewerId=${viewerId}
      const viewerId = currentUser?.id || 0;
      const data = await apiFetch(`/api/posts/${activePostId}/comments?viewerId=${viewerId}`);
      if (Array.isArray(data)) {
        setComments(data);
        setCommentsCount(data.length);
      } else if (Array.isArray(data?.comments)) {
        setComments(data.comments);
        setCommentsCount(data.comments.length);
      }
    } catch (err) {
      console.warn('Failed to load post comments for video:', err);
    } finally {
      setIsLoadingComments(false);
    }
  }, [activePostId, currentUser?.id]);

  const handleOpenDiscuss = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onOpenComments) {
      onOpenComments(activePost);
    } else {
      setShowDiscussModal(true);
      fetchVideoComments();
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    if (!currentUser) {
      alert('Please log in to comment');
      return;
    }

    setIsSubmittingComment(true);

    // Optimistic comment
    const tempComment: ReelComment = {
      id: Date.now(),
      user_id: currentUser.id,
      text,
      created_at: new Date().toISOString(),
      name: currentUser.name || currentUser.username || 'You',
      username: currentUser.username || 'you',
      profile_image_url: avatarFrom(currentUser),
    };

    setComments((prev) => [tempComment, ...prev]);
    setCommentsCount((prev) => prev + 1);
    setCommentText('');

    try {
      // Standard post comments endpoint: /api/posts/${postId}/comments
      const res = await apiFetch(`/api/posts/${activePostId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          post_id: activePostId,
          user_id: currentUser.id,
          text,
        }),
      }).catch(async () => {
        // Fallback to /api/posts/${postId}/comment
        return await apiFetch(`/api/posts/${activePostId}/comment`, {
          method: 'POST',
          body: JSON.stringify({
            post_id: activePostId,
            user_id: currentUser.id,
            text,
          }),
        });
      });

      if (res?.comment?.id || res?.id) {
        const serverComment = res?.comment || res;
        setComments((prev) =>
          prev.map((c) => (c.id === tempComment.id ? { ...c, ...serverComment } : c))
        );
      }
    } catch (err) {
      console.warn('Failed to post comment on video:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // ==========================================
  // NORMAL POST ENDPOINT: SHARE (/api/posts/[id]/share)
  // ==========================================
  const handleShare = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextCount = sharesCount + 1;
    setSharesCount(nextCount);

    // Call standard post share endpoint: POST /api/posts/${postId}/share
    try {
      const res = await apiFetch(`/api/posts/${activePostId}/share`, {
        method: 'POST',
        body: JSON.stringify({
          destination: 'feed',
          user_id: currentUser?.id || 1,
          post_id: activePostId,
        }),
      });

      if (res && (typeof res.shares === 'number' || typeof res.shares_count === 'number')) {
        setSharesCount(res.shares ?? res.shares_count);
      }
    } catch (err) {
      console.warn('Post share endpoint error:', err);
    }

    if (onShare) {
      try {
        onShare(activePostId, nextCount);
      } catch (err) {
        console.warn('onShare callback error:', err);
      }
    }

    // Native Web Share if available
    const shareUrl = `${window.location.origin}/?post=${activePostId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${authorName} on UNERA`,
          text: activePost.content || 'Check out this video on UNERA!',
          url: shareUrl,
        });
        return;
      } catch (e) {
        // User cancelled or share failed, fallback to copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    } catch (err) {
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    }
  };

  // Parse hashtags & mentions
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\s+)/);
    return parts.map((part, i) => {
      if (part.startsWith('#') && part.length > 1) {
        return (
          <span
            key={i}
            className="text-[#38BDF8] font-semibold hover:underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onHashtagClick?.(part);
            }}
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('@') && part.length > 1) {
        return (
          <span
            key={i}
            className="text-[#60A5FA] font-medium hover:underline cursor-pointer"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      ref={containerRef}
      className="w-full bg-[#0F172A] border-b border-[#1E293B] text-[#F8FAFC] font-sans select-none"
    >
      {/* 1. INSTAGRAM HEADER */}
      <div className="flex items-center justify-between px-3.5 py-3">
        <div className="flex items-center gap-3">
          {/* Avatar with authentic story ring/dots only if user has active story - Blue styled */}
          <div
            className={`relative cursor-pointer transition-transform active:scale-95 ${
              userHasStory
                ? 'p-[2px] rounded-full bg-gradient-to-tr from-[#1877F2] via-[#0284C7] to-[#38BDF8] ring-2 ring-[#0F172A]'
                : 'rounded-full'
            }`}
            onClick={() => {
              if (userHasStory && onStoryClick) {
                onStoryClick(authorId);
              } else {
                onProfileClick(authorId);
              }
            }}
            title={userHasStory ? `${authorName} has an active story` : authorName}
          >
            <img
              src={authorAvatar}
              alt={authorName}
              className={`w-9 h-9 rounded-full object-cover ${
                userHasStory ? 'border border-[#0F172A]' : 'border-2 border-[#1E293B]'
              }`}
            />
            {/* Real online status indicator */}
            {isOnline && (
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#22C55E] border-2 border-[#0F172A] rounded-full shadow-sm"
                title="Online now"
              />
            )}
          </div>

          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-1.5">
              <span
                className="font-bold text-[21px] hover:underline cursor-pointer text-[#F8FAFC]"
                onClick={() => onProfileClick(authorId)}
              >
                {authorName}
              </span>
              {/* REAL verification tick only - NEVER faked */}
              {isVerified && (
                <VerifiedBadge size={16} className="shrink-0" />
              )}
              <span className="text-[#64748B] text-[13px]">•</span>
              <span className="text-[#94A3B8] text-[12.5px]">
                {formatRelativeTime(post.created_at || post.timestamp)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[12px] text-[#94A3B8]">
              <i className="fas fa-music text-[10px] text-[#38BDF8]"></i>
              <span className="truncate max-w-[180px] sm:max-w-[240px]">
                {post.song_name || 'Original Audio'} • {authorName}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && currentUser.id !== authorId && onFollow && (
            <button
              onClick={() => onFollow(authorId)}
              className={`text-xs font-semibold px-3 py-1 rounded-md transition-colors ${
                isFollowing
                  ? 'bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]'
                  : 'bg-[#1877F2] text-white hover:bg-[#166FE5]'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}

          {/* Watch in Videos button */}
          <button
            onClick={() => onVideoClick?.(post)}
            title="Watch in Videos"
            className="flex items-center gap-1.5 bg-[#1E293B] hover:bg-[#334155] text-[#38BDF8] text-xs font-semibold px-2.5 py-1 rounded-md transition-colors"
          >
            <i className="fas fa-play text-[10px]"></i>
            <span className="hidden xs:inline">Videos</span>
            <i className="fas fa-chevron-right text-[10px] ml-0.5"></i>
          </button>
        </div>
      </div>

      {/* 2. INSTAGRAM VIDEO MEDIA CONTAINER - FILLS ALL CARD WIDTH */}
      <div
        className="relative w-full bg-black flex items-center justify-center cursor-pointer overflow-hidden min-h-[380px] max-h-[640px] aspect-[4/5] sm:aspect-[1/1] md:aspect-[4/5] max-w-full"
        onClick={handleVideoAreaClick}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          loop
          muted={isMuted}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          className="w-full h-full object-cover object-center"
        />

        {/* Play / Pause Ripple Indicator */}
        {showPlayIcon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity">
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white text-2xl animate-scale-in">
              <i className={`fas fa-${isPlaying ? 'play' : 'pause'}`}></i>
            </div>
          </div>
        )}

        {/* Play Icon when paused (e.g., in feed when autoplay is false) */}
        {!isPlaying && !showPlayIcon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-xl shadow-xl transition-transform active:scale-95">
              <i className="fas fa-play ml-1 text-[#38BDF8]"></i>
            </div>
          </div>
        )}

        {/* User Intent: ">" Button on top of every video to open in Videos page starting from this video */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onVideoClick) {
              onVideoClick(post);
            }
          }}
          title="Open in Videos page"
          aria-label="Open in Videos page"
          className="absolute top-3 right-3 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-black/65 hover:bg-[#1877F2] text-white border border-white/25 shadow-lg backdrop-blur-md transition-all active:scale-90 group cursor-pointer"
        >
          <i className="fas fa-chevron-right text-[13px] ml-0.5 group-hover:translate-x-0.5 transition-transform"></i>
        </button>

        {/* Double-tap Heart Burst Animation */}
        {showHeartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <i className="fas fa-heart text-white drop-shadow-[0_0_20px_rgba(239,68,68,0.9)] text-7xl animate-ping opacity-90 text-red-500"></i>
          </div>
        )}

        {/* Bottom Audio Track Frosted Pill */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none max-w-[70%]">
          <div className="bg-black/50 backdrop-blur-md border border-white/10 text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
            <i className="fas fa-volume-up text-[#38BDF8] text-[10px]"></i>
            <span className="truncate">
              {post.song_name || 'Original Audio'} - {authorName}
            </span>
          </div>
        </div>

        {/* Sound Toggle Floating Button */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
          className="absolute bottom-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
        >
          <i className={`fas fa-${isMuted ? 'volume-mute' : 'volume-up'} text-xs`}></i>
        </button>

        {/* Instagram Scrubber Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-10">
          <div
            className="h-full bg-[#1877F2] transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Reaction Summary & Counts Bar (Identical to Standard Posts) */}
      {(reactionCount > 0 || commentsCount > 0 || sharesCount > 0) && (
        <div className="px-3.5 pt-2.5 pb-1 flex items-center justify-between text-xs text-[#94A3B8] border-b border-[#1E293B]/50">
          <button
            type="button"
            onClick={() => {
              if (onOpenReactions) {
                onOpenReactions(activePost);
              } else {
                setShowReactionsSheet(true);
              }
            }}
            className="flex items-center gap-1.5 hover:underline text-left cursor-pointer group"
          >
            {reactionCount > 0 && (
              <>
                <span className="flex -space-x-1 items-center">
                  {emojiList.map((emoji, idx) => (
                    <span
                      key={idx}
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[11px] ring-1 ring-[#0F172A] bg-[#1E293B]"
                    >
                      {emoji}
                    </span>
                  ))}
                </span>
                <span className="font-medium text-[#CBD5E1] group-hover:text-[#F8FAFC]">
                  {reactionText}
                </span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3 font-medium">
            {commentsCount > 0 && (
              <button
                type="button"
                onClick={handleOpenDiscuss}
                className="hover:underline hover:text-[#CBD5E1]"
              >
                {formatCount(commentsCount)} {commentsCount === 1 ? 'Discussion' : 'Discussions'}
              </button>
            )}
            {sharesCount > 0 && (
              <span>
                {formatCount(sharesCount)} {sharesCount === 1 ? 'Share' : 'Shares'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. ACTION BAR (React with ReactionButton dock, Discuss, Share, Save) */}
      <div className="px-3.5 pt-2 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 1. React Button with Animated Dock */}
            <ReactionButton
              currentUserReactions={myReaction}
              reactionCount={reactionCount}
              onReact={handleReact}
              isGuest={!currentUser}
              postId={activePostId}
            />

            {/* 2. Discuss / Comment */}
            <button
              type="button"
              onClick={handleOpenDiscuss}
              className="flex items-center gap-1.5 text-[#F8FAFC] hover:text-[#38BDF8] transition-colors focus:outline-none p-1.5 rounded-lg hover:bg-[#1E293B]/60"
              aria-label="Discuss & Comments"
              title="Discuss"
            >
              <i className="far fa-comment text-[20px]"></i>
              {commentsCount > 0 && (
                <span className="text-[14px] font-semibold text-[#F8FAFC]">
                  {formatCount(commentsCount)}
                </span>
              )}
            </button>

            {/* 3. Share */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 text-[#F8FAFC] hover:text-[#38BDF8] transition-transform active:scale-110 focus:outline-none p-1.5 rounded-lg hover:bg-[#1E293B]/60"
              aria-label="Share reel"
              title="Share"
            >
              <i className="far fa-paper-plane text-[19px]"></i>
              {sharesCount > 0 && (
                <span className="text-[14px] font-semibold text-[#F8FAFC]">
                  {formatCount(sharesCount)}
                </span>
              )}
            </button>
          </div>

          {/* Bookmark / Save */}
          <button
            onClick={() => toggleSavePost(activePost, true)}
            className="flex items-center justify-center p-1.5 rounded-lg hover:bg-[#1E293B]/60 transition-transform active:scale-110 focus:outline-none"
            aria-label={isSaved ? 'Remove from saved' : 'Save'}
            title={isSaved ? 'Saved' : 'Save post'}
          >
            <i
              className={`${
                isSaved ? 'fas text-[#F59E0B]' : 'far text-[#F8FAFC] hover:text-[#F59E0B]'
              } fa-bookmark text-[19px] transition-colors`}
            ></i>
          </button>
        </div>

        {/* Caption & Hashtags */}
        {activePost.content && (
          <div className="mt-2 text-[15px] leading-snug">
            <span
              className="font-bold text-[15px] text-[#F8FAFC] mr-1.5 cursor-pointer hover:underline"
              onClick={() => onProfileClick(authorId)}
            >
              {authorName}
            </span>
            <span className="text-[#E2E8F0]">
              {isCaptionExpanded
                ? renderFormattedText(activePost.content)
                : renderFormattedText(activePost.content.slice(0, 110))}
            </span>
            {activePost.content.length > 110 && (
              <button
                onClick={() => setIsCaptionExpanded(!isCaptionExpanded)}
                className="text-[#94A3B8] hover:text-white text-xs ml-1 font-medium"
              >
                {isCaptionExpanded ? 'less' : 'more'}
              </button>
            )}
          </div>
        )}

        {/* View all discussions link */}
        {commentsCount > 0 && (
          <button
            onClick={handleOpenDiscuss}
            className="mt-1.5 text-[#94A3B8] hover:text-[#F8FAFC] text-[13px] font-medium block transition-colors"
          >
            View all {commentsCount} discussions
          </button>
        )}

        {/* Inline Quick Comment Input */}
        <form onSubmit={handlePostComment} className="mt-2.5 pt-2 border-t border-[#1E293B]/70 flex items-center gap-2.5">
          <img
            src={avatarFrom(currentUser)}
            alt=""
            className="w-7 h-7 rounded-full object-cover"
          />
          <input
            type="text"
            placeholder="Add a discussion…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="bg-transparent flex-1 text-[14px] text-[#F8FAFC] placeholder-[#64748B] outline-none"
          />
          {commentText.trim() && (
            <button
              type="submit"
              disabled={isSubmittingComment}
              className="text-[#1877F2] hover:text-[#38BDF8] text-[14px] font-bold transition-colors disabled:opacity-50"
            >
              Post
            </button>
          )}
        </form>
      </div>

      {/* Share Toast */}
      {showShareToast && (
        <div className="px-4 py-2 bg-[#1E293B] text-[#38BDF8] text-xs font-semibold flex items-center justify-center gap-2">
          <i className="fas fa-check-circle"></i>
          <span>Link copied to clipboard! Ready to share.</span>
        </div>
      )}

      {/* Reactions Sheet */}
      {showReactionsSheet && (
        <ReactionsSheet
          isOpen={showReactionsSheet}
          onClose={() => setShowReactionsSheet(false)}
          post={{
            ...activePost,
            id: activePostId,
            post_id: activePostId,
            reactions_count: reactionCount,
            reactions: combinedReactions,
          }}
          onProfileClick={onProfileClick}
          onOpenComments={handleOpenDiscuss}
        />
      )}

      {/* ========================================== */}
      {/* 4. REEL DISCUSS / COMMENTS DRAWER MODAL    */}
      {/* ========================================== */}
      {showDiscussModal && (
        <div
          className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex justify-center items-end sm:items-center"
          onClick={() => setShowDiscussModal(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0B1120] border border-[#1E293B] rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[85vh] h-[550px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Discuss Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#1E293B] bg-[#0B1120]">
              <div className="flex items-center gap-2">
                <i className="fas fa-comments text-[#38BDF8]"></i>
                <h3 className="font-bold text-[16px] text-[#F8FAFC]">Video Discussion</h3>
                <span className="text-xs bg-[#1E293B] text-[#94A3B8] px-2 py-0.5 rounded-full">
                  {commentsCount}
                </span>
              </div>
              <button
                onClick={() => setShowDiscussModal(false)}
                className="w-8 h-8 rounded-full hover:bg-[#1E293B] flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors"
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-[#1E293B]/40">
              {isLoadingComments ? (
                <div className="flex flex-col items-center justify-center h-48 text-[#94A3B8]">
                  <i className="fas fa-spinner fa-spin text-2xl text-[#1877F2] mb-2"></i>
                  <span className="text-sm">Loading comments…</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-[#94A3B8] text-center">
                  <i className="far fa-comment-dots text-3xl text-[#475569] mb-2"></i>
                  <p className="text-sm font-medium text-[#F8FAFC]">No comments yet</p>
                  <p className="text-xs text-[#64748B]">Be the first to start the discussion on this video!</p>
                </div>
              ) : (
                comments.map((comment) => {
                  const cAuthorName = comment.name || comment.user?.name || 'User';
                  const cAuthorAvatar =
                    comment.profile_image_url ||
                    comment.user?.profile_image_url ||
                    avatarFrom({ id: comment.user_id, name: cAuthorName });

                  return (
                    <div key={comment.id} className="pt-3 first:pt-0 flex items-start gap-3">
                      <img
                        src={cAuthorAvatar}
                        alt={cAuthorName}
                        className="w-8 h-8 rounded-full object-cover border border-[#1E293B]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bold text-[21px] text-[#F8FAFC] hover:underline cursor-pointer"
                            onClick={() => {
                              setShowDiscussModal(false);
                              onProfileClick(comment.user_id);
                            }}
                          >
                            {cAuthorName}
                          </span>
                          <span className="text-[12px] text-[#64748B]">
                            {formatRelativeTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-[20.5px] leading-[1.38] text-[#CBD5E1] mt-0.5 break-words">
                          {renderFormattedText(comment.text)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Emoji Bar */}
            <div className="px-4 py-1.5 bg-[#0B1120] border-t border-[#1E293B] flex items-center justify-between text-lg">
              {['❤️', '🙌', '🔥', '👏', '😍', '😂', '😮', '💯'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setCommentText((prev) => prev + emoji)}
                  className="hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Comment Form */}
            <form
              onSubmit={handlePostComment}
              className="p-3 bg-[#0F172A] border-t border-[#1E293B] flex items-center gap-3"
            >
              <img
                src={avatarFrom(currentUser)}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-[#1E293B]"
              />
              <input
                type="text"
                placeholder="Share your thoughts on this video…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-[#1E293B] border border-[#334155] rounded-full px-4 py-2.5 text-[16px] text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#1877F2]"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isSubmittingComment}
                className="bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-40 text-white text-sm font-bold px-4 py-2.5 rounded-full transition-colors flex items-center gap-1.5"
              >
                {isSubmittingComment ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <>
                    <span>Post</span>
                    <i className="fas fa-arrow-up text-[10px]"></i>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
