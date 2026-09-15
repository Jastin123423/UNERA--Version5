import { useState, useEffect, useCallback } from 'react';

export interface SavedPostItem {
  id: string | number;
  type: 'video' | 'normal';
  savedAt: number;
  post: any;
}

const STORAGE_KEY = 'unera_saved_posts';
const CHANGE_EVENT = 'unera_saved_posts_changed';

/**
 * Determine whether a post or reel item is considered a video post
 */
export const detectIsVideoPost = (post: any, explicitIsVideo?: boolean): boolean => {
  if (explicitIsVideo !== undefined) return explicitIsVideo;
  if (!post) return false;
  if (post.type === 'video' || post.media_type === 'video' || post.is_video) return true;
  if (post.video_url || post.videoUrl || post.reel_url) return true;
  if (Array.isArray(post.video_urls) && post.video_urls.length > 0) return true;
  if (Array.isArray(post.media_urls) && post.media_urls.some((url: string) => /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url))) return true;
  if (typeof post.media_url === 'string' && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(post.media_url)) return true;
  return false;
};

/**
 * Retrieve all saved posts from localStorage
 */
export const getSavedPosts = (): SavedPostItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to read saved posts from localStorage:', e);
    return [];
  }
};

/**
 * Check whether a post or reel is saved
 */
export const isPostSaved = (id: string | number): boolean => {
  if (id === undefined || id === null) return false;
  const list = getSavedPosts();
  return list.some((item) => String(item.id) === String(id));
};

/**
 * Toggle saved status for a post. Returns true if now saved, false if removed.
 */
export const toggleSavePost = (post: any, explicitIsVideo?: boolean): boolean => {
  if (!post || post.id === undefined || post.id === null) return false;
  const list = getSavedPosts();
  const idStr = String(post.id);
  const existingIndex = list.findIndex((item) => String(item.id) === idStr);

  let nowSaved = false;
  let updatedList: SavedPostItem[];

  if (existingIndex >= 0) {
    // Remove from saved
    updatedList = list.filter((_, idx) => idx !== existingIndex);
    nowSaved = false;
  } else {
    // Add to saved
    const isVideo = detectIsVideoPost(post, explicitIsVideo);
    const newItem: SavedPostItem = {
      id: post.id,
      type: isVideo ? 'video' : 'normal',
      savedAt: Date.now(),
      post: post,
    };
    updatedList = [newItem, ...list];
    nowSaved = true;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(CHANGE_EVENT, {
          detail: { id: post.id, isSaved: nowSaved },
        })
      );
    }
  } catch (e) {
    console.error('Failed to save posts to localStorage:', e);
  }

  return nowSaved;
};

/**
 * Remove a post from saved posts
 */
export const removeSavedPost = (id: string | number): void => {
  if (id === undefined || id === null) return;
  const list = getSavedPosts();
  const updatedList = list.filter((item) => String(item.id) !== String(id));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(CHANGE_EVENT, {
          detail: { id, isSaved: false },
        })
      );
    }
  } catch (e) {
    console.error('Failed to remove saved post:', e);
  }
};

/**
 * React hook to reactively track if a specific post is saved
 */
export const useIsPostSaved = (id: string | number): boolean => {
  const [saved, setSaved] = useState<boolean>(() => isPostSaved(id));

  useEffect(() => {
    setSaved(isPostSaved(id));

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || String(customEvent.detail.id) === String(id)) {
        setSaved(isPostSaved(id));
      }
    };

    window.addEventListener(CHANGE_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, [id]);

  return saved;
};

/**
 * React hook to track all saved posts reactively
 */
export const useSavedPosts = () => {
  const [savedPosts, setSavedPosts] = useState<SavedPostItem[]>(() => getSavedPosts());

  const refresh = useCallback(() => {
    setSavedPosts(getSavedPosts());
  }, []);

  useEffect(() => {
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  return {
    savedPosts,
    refresh,
    remove: removeSavedPost,
    toggle: toggleSavePost,
    isSaved: isPostSaved,
  };
};
