import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../utils/api';
import { safeUserId, avatarFrom, formatRelativeTime } from './Feed';
import { useIsPostSaved, toggleSavePost } from '../utils/savedPosts';
import { VerifiedBadge } from './VerifiedBadge';

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
  post: any;
  author: any;
  currentUser: any;
  users?: any[];
  stories?: any[];
  hasStory?: boolean;
  autoplay?: boolean;
  onProfileClick: (userId: number) => void;
  onStoryClick?: (userId: number) => void;
  onReact?: (postId: number, type: any) => void;
  onShare?: (postId: number, count: number) => void;
  onVideoClick?: (post: any) => void;
  onDelete?: (postId: number) => void;
  onEdit?: (postId: number, text: string) => void;
  isFollowing?: boolean;
  onFollow?: (userId: number) => void;
  onHashtagClick?: (tag: string) => void;
  onOpenComments?: (post: any) => void;
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
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  // Verification check - ONLY show if really verified, NEVER faked
  const isVerified = Boolean(
    author?.is_verified ||
    author?.verified ||
    post?.user?.is_verified ||
    post?.user?.verified ||
    post?.author?.is_verified ||
    post?.author?.verified ||
    post?.is_verified ||
    post?.verified
  );

  // Author ID
  const authorId = safeUserId(author || post?.user || post?.author || { id: post?.user_id });

  // Authentic story check - only show story ring/dots if user has active stories
  const userHasStory = useMemo(() => {
    if (typeof hasStory === 'boolean') return hasStory;
    if (author?.has_story || author?.hasStory || post?.user?.has_story || post?.user?.hasStory) return true;
    if (Array.isArray(stories) && stories.length > 0) {
      return stories.some((s: any) => {
        const sUid = Number(s?.user_id ?? s?.user?.id ?? 0);
        return sUid > 0 && sUid === authorId;
      });
    }
    return false;
  }, [hasStory, author, post, stories, authorId]);

  // Online status check
  const isOnline = Boolean(
    author?.is_online ||
    author?.isOnline ||
    post?.user?.is_online ||
    post?.user?.isOnline
  );

  // Video URL resolution
  const videoUrl =
    post?.media_url ||
    post?.video_url ||
    (Array.isArray(post?.media_urls) ? post.media_urls.find((u: string) => typeof u === 'string' && u.match(/\.(mp4|webm|mov|m4v)/i)) : null) ||
    post?.media_urls?.[0] ||
    post?.meta?.video_url ||
    '';

  const reelId = post?.reel_id || post?.reelId || (post?.type === 'reel' ? post?.id : null) || post?.id;

  // Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  // Reels stats states
  const postReactions = post?.reactions || {};
  const initialLikes =
    typeof post?.likes_count === 'number'
      ? post.likes_count
      : typeof post?.reaction_count === 'number'
      ? post.reaction_count
      : (postReactions?.like || 0) + (postReactions?.love || 0) + (postReactions?.heart || 0) || 0;

  const [likesCount, setLikesCount] = useState<number>(initialLikes);
  const [isLiked, setIsLiked] = useState<boolean>(
    Boolean(
      post?.my_reaction === 'love' ||
      post?.my_reaction === 'like' ||
      post?.is_liked ||
      post?.has_reacted
    )
  );

  const [sharesCount, setSharesCount] = useState<number>(post?.shares || post?.shares_count || 0);
  const [commentsCount, setCommentsCount] = useState<number>(
    post?.comments_count || (Array.isArray(post?.comments) ? post.comments.length : 0)
  );

  // Discuss modal & comments state
  const [showDiscussModal, setShowDiscussModal] = useState(false);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Caption expand state
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const isSaved = useIsPostSaved(reelId || post?.id);
  const [showShareToast, setShowShareToast] = useState(false);

  const authorName = author?.name || post?.user?.name || post?.author_name || 'Creator';
  const authorUsername = author?.username || post?.user?.username || authorName.toLowerCase().replace(/\s+/g, '_');
  const authorAvatar = avatarFrom(author || post?.user);

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
    if (!isLiked) {
      handleLike();
    }
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
  // NORMAL POST ENDPOINT: REACT / LIKE
  // ==========================================
  const handleLike = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser) {
      alert('Please log in to like this video');
      return;
    }

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    const activePostId = Number(post?.id || reelId);

    // Optimistic trigger to timeline post reaction
    if (onReact) {
      onReact(activePostId, nextLiked ? 'love' : null);
    }

    try {
      // Standard post react endpoint: /api/posts/${postId}/react
      await apiFetch(`/api/posts/${activePostId}/react`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: currentUser.id,
          type: nextLiked ? 'love' : 'like',
          post_id: activePostId,
        }),
      }).catch(async () => {
        // Fallback to reels reaction endpoint if needed
        await apiFetch(`/api/reels/${activePostId}/react`, {
          method: 'POST',
          body: JSON.stringify({
            user_id: currentUser.id,
            reaction: nextLiked ? 'love' : 'like',
          }),
        }).catch(() => {});
      });
    } catch (err) {
      console.warn('Post react endpoint error:', err);
    }
  };

  // ==========================================
  // NORMAL POST ENDPOINT: DISCUSS / COMMENTS
  // ==========================================
  const fetchReelComments = useCallback(async () => {
    const activePostId = Number(post?.id || reelId);
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
      } else {
        const fallback = await apiFetch(`/api/reel-comments?reel_id=${activePostId}`);
        const arr = Array.isArray(fallback) ? fallback : Array.isArray(fallback?.comments) ? fallback.comments : [];
        if (arr.length > 0) {
          setComments(arr);
          setCommentsCount(arr.length);
        }
      }
    } catch (err) {
      console.warn('Failed to load post comments for video:', err);
    } finally {
      setIsLoadingComments(false);
    }
  }, [post?.id, reelId, currentUser?.id]);

  const handleOpenDiscuss = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onOpenComments) {
      onOpenComments(post);
    } else {
      setShowDiscussModal(true);
      fetchReelComments();
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
    const activePostId = Number(post?.id || reelId);

    // Optimistic comment
    const tempComment: ReelComment = {
      id: Date.now(),
      user_id: currentUser.id,
      text,
      created_at: new Date().toISOString(),
      name: currentUser.name || 'You',
      username: currentUser.username || 'you',
      profile_image_url: avatarFrom(currentUser),
    };

    setComments((prev) => [tempComment, ...prev]);
    setCommentsCount((prev) => prev + 1);
    setCommentText('');

    try {
      // Standard post comment endpoint: /api/posts/${postId}/comment
      const res = await apiFetch(`/api/posts/${activePostId}/comment`, {
        method: 'POST',
        body: JSON.stringify({
          post_id: activePostId,
          user_id: currentUser.id,
          text,
        }),
      }).catch(async () => {
        // Fallback to reel comments
        return await apiFetch('/api/reel-comments', {
          method: 'POST',
          body: JSON.stringify({
            reel_id: activePostId,
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
  // NORMAL POST ENDPOINT: SHARE
  // ==========================================
  const handleShare = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const activePostId = Number(post?.id || reelId);
    const nextCount = sharesCount + 1;
    setSharesCount(nextCount);

    if (onShare) {
      onShare(post.id, nextCount);
    }

    // Call standard post share endpoint: /api/posts/${postId}/share
    try {
      if (currentUser?.id) {
        await apiFetch(`/api/posts/${activePostId}/share`, {
          method: 'POST',
          body: JSON.stringify({ destination: 'feed', user_id: currentUser.id, post_id: activePostId }),
        }).catch(async () => {
          // Fallback to reels share
          await apiFetch(`/api/reels/${activePostId}/share`, {
            method: 'POST',
            body: JSON.stringify({ user_id: currentUser.id }),
          }).catch(() => {});
        });
      }
    } catch (err) {
      console.warn('Post share endpoint error:', err);
    }

    // Native Web Share if available
    const shareUrl = `${window.location.origin}/?post=${activePostId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${authorName} on UNERA`,
          text: post.content || 'Check out this video on UNERA!',
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

      {/* 3. INSTAGRAM ACTION BAR (Heart, Comment, Share, Save) */}
      <div className="px-3.5 pt-3 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 1. Like / React */}
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 text-white transition-transform active:scale-125 focus:outline-none p-1 rounded-lg hover:bg-[#1E293B]/60"
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <i
                className={`fas fa-heart text-[22px] transition-colors ${
                  isLiked ? 'text-red-500' : 'text-[#F8FAFC] hover:text-red-400'
                }`}
              ></i>
              {likesCount > 0 && (
                <span className="text-[14px] font-semibold text-[#F8FAFC]">
                  {formatCount(likesCount)}
                </span>
              )}
            </button>

            {/* 2. Discuss / Comment */}
            <button
              onClick={handleOpenDiscuss}
              className="flex items-center gap-1.5 text-[#F8FAFC] hover:text-[#38BDF8] transition-colors focus:outline-none p-1 rounded-lg hover:bg-[#1E293B]/60"
              aria-label="Discuss & Comments"
            >
              <i className="far fa-comment text-[22px]"></i>
              {commentsCount > 0 && (
                <span className="text-[14px] font-semibold text-[#F8FAFC]">
                  {formatCount(commentsCount)}
                </span>
              )}
            </button>

            {/* 3. Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-[#F8FAFC] hover:text-[#38BDF8] transition-transform active:scale-110 focus:outline-none p-1 rounded-lg hover:bg-[#1E293B]/60"
              aria-label="Share reel"
            >
              <i className="far fa-paper-plane text-[21px]"></i>
              {sharesCount > 0 && (
                <span className="text-[14px] font-semibold text-[#F8FAFC]">
                  {formatCount(sharesCount)}
                </span>
              )}
            </button>
          </div>

          {/* Bookmark / Save */}
          <button
            onClick={() => toggleSavePost(post, true)}
            className="flex items-center justify-center p-1 rounded-lg hover:bg-[#1E293B]/60 transition-transform active:scale-110 focus:outline-none"
            aria-label={isSaved ? 'Remove from saved' : 'Save'}
            title={isSaved ? 'Saved' : 'Save post'}
          >
            <i
              className={`${
                isSaved ? 'fas text-[#F59E0B]' : 'far text-[#F8FAFC] hover:text-[#F59E0B]'
              } fa-bookmark text-[21px] transition-colors`}
            ></i>
          </button>
        </div>

        {/* Likes Count */}
        <div className="mt-2 text-[14px] font-bold text-[#F8FAFC]">
          {likesCount > 0 ? (
            <span>
              {likesCount.toLocaleString()}{' '}
              {likesCount === 1 ? 'like' : 'likes'}
            </span>
          ) : (
            <span className="text-[#94A3B8] font-normal text-xs">Be the first to like this</span>
          )}
        </div>

        {/* Caption & Hashtags */}
        {post.content && (
          <div className="mt-1 text-[15px] leading-snug">
            <span
              className="font-bold text-[21px] text-[#F8FAFC] mr-1.5 cursor-pointer hover:underline"
              onClick={() => onProfileClick(authorId)}
            >
              {authorName}
            </span>
            <span className="text-[#E2E8F0]">
              {isCaptionExpanded
                ? renderFormattedText(post.content)
                : renderFormattedText(post.content.slice(0, 110))}
            </span>
            {post.content.length > 110 && (
              <button
                onClick={() => setIsCaptionExpanded(!isCaptionExpanded)}
                className="text-[#94A3B8] hover:text-white text-xs ml-1 font-medium"
              >
                {isCaptionExpanded ? 'less' : 'more'}
              </button>
            )}
          </div>
        )}

        {/* View all comments link */}
        {commentsCount > 0 && (
          <button
            onClick={handleOpenDiscuss}
            className="mt-1 text-[#CBD5E1] hover:text-[#F8FAFC] text-[20.5px] font-semibold block transition-colors"
          >
            View all {commentsCount} comments
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
            placeholder="Add a comment…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="bg-transparent flex-1 text-[16px] text-[#F8FAFC] placeholder-[#64748B] outline-none"
          />
          {commentText.trim() && (
            <button
              type="submit"
              disabled={isSubmittingComment}
              className="text-[#1877F2] hover:text-[#38BDF8] text-[16px] font-bold transition-colors disabled:opacity-50"
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
                <h3 className="font-bold text-[16px] text-[#F8FAFC]">Video Comments</h3>
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
