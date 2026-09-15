
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useContext,
  memo,
} from 'react';
import {
  User,
  Post as PostType,
  ReactionType,
  Product,
  LinkPreview,
  AudioTrack,
  Group,
  Brand,
  Story,
  Event,
} from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { LOCATIONS_DATA, MARKETPLACE_COUNTRIES } from '../constants';
import { MarketplaceContext } from '../App';
import { CreateEventModal } from './Events';
import { EventDetailsModal } from './EventsPage';
import { performPostAction } from '../postActionRegistry';
import { PostMenu } from './Post/PostMenu';
import { buildImageUploadBundle } from '../utils/imageCompression';
import { resolveApiUrl } from '../utils/api';
import { VerifiedBadge } from './VerifiedBadge';
import {
  getCachedComments,
  setCachedComments,
  addCachedComment,
  updateCachedComment,
} from '../utils/dataCache';
import { InstagramVideoCard } from './InstagramVideoCard';
import { SavePostButton } from './SavePostButton';
import { imageCache, observeForThumbnail, observeForFeed } from '../utils/imageCache';
//====================TYPE DEFINITION =============
export type FeedItem =
  | { kind: 'post'; data: any; created_at?: string }
  | { kind: 'story'; data: Story; created_at?: string }
  | { kind: 'reel'; data: ReelFeedData; created_at?: string };  // ✅ ADD THIS

// ==================== ICON COMPONENTS ====================
const Film: React.FC<{ size?: number; color?: string }> = ({
  size = 22,
  color = '#1877F2',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
    <line x1="7" y1="2" x2="7" y2="22"></line>
    <line x1="17" y1="2" x2="17" y2="22"></line>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <line x1="2" y1="7" x2="7" y2="7"></line>
    <line x1="2" y1="17" x2="7" y2="17"></line>
  </svg>
);

const MoreHorizontal: React.FC<{ size?: number; color?: string }> = ({
  size = 26,
  color = '#b0b3b8',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="1"></circle>
    <circle cx="19" cy="12" r="1"></circle>
    <circle cx="5" cy="12" r="1"></circle>
  </svg>
);

const Play: React.FC<{
  size?: number;
  color?: string;
  fill?: string;
  style?: React.CSSProperties;
}> = ({ size = 36, color = '#fff', fill = '#fff', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const Eye: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = '#fff',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const SparkReactIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id="uneraSparkGrad" x1="12" y1="52" x2="52" y2="12">
        <stop offset="0%" stopColor="#FF7A45" />
        <stop offset="55%" stopColor="#FF5A6A" />
        <stop offset="100%" stopColor="#FF8A3D" />
      </linearGradient>
      <filter
        id="uneraSparkGlow"
        x="-40%"
        y="-40%"
        width="180%"
        height="180%"
      >
        <feGaussianBlur stdDeviation="2.2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <circle
      cx="32"
      cy="32"
      r="18"
      fill="url(#uneraSparkGrad)"
      opacity="0.14"
    />
    <g
      stroke="url(#uneraSparkGrad)"
      strokeWidth="5.2"
      strokeLinecap="round"
      filter="url(#uneraSparkGlow)"
    >
      <line x1="32" y1="10" x2="32" y2="18" />
      <line x1="32" y1="46" x2="32" y2="54" />
      <line x1="10" y1="32" x2="18" y2="32" />
      <line x1="46" y1="32" x2="54" y2="32" />
      <line x1="17" y1="17" x2="22.8" y2="22.8" />
      <line x1="41.2" y1="41.2" x2="47" y2="47" />
      <line x1="47" y1="17" x2="41.2" y2="22.8" />
      <line x1="22.8" y1="41.2" x2="17" y2="47" />
    </g>
    <circle cx="32" cy="32" r="6.2" fill="url(#uneraSparkGrad)" />
  </svg>
);

const DiscussSignalIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 28,
  color = '#1877F2',
}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <g
      fill="none"
      stroke={color}
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 20c0-5 4-9 9-9h18c7 0 13 6 13 13v6c0 7-6 13-13 13H30l-9 7v-7h-1c-6 0-10-4-10-10V20z" />
      <circle cx="27" cy="30" r="2.2" />
      <circle cx="33" cy="30" r="2.2" />
      <circle cx="39" cy="30" r="2.2" />
      <path d="M48 18c3 2 5 5 6 9" />
      <path d="M44 22c2 1 3 3 4 6" />
    </g>
  </svg>
);

// ==================== HELPER FUNCTIONS ====================
const formatViewCount = (n?: number): string => {
  const v = Number(n || 0);
  if (v >= 1_000_000_000)
    return `${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (v >= 1_000_000)
    return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(v);
};

const isStoryVideo = (story: any) => {
  if (story?.type === 'video') return true;

  const safeParseArray = (value: any) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const mediaMeta = safeParseArray(story?.media_meta);
  if (mediaMeta.length > 0) {
    const first = mediaMeta[0];
    const item = typeof first === 'string' ? (() => {
      try {
        return JSON.parse(first);
      } catch {
        return null;
      }
    })() : first;

    if (item?.type === 'video') return true;

    const metaUrl = String(item?.feed || item?.full || item?.thumb || '').toLowerCase();
    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(metaUrl)) return true;
  }

  const mediaUrls = safeParseArray(story?.media_urls);
  const firstUrl = String(
    story?.media_url || mediaUrls[0] || ''
  ).toLowerCase();

  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(firstUrl);
};

const getStoryAuthorName = (story: any) =>
  story?.user?.name || story?.author_name || story?.username || 'User';

const getStoryAuthorImage = (story: any) => {
  const name = getStoryAuthorName(story);
  return (
    story?.user?.profile_image_url ||
    story?.author_image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1877F2&color=fff&size=128`
  );
};

type RSVPStatus = 'going' | 'interested' | 'not_going';

const rsvpEventDirect = async (args: {
  eventId: number;
  userId: number;
  newStatus: RSVPStatus;
  prevStatus?: '' | 'going' | 'interested';
}) => {
  const { eventId, userId, newStatus, prevStatus = '' } = args;
  const endpoint =
    newStatus === 'going'
      ? '/api/attend'
      : newStatus === 'interested'
      ? '/api/interested'
      : prevStatus === 'interested'
      ? '/api/interested'
      : '/api/attend';
  const payloadStatus = {
    event_id: eventId,
    user_id: userId,
    status: newStatus,
  };
  try {
    return await postJSON(endpoint, payloadStatus);
  } catch (e1: any) {
    const payloadAction = {
      event_id: eventId,
      user_id: userId,
      action: newStatus === 'not_going' ? 'remove' : 'add',
    };
    try {
      return await postJSON(endpoint, payloadAction);
    } catch (e2: any) {
      throw new Error(e2?.message || e1?.message || 'RSVP failed');
    }
  }
};

const avatarFrom = (u: any) => {
  const img = String(
    u?.profile_image_url ??
      u?.profileImage ??
      u?.avatar ??
      u?.author_image ??
      u?.authorImage ??
      u?.image ??
      u?.picture ??
      ''
  ).trim();
  if (img && img !== 'null' && img !== 'undefined') return img;
  const label =
    String(u?.name ?? '').trim() ||
    String(u?.username ?? '').trim() ||
    String(u?.author_name ?? '').trim() ||
    String(u?.author_username ?? '').trim() ||
    'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    label
  )}&background=1877F2&color=fff&bold=true`;
};

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('unera_token');
  const headers: HeadersInit = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

//====NATIVE HELPERS =====
  
  // Native detection helper (add inside CreatePostModal or import from parent)
const isUneraNativeApp = (): boolean => {
  return Boolean(
    (window as any).UneraNative || 
    (window as any).UNERA_IS_NATIVE_APP
  );
};

// ====== FEEDS ARRANGEMENTS HELPERS =====
const safeArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);

const safeNumber = (v: any, fallback = 0) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const seededRand01 = (seed: number) => {
  let x = seed | 0;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return ((x >>> 0) % 1000000) / 1000000;
};

const toTime = (d: any) => {
  const t = new Date(String(d ?? '')).getTime();
  return Number.isFinite(t) ? t : 0;
};

const getRotatedReels = (reelsList: any[], currentUser: any, seed: number) => {
  const arr = safeArray<any>(reelsList).slice();

  if (!arr.length) return [];

  const meId = safeNumber(currentUser?.id, 0);
  const following = new Set<number>(safeArray<number>(currentUser?.following));

  const scored = arr.map((reel, idx) => {
    const uid = safeNumber(reel?.user_id ?? reel?.user?.id, 0);
    const isMine = !!meId && uid === meId;
    const isFollowingAuthor = !!uid && following.has(uid);
    const created = toTime(reel?.created_at);

    let score = 0;

    // do not force my reels to top
    if (!isMine) score += 4;
    if (isFollowingAuthor) score += 2;

    // freshness
    score += created / 1_000_000_000_000;

    // small stable jitter per refresh
    score += seededRand01(seed + safeNumber(reel?.id, idx + 1) * 137) * 0.8;

    return { reel, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // avoid same author repeating
  const out: any[] = [];
  const authorCounts = new Map<number, number>();

  for (const item of scored) {
    const uid = safeNumber(item.reel?.user_id ?? item.reel?.user?.id, 0);
    const lastUid = out.length
      ? safeNumber(out[out.length - 1]?.user_id ?? out[out.length - 1]?.user?.id, 0)
      : 0;

    if (uid && uid === lastUid) continue;
    if ((authorCounts.get(uid) || 0) >= 1) continue;

    out.push(item.reel);
    authorCounts.set(uid, (authorCounts.get(uid) || 0) + 1);
  }

  // add leftovers if needed
  for (const item of scored) {
    if (!out.includes(item.reel)) out.push(item.reel);
  }

  // keep only a reasonable amount for mixed feed
  return out.slice(0, 8);
};

const interleaveFeedItems = (
  postItems: Array<{ kind: 'post'; data: any; created_at: string }>,
  storyItems: Array<{ kind: 'story'; data: any; created_at: string }>,
  reelItems: Array<{ kind: 'reel'; data: any; created_at: string }>
) => {
  const result: Array<{ kind: 'post' | 'story' | 'reel'; data: any; created_at: string }> = [];

  let postIndex = 0;
  let storyIndex = 0;
  let reelIndex = 0;

  const totalPosts = postItems.length;
  const totalStories = storyItems.length;
  const totalReels = reelItems.length;

  // spread stories and reels instead of pushing them down
  const storyStep = totalStories > 0 ? Math.max(4, Math.floor(totalPosts / (totalStories + 1))) : 999999;
  const reelStep = totalReels > 0 ? Math.max(5, Math.floor(totalPosts / (totalReels + 1))) : 999999;

  let insertedSinceLastSpecial = 0;
  let lastSpecialKind: 'story' | 'reel' | null = null;

  while (
    postIndex < totalPosts ||
    storyIndex < totalStories ||
    reelIndex < totalReels
  ) {
    const canInsertStory =
      storyIndex < totalStories &&
      insertedSinceLastSpecial >= storyStep &&
      lastSpecialKind !== 'story';

    const canInsertReel =
      reelIndex < totalReels &&
      insertedSinceLastSpecial >= reelStep &&
      lastSpecialKind !== 'reel';

    if (canInsertStory) {
      result.push(storyItems[storyIndex++]);
      insertedSinceLastSpecial = 0;
      lastSpecialKind = 'story';
      continue;
    }

    if (canInsertReel) {
      result.push(reelItems[reelIndex++]);
      insertedSinceLastSpecial = 0;
      lastSpecialKind = 'reel';
      continue;
    }

    if (postIndex < totalPosts) {
      result.push(postItems[postIndex++]);
      insertedSinceLastSpecial += 1;
      continue;
    }

    // fallback when posts finish
    if (storyIndex < totalStories && lastSpecialKind !== 'story') {
      result.push(storyItems[storyIndex++]);
      lastSpecialKind = 'story';
      insertedSinceLastSpecial = 0;
      continue;
    }

    if (reelIndex < totalReels && lastSpecialKind !== 'reel') {
      result.push(reelItems[reelIndex++]);
      lastSpecialKind = 'reel';
      insertedSinceLastSpecial = 0;
      continue;
    }

    // if only same type remains, allow it to finish
    if (storyIndex < totalStories) {
      result.push(storyItems[storyIndex++]);
      lastSpecialKind = 'story';
      insertedSinceLastSpecial = 0;
      continue;
    }

    if (reelIndex < totalReels) {
      result.push(reelItems[reelIndex++]);
      lastSpecialKind = 'reel';
      insertedSinceLastSpecial = 0;
      continue;
    }
  }

  return result;
};
  
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData)
    headers['Content-Type'] =
      (headers['Content-Type'] as string) || 'application/json';
  

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const targetUrl = resolveApiUrl(url);
    const res = await fetch(targetUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') || '';
    let data: any = null;

    try {
      if (contentType.includes('application/json')) data = await res.json();
      else {
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

const authHeaders = () => {
  const token = localStorage.getItem('unera_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function safeJson(res: Response) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    return { raw: txt };
  }
}

const postJSON = async (url: string, body: any) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body ?? {}),
  });

  const data = await safeJson(res);

  if (!res.ok || (data && data.success === false)) {
    throw new Error(data?.error || data?.message || `Request failed: ${url}`);
  }

  return data;
};

const normalizeFeedResponse = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.feed)) return data.feed;
  if (Array.isArray(data.posts)) return data.posts;
  if (data.data && Array.isArray(data.data.feed)) return data.data.feed;
  if (data.data && Array.isArray(data.data.posts)) return data.data.posts;
  if (Array.isArray(data.data)) return data.data;
  return [];
};

const unwrapFeedItem = (item: any): any => {
  if (!item) return null;
  if (item.type === 'post' && item.post) return item.post;
  if (item.type === 'event' && item.event) return item.event;
  if (item.type === 'product' && item.product) return item.product;
  if (item.type === 'marketplace' && item.marketplace) return item.marketplace;
  if (item.type === 'music' && item.music) return item.music;
  if (item.type === 'podcast' && item.podcast) return item.podcast;
  if (item.type === 'reel' && item.reel) return item.reel;
  if (item.data) return item.data;
  return item;
};

const safeArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
const safeNumber = (v: any, fallback = 0) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const safeString = (v: any, fallback = '') =>
  typeof v === 'string' ? v : fallback;
const safeStr = (v: any) => String(v ?? '').trim();
const safeUserId = (u: any) => safeNumber(u?.id ?? u?.user_id ?? u?.userId, 0);
const safePostId = (p: any) => safeNumber(p?.id ?? p?.post_id ?? p?.postId, 0);

const getPostTextPreview = (p: any, max = 140) => {
  const t = String(p?.content ?? p?.text ?? '').trim();
  if (!t) return '';
  return t.length > max ? t.slice(0, max).trim() + '…' : t;
};

const safeJsonArray = (v: any): string[] => {
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
      } catch {
        return [];
      }
    }
    return [s];
  }
  return [];
};

const getMarketplaceProductId = (p: any) => {
  const meta = p?.meta;
  const v =
    p?.product_id ??
    p?.productId ??
    meta?.product_id ??
    meta?.productId ??
    meta?.marketplace?.id ??
    meta?.product?.id;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const getMarketplaceImages = (p: any, productData?: any): string[] => {
  const parseVariants = (value: any) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // ✅ image_variants first
  const directVariants = parseVariants((p as any)?.image_variants);
  if (directVariants.length > 0) {
    return directVariants.map((v: any) => v?.feed || v?.thumb || v?.full).filter(Boolean);
  }

  const productVariants = parseVariants(productData?.image_variants);
  if (productVariants.length > 0) {
    return productVariants.map((v: any) => v?.feed || v?.thumb || v?.full).filter(Boolean);
  }

  // fallback old fields
  const pdImgs = safeJsonArray(productData?.images);
  if (pdImgs.length) return pdImgs;
  
  const mediaUrls = safeJsonArray(p?.media_urls);
  if (mediaUrls.length) return mediaUrls;
  
  const imgs = safeJsonArray(p?.images);
  if (imgs.length) return imgs;
  
  const single = typeof p?.media_url === 'string' && p.media_url ? [p.media_url] : [];
  return single;
};

const getMarketplaceImageVariants = (
  p: any,
  productData?: any
): Array<{ thumb: string; feed: string; full: string; type: string }> => {
  const parseVariants = (value: any) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const normalize = (arr: any[]) =>
    arr
      .map((v: any) => ({
        thumb: v?.thumb || v?.feed || v?.full || '',
        feed: v?.feed || v?.full || v?.thumb || '',
        full: v?.feed || v?.full || v?.thumb || '',
        type: v?.type || 'image',
      }))
      .filter((v) => v.feed);

  const direct = normalize(parseVariants((p as any)?.image_variants));
  if (direct.length > 0) return direct;

  const fromProduct = normalize(parseVariants(productData?.image_variants));
  if (fromProduct.length > 0) return fromProduct;

  const fromMeta = normalize(parseVariants(p?.meta?.marketplace?.image_variants));
  if (fromMeta.length > 0) return fromMeta;

  return [];
};                     

  
const getMarketplacePriceLine = (productData?: any) => {
  const priceRaw = productData?.price ?? productData?.main_price ?? null;
  const currency = productData?.currency || 'TZS';
  const loc =
    (typeof productData?.location === 'string' &&
      productData.location.split(',')[0]) ||
    (typeof productData?.address === 'string' &&
      productData.address.split(',')[0]) ||
    'Marketplace';
  const priceNum = priceRaw != null ? Number(priceRaw) : NaN;
  const price = Number.isFinite(priceNum) ? priceNum.toFixed(0) : null;
  return { price, currency, loc };
};

const toDateSafe = (input: any): Date | null => {
  if (!input) return null;
  if (input instanceof Date && Number.isFinite(input.getTime())) return input;
  if (typeof input === 'number') {
    const ms = input < 1e12 ? input * 1000 : input;
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  if (typeof input === 'string') {
    const s = input.trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
      const iso = s.replace(' ', 'T') + 'Z';
      const d = new Date(iso);
      return Number.isFinite(d.getTime()) ? d : null;
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(s) && !/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) {
      const d = new Date(s + 'Z');
      return Number.isFinite(d.getTime()) ? d : null;
    }
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
};

export const formatRelativeTime = (dateInput: any): string => {
  const d = toDateSafe(dateInput);
  if (!d) return 'Just now';
  const now = Date.now();
  let diffMs = now - d.getTime();
  if (diffMs < 0) diffMs = 0;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min === 1 ? '1 min' : `${min} mins`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return hrs === 1 ? '1 hr' : `${hrs} hrs`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return days === 1 ? '1 day' : `${days} days`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return weeks === 1 ? '1 week' : `${weeks} weeks`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? '1 month' : `${months} months`;
  const years = Math.floor(days / 365);
  return years === 1 ? '1 year' : `${years} years`;
};

const reactionEmoji = (t: string) => {
  switch (t) {
    case 'like':
      return '👍';
    case 'love':
      return '❤️';
    case 'haha':
      return '😂';
    case 'wow':
      return '😮';
    case 'sad':
      return '😢';
    case 'angry':
      return '😡';
    case 'fire':
      return '🔥';
    case 'party':
      return '🎉';
    case 'clap':
      return '👏';
    case 'star':
      return '⭐';
    case 'thinking':
      return '🤔';
    case 'crying':
      return '😭';
    case 'heart_eyes':
      return '🥰';
    case 'kiss':
      return '😘';
    case 'sunglasses':
      return '😎';
    case 'rocket':
      return '🚀';
    case 'trophy':
      return '🏆';
    case 'crown':
      return '👑';
    case 'unicorn':
      return '🦄';
    case 'rainbow':
      return '🌈';
    case 'money':
      return '💰';
    case 'muscle':
      return '💪';
    case 'brain':
      return '🧠';
    case 'lightning':
      return '⚡';
    case 'gem':
      return '💎';
    default:
      return '👍';
  }
};

const topReactionEmojis = (reactionsArr: any[], max = 2) => {
  const counts = new Map<string, number>();
  for (const r of reactionsArr || []) {
    const type = String(r?.type || '').trim();
    if (!type) continue;
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([type]) => reactionEmoji(type));
};

const fmtCount = (n: number) => {
  const num = Number(n || 0);
  if (num >= 1_000_000)
    return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (num >= 1_000)
    return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + 'K';
  return String(num);
};

const formatReactionText = (totalCount: number, reactorName: string): string => {
  if (totalCount === 0) return '';
  const formattedTotal = fmtCount(totalCount);
  if (totalCount === 1) {
    return `${formattedTotal} · ${reactorName}`;
  }
  const othersCount = totalCount - 1;
  const formattedOthers = fmtCount(othersCount);
  return `${formattedTotal} · ${reactorName} and ${formattedOthers} other${
    othersCount !== 1 ? 's' : ''
  }`;
};

const stableHash = (input: any) => {
  const s = String(input ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
};

const resolveUserName = (reaction: any, users?: any[]) => {
  const uid = Number(
    reaction?.user_id ??
      reaction?.userId ??
      reaction?.user?.id ??
      reaction?.user?.user_id ??
      0
  );
  const user =
    (users || []).find((u) => Number(u?.id) === uid) || reaction?.user || null;
  const name = String(
    reaction?.name ??
      reaction?.user?.name ??
      user?.name ??
      user?.username ??
      reaction?.username ??
      ''
  ).trim();
  return name;
};

const pickStableReactorName = (
  postId: number | string,
  reactions: any[],
  users?: any[]
) => {
  if (!Array.isArray(reactions) || reactions.length === 0) return '';
  const idx = stableHash(postId) % reactions.length;
  const r = reactions[idx] || reactions[0];
  const name = resolveUserName(r, users);
  return String(name || '').trim();
};

const getLinkPreview = async (text: string): Promise<LinkPreview | null> => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  if (!match?.[0]) return null;
  const url = match[0];
  let domain = '';
  try {
    domain = new URL(url).hostname.replace('www.', '');
  } catch {
    return null;
  }

  // Handle YouTube links with real video thumbnail and oEmbed title
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
    let videoId = '';
    try {
      const parsedUrl = new URL(url);
      if (domain.includes('youtu.be')) {
        videoId = parsedUrl.pathname.slice(1).split('/')[0];
      } else if (parsedUrl.searchParams.has('v')) {
        videoId = parsedUrl.searchParams.get('v') || '';
      } else if (parsedUrl.pathname.includes('/shorts/')) {
        videoId = parsedUrl.pathname.split('/shorts/')[1]?.split('/')[0] || '';
      }
    } catch {}

    if (videoId) {
      let ytTitle = 'YouTube Video';
      let ytAuthor = 'YouTube';
      try {
        const oembed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
        if (oembed.ok) {
          const ytData: any = await oembed.json();
          ytTitle = ytData.title || ytTitle;
          ytAuthor = ytData.author_name || ytAuthor;
        }
      } catch {}

      return {
        url,
        title: ytTitle,
        description: `Watch on YouTube • by ${ytAuthor}`,
        image: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        domain: 'youtube.com',
      };
    }
  }

  // Fetch real OpenGraph metadata from backend API
  try {
    const response = await fetch(
      `/api/link-preview?url=${encodeURIComponent(url)}`
    );
    const data = await response.json();
    if (data.success && data.data) {
      return {
        url,
        title: data.data.title || domain,
        description:
          data.data.description ||
          `Visit ${domain} for more information.`,
        image: data.data.image || null,
        domain: domain,
      };
    }
  } catch (error) {
    console.debug('Link preview fetch error:', error);
  }

  // If GitHub, use real dynamic OG preview
  if (domain.includes('github.com')) {
    try {
      const parts = new URL(url).pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return {
          url,
          title: `${parts[0]}/${parts[1]}`,
          description: 'GitHub open source project repository',
          image: `https://opengraph.githubassets.com/1/${parts[0]}/${parts[1]}`,
          domain: 'github.com',
        };
      }
    } catch {}
  }

  return {
    url,
    title: domain,
    description: `Visit ${domain} for more information.`,
    image: null,
    domain,
  };
};

const BACKGROUNDS = [
  { id: 'none', value: '' },
  { id: 'red', value: 'linear-gradient(45deg, #FF0057, #E64C4C)' },
  { id: 'blue', value: 'linear-gradient(45deg, #00C6FF, #0072FF)' },
  { id: 'green', value: 'linear-gradient(45deg, #a8ff78, #78ffd6)' },
  { id: 'purple', value: 'linear-gradient(45deg, #e65c00, #F9D423)' },
  {
    id: 'heart',
    value:
      'url("https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=500&q=60")',
  },
  { id: 'dark', value: 'linear-gradient(to right, #434343 0%, black 100%)' },
  { id: 'fire', value: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)' },
];

const FEELINGS = [
  'Happy',
  'Blessed',
  'Loved',
  'Sad',
  'Excited',
  'Thankful',
  'Crazy',
  'Tired',
  'Cool',
  'Relaxed',
];

const QUICK_EMOJIS = [
  '😀', '😂', '😍', '🥰', '😘', '😊', '😉', '😇', '🥳', '😎',
  '🤩', '😋', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  '😐', '😑', '😶', '🙄', '😏', '😒', '😞', '😔', '😟', '😕',
  '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤',
  '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
  '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑',
  '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤',
  '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕',
  '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀',
  '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼',
  '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌',
  '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕',
  '👇', '☝️', '👍', '👊', '✊', '👊', '🤛', '🤜', '👏', '🙌',
  '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵',
  '🦿', '🦶', '👣', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀',
  '👁️', '👅', '👄', '💋', '🩸', '💘', '💝', '💖', '💗', '💓',
  '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙',
  '💜', '🖤', '🤍', '🤎', '💯', '💢', '💥', '💫', '💦', '💨',
  '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤',
];

const reactionStyles = `
  @keyframes popFloat {
    0% { transform: translateY(6px) scale(0.9); opacity: 0; }
    60% { transform: translateY(-6px) scale(1.15); opacity: 1; }
    100% { transform: translateY(0px) scale(1); }
  }
  
  @keyframes wiggle {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-2deg); }
    75% { transform: rotate(2deg); }
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  
  .react-pop { animation: popFloat 220ms ease-out; }
  .react-hover { transition: transform 120ms ease; }
  .react-hover:hover { 
    transform: translateY(-10px) scale(1.25); 
    animation: wiggle 300ms ease-in-out; 
  }
  
  .reaction-preview {
    animation: bounce 0.5s infinite alternate;
  }
`;

let reactionStyleMounted = false;

const ensureReactionStyles = () => {
  if (reactionStyleMounted) return;
  reactionStyleMounted = true;
  const styleTag = document.createElement('style');
  styleTag.textContent = reactionStyles;
  styleTag.setAttribute('data-reaction-styles', '1');
  document.head.appendChild(styleTag);
};

// ==================== HYBRID FEED HELPERS ====================
const getFeedItemType = (item: any): string => {
  if (!item || typeof item !== 'object') return 'post';
  const meta = item?.meta || {};
  
  if (
    item?.source === 'sponsored' ||
    item?.item_type === 'sponsored' ||
    item?.type === 'sponsored' ||
    meta?.kind === 'ad'
  ) return 'sponsored';
  
  if (
    item?.source === 'product' ||
    item?.item_type === 'product' ||
    item?.type === 'marketplace' ||
    item?.type === 'product' ||
    item?.post_type === 'product' ||
    meta?.type === 'product' ||
    meta?.kind === 'product' ||
    !!item?.product_id ||
    !!meta?.marketplace?.id
  ) return 'product';
  
  if (
    item?.source === 'event' ||
    item?.item_type === 'event' ||
    item?.type === 'event' ||
    item?.post_type === 'event' ||
    meta?.type === 'event' ||
    meta?.kind === 'event' ||
    !!item?.event_id ||
    !!meta?.event
  ) return 'event';
  
  if (
    item?.source === 'group_post' ||
    item?.item_type === 'group_post' ||
    !!item?.group_id ||
    !!item?.group
  ) return 'group_post';
  
  if (
    item?.source === 'reel' ||
    item?.item_type === 'reel' ||
    !!item?.reel_id
  ) return 'reel';
  
  if (
    item?.source === 'song' ||
    item?.item_type === 'song' ||
    meta?.kind === 'music' ||
    meta?.type === 'music'
  ) {
    return 'music';
  }
  
  if (
    item?.source === 'podcast' ||
    item?.item_type === 'podcast' ||
    meta?.kind === 'podcast' ||
    meta?.type === 'podcast'
  ) {
    return 'podcast';
  }
  
  return 'post';
};

const getFeedItemId = (item: any): number => {
  if (!item || typeof item !== 'object') return 0;
  const type = getFeedItemType(item);
  
  switch (type) {
    case 'product':
      return Number(item?.product_id ?? item?.meta?.marketplace?.id ?? item?.id ?? 0);
    case 'event':
      return Number(item?.event_id ?? item?.id ?? 0);
    case 'group_post':
      return Number(item?.post_id ?? item?.id ?? 0);
    case 'reel':
      return Number(item?.reel_id ?? item?.id ?? 0);
    case 'music':
      return Number(item?.song_id2 ?? item?.song_id ?? item?.id ?? 0);
    case 'podcast':
      return Number(item?.podcast_id ?? item?.id ?? 0);
    case 'sponsored':
      return Number(item?.id ?? 0);
    default:
      return Number(item?.id ?? 0);
  }
};

const resolveCommentAuthor = (
  c: any,
  users: User[] = [],
  getCommentAuthor?: (id: number) => any
) => {
  const uid = Number(
    c?.user_id ?? c?.userId ?? c?.author_id ?? c?.authorId ?? 0
  );

  const u =
    (Number.isFinite(uid) ? users.find((x: any) => Number(x?.id) === uid) : null) ||
    (getCommentAuthor ? getCommentAuthor(uid) : null) ||
    null;

  const name =
    String(c?.author_name ?? c?.authorName ?? '').trim() ||
    String(u?.name ?? '').trim() ||
    String(u?.username ?? '').trim() ||
    'User';

  const image = avatarFrom({
    profile_image_url: c?.author_image ?? c?.authorImage ?? u?.profile_image_url,
    name,
    username: u?.username ?? c?.author_username ?? c?.username,
  });

  return { uid, name, image, user: u };
};

const getFeedCommentFetchEndpoint = (itemType: string, p: any, viewerId: number): string => {
  switch (itemType) {
    case 'event': {
      const eventId = p?.event_id || p?.id;
      return `/api/events/${eventId}/comments?viewerId=${viewerId}`;
    }
    case 'group_post': {
      const groupId = p?.group_id;
      const groupPostId = p?.id;
      return `/api/groups/${groupId}/posts/${groupPostId}/comments?viewerId=${viewerId}`;
    }
    case 'product': {
      const productId = p?.product_id || p?.id;
      return `/api/products/${productId}/reviews?viewerId=${viewerId}`;
    }
    case 'reel': {
      const reelId = p?.reel_id || p?.id;
      return `/api/reels/${reelId}/comments?viewerId=${viewerId}`;
    }
    case 'music': {
      const songId = p?.song_id2 || p?.id;
      return `/api/songs/${songId}/comments?viewerId=${viewerId}`;
    }
    case 'podcast': {
      const podcastId = p?.podcast_id || p?.id;
      return `/api/podcasts/${podcastId}/comments?viewerId=${viewerId}`;
    }
    default:
      return `/api/posts/${p?.id}/comments?viewerId=${viewerId}`;
  }
};

const getCommentLikeEndpoint = (itemType: string, commentId: number): string => {
  switch (itemType) {
    case 'event':
      return `/api/event-comments/${commentId}/like`;
    case 'group_post':
      return `/api/group-post-comments/${commentId}/like`;
    case 'product':
      return `/api/product-reviews/${commentId}/like`;
    case 'reel':
      return `/api/reel-comments/${commentId}/like`;
    case 'music':
      return `/api/song-comments/${commentId}/like`;
    case 'podcast':
      return `/api/podcast-comments/${commentId}/like`;
    default:
      return `/api/comments/${commentId}/like`;
  }
};

const getFeedKey = (item: any): string => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (item?.feed_key) return String(item.feed_key);
  const type = getFeedItemType(item);
  const id = getFeedItemId(item);
  return `${type}:${id}`;
};

const isSameFeedItem = (a: any, b: any): boolean => {
  if (!a || !b) return false;
  const aKey = getFeedKey(a);
  const bKey = getFeedKey(b);
  if (aKey && bKey) return aKey === bKey;
  const aType = getFeedItemType(a);
  const bType = getFeedItemType(b);
  const aId = getFeedItemId(a);
  const bId = getFeedItemId(b);
  return aType === bType && aId > 0 && bId > 0 && aId === bId;
};

    
// ==================== CUSTOM COMPARISON FUNCTIONS ====================


const postPropsEqual = () => false;

const eventPostPropsEqual = () => false;




// ==================== EXPORTED COMPONENTS (Memoized) ====================

/**
 * =========================
 * ✅ REACTIONS SHEET
 * =========================
 */
export const ReactionsSheet = memo(
  ({
    isOpen,
    onClose,
    post,
    onProfileClick,
    onOpenComments,
  }: {
    isOpen: boolean;
    onClose: () => void;
    post: PostType;
    onProfileClick: (id: number) => void;
    onOpenComments?: (post: PostType) => void;
  }) => {
    const postId = getFeedItemId(post);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState<string>('all');
    const [items, setItems] = useState<any[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
      if (!isOpen) return;
      setLoading(true);
      setItems([]);
      setCounts({});
      setActive('all');
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      (async () => {
        try {
          const data = await apiFetch(
            `/api/posts/${postId}/reactions?limit=500&offset=0`,
            {
              signal: abortRef.current?.signal as any,
            } as any
          );
          const arr = Array.isArray(data?.reactions) ? data.reactions : [];
          setItems(arr);
          const map: Record<string, number> = {};
          for (const r of arr) {
            const t = String(r?.type || 'like').toLowerCase();
            map[t] = (map[t] || 0) + 1;
          }
          setCounts(map);
        } catch (e) {
          // ignore abort
        } finally {
          setLoading(false);
        }
      })();
      return () => abortRef.current?.abort();
    }, [isOpen, postId]);

    if (!isOpen) return null;

    const typesSorted = Object.entries(counts)
      .sort((a: any, b: any) => Number(b[1]) - Number(a[1]))
      .map(([t]) => t);

    const filtered =
      active === 'all'
        ? items
        : items.filter((x) => String(x?.type).toLowerCase() === active);

    const Tab = ({
      t,
      label,
      count,
    }: {
      key?: any;
      t: string;
      label: React.ReactNode;
      count: number;
    }) => (
      <button
        onClick={() => setActive(t)}
        className={`px-3 py-2 text-[17px] font-bold border-b-2 whitespace-nowrap ${
          active === t
            ? 'text-[#1877F2] border-[#1877F2]'
            : 'text-[#94A3B8] border-transparent'
        }`}
      >
        {label} {count ? <span className="ml-1">{count}</span> : null}
      </button>
    );

    return (
      <div className="fixed inset-0 z-[9999] bg-[#050B18] flex flex-col">
        <div className="p-4 border-b border-[#1E293B] flex items-center gap-3 bg-[#0B1120]">
          <button
            className="w-10 h-10 rounded-full hover:bg-[#1E293B] flex items-center justify-center"
            onClick={onClose}
            aria-label="Back"
          >
            <i className="fas fa-arrow-left text-[#F8FAFC] text-xl"></i>
          </button>
          <div className="text-[#F8FAFC] font-bold text-[20px]">
            People who reacted
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto border-b border-[#1E293B] bg-[#0B1120] scrollbar-hide">
          <Tab t="all" label="All" count={items.length} />
          {typesSorted.map((t) => (
            <Tab
              key={t}
              t={t}
              label={<span className="text-[20px]">{reactionEmoji(t)}</span>}
              count={counts[t] || 0}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-[#94A3B8] text-center text-[17px]">
              Loading reactions...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-[#94A3B8] text-center text-[17px]">
              No reactions yet.
            </div>
          ) : (
            <div className="p-2">
              {filtered.map((r, idx) => {
                const u = r?.user || {};
                const uid = Number(u?.id || r?.user_id || 0);
                const name = String(u?.name || u?.username || 'User');
                const img = avatarFrom(u);
                return (
                  <button
                    key={String(uid) + '-' + idx}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[#1E293B] rounded-xl text-left"
                    onClick={() => uid && onProfileClick(uid)}
                  >
                    <div className="relative">
                      <img
                        src={img}
                        className="w-12 h-12 rounded-full object-cover"
                        alt=""
                      />
                      <div className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full bg-[#0B1120] border border-[#1E293B] flex items-center justify-center text-[16px]">
                        {reactionEmoji(String(r?.type))}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[#F8FAFC] font-bold text-[17px] truncate">
                        {name}
                      </div>
                      {u?.username ? (
                        <div className="text-[#94A3B8] text-[14px] truncate">
                          @{u.username}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {onOpenComments && (
          <div className="p-4 border-t border-[#1E293B] bg-[#0B1120]">
            <button
              onClick={() => {
                onClose();
                onOpenComments(post);
              }}
              className="w-full py-3 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] font-bold rounded-lg transition-colors text-[17px]"
            >
              View Discussions
            </button>
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    return prev.isOpen === next.isOpen && isSameFeedItem(prev.post, next.post);
  }
);

/**
 * =========================
 * ✅ GALLERY VIEWER
 * =========================
 */
export const GalleryViewer = memo(
  ({
    isOpen,
    urls,
    startIndex,
    onClose,
    post,
    currentUser,
    reactionCount,
    commentCount,
    shareCount,
    myReaction,
    onReact,
    onOpenComments,
    onShare,
    onOpenReactions,
  }: {
    isOpen: boolean;
    urls: string[];
    startIndex: number;
    onClose: () => void;
    post: PostType;
    currentUser: User | null;
    reactionCount: number;
    commentCount: number;
    shareCount: number;
    myReaction?: ReactionType;
    onReact: (post: PostType, type: ReactionType) => void;
    onOpenComments: () => void;
    onShare: () => void;
    onOpenReactions?: () => void;
  }) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [currentIndex, setCurrentIndex] = useState(startIndex);

    useEffect(() => {
      if (!isOpen) return;
      document.body.style.overflow = 'hidden';
      setCurrentIndex(startIndex);
      requestAnimationFrame(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const w = el.clientWidth || window.innerWidth;
        el.scrollTo({ left: startIndex * w, behavior: 'instant' as any });
      });
      return () => {
        document.body.style.overflow = '';
      };
    }, [isOpen, startIndex]);

    const handleScroll = () => {
      const el = scrollerRef.current;
      if (!el) return;
      const scrollLeft = el.scrollLeft;
      const width = el.clientWidth || window.innerWidth;
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    };

    const formatCount = (count: number): string => {
      if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
      if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
      return count.toString();
    };

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-[9999] bg-black flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-black/40"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-white text-[17px] font-semibold">
            {currentIndex + 1}/{urls.length}
          </div>
          <button
            className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="fas fa-times text-white text-lg"></i>
          </button>
        </div>

        <div
          ref={scrollerRef}
          className="flex-1 w-full overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory scroll-smooth"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onClick={(e) => e.stopPropagation()}
          onScroll={handleScroll}
        >
          {urls.map((url, i) => (
            <div
              key={url + i}
              className="min-w-full h-full snap-center flex items-center justify-center bg-black"
            >
              <img
                src={url}
                alt=""
                className="max-w-full max-h-full object-contain"
                draggable={false}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ))}
        </div>

        <div
          className="bg-black/80 backdrop-blur-sm border-t border-white/10 px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between text-[#94A3B8] text-[15px] mb-2 px-2">
            <div className="flex items-center gap-2">
              {reactionCount > 0 && (
                <span
                  className="text-[#F8FAFC] font-bold cursor-pointer hover:underline flex items-center gap-2 text-[15px]"
                  onClick={onOpenReactions}
                >
                  <div className="flex -space-x-2">
                    {Array.from(new Set([myReaction, 'like', 'love']))
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((t, i) => (
                        <span
                          key={i}
                          className="w-[24px] h-[24px] rounded-full bg-[#1E293B] border border-black flex items-center justify-center text-[16px]"
                        >
                          {reactionEmoji(t as string)}
                        </span>
                      ))}
                  </div>
                  {fmtCount(reactionCount)}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <span
                className="hover:underline cursor-pointer text-[15px]"
                onClick={onOpenComments}
              >
                {formatCount(commentCount)} Discussions
              </span>
              {shareCount > 0 && (
                <span
                  className="hover:underline cursor-pointer text-[15px]"
                  onClick={onShare}
                >
                  {formatCount(shareCount)} Shares
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ReactionButton
                currentUserReactions={myReaction}
                reactionCount={reactionCount}
                onReact={(type) => onReact(post, type)}
                isGuest={!currentUser}
              />
              <button
                type="button"
                className="flex items-center gap-1.5 text-[#F8FAFC] hover:text-[#38BDF8] transition-colors focus:outline-none p-1 rounded-lg hover:bg-[#1E293B]/60"
                onClick={() => (currentUser ? onOpenComments() : alert('Login first'))}
                aria-label="Discuss & Comments"
                title="Discuss"
              >
                <i className="far fa-comment text-[22px]"></i>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 text-[#F8FAFC] hover:text-[#38BDF8] transition-transform active:scale-110 focus:outline-none p-1 rounded-lg hover:bg-[#1E293B]/60"
                onClick={() =>
                  currentUser ? onShare() : alert('Please login to share posts.')
                }
                aria-label="Share post"
                title="Share"
              >
                <i className="far fa-paper-plane text-[21px]"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.isOpen === next.isOpen &&
      prev.urls === next.urls &&
      prev.startIndex === next.startIndex &&
      prev.reactionCount === next.reactionCount &&
      prev.commentCount === next.commentCount &&
      prev.shareCount === next.shareCount &&
      prev.myReaction === next.myReaction
    );
  }
);

/**
 * =========================
 * ✅ SHARE BOTTOM SHEET
 * =========================
 */
export const ShareBottomSheet = memo(
  ({
    isOpen,
    onClose,
    post,
    currentUser,
    users = [],
    groups = [],
    brands = [],
    chats = [],
    onShareComplete,
  }: {
    isOpen: boolean;
    onClose: () => void;
    post: any;
    currentUser: User | null;
    users?: User[];
    groups?: Group[];
    brands?: Brand[];
    chats?: any[];
    onShareComplete?: (destination: string, data?: any) => void;
  }) => {
    const [activeFlow, setActiveFlow] = useState<'sheet' | 'feed' | 'groups' | 'messages'>(
      'sheet'
    );
    const [isAnimating, setIsAnimating] = useState(false);
    const sheetRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);

    const getShareEndpoint = () => {
      const itemType = getFeedItemType(post);
      switch (itemType) {
        case 'event':
          return '/api/events/share';
        case 'group_post':
          return '/api/groups/posts/share';
        case 'product':
          return '/api/products/share';
        case 'reel':
          return '/api/reels/share';
        case 'music':
          return '/api/songs/share';
        case 'podcast':
          return '/api/podcasts/share';
        default:
          return '/api/posts/share';
      }
    };

    const getSharePayload = (destination: string) => {
      const itemType = getFeedItemType(post);
      const base = {
        user_id: currentUser?.id,
        destination: destination,
        shared_at: new Date().toISOString(),
        item_type: itemType,
      };
      
      const itemId = getFeedItemId(post);
      
      switch (itemType) {
        case 'event':
          return { ...base, event_id: itemId };
        case 'group_post':
          return { ...base, post_id: itemId, group_id: post.group_id };
        case 'product':
          return { ...base, product_id: itemId };
        case 'reel':
          return { ...base, reel_id: itemId };
        case 'music':
          return { ...base, song_id: itemId };
        case 'podcast':
          return { ...base, podcast_id: itemId };
        default:
          return { ...base, post_id: itemId };
      }
    };

    useEffect(() => {
      const handleBackdropClick = (e: MouseEvent) => {
        if (backdropRef.current && e.target === backdropRef.current) closeSheet();
      };
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) closeSheet();
      };
      if (isOpen) {
        setActiveFlow('sheet');
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
        document.body.style.overflow = 'hidden';
        document.addEventListener('click', handleBackdropClick);
        document.addEventListener('keydown', handleEscape);
      }
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('click', handleBackdropClick);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isOpen]);

    const closeSheet = () => {
      setIsAnimating(true);
      setTimeout(() => {
        onClose();
        setActiveFlow('sheet');
        setIsAnimating(false);
      }, 200);
    };

    const handleShareAction = async (destination: string) => {
      if (!currentUser) {
        alert('Please login to share.');
        return;
      }
      try {
        const endpoint = getShareEndpoint();
        const payload = getSharePayload(destination);
        const response = await apiFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (onShareComplete) {
          const nextShares = safeNumber(
            response?.shares ?? response?.share_count,
            safeNumber(post.shares || 0, 0) + 1
          );
          onShareComplete(destination, {
            success: true,
            data: response,
            shares: nextShares,
          });
        }
        closeSheet();
      } catch (error: any) {
        console.error('Share failed:', error);
        if (onShareComplete)
          onShareComplete(destination, { success: false, error: error.message });
      }
    };

    const textPreview = getPostTextPreview(post, 100);
    const previewUrl = useMemo(() => {
      return (
        (Array.isArray(post?.media_urls) && post.media_urls[0]) ||
        (Array.isArray(post?.images) && post.images[0]) ||
        post?.media_url ||
        ''
      );
    }, [post]);

    if (!isOpen) return null;

    if (activeFlow === 'feed' && currentUser) {
      return (
        <div className="fixed inset-0 z-[500] bg-[#050B18] flex flex-col animate-slide-up">
          <div className="flex items-center justify-between p-4 border-b border-[#1E293B]">
            <div className="flex items-center gap-4">
              <i
                className="fas fa-arrow-left text-[#F8FAFC] text-xl cursor-pointer"
                onClick={() => setActiveFlow('sheet')}
              ></i>
              <h3 className="text-[#F8FAFC] text-[22px] font-medium">
                Share to UNERA Feed
              </h3>
            </div>
            <button
              onClick={() => handleShareAction('feed')}
              className="text-[#1877F2] font-bold text-[19px]"
            >
              POST
            </button>
          </div>
          <div className="flex-1 p-4">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={avatarFrom(currentUser)}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <div className="text-[#F8FAFC] font-bold text-[17px]">
                  {currentUser.name}
                </div>
                <select className="bg-[#1E293B] text-[#F8FAFC] text-[15px] px-3 py-1 rounded-lg mt-1 border border-[#1E293B]">
                  <option>🌍 Public</option>
                  <option>👥 Friends</option>
                  <option>🔒 Only me</option>
                </select>
              </div>
            </div>
            <textarea
              className="w-full bg-transparent text-[#F8FAFC] placeholder-[#94A3B8] text-[22px] outline-none resize-none min-h-[200px]"
              placeholder="Write something..."
            ></textarea>
          </div>
        </div>
      );
    }

    if (activeFlow === 'groups' && currentUser) {
      return (
        <div className="fixed inset-0 z-[500] bg-[#050B18] flex flex-col animate-slide-up">
          <div className="flex items-center justify-between p-4 border-b border-[#1E293B]">
            <div className="flex items-center gap-4">
              <i
                className="fas fa-arrow-left text-[#F8FAFC] text-xl cursor-pointer"
                onClick={() => setActiveFlow('sheet')}
              ></i>
              <h3 className="text-[#F8FAFC] text-[22px] font-medium">
                Share to Groups & Brands
              </h3>
            </div>
            <button
              onClick={() => handleShareAction('group')}
              className="text-[#1877F2] font-bold text-[19px]"
            >
              SHARE
            </button>
          </div>
          <div className="p-4 border-b border-[#1E293B]">
            <div className="text-[#94A3B8] text-[15px] mb-2">
              Share with up to 10 groups you're in
            </div>
            <input
              type="text"
              placeholder="Search groups..."
              className="w-full bg-[#1E293B] text-[#F8FAFC] px-4 py-2 rounded-lg text-[15px] outline-none border border-[#1E293B]"
            />
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {groups.length === 0 ? (
              <div className="text-center py-10">
                <i className="fas fa-users text-4xl text-[#1E293B] mb-3"></i>
                <div className="text-[#F8FAFC] text-[17px]">No groups available</div>
              </div>
            ) : (
              groups.slice(0, 5).map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3 hover:bg-[#1E293B] rounded-lg mb-2"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={group.image || avatarFrom(group)}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="text-[#F8FAFC] font-medium text-[15px]">
                        {group.name}
                      </div>
                      <div className="text-[#94A3B8] text-[13px]">
                        {group.members_count} members
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleShareAction('group')}
                    className="px-4 py-1 bg-[#1877F2] text-white rounded-lg text-[15px]"
                  >
                    Share
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeFlow === 'messages' && currentUser) {
      return (
        <div className="fixed inset-0 z-[500] bg-[#050B18] flex flex-col animate-slide-up">
          <div className="flex items-center justify-between p-4 border-b border-[#1E293B]">
            <div className="flex items-center gap-4">
              <i
                className="fas fa-arrow-left text-[#F8FAFC] text-xl cursor-pointer"
                onClick={() => setActiveFlow('sheet')}
              ></i>
              <h3 className="text-[#F8FAFC] text-[22px] font-medium">
                Share to Messages
              </h3>
            </div>
          </div>
          <div className="p-4 border-b border-[#1E293B]">
            <textarea
              className="w-full bg-[#1E293B] text-[#F8FAFC] rounded-xl p-3 min-h-[80px] text-[15px] outline-none"
              placeholder="Write a message..."
            />
          </div>
          <div className="p-4 border-b border-[#1E293B]">
            <input
              type="text"
              placeholder="Search friends..."
              className="w-full bg-[#1E293B] text-[#F8FAFC] px-4 py-2 rounded-lg text-[15px] outline-none"
            />
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {users
              .filter((u) => u.id !== currentUser.id)
              .slice(0, 10)
              .map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 hover:bg-[#1E293B] rounded-lg mb-2"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarFrom(user)}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="text-[#F8FAFC] font-medium text-[15px]">
                        {user.name}
                      </div>
                      <div className="text-[#94A3B8] text-[13px]">@{user.username}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleShareAction('message')}
                    className="px-4 py-1 bg-[#1877F2] text-white rounded-lg text-[15px]"
                  >
                    Send
                  </button>
                </div>
              ))}
          </div>
        </div>
      );
    }

    return (
      <>
        <div
          ref={backdropRef}
          className={`fixed inset-0 bg-black/60 z-[300] transition-opacity duration-300 ${
            isAnimating ? 'opacity-0' : 'opacity-100'
          }`}
        />
        <div
          ref={sheetRef}
          className={`fixed bottom-0 left-0 right-0 z-[301] bg-[#0B1120] rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col border-t border-[#1E293B] transition-transform duration-300 ease-out ${
            isAnimating ? 'translate-y-full' : 'translate-y-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 pb-2">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 bg-[#1E293B] rounded-full"></div>
            </div>
            {post && (
              <div className="flex items-start gap-3 mb-4 p-3 bg-[#1E293B] rounded-xl border border-[#1E293B]">
                {previewUrl ? (
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={previewUrl}
                      alt="Post"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : textPreview ? (
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[#1877F2]/10 flex items-center justify-center">
                    <i className="fas fa-file-alt text-[#1877F2] text-xl"></i>
                  </div>
                ) : null}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#F8FAFC] font-semibold text-[15px]">
                      {post.author?.name || 'Original Author'}
                    </span>
                    <span className="text-[#94A3B8] text-[13px]">•</span>
                    <span className="text-[#94A3B8] text-[13px]">
                      {formatRelativeTime(post.created_at)}
                    </span>
                  </div>
                  <p className="text-[#94A3B8] text-[15px] line-clamp-2">
                    {textPreview || 'Shared post'}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-1">
              <button
                onClick={() => {
                  if (!currentUser) alert('Please login to share to feed');
                  else setActiveFlow('feed');
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#1E293B] active:bg-[#334155] transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-full bg-[#1877F215] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <i className="fas fa-newspaper text-[#1877F2] text-lg"></i>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[#F8FAFC] font-medium text-[17px]">
                    Share to UNERA Feed
                  </div>
                  <div className="text-[#94A3B8] text-[13px] mt-0.5">
                    Share to your profile feed
                  </div>
                </div>
                <i className="fas fa-chevron-right text-[#94A3B8] text-[15px]"></i>
              </button>

              <button
                onClick={() => {
                  if (!currentUser) alert('Please login to share to groups/brands');
                  else setActiveFlow('groups');
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#1E293B] active:bg-[#334155] transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-full bg-[#45BD6215] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <i className="fas fa-users text-[#45BD62] text-lg"></i>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[#F8FAFC] font-medium text-[17px]">
                    Share to Groups & Brands
                  </div>
                  <div className="text-[#94A3B8] text-[13px] mt-0.5">
                    Share with up to 10 groups/brands
                  </div>
                </div>
                <i className="fas fa-chevron-right text-[#94A3B8] text-[15px]"></i>
              </button>

              <button
                onClick={() => {
                  if (!currentUser) alert('Please login to send messages');
                  else setActiveFlow('messages');
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#1E293B] active:bg-[#334155] transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-full bg-[#1877F215] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <i className="fas fa-comment-alt text-[#1877F2] text-lg"></i>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[#F8FAFC] font-medium text-[17px]">
                    Send as a Message
                  </div>
                  <div className="text-[#94A3B8] text-[13px] mt-0.5">
                    Share via direct message
                  </div>
                </div>
                <i className="fas fa-chevron-right text-[#94A3B8] text-[15px]"></i>
              </button>

              <button
                onClick={() => {
                  const text = `Check out this post on UNERA: ${window.location.origin}/post/${getFeedItemId(post)}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  closeSheet();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#1E293B] active:bg-[#334155] transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-full bg-[#25D36615] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <i className="fab fa-whatsapp text-[#25D366] text-lg"></i>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[#F8FAFC] font-medium text-[17px]">
                    Send via WhatsApp
                  </div>
                  <div className="text-[#94A3B8] text-[13px] mt-0.5">
                    Share to WhatsApp
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  const url = `${window.location.origin}/post/${getFeedItemId(post)}`;
                  navigator.clipboard.writeText(url);
                  alert('Link copied to clipboard!');
                  closeSheet();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#1E293B] active:bg-[#334155] transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-full bg-[#1877F215] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <i className="fas fa-link text-[#1877F2] text-lg"></i>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[#F8FAFC] font-medium text-[17px]">
                    Copy Post Link
                  </div>
                  <div className="text-[#94A3B8] text-[13px] mt-0.5">
                    Copy link to clipboard
                  </div>
                </div>
              </button>
            </div>

            {currentUser && users.length > 0 && (
              <div className="mt-6">
                <div className="text-[#94A3B8] text-[13px] font-semibold uppercase tracking-wider mb-3 px-1">
                  Share with recent contacts
                </div>
                <div className="flex gap-3">
                  {users
                    .filter((u) => u.id !== currentUser.id)
                    .slice(0, 3)
                    .map((user) => (
                      <button
                        key={user.id}
                        onClick={() => setActiveFlow('messages')}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#1877F2] p-0.5">
                          <img
                            src={avatarFrom(user)}
                            alt={user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                        <span className="text-[#F8FAFC] text-[13px] font-medium max-w-[60px] truncate">
                          {user.name.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
          <div className="p-4 pt-3 border-t border-[#1E293B]">
            <button
              onClick={closeSheet}
              className="w-full py-3 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] font-semibold rounded-xl transition-colors text-[17px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </>
    );
  },
  (prev, next) => {
    return (
      prev.isOpen === next.isOpen &&
      isSameFeedItem(prev.post, next.post) &&
      prev.currentUser?.id === next.currentUser?.id
    );
  }
);

/**
 * =========================
 * ✅ PEOPLE YOU MAY KNOW
 * =========================
 */
interface PeopleSuggestion {
  id: number;
  username: string;
  name: string;
  profile_image_url: string | null;
  is_verified: boolean;
  role: string;
  mutual_count: number;
  is_following: boolean;
  score: number;
}

export const PeopleYouMayKnowGrid = memo(
  ({
    users = [],
    onFollow,
    currentUser,
    isLoading = false,
    onLoginClick,
    onProfileClick,
    title = 'People You May Know',
    maxDisplay = 8,
  }: {
    users: PeopleSuggestion[];
    onFollow: (userId: number) => void;
    currentUser: User | null;
    isLoading?: boolean;
    onLoginClick?: () => void;
    onProfileClick?: (userId: number) => void;
    title?: string;
    maxDisplay?: number;
  }) => {
    const [followLoading, setFollowLoading] = useState<{ [key: number]: boolean }>(
      {}
    );
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const displayUsers = users.slice(0, maxDisplay);

    const checkScroll = useCallback(() => {
      const el = scrollRef.current;
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
    }, []);

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      checkScroll();
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }, [checkScroll, displayUsers.length]);

    const scroll = (direction: 'left' | 'right') => {
      const el = scrollRef.current;
      if (!el) return;
      const scrollAmount = 350;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    };

    const handleFollow = async (userId: number) => {
      setFollowLoading((prev) => ({ ...prev, [userId]: true }));
      try {
        await onFollow(userId);
      } finally {
        setFollowLoading((prev) => ({ ...prev, [userId]: false }));
      }
    };

    const handleProfileClick = (userId: number) => {
      if (onProfileClick) onProfileClick(userId);
    };

    if (isLoading) {
      return (
        <div className="w-full">
          <div className="bg-[#0B1120] w-full p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[#F8FAFC] font-bold text-[18px] sm:text-[20px] tracking-tight">{title}</h3>
            </div>
            <div className="flex gap-3 overflow-x-hidden py-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[168px] sm:w-[185px] bg-[#1E293B] rounded-2xl overflow-hidden animate-pulse border border-[#334155]/30 flex flex-col"
                >
                  <div className="aspect-square w-full bg-[#334155]/60" />
                  <div className="p-3 flex flex-col flex-1 justify-between">
                    <div>
                      <div className="h-4 bg-[#334155]/70 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-[#334155]/40 rounded w-1/2 mb-3" />
                    </div>
                    <div className="h-9 bg-[#334155]/60 rounded-lg w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[10px] bg-[#050B18] border-t border-white/10" />
        </div>
      );
    }

    if (displayUsers.length === 0) return null;

    return (
      <div className="w-full">
        <div className="bg-[#0B1120] w-full p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[#F8FAFC] font-bold text-[18px] sm:text-[20px] tracking-tight">{title}</h3>
            <div className="flex items-center gap-1.5">
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => scroll('left')}
                  aria-label="Scroll left"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1E293B] hover:bg-[#334155] border border-[#334155]/50 flex items-center justify-center transition-colors active:scale-95"
                >
                  <i className="fas fa-chevron-left text-[#F8FAFC] text-sm"></i>
                </button>
              )}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => scroll('right')}
                  aria-label="Scroll right"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1E293B] hover:bg-[#334155] border border-[#334155]/50 flex items-center justify-center transition-colors active:scale-95"
                >
                  <i className="fas fa-chevron-right text-[#F8FAFC] text-sm"></i>
                </button>
              )}
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayUsers.map((user) => (
              <div
                key={user.id}
                className="flex-shrink-0 w-[168px] sm:w-[185px] bg-[#1E293B] rounded-2xl overflow-hidden border border-[#334155]/40 hover:border-[#1877F2]/50 transition-all duration-200 shadow-lg flex flex-col group"
              >
                {/* 1. Large Square Profile Photo */}
                <div
                  className="aspect-square w-full relative bg-[#0F172A] overflow-hidden cursor-pointer shrink-0"
                  onClick={() => handleProfileClick(user.id)}
                >
                  <img
                    src={
                      user.profile_image_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user.name
                      )}&background=1877F2&color=fff&bold=true&size=320`
                    }
                    alt={user.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user.name
                      )}&background=1877F2&color=fff&bold=true&size=320`;
                    }}
                  />
                </div>

                {/* Card Information Section */}
                <div className="p-3 flex flex-col flex-1 justify-between bg-[#1E293B]">
                  <div>
                    {/* 2. Person's Name & Extended Verification Badge */}
                    <div className="flex items-center min-w-0 mb-1">
                      <button
                        type="button"
                        onClick={() => handleProfileClick(user.id)}
                        className="text-[#F8FAFC] font-bold text-[15px] sm:text-[16px] leading-snug truncate text-left hover:underline inline-flex items-center gap-1.5 max-w-full"
                        title={user.name}
                      >
                        <span className="truncate">{user.name}</span>
                        {user.is_verified && (
                          <VerifiedBadge size={14} className="shrink-0" />
                        )}
                      </button>
                    </div>

                    {/* 3. Mutual Friends */}
                    <div className="flex items-center gap-1.5 text-[#94A3B8] text-[12px] sm:text-[13px] mb-3 min-h-[18px]">
                      {user.mutual_count > 0 ? (
                        <>
                          <i className="fas fa-user-group text-[11px] opacity-75 shrink-0" />
                          <span className="truncate">
                            {user.mutual_count} mutual friend{user.mutual_count !== 1 ? 's' : ''}
                          </span>
                        </>
                      ) : (
                        <span className="truncate opacity-75">
                          {user.role || 'Suggested for you'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4. Follow Button */}
                  {!currentUser ? (
                    <button
                      type="button"
                      onClick={onLoginClick}
                      className="w-full py-2 sm:py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white text-[13px] sm:text-[14px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-[#1877F2]/20 active:scale-[0.98]"
                    >
                      <i className="fas fa-user-plus text-[12px] sm:text-[13px]"></i>
                      <span>Follow</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleFollow(user.id)}
                      disabled={followLoading[user.id]}
                      className={`w-full py-2 sm:py-2.5 text-[13px] sm:text-[14px] font-bold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                        user.is_following
                          ? 'bg-[#334155] text-[#F8FAFC] hover:bg-[#475569]'
                          : 'bg-[#1877F2] text-white hover:bg-[#166FE5] shadow-sm shadow-[#1877F2]/20'
                      } disabled:opacity-70 disabled:cursor-not-allowed`}
                    >
                      {followLoading[user.id] ? (
                        <i className="fas fa-spinner fa-spin text-[13px]"></i>
                      ) : (
                        <>
                          <i
                            className={`fas ${
                              user.is_following ? 'fa-check' : 'fa-user-plus'
                            } text-[12px] sm:text-[13px]`}
                          ></i>
                          <span>{user.is_following ? 'Following' : 'Follow'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-[10px] bg-[#050B18] border-t border-white/10" />
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.users === next.users &&
      prev.currentUser?.id === next.currentUser?.id &&
      prev.isLoading === next.isLoading
    );
  }
);

/**
 * =========================
 * ✅ REEL PREVIEW CARD
 * =========================
 */
export type ReelFeedData = {
  id: number | string;
  user_id: number | string;
  author: string;
  avatar?: string;
  verified?: boolean;
  video: string;
  thumbnail?: string;
  caption?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  created_at?: string;
  audioUrl?: string;
  audioStart?: number;
  audioEnd?: number;
  songName?: string;
  songId?: string | number;
  soundKey?: string;
};

const formatReelCount = (n?: number): string => {
  const v = Number(n || 0);
  if (v >= 1_000_000_000)
    return (v / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (v >= 1_000_000)
    return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(v);
};

const getReelAuthorName = (reel: any): string => {
  return (
    reel?.author_name ||
    reel?.full_name ||
    reel?.username ||
    reel?.user_name ||
    reel?.name ||
    (reel?.user &&
      (reel.user.full_name || reel.user.username || reel.user.name)) ||
    (reel?.author &&
      (typeof reel.author === 'string'
        ? reel.author
        : reel.author.full_name || reel.author.username || reel.author.name)) ||
    'User'
  );
};

export const normalizeReelFromFeed = (item: any): ReelFeedData => {
  const reelData = item?.reel || item;
  return {
    id: reelData?.id || item?.id || 0,
    user_id: reelData?.user_id ?? reelData?.userId ?? item?.user_id ?? 0,
    author: getReelAuthorName(reelData) || getReelAuthorName(item),
    avatar:
      reelData?.avatar ||
      reelData?.profile_image_url ||
      reelData?.user?.profile_image_url ||
      item?.avatar ||
      '',
    verified: Boolean(reelData?.verified || reelData?.is_verified || false),
    views: Number(
      reelData?.views_count ??
        reelData?.view_count ??
        reelData?.views ??
        reelData?.total_views ??
        item?.views_count ??
        item?.views ??
        0
    ),
    likes: Number(
      reelData?.likes_count ?? reelData?.likes ?? reelData?.reactions_count ?? 0
    ),
    comments: Number(reelData?.comments_count ?? reelData?.comments ?? 0),
    shares: Number(reelData?.shares_count ?? reelData?.shares ?? 0),
    video:
      reelData?.video_url || reelData?.video || reelData?.media_url || item?.video_url || '',
    thumbnail: reelData?.thumbnail_url || reelData?.thumbnail || reelData?.cover_url || '',
    caption: reelData?.caption || reelData?.description || '',
    created_at: reelData?.created_at || reelData?.createdAt || item?.created_at || '',
    audioUrl: reelData?.audio_url || reelData?.audioUrl || reelData?.song?.audio_url,
    audioStart: Number(reelData?.audio_start || reelData?.audioStart || 0),
    audioEnd: Number(reelData?.audio_end || reelData?.audioEnd || 0),
    songName: reelData?.song_name || reelData?.songName || reelData?.song?.title,
    songId: reelData?.song_id || reelData?.songId || reelData?.song?.id,
    soundKey: reelData?.sound_key || reelData?.soundKey || `reel:${reelData?.id || 0}`,
  };
};

export const isReelPost = (item: any): boolean => {
  return (
    item?.type === 'reel' ||
    item?.post_type === 'reel' ||
    item?.kind === 'reel' ||
    item?.feed_type === 'reel' ||
    item?.item_type === 'reel' ||
    item?.is_reel === true ||
    item?.format === 'reel' ||
    (item?.video && (item?.audio_url || item?.song_name))
  );
};

//============ STORY CARD COMPONENTS =======

interface FeedStoryCardProps {
  story: any;
  onOpen?: (story: any) => void;
}

const FeedStoryCard: React.FC<FeedStoryCardProps> = ({ story, onOpen }) => {
  const authorName = getStoryAuthorName(story);
  const authorImage = getStoryAuthorImage(story);

  const storyMedia = getStoryMediaList(story);
  const primaryMedia = storyMedia[0];

  const isText = story?.type === 'text';
  const isVideo = story?.type === 'video' || primaryMedia?.kind === 'video';
  const isImage = !isText && !isVideo;

  const storyLabel = isText ? 'Text story' : isVideo ? 'Video story' : 'Photo story';

  const displayMediaUrl =
    primaryMedia?.feed ||
    primaryMedia?.full ||
    primaryMedia?.url ||
    String(story?.media_url || '').trim();

  const thumbnailUrl =
    primaryMedia?.thumb ||
    primaryMedia?.feed ||
    primaryMedia?.full ||
    displayMediaUrl;

  const viewsCount = Number(story?.views_count || 0);
  const reactionsCount = Number(story?.reactions_count || 0);

  return (
    <div className="w-full bg-[#0F172A] border-b-[8px] border-[#050B18] overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <img
          src={authorImage}
          alt={authorName}
          className="w-10 h-10 rounded-full object-cover border border-[#1E293B]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[#F8FAFC] font-bold text-[15px] truncate">{authorName}</p>
            <span className="text-[#1877F2] text-[12px] font-bold">Story</span>
          </div>
          <p className="text-[#94A3B8] text-[12px]">
            {storyLabel}
            {viewsCount > 0 ? ` · ${viewsCount} views` : ''}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpen?.(story)}
        className="block w-full text-left"
      >
        {isText ? (
          <div
            className="h-[420px] flex items-center justify-center text-center px-6"
            style={{
              background:
                story?.background_style ||
                'linear-gradient(45deg, #1877F2, #0055FF)',
            }}
          >
            <div className="max-w-[85%]">
              <p className="text-white font-bold text-2xl whitespace-pre-wrap break-words">
                {story?.text_content || 'Story'}
              </p>
            </div>
          </div>
        ) : isVideo ? (
          <div className="relative h-[420px] bg-[#0B1120]">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt="Video story"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : displayMediaUrl ? (
              <video
                src={displayMediaUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <div className="w-full h-full bg-[#0B1120]" />
            )}

            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/45 border border-white/30 flex items-center justify-center">
                <i className="fas fa-play text-white text-2xl ml-1"></i>
              </div>
            </div>
          </div>
        ) : isImage ? (
          <div className="relative h-[420px] bg-[#0B1120]">
            {primaryMedia ? (
              <ProgressiveTileImage
                item={{
                  url: displayMediaUrl,
                  thumb: primaryMedia.thumb || displayMediaUrl,
                  feed: primaryMedia.feed || displayMediaUrl,
                  full: primaryMedia.full || primaryMedia.feed || displayMediaUrl,
                }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : displayMediaUrl ? (
              <img
                src={displayMediaUrl}
                alt="Story"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-[#0B1120]" />
            )}
          </div>
        ) : null}
      </button>

      <div className="px-4 py-3 border-t border-[#1E293B] flex items-center justify-between">
        <div className="flex items-center gap-4 text-[#94A3B8] text-sm">
          <span className="flex items-center gap-1">
            <i className="fas fa-eye text-[13px]"></i>
            {viewsCount}
          </span>
          <span className="flex items-center gap-1">
            <i className="fas fa-heart text-[13px]"></i>
            {reactionsCount}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpen?.(story)}
          className="px-4 py-1.5 rounded-full bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold"
        >
          View story
        </button>
      </div>
    </div>
  );
};



/**
 * =========================
 * ✅ GROUPS YOU MAY JOIN
 * =========================
 */
interface GroupSuggestion {
  id: number;
  admin_id: number;
  name: string;
  description: string;
  type: 'public' | 'private';
  cover_image?: string;
  profile_image?: string;
  created_at?: string;
  category: string;
  members_count: number;
  mutual_count: number;
  is_member: boolean;
  score: number;
}

export const GroupsYouMayJoinCard = memo(
  ({
    groups = [],
    onJoin,
    currentUser,
    isLoading = false,
    onLoginClick,
    onOpenGroup,
    onProfileClick,
    title = 'Groups You May Join',
    maxDisplay = 8,
  }: {
    groups: GroupSuggestion[];
    onJoin: (groupId: number) => void;
    currentUser: User | null;
    isLoading?: boolean;
    onLoginClick?: () => void;
    onOpenGroup?: (groupId: number) => void;
    onProfileClick?: (userId: number) => void;
    title?: string;
    maxDisplay?: number;
  }) => {
    const [joinLoading, setJoinLoading] = useState<{ [key: number]: boolean }>({});
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const displayGroups = groups.slice(0, maxDisplay);

    const checkScroll = useCallback(() => {
      const el = scrollRef.current;
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
    }, []);

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      checkScroll();
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }, [checkScroll, displayGroups.length]);

    const scroll = (direction: 'left' | 'right') => {
      const el = scrollRef.current;
      if (!el) return;
      const scrollAmount = 400;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    };

    const handleJoin = async (groupId: number) => {
      setJoinLoading((prev) => ({ ...prev, [groupId]: true }));
      try {
        await onJoin(groupId);
      } finally {
        setJoinLoading((prev) => ({ ...prev, [groupId]: false }));
      }
    };

    const handleGroupClick = (groupId: number) => {
      if (onOpenGroup) onOpenGroup(groupId);
    };
    const handleAdminClick = (adminId: number) => {
      if (onProfileClick) onProfileClick(adminId);
    };

    if (isLoading) {
      return (
        <div className="w-full">
          <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl w-full p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[#F8FAFC] font-bold text-[20px]">{title}</h3>
            </div>
            <div className="flex gap-4 overflow-x-hidden py-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-shrink-0 w-[240px] animate-pulse">
                  <div className="h-32 bg-[#1E293B] rounded-t-lg"></div>
                  <div className="p-4 bg-[#1E293B]">
                    <div className="h-5 bg-[#334155] rounded w-32 mb-3"></div>
                    <div className="h-4 bg-[#334155] rounded w-20 mb-4"></div>
                    <div className="h-10 bg-[#334155] rounded-lg w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[10px] bg-[#050B18] border-t border-white/10" />
        </div>
      );
    }

    if (displayGroups.length === 0) return null;

    return (
      <div className="w-full">
        <div className="bg-[#0F172A] w-full p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[#F8FAFC] font-bold text-[20px]">{title}</h3>
            <div className="flex items-center gap-2">
              {canScrollLeft && (
                <button
                  onClick={() => scroll('left')}
                  className="w-9 h-9 rounded-xl bg-[#1E293B] hover:bg-[#141E33] border border-[#1E293B] flex items-center justify-center transition-colors"
                >
                  <i className="fas fa-chevron-left text-[#F8FAFC] text-base"></i>
                </button>
              )}
              {canScrollRight && (
                <button
                  onClick={() => scroll('right')}
                  className="w-9 h-9 rounded-xl bg-[#1E293B] hover:bg-[#141E33] border border-[#1E293B] flex items-center justify-center transition-colors"
                >
                  <i className="fas fa-chevron-right text-[#F8FAFC] text-base"></i>
                </button>
              )}
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayGroups.map((group) => (
              <div
                key={group.id}
                className="flex-shrink-0 w-[240px] bg-[#0B1120] border border-[#1E293B] rounded-2xl overflow-hidden hover:border-[#1877F2]/40 transition-all group"
              >
                <div
                  className="h-32 bg-[#1E293B] cursor-pointer relative"
                  onClick={() => handleGroupClick(group.id)}
                >
                  {group.cover_image ? (
                    <img
                      src={group.cover_image}
                      alt={group.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1877F2] to-[#166FE5]">
                      <i className="fas fa-users text-white text-3xl opacity-50"></i>
                    </div>
                  )}

                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-white text-[13px] font-semibold">
                    {group.type === 'public' ? '🌍 Public' : '🔒 Private'}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden bg-[#1E293B] flex-shrink-0 cursor-pointer border-2 border-[#1877F2] group-hover:border-[#166FE5] transition-colors"
                      onClick={() => handleGroupClick(group.id)}
                    >
                      {group.profile_image ? (
                        <img
                          src={group.profile_image}
                          alt={group.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#1E293B]">
                          <i className="fas fa-users text-[#94A3B8] text-base"></i>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleGroupClick(group.id)}
                        className="text-[#F8FAFC] font-bold text-[17px] truncate w-full text-left hover:underline"
                      >
                        {group.name}
                      </button>
                      <div className="text-[#94A3B8] text-[13px] truncate">
                        {group.category}
                      </div>
                    </div>
                  </div>

                  <div className="text-[#94A3B8] text-[13px] mb-3">
                    <i className="fas fa-users mr-1"></i>
                    {group.members_count.toLocaleString()} members
                    {group.mutual_count > 0 && (
                      <span className="ml-1">· {group.mutual_count} mutual</span>
                    )}
                  </div>

                  {onProfileClick && (
                    <div className="text-[#94A3B8] text-[13px] mb-3">
                      Admin:{' '}
                      <button
                        type="button"
                        onClick={() => handleAdminClick(group.admin_id)}
                        className="text-[#F8FAFC] hover:underline font-medium text-[13px]"
                      >
                        View Admin
                      </button>
                    </div>
                  )}

                  {group.description && (
                    <div className="text-[#94A3B8] text-[13px] mb-3 line-clamp-2">
                      {group.description}
                    </div>
                  )}

                  {!currentUser ? (
                    <button
                      onClick={onLoginClick}
                      className="w-full py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white text-[15px] font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                    >
                      <i className="fas fa-sign-in-alt text-[13px]"></i>
                      <span>Sign in</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoin(group.id)}
                      disabled={joinLoading[group.id] || group.is_member}
                      className={`w-full py-2.5 text-[15px] font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1 ${
                        group.is_member
                          ? 'bg-[#1E293B] text-[#F8FAFC] hover:bg-[#141E33] border border-[#1E293B]'
                          : 'bg-[#1877F2] text-white hover:bg-[#166FE5]'
                      } disabled:opacity-70 disabled:cursor-not-allowed`}
                    >
                      {joinLoading[group.id] ? (
                        <i className="fas fa-spinner fa-spin text-[13px]"></i>
                      ) : (
                        <>
                          <i
                            className={`fas ${
                              group.is_member ? 'fa-check' : 'fa-user-plus'
                            } text-[13px]`}
                          ></i>
                          <span>{group.is_member ? 'Joined' : 'Join Group'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-[10px] bg-[#050B18] border-t border-white/10" />
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.groups === next.groups &&
      prev.currentUser?.id === next.currentUser?.id &&
      prev.isLoading === next.isLoading
    );
  }
);

// Add CSS for hiding scrollbar
const scrollbarHideStyles = `
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
`;

if (typeof document !== 'undefined') {
  const styleId = 'people-you-may-know-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = scrollbarHideStyles;
    document.head.appendChild(style);
  }
}

// ==================== EVENT HELPERS ====================
const safeParseJsonArray = (v: any): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === 'string') {
    try {
      const arr = JSON.parse(v);
      if (Array.isArray(arr)) return arr.filter(Boolean).map(String);
    } catch {}
  }
  return [];
};

const getEventCover = (item: any, meta?: any) => {
  const urls = safeParseJsonArray(item?.media_urls);
  if (urls.length > 0) return urls[0];
  if (item?.media_url) return item.media_url;
  if (meta?.cover_url) return meta.cover_url;
  if (meta?.image) return meta.image;
  if (meta?.cover) return meta.cover;
  return '';
};

//===NORMALIZE EVENT FROM FEEDS ==


    
const normalizeEventFromFeed = (item: any) => {
  const metaRaw = item?.meta || {};
  let meta: any = metaRaw;

  if (typeof metaRaw === 'string') {
    try {
      meta = JSON.parse(metaRaw);
    } catch {
      meta = {};
    }
  }

  const cover = getEventCover(item, meta);
  const id = Number(item?.event_id ?? item?.id ?? meta?.event_id ?? 0);

  return {
    id,

    title: String(
      item?.content ??
      meta?.title ??
      'Event'
    ),

    description: String(
      item?.event_description ??
      meta?.description ??
      ''
    ),

    cover_url: String(cover || ''),

    location: String(
      item?.location ??
      meta?.location ??
      ''
    ),

    event_date: String(
      item?.event_date ??
      meta?.event_date ??
      meta?.start_time ??
      ''
    ),

    created_at: String(
      item?.created_at ??
      meta?.created_at ??
      ''
    ),

    attendees_count: Number(
      item?.attending_count ??
      meta?.attending_count ??
      0
    ),

    interested_count: Number(
      item?.interested_count ??
      meta?.interested_count ??
      0
    ),

    user_rsvp_status: String(
      item?.my_rsvp_status ??
      meta?.my_rsvp_status ??
      ''
    ),

    // ✅ EVENT REACTIONS
    my_reaction:
      item?.my_reaction ??
      item?.myReaction ??
      meta?.my_reaction ??
      null,

    reactions_count: Number(
      item?.reactions_count ??
      item?.reactionsCount ??
      item?.likes_count ??
      item?.likesCount ??
      meta?.reactions_count ??
      0
    ),

    reactions: Array.isArray(item?.reactions)
      ? item.reactions
      : Array.isArray(item?.reactions_preview)
      ? item.reactions_preview
      : [],

    creator_id: Number(
      item?.user_id ??
      meta?.creator_id ??
      0
    ),

    creator: {
      id: Number(
        item?.user_id ??
        meta?.creator_id ??
        0
      ),

      name: String(
        item?.name ??
        meta?.creator_name ??
        'Event Organizer'
      ),

      username: String(
        item?.username ??
        meta?.creator_username ??
        ''
      ),

      profile_image_url: String(
        item?.profile_image_url ??
        meta?.creator_image ??
        ''
      ),
    },
  };
};



// ==================== MEDIA HELPERS ====================
const getMediaTypeInfo = (post: any) => {
  const mediaUrl = String(post?.media_url || '');
  const mediaTypeRaw = String(post?.media_type || '').toLowerCase();
  const typeRaw = String(post?.type || '').toLowerCase();

  const cleanUrl = mediaUrl.split('?')[0].split('#')[0];
  const ext = cleanUrl.split('.').pop()?.toLowerCase() || '';

  const isImage =
    typeRaw === 'image' ||
    mediaTypeRaw === 'image' ||
    mediaTypeRaw.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif', 'heic'].includes(
      ext
    );

  const isVideo =
    typeRaw === 'video' ||
    mediaTypeRaw === 'video' ||
    mediaTypeRaw.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv', 'flv', 'wmv', '3gp'].includes(ext);

  const isAudio =
    typeRaw === 'audio' ||
    mediaTypeRaw.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext);

  return {
    mediaUrl,
    isImage,
    isVideo,
    isAudio,
    extension: ext,
    mimeType: mediaTypeRaw,
  };
};

type NormalizedMedia = {
  url: string;
  thumb?: string;
  feed?: string;
  full?: string;
  kind: 'image' | 'video' | 'audio';
};
                       
const getPostMediaList = (p: any) => {
  const out: Array<{
    url: string;
    thumb?: string;
    feed?: string;
    full?: string;
    kind: 'image' | 'video' | 'audio';
  }> = [];

  const guessKind = (url: string, explicitType?: string) => {
    const t = String(explicitType || '').toLowerCase();
    const u = String(url || '').toLowerCase();
    if (t.includes('video') || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) return 'video';
    if (t.includes('audio') || /\.(mp3|wav|m4a|ogg|aac)(\?|$)/i.test(u)) return 'audio';
    return 'image';
  };

  const safeParseArray = (value: any) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  try {
    // ✅ STEP 1: Check media_meta first
    const metaItems = safeParseArray(p?.media_meta);

    if (metaItems.length > 0) {
      metaItems.forEach((item: any) => {
        let parsedItem = item;
        if (typeof item === 'string') {
          try {
            parsedItem = JSON.parse(item);
          } catch {
            parsedItem = null;
          }
        }

        if (parsedItem && typeof parsedItem === 'object') {
          const thumbUrl = String(parsedItem.thumb || parsedItem.thumbnail_url || '').trim();
          const feedUrl = String(parsedItem.feed || parsedItem.feed_url || '').trim();
          const fullUrl = String(parsedItem.full || parsedItem.full_url || '').trim();

          const displayUrl = feedUrl || fullUrl || thumbUrl;
          if (displayUrl) {
            out.push({
              url: displayUrl,                         // feed card
              thumb: thumbUrl || feedUrl || fullUrl,  // small preview
              feed: feedUrl || fullUrl || thumbUrl,   // feed image
              full: feedUrl || fullUrl || thumbUrl,   // ✅ full now prefers feed too
              kind: guessKind(displayUrl, parsedItem.type),
            });
          }
        }
      });

      if (out.length > 0) return out;
    }

    // ✅ STEP 2: Fallback to media_urls
    const rawUrls = safeParseArray(p?.media_urls);
    const rawTypes = safeParseArray(p?.media_types);

    if (rawUrls.length > 0) {
      rawUrls.forEach((url: string, i: number) => {
        const cleanUrl = String(url || '').trim();
        if (cleanUrl) {
          out.push({
            url: cleanUrl,
            thumb: cleanUrl,
            feed: cleanUrl,
            full: cleanUrl,
            kind: guessKind(cleanUrl, rawTypes[i]),
          });
        }
      });
    }

    // ✅ STEP 3: Fallback to media array or video_url/feed_url
    if (!out.length && Array.isArray(p?.media) && p.media.length > 0) {
      p.media.forEach((item: any) => {
        const u = String(item?.feed || item?.full || item?.url || item?.thumb || '').trim();
        if (u) {
          out.push({
            url: u,
            thumb: String(item?.thumb || u),
            feed: String(item?.feed || u),
            full: String(item?.full || u),
            kind: guessKind(u, item?.type || p?.media_type),
          });
        }
      });
    }

    if (!out.length && p?.video_url) {
      const v = String(p.video_url).trim();
      if (v) {
        out.push({
          url: v,
          thumb: p?.thumb_url || v,
          feed: v,
          full: v,
          kind: 'video',
        });
      }
    }

    if (!out.length && p?.feed_url) {
      const f = String(p.feed_url).trim();
      if (f) {
        out.push({
          url: f,
          thumb: p?.thumb_url || f,
          feed: f,
          full: f,
          kind: guessKind(f, p?.media_type),
        });
      }
    }

    // ✅ STEP 4: Fallback to single media_url
    if (!out.length && p?.media_url) {
      const single = String(p.media_url).trim();
      if (single) {
        out.push({
          url: single,
          thumb: single,
          feed: single,
          full: single,
          kind: guessKind(single, p?.media_type),
        });
      }
    }
  } catch (error) {
    console.warn('Failed to parse post media:', error);
    if (p?.media_url) {
      const single = String(p.media_url).trim();
      if (single) {
        out.push({
          url: single,
          thumb: single,
          feed: single,
          full: single,
          kind: guessKind(single, p?.media_type),
        });
      }
    }
  }

  return out;
};

type MediaOrientation = 'portrait' | 'landscape' | 'square';

const getOrientation = (item: {
  width?: number;
  height?: number;
}): MediaOrientation => {
  const w = Number(item?.width || 0);
  const h = Number(item?.height || 0);

  if (!w || !h) return 'square';

  const ratio = w / h;

  if (ratio > 1.15) return 'landscape';
  if (ratio < 0.87) return 'portrait';
  return 'square';
};

const classifyOrientations = (
  media: { width?: number; height?: number }[]
): MediaOrientation[] => media.map(getOrientation);
    
  //===========GET STORY MEDIA LIST======

const getStoryMediaList = (story: any) => {
  const out: Array<{
    url: string;
    thumb?: string;
    feed?: string;
    full?: string;
    kind: 'image' | 'video' | 'audio';
  }> = [];

  const guessKind = (url: string, explicitType?: string) => {
    const t = String(explicitType || '').toLowerCase();
    const u = String(url || '').toLowerCase();

    if (t.includes('video') || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) return 'video';
    if (t.includes('audio') || /\.(mp3|wav|m4a|ogg|aac)(\?|$)/i.test(u)) return 'audio';
    return 'image';
  };

  const safeParseArray = (value: any) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  try {
    const metaItems = safeParseArray(story?.media_meta);

    if (metaItems.length > 0) {
      metaItems.forEach((item: any) => {
        let parsedItem = item;

        if (typeof item === 'string') {
          try {
            parsedItem = JSON.parse(item);
          } catch {
            parsedItem = null;
          }
        }

        if (parsedItem && typeof parsedItem === 'object') {
          const thumbUrl = String(parsedItem.thumb || parsedItem.thumbnail_url || '').trim();
          const feedUrl = String(parsedItem.feed || parsedItem.feed_url || '').trim();
          const fullUrl = String(parsedItem.full || parsedItem.full_url || '').trim();

          const displayUrl = feedUrl || fullUrl || thumbUrl;

          if (displayUrl) {
            out.push({
              url: displayUrl,
              thumb: thumbUrl || feedUrl || fullUrl,
              feed: feedUrl || fullUrl || thumbUrl,
              full: fullUrl || feedUrl || thumbUrl,
              kind: guessKind(displayUrl, parsedItem.type || story?.type),
            });
          }
        }
      });

      if (out.length > 0) return out;
    }

    const urls = safeParseArray(story?.media_urls);
    const types = safeParseArray(story?.media_types);

    if (urls.length > 0) {
      urls.forEach((url: string, i: number) => {
        const cleanUrl = String(url || '').trim();
        if (cleanUrl) {
          out.push({
            url: cleanUrl,
            thumb: cleanUrl,
            feed: cleanUrl,
            full: cleanUrl,
            kind: guessKind(cleanUrl, types[i] || story?.type),
          });
        }
      });
    }

    if (!out.length && story?.media_url) {
      const single = String(story.media_url).trim();
      if (single) {
        out.push({
          url: single,
          thumb: single,
          feed: single,
          full: single,
          kind: guessKind(single, story?.type),
        });
      }
    }
  } catch (error) {
    console.warn('Failed to parse story media:', error);

    if (story?.media_url) {
      const single = String(story.media_url).trim();
      if (single) {
        out.push({
          url: single,
          thumb: single,
          feed: single,
          full: single,
          kind: guessKind(single, story?.type),
        });
      }
    }
  }

  return out;
};    

    
// ==================== PROGRESSIVE TILE IMAGE (PROFESSIONAL UNERA DATA SAVING) ====================
// - Outside 3 posts: 0kb downloaded, stable background placeholder (no layout shift/shake)
// - ~3 posts before screen: thumbnail downloaded
// - ~1 post before screen: full feed image downloaded & smoothly applied
// - Cached images: instant load, never redownload once downloaded
const ProgressiveTileImage = memo(
  ({
    item,
    className,
  }: {
    item: { url: string; thumb?: string; feed?: string; full?: string; width?: number; height?: number };
    className: string;
  }) => {
    const thumbSrc = item.thumb || '';
    const feedSrc = item.feed || item.full || item.url || '';
    const fullSrc = item.full || item.feed || item.url || '';
    const fallbackSrc = item.url || '';

    // Check if feed image or thumbnail is already in local/memory cache
    const feedCached = imageCache.isCached(feedSrc) || imageCache.isCached(fullSrc) || imageCache.isCached(fallbackSrc);
    const thumbCached = imageCache.isCached(thumbSrc);

    const [stage, setStage] = useState<'idle' | 'thumb' | 'feed'>(() => {
      if (feedCached) return 'feed';
      if (thumbCached) return 'thumb';
      return 'idle';
    });

    const [activeSrc, setActiveSrc] = useState<string>(() => {
      if (feedCached) return feedSrc || fullSrc || fallbackSrc;
      if (thumbCached) return thumbSrc;
      return '';
    });

    const [isLoaded, setIsLoaded] = useState<boolean>(() => feedCached);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      // If already feed loaded and active, nothing to do
      if (stage === 'feed' && isLoaded && activeSrc) return;

      if (imageCache.isCached(feedSrc) || imageCache.isCached(fullSrc)) {
        const resolved = feedSrc || fullSrc || fallbackSrc;
        setStage('feed');
        setActiveSrc(resolved);
        setIsLoaded(true);
        return;
      }

      const el = containerRef.current;
      if (!el) return;

      // STAGE 2 OBSERVER (~1 post ahead / on screen -> Download feed image)
      const unobserveFeed = observeForFeed(el, () => {
        setStage('feed');
        const targetFeed = feedSrc || fullSrc || fallbackSrc;
        if (targetFeed) {
          const img = new Image();
          img.src = targetFeed;
          img.onload = () => {
            imageCache.markCached(targetFeed);
            setActiveSrc(targetFeed);
            setIsLoaded(true);
          };
          img.onerror = () => {
            setActiveSrc(targetFeed);
            setIsLoaded(true);
          };
        }
      });

      // If already in thumb or feed stage, we only wait for feed observer
      if (stage !== 'idle') {
        return () => {
          unobserveFeed();
        };
      }

      // STAGE 1 OBSERVER (~3 posts ahead -> Download thumbnail)
      const unobserveThumb = observeForThumbnail(el, () => {
        setStage((prev) => (prev === 'idle' ? 'thumb' : prev));
        const targetThumb = thumbSrc || feedSrc || fallbackSrc;
        if (targetThumb) {
          const img = new Image();
          img.src = targetThumb;
          img.onload = () => {
            imageCache.markCached(targetThumb);
            setActiveSrc((current) => current || targetThumb);
          };
          img.onerror = () => {
            setActiveSrc((current) => current || targetThumb);
          };
        }
      });

      return () => {
        unobserveThumb();
        unobserveFeed();
      };
    }, [feedSrc, fullSrc, thumbSrc, fallbackSrc, stage, activeSrc, isLoaded]);

    return (
      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden bg-[#162032]"
      >
        {/* Subtle placeholder icon while 0kb idle */}
        {(!activeSrc || !isLoaded) && (
          <div className="absolute inset-0 bg-[#162032] flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-[#1E293B]/50 flex items-center justify-center">
              <i className="fas fa-image text-[#334155] text-xs" />
            </div>
          </div>
        )}

        {/* The Image element: 0kb download when idle, thumbnail at 3 posts, feed at 1 post */}
        {activeSrc && (
          <img
            src={activeSrc}
            alt=""
            loading="lazy"
            decoding="async"
            className={`${className} transition-opacity duration-300 ease-out ${
              isLoaded ? 'opacity-100' : 'opacity-75'
            }`}
            onLoad={() => {
              imageCache.markCached(activeSrc);
              setIsLoaded(true);
            }}
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (stage === 'thumb' && feedSrc && target.src !== feedSrc) {
                target.src = feedSrc;
                return;
              }
              if (fallbackSrc && target.src !== fallbackSrc) {
                target.src = fallbackSrc;
                return;
              }
              target.style.opacity = '0';
            }}
          />
        )}
      </div>
    );
  }
);
    
// ==================== MEDIA GRID ====================
const MediaGrid = memo(
  ({
    media,
    onOpen,
  }: {
    media: {
      url: string;
      thumb?: string;
      feed?: string;
      full?: string;
      width?: number;
      height?: number;
    }[];
    onOpen: (url: string, index: number) => void;
  }) => {
    const total = Array.isArray(media) ? media.length : 0;

    const visible =
      total <= 4
        ? media
        : total === 5
        ? media.slice(0, 5)
        : media.slice(0, 6);

    const extra = total <= 5 ? 0 : total === 6 ? 0 : total - 6;

    const orientations = classifyOrientations(visible);

    const Tile = ({
      item,
      index,
      className,
      showOverlay = false,
    }: {
      item: { url: string; thumb?: string; feed?: string; full?: string };
      index: number;
      className: string;
      showOverlay?: boolean;
    }) => (
      <button
        type="button"
        key={`${item.full || item.feed || item.thumb || item.url}-${index}`}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(item.full || item.feed || item.thumb || item.url, index);
        }}
        className={`relative overflow-hidden bg-[#162032] ${className}`}
        style={{ borderRadius: 0 }}
      >
        <ProgressiveTileImage
          item={item}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {showOverlay && extra > 0 && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center pointer-events-none">
            <span className="text-white font-bold text-[34px] leading-none">
              +{extra}
            </span>
          </div>
        )}
      </button>
    );

    if (total === 0) return null;

    // Single image layout - edge-to-edge with natural aspect ratio container to prevent layout shifts
    if (total === 1) {
      const item = visible[0];
      const hasDimensions = Boolean(item.width && item.height && item.width > 0 && item.height > 0);
      const aspectStyle = hasDimensions
        ? { aspectRatio: `${item.width} / ${item.height}` }
        : undefined;

      return (
        <div className="w-full bg-[#050B18] overflow-hidden flex justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(
                item.full || item.feed || item.thumb || item.url,
                0
              );
            }}
            className="w-full block focus:outline-none relative bg-[#162032] min-h-[260px] max-h-[850px] overflow-hidden"
            style={aspectStyle}
          >
            <ProgressiveTileImage
              item={item}
              className="w-full h-auto max-h-[850px] object-cover mx-auto block"
            />
          </button>
        </div>
      );
    }

    // 2 images layout
    if (total === 2) {
      return (
        <div className="w-full grid grid-cols-2 gap-[2px] bg-black">
          <Tile item={visible[0]} index={0} className="h-[320px] w-full" />
          <Tile item={visible[1]} index={1} className="h-[320px] w-full" />
        </div>
      );
    }

    // 3 images layout
    if (total === 3) {
      return (
        <div className="w-full grid grid-cols-2 gap-[2px] bg-black">
          <Tile item={visible[0]} index={0} className="h-[420px] w-full" />
          <div className="grid grid-rows-2 gap-[2px] h-[420px]">
            <Tile item={visible[1]} index={1} className="w-full h-full" />
            <Tile item={visible[2]} index={2} className="w-full h-full" />
          </div>
        </div>
      );
    }

    // 4 images layout
    if (total === 4) {
      return (
        <div className="w-full grid grid-cols-2 gap-[2px] bg-black">
          <Tile item={visible[0]} index={0} className="h-[260px] w-full" />
          <Tile item={visible[1]} index={1} className="h-[260px] w-full" />
          <Tile item={visible[2]} index={2} className="h-[260px] w-full" />
          <Tile item={visible[3]} index={3} className="h-[260px] w-full" />
        </div>
      );
    }

    // 5 images layout
    if (total === 5) {
      return (
        <div className="w-full bg-black">
          <div className="grid grid-cols-2 gap-[2px] mb-[2px]">
            <Tile item={visible[0]} index={0} className="h-[250px] w-full" />
            <Tile item={visible[1]} index={1} className="h-[250px] w-full" />
          </div>

          <div className="grid grid-cols-3 gap-[2px]">
            <Tile item={visible[2]} index={2} className="h-[170px] w-full" />
            <Tile item={visible[3]} index={3} className="h-[170px] w-full" />
            <Tile
              item={visible[4]}
              index={4}
              className="h-[170px] w-full"
              showOverlay={extra > 0}
            />
          </div>
        </div>
      );
    }

    // Smart 6-image layout
    if (total >= 6) {
      const first = orientations[0];
      const second = orientations[1];
      const third = orientations[2];

      const topPortraitPair = first === 'portrait' && second === 'portrait';
      const firstLandscape = first === 'landscape' || second === 'landscape';
      const tallLeft = third === 'portrait';

      // Layout A
      if (tallLeft) {
        return (
          <div className="w-full bg-black">
            <div className="grid grid-cols-2 gap-[2px] mb-[2px]">
              <Tile item={visible[0]} index={0} className="h-[250px] w-full" />
              <Tile item={visible[1]} index={1} className="h-[250px] w-full" />
            </div>

            <div className="grid grid-cols-2 gap-[2px]">
              <Tile item={visible[2]} index={2} className="h-[340px] w-full" />
              <div className="grid grid-rows-3 gap-[2px] h-[340px]">
                <Tile item={visible[3]} index={3} className="w-full h-full" />
                <Tile item={visible[4]} index={4} className="w-full h-full" />
                <Tile
                  item={visible[5]}
                  index={5}
                  className="w-full h-full"
                  showOverlay={extra > 0}
                />
              </div>
            </div>
          </div>
        );
      }

      // Layout B
      if (firstLandscape || !topPortraitPair) {
        return (
          <div className="w-full bg-black">
            <div className="grid grid-cols-2 gap-[2px] mb-[2px]">
              <Tile item={visible[0]} index={0} className="h-[230px] w-full" />
              <Tile item={visible[1]} index={1} className="h-[230px] w-full" />
            </div>

            <div className="grid grid-cols-2 gap-[2px]">
              <Tile item={visible[2]} index={2} className="h-[170px] w-full" />
              <Tile item={visible[3]} index={3} className="h-[170px] w-full" />
              <Tile item={visible[4]} index={4} className="h-[170px] w-full" />
              <Tile
                item={visible[5]}
                index={5}
                className="h-[170px] w-full"
                showOverlay={extra > 0}
              />
            </div>
          </div>
        );
      }

      // Layout C
      return (
        <div className="w-full bg-black">
          <div className="grid grid-cols-2 gap-[2px] mb-[2px]">
            <Tile item={visible[0]} index={0} className="h-[320px] w-full" />
            <div className="grid grid-rows-2 gap-[2px] h-[320px]">
              <Tile item={visible[1]} index={1} className="w-full h-full" />
              <Tile item={visible[2]} index={2} className="w-full h-full" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-[2px]">
            <Tile item={visible[3]} index={3} className="h-[150px] w-full" />
            <Tile item={visible[4]} index={4} className="h-[150px] w-full" />
            <Tile
              item={visible[5]}
              index={5}
              className="h-[150px] w-full"
              showOverlay={extra > 0}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="w-full grid grid-cols-3 gap-[2px] bg-black">
        <Tile item={visible[0]} index={0} className="h-[180px] w-full" />
        <Tile item={visible[1]} index={1} className="h-[180px] w-full" />
        <Tile item={visible[2]} index={2} className="h-[180px] w-full" />
        <Tile item={visible[3]} index={3} className="h-[180px] w-full" />
        <Tile item={visible[4]} index={4} className="h-[180px] w-full" />
        <Tile
          item={visible[5]}
          index={5}
          className="h-[180px] w-full"
          showOverlay={extra > 0}
        />
      </div>
    );
  },
  (prev, next) => prev.media === next.media
);
              
              
// ==================== GROUP POST HEADER (internal) ====================
const GroupPostHeader = memo(
  ({
    post,
    group,
    author,
    groups = [],
    onOpenGroup,
    onOpenProfile,
    onOpenMenu,
  }: {
    post: any;
    group?: any;
    author?: any;
    groups?: any[];
    onOpenGroup?: (groupId: number) => void;
    onOpenProfile?: (userId: number) => void;
    onOpenMenu?: () => void;
  }) => {
    const rawGroupId = Number(
      group?.id ||
      post?.group_id ||
      post?.groupId ||
      post?.meta?.group_id ||
      post?.meta?.groupId ||
      0
    );
    const rawGroupName = safeStr(
      group?.name ||
      post?.group_name ||
      post?.groupName ||
      post?.meta?.group_name ||
      post?.meta?.groupName
    );
    const matchedGroup = group || (rawGroupId ? groups.find((g: any) => g.id === rawGroupId) : (rawGroupName ? groups.find((g: any) => g.name?.toLowerCase() === rawGroupName.toLowerCase()) : undefined));
    const groupId = rawGroupId || matchedGroup?.id || 0;
    const groupName = rawGroupName || matchedGroup?.name || 'Group';
    const isGroupVerified = Boolean(group?.is_verified || matchedGroup?.is_verified || post?.is_group_verified);

    const userName = safeStr(author?.name || post?.name || post?.username);
    const userId = Number(author?.id || post?.user_id || 0);
    const groupImg =
      safeStr(
        group?.profile_image || group?.avatar || group?.image || matchedGroup?.profile_image || matchedGroup?.avatar || post?.group_image
      ) || '';
    const userImg =
      safeStr(author?.profile_image_url || author?.avatar || post?.profile_image_url) ||
      '';
    const timeAgo = formatRelativeTime(post?.created_at);

    return (
      <div className="flex items-start justify-between px-3 pt-3">
        <div className="flex items-start gap-3 min-w-0">
          <button
            className="relative shrink-0 cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenGroup) onOpenGroup(groupId || 0);
            }}
            title={groupName}
          >
            <div className="w-10 h-10 rounded-full bg-[#1E293B] overflow-hidden flex items-center justify-center border border-[#334155] group-hover:border-[#1877F2] transition-colors">
              {groupImg ? (
                <img src={groupImg} className="w-full h-full object-cover" />
              ) : (
                <i className="fas fa-users text-[#94A3B8]" />
              )}
            </div>

            <div className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-[#1E293B] overflow-hidden border-2 border-[#0B1120] flex items-center justify-center">
              {userImg ? (
                <img src={userImg} className="w-full h-full object-cover" />
              ) : (
                <i className="fas fa-user text-[10px] text-[#94A3B8]" />
              )}
            </div>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                className="text-left font-extrabold text-[21px] leading-[1.1] text-[#E4E6EB] truncate hover:underline cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenGroup) onOpenGroup(groupId || 0);
                }}
                title={`Open ${groupName}`}
              >
                {groupName}
              </button>
              {isGroupVerified && (
                <VerifiedBadge size={21} className="shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-2 text-[15px] text-[#B0B3B8] min-w-0 mt-0.5">
              <button
                className="font-semibold text-[17.5px] text-[#CBD5E1] hover:text-white hover:underline truncate cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (userId && onOpenProfile) onOpenProfile(userId);
                }}
              >
                {userName || 'User'}
              </button>

              <span>·</span>
              <span className="truncate">{timeAgo}</span>

              <span>·</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenGroup) onOpenGroup(groupId || 0);
                }}
                className="hover:text-white transition-colors"
                title="Open Group"
              >
                <i className="fas fa-users text-[14px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Right menu - Will be handled by PostMenu component */}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.post?.id === next.post?.id &&
      prev.group?.id === next.group?.id &&
      prev.author?.id === next.author?.id
    );
  }
);

// ==================== EXPANDABLE RICH TEXT (internal) ====================
const ExpandableRichText = memo(
  ({
    text,
    users,
    onProfileClick,
    onHashtagClick,
    maxWords = 14,
    fontSizePx = 23,
    forceExpanded = false,
  }: {
    text: string;
    users?: User[];
    onProfileClick: (id: number) => void;
    onHashtagClick?: (tag: string) => void;
    maxWords?: number;
    fontSizePx?: number;
    forceExpanded?: boolean;
  }) => {
    const [expanded, setExpanded] = useState(false);

    const words = (text || '').trim().split(/\s+/).filter(Boolean);
    const isLong = words.length > maxWords;

    const showAll = forceExpanded || expanded || !isLong;
    const shownText = showAll
      ? text
      : words.slice(0, maxWords).join(' ') + '…';

    return (
      <div
        style={{ fontSize: `${fontSizePx}px` }}
        className="text-[#E4E6EB] leading-relaxed"
      >
        <RichText
          text={shownText}
          users={users}
          onProfileClick={onProfileClick}
          onHashtagClick={onHashtagClick}
        />

        {isLong && !forceExpanded && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="ml-2 font-bold text-[#1877F2] hover:underline text-[16px]"
          >
            {expanded ? 'See less' : 'See more'}
          </button>
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.text === next.text &&
      prev.forceExpanded === next.forceExpanded &&
      prev.users === next.users
    );
  }
);

// ==================== RICH TEXT (exported) ====================
export const RichText = ({
  text,
  users,
  onProfileClick,
  onHashtagClick,
}: {
  text: string;
  users?: User[];
  onProfileClick: (id: number) => void;
  onHashtagClick?: (tag: string) => void;
}) => {
  if (!text) return null;
  const parts = text.split(/(#[a-zA-Z0-9_]+|@\w+(?:\s\w+)?)/g);

  return (
    <span className="leading-relaxed text-[#E4E6EB] whitespace-pre-wrap break-words text-[23px]">
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const name = part.substring(1).trim().toLowerCase();
          const user = users?.find((u: any) => {
            const un = String(u?.username ?? '').toLowerCase();
            const nm = String(u?.name ?? '').toLowerCase();
            return un === name || nm === name;
          });

          if (user) {
            return (
              <span
                key={index}
                className="text-[#1877F2] font-semibold cursor-pointer hover:underline text-[23px]"
                onClick={(e) => {
                  e.stopPropagation();
                  onProfileClick(safeUserId(user));
                }}
              >
                {part}
              </span>
            );
          }

          return (
            <span
              key={index}
              className="text-[#1877F2] font-semibold text-[23px]"
            >
              {part}
            </span>
          );
        }

        if (part.startsWith('#')) {
          return (
            <span
              key={index}
              className="text-[#1877F2] cursor-pointer hover:underline text-[23px]"
              onClick={(e) => {
                e.stopPropagation();
                onHashtagClick && onHashtagClick(part);
              }}
            >
              {part}
            </span>
          );
        }

        return <span key={index} className="text-[23px]">{part}</span>;
      })}
    </span>
  );
};

/**
 * =========================
 * ✅ EVENT POST
 * =========================
 */
export const EventPost = memo(
  ({
    event,
    author,
    currentUser,
    users = [],
    onProfileClick,
    onRSVP,
    onFollow,
    isFollowing = false,
    followLoading = false,
    onReact,
    onShare,
    onOpenComments,
    groups = [],
    brands = [],
    chats = [],
    onEventClick,
  }: {
    event: any;
    author?: any;
    currentUser: User | null;
    users?: User[];
    onProfileClick: (id: number) => void;
    onRSVP?: (eventId: number, status: 'going' | 'interested' | 'not_going') => Promise<any>;
    onFollow?: (id: number) => void;
    isFollowing?: boolean;
    followLoading?: boolean;
    onReact?: (post: PostType, type: ReactionType) => void;
    onShare?: (id: number, newShareCount: number) => void;
    onOpenComments?: (post: PostType) => void;
    groups?: Group[];
    brands?: Brand[];
    chats?: any[];
    onEventClick?: (eventId: number) => void;
  }) => {
    const [rsvpStatus, setRsvpStatus] = useState(event.user_rsvp_status || '');
    const [attendeesCount, setAttendeesCount] = useState(
      event.attendees_count || 0
    );
    const [interestedCount, setInterestedCount] = useState(
      event.interested_count || 0
    );
    const [loading, setLoading] = useState(false);
    const [showShareSheet, setShowShareSheet] = useState(false);
    const [showEventPreviewModal, setShowEventPreviewModal] = useState(false);

    const creator =
      author ||
      users?.find((u) => Number(u.id) === Number(event.creator_id)) ||
      event.creator || {
        id: event.creator_id,
        name: 'Event Organizer',
        username: '',
        profile_image_url: null,
      };

    const dateObj = event.event_date ? toDateSafe(event.event_date) : null;
    const nowLocal = new Date();
    const isPast = !!dateObj && dateObj < nowLocal;

    const formatEventDate = () => {
      if (!dateObj) return 'Date TBD';
      if (dateObj.toDateString() === nowLocal.toDateString()) return 'Today';
      const tomorrow = new Date(nowLocal);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (dateObj.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    };

    const formatEventTime = () => {
      if (!dateObj) return '';
      return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const handleRSVPClick = async (target: 'going' | 'interested') => {
      if (!currentUser) {
        alert('Please login to RSVP');
        return;
      }
      if (!event.id) return;

      setLoading(true);

      const prevStatus = rsvpStatus;
      const nextStatus: '' | 'going' | 'interested' =
        prevStatus === target ? '' : target;

      const prevAtt = attendeesCount;
      const prevInt = interestedCount;

      let nextAtt = prevAtt;
      let nextInt = prevInt;

      if (target === 'going') {
        if (prevStatus === 'going') nextAtt = Math.max(0, prevAtt - 1);
        else if (prevStatus === 'interested') {
          nextAtt = prevAtt + 1;
          nextInt = Math.max(0, prevInt - 1);
        } else nextAtt = prevAtt + 1;
      } else {
        if (prevStatus === 'interested') nextInt = Math.max(0, prevInt - 1);
        else if (prevStatus === 'going') {
          nextInt = prevInt + 1;
          nextAtt = Math.max(0, prevAtt - 1);
        } else nextInt = prevInt + 1;
      }

      setRsvpStatus(nextStatus);
      setAttendeesCount(nextAtt);
      setInterestedCount(nextInt);

      try {
        let res;
        if (onRSVP) {
          await onRSVP(event.id, (nextStatus || 'not_going') as any);
          res = { success: true };
        } else {
          res = await rsvpEventDirect({
            eventId: event.id,
            userId: safeUserId(currentUser),
            newStatus: (nextStatus || 'not_going') as any,
            prevStatus: prevStatus as any,
          });
        }

        if (res?.success) {
          if (res.attending_count !== undefined) {
            setAttendeesCount(Number(res.attending_count));
          }
          if (res.interested_count !== undefined) {
            setInterestedCount(Number(res.interested_count));
          }
          if (res.my_status !== undefined) {
            setRsvpStatus(res.my_status);
          }
        }
      } catch (error) {
        setRsvpStatus(prevStatus);
        setAttendeesCount(prevAtt);
        setInterestedCount(prevInt);
        console.error('RSVP failed:', error);
        alert('Failed to RSVP. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const handleFollowClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (onFollow && creator?.id) onFollow(safeUserId(creator));
    };

    const getReactionEndpoint = () =>
      event.id ? `/api/events/${event.id}/react` : null;

    const handleReact = async (type: ReactionType) => {
  if (!currentUser || !event.id || !onReact) return;
      

  const eventAsPost = {
  ...event,
  id: event.id,
  event_id: event.id,
  source: "event",
  item_type: "event",
  type: "event",
  post_type: "event",
  kind: "event",
};
  
 onReact(eventAsPost as any, type);
};



    const handleShare = () => {
      if (!currentUser) alert('Please login to share');
      else setShowShareSheet(true);
    };

    const handleShareComplete = (destination: string, data?: any) => {
      if (onShare && data?.success && event.id) {
        const newShares = data?.shares || 0;
        onShare(event.id, newShares);
      }
      setShowShareSheet(false);
    };

    const handleOpenComments = () => {
      if (onOpenComments && event.id) {
        const eventAsPost = {
          id: event.id,
          type: 'event',
          ...event,
        };
        onOpenComments(eventAsPost as PostType);
      }
    };

    const handleCardClick = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (onEventClick && event.id) onEventClick(event.id);
      setShowEventPreviewModal(true);
    };

    return (
      <>
        <div className="w-full">
          <div
            className="bg-[#0B1120] w-full overflow-hidden cursor-pointer"
            onClick={handleCardClick}
          >
            <div
              className="p-3 md:p-4 flex items-center justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  creator?.id && onProfileClick(Number(creator.id));
                }}
              >
                <img
                  src={avatarFrom(creator)}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-[#1E293B]"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <h4 className="font-bold text-[#F8FAFC] text-[21px] truncate">
                      {creator?.name || creator?.username || 'User'}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#94A3B8] text-[15px]">
                    <span>{formatRelativeTime(event.created_at)}</span>
                    <span>•</span>
                    <i className="fas fa-globe-americas text-[14px]"></i>
                    <span>• created an event</span>
                  </div>
                </div>
              </div>

              {onFollow && currentUser && creator?.id && safeUserId(creator) !== safeUserId(currentUser) && (
                <button
                  onClick={handleFollowClick}
                  disabled={followLoading}
                  className={`px-3 py-1.5 text-[15px] font-bold rounded-lg transition-all duration-200 ml-2 ${
                    isFollowing
                      ? 'bg-[#1E293B] text-[#F8FAFC] hover:bg-[#334155]'
                      : 'bg-[#1877F2] text-white hover:bg-[#166FE5]'
                  } ${followLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {followLoading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : isFollowing ? (
                    'Following'
                  ) : (
                    'Follow'
                  )}
                </button>
              )}
            </div>

            <div className="pb-4 px-3.5 sm:px-4" onClick={handleCardClick}>
              <div className="border border-[#1E293B] hover:border-[#1877F2]/60 rounded-2xl overflow-hidden bg-[#050B18] transition-colors cursor-pointer group">
                {event.cover_url ? (
                  <div className="h-48 bg-[#050B18] overflow-hidden relative">
                    <img
                      src={event.cover_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const fallback = document.createElement('div');
                          fallback.className =
                            'h-48 bg-[#1f2a37] flex items-center justify-center';
                          fallback.innerHTML =
                            '<i class="fas fa-calendar text-white/30 text-5xl"></i>';
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                    {dateObj && (
                      <div className="absolute top-3 left-3 bg-[#0B1120]/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-[#1E293B]">
                        <div className="text-[#94A3B8] text-[13px] font-black">
                          {dateObj
                            .toLocaleDateString('en-US', { month: 'short' })
                            .toUpperCase()}
                        </div>
                        <div className="text-[#F8FAFC] text-[22px] font-black leading-tight">
                          {dateObj.getDate()}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-32 bg-[#1f2a37] flex items-center justify-center relative">
                    <i className="fas fa-calendar text-white/30 text-5xl"></i>
                    {dateObj && (
                      <div className="absolute top-3 left-3 bg-[#0B1120]/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-[#1E293B]">
                        <div className="text-[#94A3B8] text-[13px] font-black">
                          {dateObj
                            .toLocaleDateString('en-US', { month: 'short' })
                            .toUpperCase()}
                        </div>
                        <div className="text-[#F8FAFC] text-[22px] font-black leading-tight">
                          {dateObj.getDate()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4">
                  <div className="text-[#F8FAFC] font-black text-[22px] line-clamp-2">
                    {event.title}
                  </div>

                  {event.description && (
                    <div className="text-[#94A3B8] text-[16px] mt-1 line-clamp-2">
                      {event.description}
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    {event.event_date && (
                      <div className="flex items-center gap-2 text-[#94A3B8] text-[15px]">
                        <i
                          className={`fas fa-calendar-alt ${
                            isPast ? 'text-[#94A3B8]' : 'text-[#1877F2]'
                          } w-4`}
                        ></i>
                        <span>
                          {formatEventDate()} at {formatEventTime()}
                        </span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-2 text-[#94A3B8] text-[15px]">
                        <i className="fas fa-map-marker-alt text-[#F02849] w-4"></i>
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[#94A3B8] text-[15px]">
                      <i className="fas fa-users text-[#45BD62] w-4"></i>
                      <span>
                        {attendeesCount} attending • {interestedCount} interested
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      disabled={loading || isPast}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRSVPClick('going');
                      }}
                      className={`flex-1 h-11 rounded-lg font-bold transition-colors text-[15px] ${
                        isPast ? 'opacity-50 cursor-not-allowed' : ''
                      } ${
                        rsvpStatus === 'going'
                          ? 'bg-[#45BD62] text-white'
                          : 'bg-[#1877F2] text-white hover:bg-[#166FE5]'
                      } disabled:opacity-60`}
                    >
                      {loading && rsvpStatus === 'going' ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : rsvpStatus === 'going' ? (
                        '✓ Going'
                      ) : (
                        'Going'
                      )}
                    </button>

                    <button
                      disabled={loading || isPast}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRSVPClick('interested');
                      }}
                      className={`flex-1 h-11 rounded-lg font-bold transition-colors text-[15px] ${
                        isPast ? 'opacity-50 cursor-not-allowed' : ''
                      } ${
                        rsvpStatus === 'interested'
                          ? 'bg-[#F7B928] text-black'
                          : 'bg-[#1E293B] text-[#F8FAFC] hover:bg-[#334155]'
                      } disabled:opacity-60`}
                    >
                      {loading && rsvpStatus === 'interested' ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : rsvpStatus === 'interested' ? (
                        '✓ Interested'
                      ) : (
                        'Interested'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="px-3.5 py-2.5 border-t border-white/10 flex items-center justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4">
                <ReactionButton
                  currentUserReactions={(event as any).my_reaction || undefined}
                  reactionCount={Number((event as any).reactions_count || 0)}
                  onReact={handleReact}
                  isGuest={!currentUser}
                />
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-[#F8FAFC] hover:text-[#38BDF8] transition-colors focus:outline-none p-1 rounded-lg hover:bg-[#1E293B]/60"
                  onClick={handleOpenComments}
                  aria-label="Discuss & Comments"
                  title="Discuss"
                >
                  <i className="far fa-comment text-[22px]"></i>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-[#F8FAFC] hover:text-[#38BDF8] transition-transform active:scale-110 focus:outline-none p-1 rounded-lg hover:bg-[#1E293B]/60"
                  onClick={handleShare}
                  aria-label="Share post"
                  title="Share"
                >
                  <i className="far fa-paper-plane text-[21px]"></i>
                </button>
              </div>
            </div>
          </div>

          <div className="h-[10px] bg-[#050B18] border-t border-white/10" />
        </div>

        {event && (
          <ShareBottomSheet
            isOpen={showShareSheet}
            onClose={() => setShowShareSheet(false)}
            post={{
              id: event.id,
              author: creator,
              content: event.title,
              description: event.description,
              media_url: event.cover_url,
              created_at: event.created_at,
              source: 'event',
              item_type: 'event',
              event_id: event.id,
            }}
            currentUser={currentUser}
            users={users}
            groups={groups}
            brands={brands}
            chats={chats}
            onShareComplete={handleShareComplete}
          />
        )}

        {showEventPreviewModal && (
          <EventDetailsModal
            event={{
              ...event,
              image: event.cover_url || event.image || event.media_url,
              time: event.time || (event.event_date ? new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'),
              attendees_count: attendeesCount,
              interested_count: interestedCount,
              user_rsvp_status: rsvpStatus,
            }}
            currentUser={currentUser}
            onClose={() => setShowEventPreviewModal(false)}
            onJoin={() => handleRSVPClick('going')}
            onInterested={() => handleRSVPClick('interested')}
            onProfileClick={onProfileClick}
          />
        )}
      </>
    );
  },
  eventPostPropsEqual
);

/**
 * =========================
 * ✅ EVENT FEED CARD
 * =========================
 */
type FeedEventItem = {
  id: number;
  feed_key: string;
  item_type: 'event';
  event_id: number;
  user_id: number;
  name: string;
  username: string;
  profile_image_url: string | null;
  created_at: string;
  content: string;
  event_date?: string;
  event_description?: string;
  location?: string;
  media_url?: string | null;
  image_url?: string | null;
  cover_url?: string | null;
  attending_count?: number;
  interested_count?: number;
  my_rsvp_status?: '' | 'going' | 'interested';
};

export const EventFeedCard = memo(
  ({
    item,
    currentUser,
    onProfileClick,
    onUpdateItem,
    onRSVPEvent,
    onEventClick,
  }: {
    item: FeedEventItem;
    currentUser: { id: number } | null;
    onProfileClick: (id: number) => void;
    onUpdateItem: (patch: Partial<FeedEventItem>) => void;
    onRSVPEvent?: (eventId: number, status: 'going' | 'interested' | 'not_going') => Promise<any>;
    onEventClick?: (eventId: number) => void;
  }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showEventPreviewModal, setShowEventPreviewModal] = useState(false);

    const whenText = useMemo(() => {
      const d = item.event_date ? new Date(item.event_date) : null;
      if (!d || isNaN(d.getTime())) return '';
      return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }, [item.event_date]);

    const dateObj = item.event_date ? toDateSafe(item.event_date) : null;
    const nowLocal = new Date();
    const isPast = !!dateObj && dateObj < nowLocal;

    const rsvp = async (target: 'going' | 'interested') => {
      if (!currentUser) {
        alert('Please login to RSVP');
        return;
      }
      setLoading(true);
      setError(null);

      const eventId = item.event_id || item.id;
      const prevStatus = (item.my_rsvp_status || '') as '' | 'going' | 'interested';
      const nextStatus: '' | 'going' | 'interested' =
        prevStatus === target ? '' : target;

      const prevAtt = Number(item.attending_count ?? 0);
      const prevInt = Number(item.interested_count ?? 0);

      let nextAtt = prevAtt;
      let nextInt = prevInt;

      if (target === 'going') {
        if (prevStatus === 'going') nextAtt = Math.max(0, prevAtt - 1);
        else if (prevStatus === 'interested') {
          nextAtt = prevAtt + 1;
          nextInt = Math.max(0, prevInt - 1);
        } else nextAtt = prevAtt + 1;
      } else {
        if (prevStatus === 'interested') nextInt = Math.max(0, prevInt - 1);
        else if (prevStatus === 'going') {
          nextInt = prevInt + 1;
          nextAtt = Math.max(0, prevAtt - 1);
        } else nextInt = prevInt + 1;
      }

      onUpdateItem({
        my_rsvp_status: nextStatus as any,
        attending_count: nextAtt,
        interested_count: nextInt,
      });

      try {
        let res;
        if (onRSVPEvent) {
          await onRSVPEvent(eventId, (nextStatus || 'not_going') as any);
          res = { success: true };
        } else {
          res = await rsvpEventDirect({
            eventId,
            userId: currentUser.id,
            newStatus: (nextStatus || 'not_going') as any,
            prevStatus,
          });
        }

        if (res?.success) {
          const patch: Partial<FeedEventItem> = {};
          if (res.my_status !== undefined) patch.my_rsvp_status = res.my_status;
          if (res.attending_count !== undefined)
            patch.attending_count = Number(res.attending_count);
          if (res.interested_count !== undefined)
            patch.interested_count = Number(res.interested_count);
          onUpdateItem(patch);
        }
      } catch (e: any) {
        onUpdateItem({
          my_rsvp_status: prevStatus as any,
          attending_count: prevAtt,
          interested_count: prevInt,
        });
        setError(e?.message || 'Failed to RSVP. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const my = item.my_rsvp_status || '';
    const attending = Number(item.attending_count ?? 0);
    const interested = Number(item.interested_count ?? 0);

    const handleCardClick = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (onEventClick) {
        const eventId = item.event_id || item.id;
        onEventClick(eventId);
      }
      setShowEventPreviewModal(true);
    };

    return (
      <div className="w-full cursor-pointer" onClick={handleCardClick}>
        <div className="bg-[#0B1120] rounded-xl overflow-hidden border border-[#1E293B]">
          <div
            className="flex items-center gap-3 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={item.profile_image_url || 'https://via.placeholder.com/40'}
              className="w-10 h-10 rounded-full object-cover cursor-pointer border border-[#1E293B]"
              alt=""
              onClick={(e) => {
                e.stopPropagation();
                onProfileClick(item.user_id);
              }}
            />
            <div className="min-w-0">
              <div className="text-[#F8FAFC] font-bold text-[21px] truncate">
                {item.name}
              </div>
              <div className="text-[#94A3B8] text-[15px]">
                {formatRelativeTime(item.created_at)} • created an event
              </div>
            </div>
          </div>

          {item.media_url ? (
            <div className="w-full h-56 bg-black overflow-hidden relative">
              <img
                src={item.media_url}
                className="w-full h-full object-cover"
                alt=""
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className =
                      'w-full h-56 bg-[#0B1120] flex items-center justify-center';
                    fallback.innerHTML =
                      '<i class="fas fa-calendar text-[#1877F2] text-4xl opacity-60"></i>';
                    parent.appendChild(fallback);
                  }
                }}
              />
              {dateObj && (
                <div className="absolute top-3 left-3 bg-[#0B1120]/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-[#1E293B]">
                  <div className="text-[#94A3B8] text-[13px] font-black">
                    {dateObj
                      .toLocaleDateString('en-US', { month: 'short' })
                      .toUpperCase()}
                  </div>
                  <div className="text-[#F8FAFC] text-[22px] font-black leading-tight">
                    {dateObj.getDate()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-40 bg-[#0B1120] flex items-center justify-center relative">
              <i className="fas fa-calendar text-[#1877F2] text-4xl opacity-60"></i>
              {dateObj && (
                <div className="absolute top-3 left-3 bg-[#0B1120]/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-[#1E293B]">
                  <div className="text-[#94A3B8] text-[13px] font-black">
                    {dateObj
                      .toLocaleDateString('en-US', { month: 'short' })
                      .toUpperCase()}
                  </div>
                  <div className="text-[#F8FAFC] text-[22px] font-black leading-tight">
                    {dateObj.getDate()}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-4" onClick={handleCardClick}>
            <div className="text-[#F8FAFC] font-black text-[22px] leading-tight">
              {item.content}
            </div>

            {item.event_description ? (
              <div className="text-[#94A3B8] text-[16px] mt-2 line-clamp-2">
                {item.event_description}
              </div>
            ) : null}

            <div className="mt-3 space-y-2 text-[#94A3B8] text-[15px]">
              {whenText ? (
                <div className="flex items-center gap-2">
                  <i
                    className={`fas fa-clock ${
                      isPast ? 'text-[#94A3B8]' : 'text-[#1877F2]'
                    } w-5`}
                  ></i>
                  <span>{whenText}</span>
                </div>
              ) : null}

              {item.location ? (
                <div className="flex items-center gap-2">
                  <i className="fas fa-map-marker-alt text-[#F02849] w-5"></i>
                  <span className="line-clamp-1">{item.location}</span>
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <i className="fas fa-users text-[#45BD62] w-5"></i>
                <span>
                  {attending} attending • {interested} interested
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-2 text-[15px] text-red-500 bg-red-500/10 p-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                disabled={loading || isPast}
                onClick={(e) => {
                  e.stopPropagation();
                  rsvp('going');
                }}
                className={`flex-1 py-2.5 rounded-lg font-bold text-[15px] disabled:opacity-60 transition-colors ${
                  isPast ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  my === 'going'
                    ? 'bg-[#45BD62] text-white hover:bg-[#3da855]'
                    : 'bg-[#1877F2] text-white hover:bg-[#166FE5]'
                }`}
              >
                {loading && my === 'going' ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : my === 'going' ? (
                  '✓ Going'
                ) : (
                  'Going'
                )}
              </button>

              <button
                disabled={loading || isPast}
                onClick={(e) => {
                  e.stopPropagation();
                  rsvp('interested');
                }}
                className={`flex-1 py-2.5 rounded-lg font-bold text-[15px] disabled:opacity-60 transition-colors ${
                  isPast ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  my === 'interested'
                    ? 'bg-[#F7B928] text-black hover:bg-[#e5aa24]'
                    : 'bg-[#1E293B] text-[#F8FAFC] hover:bg-[#334155]'
                }`}
              >
                {loading && my === 'interested' ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : my === 'interested' ? (
                  '✓ Interested'
                ) : (
                  'Interested'
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="h-[10px] bg-[#050B18] border-t border-white/10" />

        {showEventPreviewModal && (
          <EventDetailsModal
            event={{
              id: item.event_id || item.id,
              title: item.content,
              description: item.event_description,
              image: item.image_url || item.cover_url || item.media_url,
              cover_url: item.image_url || item.cover_url || item.media_url,
              location: item.location,
              date: item.event_date,
              event_date: item.event_date,
              time: whenText || 'TBD',
              attendees_count: attending,
              interested_count: interested,
              user_rsvp_status: my,
              my_rsvp_status: my,
              visibility: 'Worldwide',
            }}
            currentUser={currentUser as any}
            onClose={() => setShowEventPreviewModal(false)}
            onJoin={() => rsvp('going')}
            onInterested={() => rsvp('interested')}
            onProfileClick={onProfileClick}
          />
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.my_rsvp_status === next.item.my_rsvp_status &&
      prev.item.attending_count === next.item.attending_count &&
      prev.item.interested_count === next.item.interested_count
    );
  }
);

/**
 * =========================
 * ✅ REACTION BUTTON
 * =========================
 */
const formatReactionCount = (count: number): string => {
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

export const ReactionButton = memo(
  ({
    currentUserReactions,
    reactionCount,
    onReact,
    isGuest,
  }: {
    currentUserReactions: ReactionType | undefined;
    reactionCount: number;
    onReact: (type: ReactionType) => void;
    isGuest?: boolean;
  }) => {
    const [showDock, setShowDock] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewEmoji, setPreviewEmoji] = useState<string>('👍');
    const timerRef = useRef<any>(null);
    const longPressTimerRef = useRef<any>(null);
    const dockRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      ensureReactionStyles();
    }, []);

    const reactionConfig = [
      { type: 'like', icon: '👍', color: '#1877F2', label: 'Like' },
      { type: 'love', icon: '❤️', color: '#F3425F', label: 'Love' },
      { type: 'haha', icon: '😂', color: '#F7B928', label: 'Haha' },
      { type: 'wow', icon: '😮', color: '#F7B928', label: 'Wow' },
      { type: 'sad', icon: '😢', color: '#F7B928', label: 'Sad' },
      { type: 'angry', icon: '😡', color: '#E41E3F', label: 'Angry' },
      { type: 'fire', icon: '🔥', color: '#FF6B35', label: 'Fire' },
      { type: 'party', icon: '🎉', color: '#9C27B0', label: 'Party' },
      { type: 'clap', icon: '👏', color: '#4CAF50', label: 'Clap' },
      { type: 'star', icon: '⭐', color: '#FFD700', label: 'Star' },
      { type: 'thinking', icon: '🤔', color: '#607D8B', label: 'Thinking' },
      { type: 'crying', icon: '😭', color: '#2196F3', label: 'Crying' },
      { type: 'heart_eyes', icon: '🥰', color: '#E91E63', label: 'Heart Eyes' },
      { type: 'kiss', icon: '😘', color: '#FF4081', label: 'Kiss' },
      { type: 'sunglasses', icon: '😎', color: '#00BCD4', label: 'Cool' },
      { type: 'rocket', icon: '🚀', color: '#3F51B5', label: 'Rocket' },
      { type: 'trophy', icon: '🏆', color: '#FF9800', label: 'Trophy' },
      { type: 'crown', icon: '👑', color: '#FFC107', label: 'Crown' },
      { type: 'unicorn', icon: '🦄', color: '#E040FB', label: 'Unicorn' },
      { type: 'rainbow', icon: '🌈', color: '#00E676', label: 'Rainbow' },
      { type: 'money', icon: '💰', color: '#4CAF50', label: 'Money' },
      { type: 'muscle', icon: '💪', color: '#FF5722', label: 'Muscle' },
      { type: 'brain', icon: '🧠', color: '#9C27B0', label: 'Brain' },
      { type: 'lightning', icon: '⚡', color: '#FFEB3B', label: 'Lightning' },
      { type: 'gem', icon: '💎', color: '#00BCD4', label: 'Gem' },
    ] as const;

    const handleMouseEnter = () => {
      if (isGuest) return;
      timerRef.current = setTimeout(() => setShowDock(true), 500);
    };

    const handleMouseLeave = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setTimeout(() => setShowDock(false), 250);
      setShowPreview(false);
    };

    const handleTouchStart = () => {
      if (isGuest) return;
      longPressTimerRef.current = setTimeout(() => {
        setShowDock(true);
        setShowPreview(true);
        setPreviewEmoji('👍');
      }, 600);
    };

    const handleTouchEnd = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      setTimeout(() => setShowPreview(false), 300);
    };

    const handleClick = () => {
      if (isGuest) return alert('Please login to react.');
      if (currentUserReactions) {
        setIsAnimating(true);
        onReact(currentUserReactions);
        setTimeout(() => setIsAnimating(false), 300);
      } else {
        setShowDock(!showDock);
      }
    };

    const handleDockReact = (type: ReactionType) => {
      setIsAnimating(true);
      onReact(type);
      setShowDock(false);
      setShowPreview(false);
      setTimeout(() => setIsAnimating(false), 300);
    };

    const handleEmojiHover = (emoji: string) => {
      if (showPreview) {
        setPreviewEmoji(emoji);
      }
    };

    const activeReaction = currentUserReactions
      ? reactionConfig.find((r) => r.type === currentUserReactions)
      : null;

    return (
      <div
        className="relative group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {showPreview && (
          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-[#0B1120] rounded-full shadow-2xl p-3 border border-[#1E293B] z-50 reaction-preview">
            <div className="text-4xl">{previewEmoji}</div>
          </div>
        )}

        {showDock && (
          <div
            ref={dockRef}
            className="absolute -top-16 left-0 bg-[#0B1120] rounded-full shadow-2xl p-2 border border-[#1E293B] z-50 react-pop flex items-center"
          >
            <div className="flex gap-1 overflow-x-auto max-w-[320px] scrollbar-hide px-1 py-1">
              {reactionConfig.map((r) => (
                <div
                  key={r.type}
                  className="text-3xl react-hover cursor-pointer p-1 rounded-full hover:bg-[#1E293B] transition-colors flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDockReact(r.type as ReactionType);
                  }}
                  onMouseEnter={() => handleEmojiHover(r.icon)}
                  title={r.label}
                >
                  {r.icon}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`flex items-center gap-1.5 text-white transition-transform active:scale-125 focus:outline-none p-1 rounded-lg hover:bg-[#1E293B]/60 ${
            isAnimating ? 'scale-125' : ''
          }`}
          aria-label={activeReaction || currentUserReactions ? 'Unlike' : 'Like'}
          title="React"
        >
          {activeReaction ? (
            activeReaction.type === 'love' || activeReaction.type === 'like' ? (
              <i className="fas fa-heart text-[22px] text-red-500 transition-transform duration-300"></i>
            ) : (
              <span className="text-[22px] transition-transform duration-300">
                {activeReaction.icon}
              </span>
            )
          ) : currentUserReactions ? (
            <i className="fas fa-heart text-[22px] text-red-500 transition-transform duration-300"></i>
          ) : (
            <i className="far fa-heart text-[22px] text-[#F8FAFC] hover:text-red-400 transition-colors"></i>
          )}
          {reactionCount > 0 && (
            <span className="text-[14px] font-semibold text-[#F8FAFC]">
              {formatReactionCount(reactionCount)}
            </span>
          )}
        </button>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.currentUserReactions === next.currentUserReactions &&
      prev.reactionCount === next.reactionCount &&
      prev.isGuest === next.isGuest
    );
  }
);

/**
 * =========================
 * ✅ MAIN POST COMPONENT (with integrated Facebook-style sponsored support)
 * =========================
 */
export const Post = memo(
  ({
    post,
    author,
    currentUser,
    users = [],
    stories = [],
    onProfileClick,
    onReact,
    onShare,
    onDelete,
    onEdit,
    onViewImage,
    onOpenComments,
    onVideoClick,
    onPlayAudioTrack,
    onHashtagClick,
    onViewProductFromPost,
    onOpenGroup,
    onOpenAudio,
    onRSVP,
    groups = [],
    brands = [],
    chats = [],
    isFollowing = false,
    onFollow,
    followLoading = false,
    onEventClick,
    onOpenReactions,
    onReport,
    onHide,
    pushButton,
    onToggleGroupPostLike,
    hideCommentPreview = false,
  }: {
    post: PostType;
    author: User | any;
    currentUser: User | null;
    users?: User[];
    stories?: any[];

    onProfileClick: (id: number) => void;

    onReact: (post: PostType, type: ReactionType) => void;

    onShare: (id: number, newShareCount: number) => void;

    onDelete?: (id: number) => void;

    onEdit?: (id: number, content: string) => void;

    onViewImage: (url: string) => void;

    onOpenComments: (post: PostType) => void;

    onVideoClick: (p: PostType) => void;

    onPlayAudioTrack?: (t: AudioTrack) => void;

    onHashtagClick?: (tag: string) => void;

    onViewProductFromPost?: (productId: number) => void;

    onOpenGroup?: (groupId: number) => void;

    onOpenAudio?: (item: any) => void;

    onRSVP?: (
      eventId: number,
      status: 'going' | 'interested' | 'not_going'
    ) => Promise<void>;

    groups?: Group[];

    brands?: Brand[];

    chats?: any[];

    isFollowing?: boolean;

    onFollow?: (id: number) => void;

    followLoading?: boolean;

    onEventClick?: (eventId: number) => void;

    onOpenReactions?: (post: PostType) => void;

    onReport?: (postId: number, reason?: string) => void;

    onHide?: (postId: number) => void;

    pushButton?: React.ReactNode;

    onToggleGroupPostLike?: (
      postId: number,
      type?: ReactionType
    ) => Promise<{ liked: boolean; likes_count: number } | void>;

    hideCommentPreview?: boolean;
  }) => {

                                                                                                     
    const { onViewProduct, getProductData } = useContext(MarketplaceContext);
    const p: any = post as any;
    const a: any = author as any;
    const meta: any = p?.meta || {};

    // ==================== SPONSORED DETECTION - ENHANCED ====================
    const isSponsored = !!p?.is_sponsored || !!meta?.is_sponsored || !!meta?.sponsored_meta;
    const sponsoredMeta = p?.sponsored_meta || meta?.sponsored_meta || null;
    const sponsoredAdId = Number(sponsoredMeta?.ad_id || 0);
    
    const sponsoredHeadline = String(
      sponsoredMeta?.headline || p?.headline || ''
    ).trim();
    
    const sponsoredCtaText = String(
      sponsoredMeta?.cta_text || 
      p?.cta_text || 
      p?.cta_button || 
      sponsoredMeta?.button_text ||
      'Learn More'
    ).trim();
    
    const sponsoredCtaUrl = String(
      sponsoredMeta?.cta_url || 
      p?.cta_url || 
      p?.destination_url || 
      ''
    ).trim();
    
    const sponsoredContactType = String(
      sponsoredMeta?.contact_type || 
      p?.contact_type || 
      'link'
    ).trim();
    
    const sponsoredPhone = String(
      sponsoredMeta?.phone_number || 
      p?.phone_number || 
      ''
    ).trim();
    
    const sponsoredEmail = String(
      sponsoredMeta?.email_address || 
      p?.email_address || 
      ''
    ).trim();
    
    const shouldShowSponsoredButton = isSponsored && (
      !!sponsoredCtaUrl ||
      (sponsoredContactType === 'phone' && !!sponsoredPhone) ||
      (sponsoredContactType === 'email' && !!sponsoredEmail)
    );
    
    const shouldHideDateForSponsored = isSponsored;

    // ==================== SPONSORED IMPRESSION TRACKING ====================
    const sponsoredImpressionTrackedRef = useRef(false);
    useEffect(() => {
      if (!isSponsored || !currentUser || !sponsoredAdId) return;
      if (sponsoredImpressionTrackedRef.current) return;
      sponsoredImpressionTrackedRef.current = true;
      fetch('/api/ads/impression', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(currentUser.id),
        },
        body: JSON.stringify({ ad_id: sponsoredAdId }),
      }).catch((err) => console.error('Failed to record sponsored impression:', err));
    }, [isSponsored, currentUser, sponsoredAdId]);

    // ==================== SPONSORED CLICK HANDLER ====================
    const handleSponsoredClick = useCallback(() => {
      if (!isSponsored || !sponsoredAdId) return;
      if (currentUser) {
        fetch('/api/ads/click', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': String(currentUser.id),
          },
          body: JSON.stringify({ ad_id: sponsoredAdId }),
        }).catch((err) => console.error('Failed to record ad click:', err));
      }
      
      if (sponsoredContactType === 'phone' && sponsoredPhone) {
        window.location.href = `tel:${sponsoredPhone}`;
        return;
      }
      if (sponsoredContactType === 'email' && sponsoredEmail) {
        window.location.href = `mailto:${sponsoredEmail}`;
        return;
      }
      if (sponsoredCtaUrl) {
        window.open(sponsoredCtaUrl, '_blank', 'noopener,noreferrer');
      }
    }, [
      isSponsored, 
      sponsoredAdId, 
      currentUser, 
      sponsoredContactType, 
      sponsoredPhone, 
      sponsoredEmail, 
      sponsoredCtaUrl
    ]);

    const isMarketplace =
      p?.type === 'marketplace' ||
      p?.post_type === 'product' ||
      p?.type === 'product' ||
      p?.kind === 'product' ||
      meta?.type === 'product' ||
      meta?.kind === 'product' ||
      !!p?.product_id ||
      !!p?.meta?.marketplace?.id;

    const isEventPost =
      p?.item_type === 'event' ||
      String(p?.feed_key || '').startsWith('event:') ||
      p?.source === 'event' ||
      p?.type === 'event' ||
      p?.post_type === 'event' ||
      meta?.type === 'event' ||
      meta?.kind === 'event' ||
      !!p?.event_id ||
      !!meta?.event;

    // If it's an event post, render EventPost component
    if (isEventPost) {
      const event = normalizeEventFromFeed(p);  
  return (
    <EventPost
      event={event}
      author={a}
      currentUser={currentUser}
      users={users}
      onProfileClick={onProfileClick}
      onRSVP={onRSVP}
      onFollow={onFollow}
      isFollowing={isFollowing}
      followLoading={followLoading}
      onReact={(eventAsPost, type) => onReact(eventAsPost as PostType, type)}
      onShare={onShare}
      onOpenComments={() => onOpenComments(post)}
      groups={groups}
      brands={brands}
      chats={chats}
      onEventClick={onEventClick}
    />
  );
}


      

    const productId = isMarketplace ? getMarketplaceProductId(p) : null;
    const productData = productId ? getProductData?.(productId) : null;
  
    const mpImages = useMemo(() => 
      isMarketplace ? getMarketplaceImages(p, productData) : []
    , [isMarketplace, p, productData]);

    const { price, currency, loc } = isMarketplace
      ? getMarketplacePriceLine(productData)
      : { price: null, currency: 'TZS', loc: 'Marketplace' };

    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [showReactionsSheet, setShowReactionsSheet] = useState(false);
    const [showShareSheet, setShowShareSheet] = useState(false);

    const isMusic = meta?.kind === 'music' || meta?.type === 'music';
    const isPodcast = meta?.kind === 'podcast' || meta?.type === 'podcast';
    const song = meta?.song;
    const podcast = meta?.podcast;

    const rawGroupId = Number(
      p?.group_id || p?.groupId || meta?.group_id || meta?.groupId || p?.group?.id || 0
    );
    const rawGroupName =
      p?.group_name || p?.groupName || meta?.group_name || meta?.groupName || p?.group?.name || '';
    const group = p?.group || (rawGroupId ? groups?.find((g) => g.id === rawGroupId) : (rawGroupName ? groups?.find((g) => g.name?.toLowerCase() === rawGroupName.toLowerCase()) : undefined));
    const groupId = rawGroupId || group?.id || 0;
    const groupName = rawGroupName || group?.name || '';
    const isGroupPost = !!(groupId || group || groupName);

    const myReaction = p.myReaction ?? p.my_reaction ?? null;
 const likesCount = Number(p.likesCount ?? p.reactionsCount ?? p.reactions_count ?? 0);
      

    const reactionsArr: any[] = Array.isArray(p.reactions)
      ? p.reactions
      : Array.isArray(p.reactions_preview)
      ? p.reactions_preview
      : [];

    const reactorNameFromApi = String(p.reactor_name ?? p.reactorName ?? '').trim();

    const finalMyReaction: ReactionType | undefined =
      myReaction ||
      (currentUser && reactionsArr.length
        ? (reactionsArr.find(
            (r: any) => Number(r.user_id) === safeUserId(currentUser)
          )?.type as ReactionType)
        : undefined);

    const finalReactionCount = likesCount > 0 ? likesCount : reactionsArr.length;

    const [commentCount, setCommentCount] = useState(() => {
      if (typeof p.comments_count === 'number') return p.comments_count;
      if (Array.isArray(p.comments)) return p.comments.length;
      return 0;
    });

    const [shareCount, setShareCount] = useState(() =>
      safeNumber(p.shares ?? p.shares_count, 0)
    );

    const createdAtLabel = formatRelativeTime(p.created_at);
    const postId = getFeedItemId(p);

    const mediaInfo = getMediaTypeInfo(p);
    const mediaList = useMemo(() => getPostMediaList(p), [p]);
    const imageMedia = mediaList.filter((m) => m.kind === 'image');
    const videoMedia = mediaList.filter((m) => m.kind === 'video');

    const formatCount = (count: number): string => {
      if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
      if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
      return count.toString();
    };

    const itemType = getFeedItemType(p);
    const [previewComment, setPreviewComment] = useState<any>(() => {
      if (hideCommentPreview) return null;
      if (Array.isArray(p?.comments) && p.comments.length > 0) {
        return p.comments[0];
      }
      const cached = getCachedComments(itemType, postId);
      if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
        return cached.data[0];
      }
      return null;
    });

    useEffect(() => {
      if (hideCommentPreview) return;
      let isMounted = true;
      if (commentCount > 0 && !previewComment) {
        const cached = getCachedComments(itemType, postId);
        if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
          setPreviewComment(cached.data[0]);
          return;
        }

        const endpoint = getFeedCommentFetchEndpoint(itemType, p, safeUserId(currentUser));
        apiFetch(endpoint)
          .then((data) => {
            if (!isMounted) return;
            const arr = Array.isArray(data) ? data : data?.comments || [];
            if (arr.length > 0) {
              setPreviewComment(arr[0]);
              setCachedComments(itemType, postId, arr);
            }
          })
          .catch(() => {});
      }
      return () => {
        isMounted = false;
      };
    }, [hideCommentPreview, commentCount, previewComment, itemType, postId, p, currentUser]);

    const handleLikePreviewComment = async (c: any) => {
      if (!currentUser) {
        alert('Please login to react to comments.');
        return;
      }
      const optimisticLiked = !c.liked_by_me;
      const optimisticCount = c.liked_by_me
        ? Math.max(0, (c.likes_count || 0) - 1)
        : (c.likes_count || 0) + 1;

      setPreviewComment((prev: any) =>
        prev && prev.id === c.id
          ? { ...prev, liked_by_me: optimisticLiked, likes_count: optimisticCount }
          : prev
      );

      updateCachedComment(itemType, postId, c.id, (old: any) => ({
        ...old,
        liked_by_me: optimisticLiked,
        likes_count: optimisticCount,
      }));

      try {
        const endpoint = getCommentLikeEndpoint(itemType, c.id);
        await apiFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify({ user_id: safeUserId(currentUser) }),
        });
      } catch (err) {
        setPreviewComment((prev: any) =>
          prev && prev.id === c.id
            ? { ...prev, liked_by_me: !optimisticLiked, likes_count: c.likes_count || 0 }
            : prev
        );
        updateCachedComment(itemType, postId, c.id, (old: any) => ({
          ...old,
          liked_by_me: !optimisticLiked,
          likes_count: c.likes_count || 0,
        }));
      }
    };

    const previewAuthor = useMemo(() => {
      if (!previewComment) return null;
      return resolveCommentAuthor(previewComment, users);
    }, [previewComment, users]);

    const emojiList = useMemo(() => {
      if (reactionsArr.length > 0) {
        const em = topReactionEmojis(reactionsArr, 2);
        return em.length ? em : ['👍'];
      }
      return finalReactionCount > 0 ? ['👍'] : [];
    }, [reactionsArr, finalReactionCount]);

    const reactorName = useMemo(() => {
      if (!finalReactionCount) return '';
      if (reactionsArr.length) {
        const name = pickStableReactorName(postId, reactionsArr, users);
        return String(name || '').trim();
      }
      return reactorNameFromApi;
    }, [postId, finalReactionCount, reactionsArr, users, reactorNameFromApi]);

    const reactionText = useMemo(() => {
      if (!finalReactionCount || !reactorName) return '';
      return formatReactionText(finalReactionCount, reactorName);
    }, [finalReactionCount, reactorName]);

    // Inside Post component, after all the useMemo declarations, before the return
    const marketplaceGridData = useMemo(() => {
      if (!isMarketplace) {
        return {
          mediaForGrid: [] as Array<{ url: string; thumb?: string; feed?: string; full?: string; }>,
          galleryUrls: [] as string[],
        };
      }
      
      const variants = getMarketplaceImageVariants(p, productData);
      const hasVariants = variants.length > 0;
      
      const mediaForGrid = hasVariants
        ? variants.map((v) => ({
            url: v.feed || v.thumb || v.full || '',
            thumb: v.thumb || v.feed || v.full || '',
            feed: v.feed || v.full || v.thumb || '',
            full: v.full || v.feed || v.thumb || '',
          }))
        : mpImages.map((url) => ({
            url,
            thumb: url,
            feed: url,
            full: url,
          }));
      
      const galleryUrls = hasVariants
        ? variants.map((v) => v.full || v.feed || v.thumb || '').filter(Boolean)
        : mpImages.filter(Boolean);
      
      return { mediaForGrid, galleryUrls };
    }, [isMarketplace, p, productData, mpImages]);

    useEffect(() => {
      const newCommentCount =
        typeof p.comments_count === 'number'
          ? p.comments_count
          : Array.isArray(p.comments)
          ? p.comments.length
          : 0;
      if (newCommentCount !== commentCount) {
        setCommentCount(newCommentCount);
      }

      const newShareCount = safeNumber(p.shares ?? p.shares_count, 0);
      if (newShareCount !== shareCount) {
        setShareCount(newShareCount);
      }
    }, [p.comments_count, p.comments, p.shares, p.shares_count]);

    const handleShareComplete = (destination: string, data?: any) => {
      const nextShares = safeNumber(data?.shares ?? data?.share_count, NaN);
      if (data?.success && Number.isFinite(nextShares)) {
        setShareCount(nextShares);
        onShare(postId, nextShares);
      }
      setShowShareSheet(false);
    };

    const handleFollowClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (onFollow && a.id) onFollow(safeUserId(a));
    };

    // ✅ UPDATED: Complete handleReactClick with proper group post detection
      
   const handleReactClick = async (type: ReactionType) => {
  if (!currentUser) {
    alert("Please login to react.");
    return;
  }

  onReact?.(p, type);
};
      
      

    const openGallery = (urls: string[], index: number) => {
      setGalleryUrls(urls);
      setGalleryIndex(index);
      setGalleryOpen(true);
    };

    const handleOpenComments = (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (currentUser) {
        onOpenComments(post);
      } else {
        alert('Please login to comment');
      }
    };

    const handleOpenReactionsSheet = () => {
      if (onOpenReactions) {
        onOpenReactions(post);
      } else {
        setShowReactionsSheet(true);
      }
    };

    if (
      !isGroupPost &&
      !isMarketplace &&
      (isVideoPost(p) || (videoMedia.length > 0 && !imageMedia.length) || p.media_type === 'video' || p.type === 'video' || p.type === 'reel' || p.post_type === 'reel' || p.kind === 'reel')
    ) {
      return (
        <article className="w-full relative bg-[#0F172A] border-b-[8px] border-[#050B18]">
          <InstagramVideoCard
            post={p}
            author={a}
            currentUser={currentUser}
            users={users}
            stories={stories}
            autoplay={false}
            onProfileClick={onProfileClick}
            onReact={(postItem, rType) => onReact(post, rType)}
            onShare={(postId, newCount) => {
              setShareCount(newCount);
              onShare(postId, newCount);
            }}
            onVideoClick={() => onVideoClick(post)}
            onDelete={onDelete}
            onEdit={onEdit}
            isFollowing={isFollowing}
            onFollow={onFollow}
            onHashtagClick={onHashtagClick}
          />
        </article>
      );
    }

    return (
      <>
        <article className="w-full relative bg-[#0F172A] border-b-[8px] border-[#050B18]">
          {/* HEADER SECTION - Group Post vs Regular Post */}
            {isGroupPost ? (
              <>
                <GroupPostHeader
                  post={p}
                  group={group}
                  author={a}
                  groups={groups}
                  onOpenGroup={(id) => onOpenGroup?.(id || groupId)}
                  onOpenProfile={(id) => onProfileClick(id)}
                />
                {isSponsored && (
                  <div className="px-3 md:px-4 pb-2 text-[#94A3B8] text-[15px] font-medium">
                    Sponsored
                  </div>
                )}
              </>
            ) : (
              <div className="p-3 md:p-4 flex items-center justify-between">
                <div
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                  onClick={() => onProfileClick(safeUserId(a))}
                >
                  <img
                    src={avatarFrom(a)}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-[#1E293B]"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <h4 className="font-bold text-[#F8FAFC] text-[21px] cursor-pointer hover:underline truncate">
                        {a.name || a.username || 'User'}
                      </h4>
                      {a.is_verified && (
                        <VerifiedBadge size={21} className="shrink-0" />
                      )}
                      {(groupName || group) && (
                        <span className="inline-flex items-center gap-1 text-[#94A3B8] text-[15px] font-normal">
                          <span className="mx-0.5">▶</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenGroup) onOpenGroup(groupId || group?.id || 0);
                            }}
                            className="font-bold text-[#F8FAFC] hover:underline cursor-pointer flex items-center gap-1 text-[21px]"
                          >
                            <span className="truncate">{groupName || group?.name}</span>
                            {(group?.is_verified || (group as any)?.verified) && (
                              <VerifiedBadge size={21} className="shrink-0" />
                            )}
                          </button>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[#94A3B8] text-[15px]">
                      {isSponsored ? (
                        <>
                          <span className="font-semibold text-[#E2E8F0]">Ad</span>
                          <span>•</span>
                          <i className="fas fa-globe-americas text-[14px]" title="Public Ad"></i>
                        </>
                      ) : (
                        <>
                          {!shouldHideDateForSponsored && (
                            <>
                              <span>{createdAtLabel}</span>
                              <span>•</span>
                            </>
                          )}
                          <i className="fas fa-globe-americas text-[14px]"></i>
                        </>
                      )}
                      {p.location && !isSponsored && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[160px]">
                            {String(p.location).split(',')[0]}
                          </span>
                        </>
                      )}
                      {p.feeling && !isSponsored && (
                        <>
                          <span>•</span>
                          <span>feeling {p.feeling}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {onFollow && currentUser && safeUserId(a) !== safeUserId(currentUser) && !isSponsored && (
                  <button
                    onClick={handleFollowClick}
                    disabled={followLoading}
                    className={`px-3 py-1.5 text-[15px] font-bold rounded-lg transition-all duration-200 ml-2 ${
                      isFollowing
                        ? 'bg-[#1E293B] text-[#F8FAFC] hover:bg-[#334155]'
                        : 'bg-[#1877F2] text-white hover:bg-[#166FE5]'
                    } ${followLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {followLoading ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : isFollowing ? (
                      'Following'
                    ) : (
                      'Follow'
                    )}
                  </button>
                )}

                <PostMenu
                  item={{
                    id: postId,
                    user_id: safeUserId(a),
                    type: isMarketplace
                      ? 'product'
                      : isGroupPost
                      ? 'group_post'
                      : 'post',
                    content: p.content,
                    caption: p.caption,
                    group_id: groupId,
                  }}
                  currentUser={currentUser}
                  onShare={(item) => setShowShareSheet(true)}
                />
              </div>
            )}

            {sponsoredHeadline && sponsoredHeadline !== String(p.content || '').trim() && (
              <div className="px-3 md:px-4 pb-1">
                <h3 className="text-[#F8FAFC] font-bold text-[22px]">
                  {sponsoredHeadline}
                </h3>
              </div>
            )}

            {isMarketplace && (
              <div className="px-4 pb-2 flex items-center gap-2 text-[#F8FAFC]">
                <span className="text-[#1877F2] font-bold text-[15px] bg-[#1877F2]/10 px-2 py-1 rounded-full">
                  Marketplace
                </span>
                {loc && (
                  <div className="flex items-center gap-1 text-[#94A3B8]">
                    <i className="fas fa-map-marker-alt text-[14px] text-[#F02849]"></i>
                    <span className="text-[15px]">{loc}</span>
                  </div>
                )}
              </div>
            )}

            {(() => {
              if (!p.content || isMarketplace) return null;
              
              // If post has a link preview, check if content is solely or contains the link
              let textToDisplay = String(p.content);
              if (p.link_preview && p.link_preview.url) {
                const trimmedUrl = p.link_preview.url.trim();
                if (textToDisplay.trim() === trimmedUrl) {
                  // Hide raw naked URL when preview card is displayed, exactly like Facebook
                  return null;
                }
                // Strip raw URL if user wrote a caption along with it
                textToDisplay = textToDisplay.replace(trimmedUrl, '').trim();
                if (!textToDisplay) return null;
              }

              return (
                <div className="px-3 md:px-4 pb-2">
                  <ExpandableRichText
                    text={textToDisplay}
                    users={users}
                    onProfileClick={onProfileClick}
                    onHashtagClick={onHashtagClick}
                    maxWords={14}
                    fontSizePx={23}
                  />
                </div>
              );
            })()}

            {(isMusic || isPodcast) && (
              <div className="mx-3 md:mx-4 mb-3 bg-[#0B1120] border border-[#1E293B] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <img
                    src={
                      (isMusic ? song?.cover_image_url : podcast?.cover_image_url) ||
                      ''
                    }
                    className="w-14 h-14 rounded-xl object-cover bg-[#0B1120]"
                    alt=""
                  />
                  <div className="flex-1 overflow-hidden">
                    <div className="text-white font-bold text-[17px] truncate">
                      {(isMusic ? song?.title : podcast?.title) || 'Untitled'}
                    </div>
                    <div className="text-[#94A3B8] text-[14px] truncate">
                      {isMusic ? song?.artist_name : podcast?.description}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAudio?.(isMusic ? song : podcast);
                    }}
                    className="bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold px-4 py-2 rounded-xl text-[15px]"
                  >
                    Play
                  </button>
                </div>
              </div>
            )}

            {p.link_preview && !mediaInfo.mediaUrl && !isMarketplace && (
              <div
                className="w-full mb-2.5 bg-[#0B1120] border-y border-[#1E293B]/70 overflow-hidden cursor-pointer hover:bg-[#141E33] transition-colors"
                onClick={() =>
                  window.open(p.link_preview.url, '_blank', 'noopener noreferrer')
                }
              >
                {p.link_preview.image && (
                  <div className="w-full h-48 bg-[#1E293B] overflow-hidden">
                    <img
                      src={p.link_preview.image}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="p-4 bg-[#1E293B]">
                  <div className="text-[#94A3B8] text-[13px] uppercase font-bold mb-1">
                    {p.link_preview.domain}
                  </div>
                  <div className="text-[#F8FAFC] font-bold text-[19px] mb-1 line-clamp-2">
                    {p.link_preview.title}
                  </div>
                  <div className="text-[#94A3B8] text-[16px] line-clamp-3">
                    {p.link_preview.description}
                  </div>
                </div>
              </div>
            )}

            {p.background && !mediaInfo.mediaUrl && !isMarketplace && (
              <div
                className="h-[300px] flex items-center justify-center p-8 text-center text-white font-bold text-2xl"
                style={{ background: p.background, backgroundSize: 'cover' }}
              >
                {p.content}
              </div>
            )}
            
            {isMarketplace ? (
              <>
                {marketplaceGridData.mediaForGrid.length > 0 && (
                  <div className="w-full">
                    <div className="w-full bg-black">
                      <MediaGrid
                        media={marketplaceGridData.mediaForGrid}
                        onOpen={(url, index) => {
                          openGallery(marketplaceGridData.galleryUrls, index);
                        }}
                      />
                    </div>
                  </div>
                )}

                {price && (
                  <div className="px-4 py-2 flex items-center justify-between border-t border-[#1E293B] mt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[#F8FAFC] text-[19px] font-bold">
                        {currency}
                      </span>
                      <span className="text-[#F8FAFC] text-[22px] font-bold">
                        {price}
                      </span>
                    </div>

                    <button
                      className="bg-[#1877F2] hover:bg-[#166FE5] text-white px-4 py-1.5 rounded-full font-bold text-[15px] transition-colors shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (productId) onViewProduct?.(productId);
                      }}
                    >
                      View product
                    </button>
                  </div>
                )}

                {shouldShowSponsoredButton && (
                  <div className="px-3 pt-2 pb-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSponsoredClick();
                      }}
                      className="w-full bg-[#1877F2] hover:bg-[#166FE5] active:scale-[0.99] text-white font-semibold py-2 px-4 text-[14.5px] rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      <span>{sponsoredCtaText}</span>
                      <i className="fas fa-chevron-right text-[11px] opacity-80"></i>
                    </button>
                  </div>
                )}

                <div className="px-3 md:px-4 py-2.5 flex items-center justify-between text-[#94A3B8] text-[16px] border-t border-[#1E293B]">
                  <div className="flex items-center gap-2">
                    {finalReactionCount > 0 && (
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReactionsSheet();
                        }}
                      >
                        <div className="flex -space-x-2">
                          {emojiList.slice(0, 2).map((e, i) => (
                            <span
                              key={i}
                              className="w-[24px] h-[24px] rounded-full bg-[#1E293B] border border-[#0B1120] flex items-center justify-center text-[16px]"
                              style={{ zIndex: 10 - i }}
                            >
                              {e}
                            </span>
                          ))}
                        </div>

                        {reactionText && (
                          <span className="text-[17px] text-[#F8FAFC] font-bold">
                            {reactionText}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <span
                      className="hover:underline cursor-pointer text-[#CBD5E1] hover:text-[#F8FAFC] text-[20.5px] font-semibold transition-colors"
                      onClick={() => handleOpenComments()}
                    >
                      {formatCount(commentCount)} Discussions
                    </span>
                    {shareCount > 0 && (
                      <span className="hover:underline text-[16px]">
                        {formatCount(shareCount)} Shares
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-3.5 py-2.5 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <ReactionButton
                      currentUserReactions={finalMyReaction || undefined}
                      reactionCount={finalReactionCount}
                      onReact={handleReactClick}
                      isGuest={!currentUser}
                      postId={productId}
                    />
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-[#F8FAFC] hover:text-[#38BDF8] transition-colors focus:outline-none p-1 rounded-lg hover:bg-[#1E293B]/60"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOpenComments(e);
                      }}
                      aria-label="Discuss & Comments"
                      title="Discuss"
                    >
                      <i className="far fa-comment text-[22px]"></i>
                      {commentCount > 0 && (
                        <span className="text-[14px] font-semibold text-[#F8FAFC]">
                          {formatCount(commentCount)}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-[#F8FAFC] hover:text-[#38BDF8] transition-transform active:scale-110 focus:outline-none p-1 rounded-lg hover:bg-[#1E293B]/60"
                      onClick={() => {
                        if (!currentUser) {
                          alert('Please login to share posts.');
                          return;
                        }
                        setShowShareSheet(true);
                      }}
                      aria-label="Share post"
                      title="Share"
                    >
                      <i className="far fa-paper-plane text-[21px]"></i>
                      {shareCount > 0 && (
                        <span className="text-[14px] font-semibold text-[#F8FAFC]">
                          {formatCount(shareCount)}
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <SavePostButton post={p} />
                    {pushButton && <div className="ml-1">{pushButton}</div>}
                  </div>
                </div>
              </>
            ) : (
              <>   
                {!p.background && imageMedia.length > 0 && (
                  <MediaGrid
                    media={imageMedia.map((m) => ({
                      url: m.feed || m.url,
                      thumb: m.thumb || m.url,
                      feed: m.feed || m.url,
                      full: m.full || m.feed || m.url,
                    }))}
                    onOpen={(url, index) => {
                      const urls = imageMedia.map((m) => m.full || m.feed || m.url);
                      openGallery(urls, index);
                    }}
                  />
                )}

                {!p.background && videoMedia.length > 0 && (
                  <div
                    className="cursor-pointer relative min-h-[320px] max-h-[540px] bg-black rounded-lg overflow-hidden my-2"
                    onClick={() => onVideoClick(post)}
                  >
                    <video
                      src={videoMedia[0].url}
                      className="w-full h-full max-h-[540px] object-contain bg-black"
                      preload="metadata"
                      playsInline
                      muted
                      controls
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
                        <i className="fas fa-play text-white text-xl ml-1 opacity-80"></i>
                      </div>
                    </div>
                  </div>
                )}

                {!p.background && mediaInfo.mediaUrl && mediaInfo.isAudio && onPlayAudioTrack && (
                  <div className="my-3">
                    {(() => {
                      const cover =
                        (p as any).song_cover_image_url ||
                        imageMedia?.[0]?.url ||
                        a.profile_image_url;

                      const titleText = p.content || 'Audio';
                      const artistText =
                        (p as any).song_artist_name || a.name || 'Unknown';

                      return (
                        <div className="rounded-lg overflow-hidden border border-[#1E293B] bg-[#1E293B]">
                          {cover ? (
                            <div className="relative">
                              <img
                                src={cover}
                                alt="Cover"
                                className="w-full h-[260px] md:h-[320px] object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  const img = e.currentTarget as HTMLImageElement;
                                  if (
                                    a.profile_image_url &&
                                    img.src !== a.profile_image_url
                                  ) {
                                    img.src = a.profile_image_url;
                                  }
                                }}
                              />

                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                              <div className="absolute left-3 right-3 bottom-3">
                                <div className="p-3 rounded-lg bg-[#0B1120]/90 border border-[#1E293B] backdrop-blur-sm">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#0B1120] flex-shrink-0">
                                      <img
                                        src={cover}
                                        alt="Mini cover"
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="text-[#F8FAFC] font-bold text-[17px]">
                                        Audio Track
                                      </div>
                                      <div className="text-[#94A3B8] text-[15px] truncate">
                                        {titleText}
                                      </div>
                                      <div className="text-[#94A3B8] text-[14px] truncate">
                                        {artistText}
                                      </div>
                                    </div>

                                    <button
                                      onClick={() =>
                                        onPlayAudioTrack!({
                                          id: postId,
                                          title: titleText,
                                          artist: artistText,
                                          url: mediaInfo.mediaUrl,
                                          duration: 0,
                                          coverImage: cover || a.profile_image_url,
                                        })
                                      }
                                      className="bg-[#1877F2] hover:bg-[#166FE5] text-white px-4 py-2 rounded-lg font-bold text-[15px] transition-colors flex-shrink-0"
                                    >
                                      <i className="fas fa-play mr-1"></i> Play
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-[#1E293B]">
                              <div className="flex items-center gap-3">
                                <i className="fas fa-music text-[#1877F2] text-2xl"></i>
                                <div className="flex-1">
                                  <div className="text-[#F8FAFC] font-bold text-[17px]">
                                    Audio Track
                                  </div>
                                  <div className="text-[#94A3B8] text-[15px]">
                                    {p.content || 'Listen to audio'}
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    onPlayAudioTrack!({
                                      id: postId,
                                      title: titleText,
                                      artist: artistText,
                                      url: mediaInfo.mediaUrl,
                                      duration: 0,
                                      coverImage: a.profile_image_url,
                                    })
                                  }
                                  className="bg-[#1877F2] hover:bg-[#166FE5] text-white px-4 py-2 rounded-lg font-bold text-[15px] transition-colors"
                                >
                                  <i className="fas fa-play mr-1"></i> Play
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {shouldShowSponsoredButton && (
                  <div className="px-3 pt-2 pb-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSponsoredClick();
                      }}
                      className="w-full bg-[#1877F2] hover:bg-[#166FE5] active:scale-[0.99] text-white font-semibold py-2 px-4 text-[14.5px] rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      <span>{sponsoredCtaText}</span>
                      <i className="fas fa-chevron-right text-[11px] opacity-80"></i>
                    </button>
                  </div>
                )}

                <div className="px-3 md:px-4 py-2.5 flex items-center justify-between text-[#94A3B8] text-[16px] border-t border-[#1E293B]">
                  <div className="flex items-center gap-2">
                    {finalReactionCount > 0 && (
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReactionsSheet();
                        }}
                      >
                        <div className="flex -space-x-2">
                          {emojiList.slice(0, 2).map((e, i) => (
                            <span
                              key={i}
                              className="w-[24px] h-[24px] rounded-full bg-[#1E293B] border border-[#0B1120] flex items-center justify-center text-[16px]"
                              style={{ zIndex: 10 - i }}
                            >
                              {e}
                            </span>
                          ))}
                        </div>

                        {reactionText && (
                          <span className="text-[17px] text-[#F8FAFC] font-bold">
                            {reactionText}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <span
                      className="hover:underline cursor-pointer text-[#CBD5E1] hover:text-[#F8FAFC] text-[20.5px] font-semibold transition-colors"
                      onClick={() => handleOpenComments()}
                    >
                      {formatCount(commentCount)} Discussions
                    </span>
                    {shareCount > 0 && (
                      <span className="hover:underline text-[16px]">
                        {formatCount(shareCount)} Shares
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-3.5 py-2.5 border-t border-[#1E293B] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <ReactionButton
                      currentUserReactions={finalMyReaction || undefined}
                      reactionCount={finalReactionCount}
                      onReact={handleReactClick}
                      isGuest={!currentUser}
                    />
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-[#F8FAFC] hover:text-[#38BDF8] transition-colors focus:outline-none p-1 rounded-lg hover:bg-[#1E293B]/60"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOpenComments(e);
                      }}
                      aria-label="Discuss & Comments"
                      title="Discuss"
                    >
                      <i className="far fa-comment text-[22px]"></i>
                      {commentCount > 0 && (
                        <span className="text-[14px] font-semibold text-[#F8FAFC]">
                          {formatCount(commentCount)}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-[#F8FAFC] hover:text-[#38BDF8] transition-transform active:scale-110 focus:outline-none p-1 rounded-lg hover:bg-[#1E293B]/60"
                      onClick={() => {
                        if (!currentUser) {
                          alert('Please login to share posts.');
                          return;
                        }
                        setShowShareSheet(true);
                      }}
                      aria-label="Share post"
                      title="Share"
                    >
                      <i className="far fa-paper-plane text-[21px]"></i>
                      {shareCount > 0 && (
                        <span className="text-[14px] font-semibold text-[#F8FAFC]">
                          {formatCount(shareCount)}
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <SavePostButton post={p} />
                    {pushButton && <div className="ml-1">{pushButton}</div>}
                  </div>
                </div>
              </>
            )}

            {/* Inline Facebook-style single comment preview */}
            {!hideCommentPreview && previewComment && previewAuthor && (
              <div className="px-3.5 pb-3 pt-1 border-t border-[#1E293B]/40">
                <div className="flex items-start gap-2.5">
                  <img
                    src={previewAuthor.image}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => previewAuthor.uid && onProfileClick(previewAuthor.uid)}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="inline-block max-w-full bg-[#162137]/65 hover:bg-[#1E293B]/70 rounded-[18px] px-3.5 py-2 border border-[#1E293B]/60 transition-colors cursor-pointer"
                      onClick={() => handleOpenComments()}
                    >
                      <div
                        className="text-[#F8FAFC] font-bold text-[21px] leading-tight cursor-pointer hover:underline inline-flex items-center gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (previewAuthor.uid) onProfileClick(previewAuthor.uid);
                        }}
                      >
                        <span className="truncate">{previewAuthor.name}</span>
                        {(previewComment.is_verified || previewAuthor.user?.is_verified) && (
                          <VerifiedBadge size={21} className="shrink-0" />
                        )}
                      </div>
                      <div className="text-[#CBD5E1] text-[20.5px] leading-[1.38] font-normal whitespace-pre-wrap break-words mt-0.5">
                        {previewComment.text}
                      </div>
                      {previewComment.image_url && (
                        <div className="mt-1.5 rounded-lg overflow-hidden max-w-[200px]">
                          <img
                            src={previewComment.image_url}
                            alt=""
                            className="object-cover rounded-lg max-h-[140px]"
                          />
                        </div>
                      )}
                    </div>
                    <div className="mt-1 ml-3 flex items-center gap-3 text-[12px]">
                      <span className="text-[#B0B3B8] font-normal">
                        {formatRelativeTime(previewComment.created_at || previewComment.createdAt || previewComment.timestamp)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleLikePreviewComment(previewComment)}
                        className={`font-bold hover:underline transition-colors inline-flex items-center gap-1 ${
                          previewComment.liked_by_me
                            ? 'text-[#F43F5E]'
                            : 'text-[#B0B3B8] hover:text-[#E4E6EB]'
                        }`}
                      >
                        <span className="text-[13px]">{previewComment.liked_by_me ? '❤️' : '🤍'}</span>
                        <span>{previewComment.liked_by_me ? 'Liked' : 'Like'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenComments()}
                        className="font-bold text-[#B0B3B8] hover:text-[#E4E6EB] hover:underline transition-colors"
                      >
                        Reply
                      </button>
                      {previewComment.likes_count > 0 && (
                        <span className="inline-flex items-center gap-1 bg-[#F43F5E]/15 text-[#F43F5E] px-1.5 py-0.5 rounded-full text-[11px] font-bold">
                          <span className="text-[10px]">❤️</span>
                          <span>{formatCount(previewComment.likes_count)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
        </article>

        <ShareBottomSheet
          isOpen={showShareSheet}
          onClose={() => setShowShareSheet(false)}
          post={{
            ...p,
            source: isMarketplace ? 'product' : isGroupPost ? 'group_post' : 'post',
            item_type: isMarketplace ? 'product' : isGroupPost ? 'group_post' : 'post',
            product_id: productId,
            group_id: groupId,
          }}
          currentUser={currentUser}
          users={users}
          groups={groups}
          brands={brands}
          chats={chats}
          onShareComplete={handleShareComplete}
        />

        <ReactionsSheet
          isOpen={showReactionsSheet}
          onClose={() => setShowReactionsSheet(false)}
          post={post}
          onProfileClick={onProfileClick}
          onOpenComments={onOpenComments}
        />

        <GalleryViewer
          isOpen={galleryOpen}
          urls={galleryUrls}
          startIndex={galleryIndex}
          onClose={() => setGalleryOpen(false)}
          post={post}
          currentUser={currentUser}
          reactionCount={finalReactionCount}
          commentCount={commentCount}
          shareCount={shareCount}
          myReaction={finalMyReaction}
          onReact={(post, type) => onReact(post, type)}
          onOpenComments={() => handleOpenComments()}
          onShare={() => setShowShareSheet(true)}
          onOpenReactions={handleOpenReactionsSheet}
        />
      </>
    );
  },
  postPropsEqual
);

                

/**
 * =========================
 * ✅ CREATE POST CARD
 * =========================
 */
export const CreatePost: React.FC<{
  currentUser: User;
  onProfileClick: (id: number) => void;
  onClick: () => void;
  onPhotoClick: () => void;
  onVideoClick: () => void;
  onCreateEventClick: () => void;
}> = ({
  currentUser,
  onProfileClick,
  onClick,
  onPhotoClick,
  onVideoClick,
  onCreateEventClick,
}) => (
  <div className="w-full bg-[#0F172A] border-b-[8px] border-[#050B18] p-3 sm:p-4">
    <div className="flex items-center gap-2.5 mb-2.5">
      <img
        src={avatarFrom(currentUser)}
        alt=""
        className="w-10 h-10 rounded-full object-cover cursor-pointer border border-[#1E293B]"
        onClick={() => onProfileClick(safeUserId(currentUser))}
      />

      <div
        className="flex-1 bg-[#1E293B]/60 hover:bg-[#1E293B] border border-[#334155]/40 rounded-full px-4 py-2 cursor-pointer flex items-center transition-all group"
        onClick={onClick}
      >
        <span className="text-[#94A3B8] group-hover:text-[#F8FAFC] text-[18px] truncate transition-colors">
          What's on your mind,{' '}
          {String((currentUser as any).name || '').split(' ')[0] || 'there'}?
        </span>
      </div>

      <button
        type="button"
        onClick={onPhotoClick}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[#1E293B] text-[#10B981] transition-colors"
      >
        <i className="fas fa-image text-[18px]"></i>
        <span className="text-[14px] font-semibold text-[#CBD5E1] hidden xs:inline">Photo</span>
      </button>
    </div>

    <div className="border-t border-[#1E293B]/60 pt-2 flex items-center justify-between gap-1">
      {/* Live Video */}
      <button
        type="button"
        className="flex items-center justify-center flex-1 gap-2 py-2 px-1 hover:bg-[#1E293B] rounded-xl cursor-pointer transition-colors focus:outline-none"
        onClick={onClick}
      >
        <i className="fas fa-video text-[#1877F2] text-[18px] sm:text-[20px]"></i>
        <span className="text-[#94A3B8] hover:text-[#F8FAFC] font-semibold text-[13px] sm:text-[14px] hidden sm:block transition-colors">
          Live
        </span>
      </button>

      {/* Photo */}
      <button
        type="button"
        className="flex items-center justify-center flex-1 gap-2 py-2 px-1 hover:bg-[#1E293B] rounded-xl cursor-pointer transition-colors focus:outline-none"
        onClick={onPhotoClick}
      >
        <i className="fas fa-image text-[#10B981] text-[18px] sm:text-[20px]"></i>
        <span className="text-[#94A3B8] hover:text-[#F8FAFC] font-semibold text-[13px] sm:text-[14px] hidden sm:block transition-colors">
          Photo
        </span>
      </button>

      {/* Reel Video */}
      <button
        type="button"
        className="flex items-center justify-center flex-1 gap-2 py-2 px-1 hover:bg-[#1E293B] rounded-xl cursor-pointer transition-colors focus:outline-none"
        onClick={onVideoClick}
      >
        <i className="fas fa-camera text-[#F43F5E] text-[18px] sm:text-[20px]"></i>
        <span className="text-[#94A3B8] hover:text-[#F8FAFC] font-semibold text-[13px] sm:text-[14px] hidden sm:block transition-colors">
          Video
        </span>
      </button>

      {/* Create Event */}
      <button
        type="button"
        className="flex items-center justify-center flex-1 gap-2 py-2 px-1 hover:bg-[#1E293B] rounded-xl cursor-pointer transition-colors focus:outline-none"
        onClick={onCreateEventClick}
      >
        <i className="fas fa-calendar-alt text-[#F59E0B] text-[18px] sm:text-[20px]"></i>
        <span className="text-[#94A3B8] hover:text-[#F8FAFC] font-semibold text-[13px] sm:text-[14px] hidden sm:block transition-colors">
          Event
        </span>
      </button>
    </div>
  </div>
);
  
/**
 * =========================
 * ✅ CREATE POST MODAL (with image compression support)
 * =========================
 */

/**
 * =========================
 * ✅ CREATE POST MODAL (with image compression + native Flutter upload support)
 * =========================
 */
export const CreatePostModal = memo(
  ({
    currentUser,
    users,
    onClose,
    onCreatePost,
    onCreateEventClick,
    onPhotoClick,
    onVideoClick,
    initialMedia,
  }: {
    currentUser: User;
    users: User[];
    onClose: () => void;
    onCreatePost: (
      text: string,
      files: File[],
      meta?: {
        type?: 'text' | 'image' | 'video';
        visibility?: string;
        location?: string;
        feeling?: string;
        taggedUsers?: number[];
        background?: string;
        linkPreview?: LinkPreview | null;
        // ✅ Native Flutter upload fields
        nativeMediaMeta?: any[];
        nativeMediaUrls?: string[];
        nativeMediaTypes?: string[];
      }
    ) => void;
    onCreateEventClick?: () => void;
    onPhotoClick?: () => void;
    onVideoClick?: () => void;
    initialMedia?: {
      files?: File[];
      previews?: string[];
      mediaUrls?: string[];
      mediaType?: 'image' | 'video' | 'mixed';
      items?: any[];
      initialText?: string;
    } | null;
  }) => {
    const isVideoUrlInternal = (u?: string | null) => {
      if (!u || typeof u !== 'string') return false;
      return /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?.*)?$/i.test(u) || u.includes('/video/');
    };

    const [view, setView] = useState<'main' | 'tag' | 'feeling' | 'location'>('main');
    const [text, setText] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [type, setType] = useState<'text' | 'image' | 'video'>('text');
    const [visibility] = useState<'Public' | 'Friends'>('Public');
    const [activeBackground, setActiveBackground] = useState('');
    const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
    const [isFetchingPreview, setIsFetchingPreview] = useState(false);
    const [taggedUsers, setTaggedUsers] = useState<number[]>([]);
    const [feeling, setFeeling] = useState('');
    const [location, setLocation] = useState('');
    const [locQuery, setLocQuery] = useState('');
    const [locResults, setLocResults] = useState<any[]>([]);
    const [locLoading, setLocLoading] = useState(false);
    const searchTimeout = useRef<any>(null);
    const previewTimeout = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    // ✅ Native upload states
    const [mediaMeta, setMediaMeta] = useState<any[]>([]);
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const [mediaTypes, setMediaTypes] = useState<string[]>([]);

    // ✅ Synchronize incoming initial media (e.g. from NativeMediaGalleryModal)
    useEffect(() => {
      if (initialMedia) {
        if (initialMedia.initialText) {
          setText(initialMedia.initialText);
        }
        if (initialMedia.files && initialMedia.files.length > 0) {
          setFiles(initialMedia.files);
        }
        const incomingUrls = initialMedia.previews || initialMedia.mediaUrls || [];
        if (incomingUrls.length > 0) {
          setPreviews(incomingUrls);
          setMediaUrls(incomingUrls);
        }
        if (initialMedia.mediaType) {
          setType(initialMedia.mediaType === 'video' ? 'video' : 'image');
        } else if (incomingUrls.some((u) => isVideoUrlInternal(u))) {
          setType('video');
        }
        setActiveBackground('');
        setLinkPreview(null);
        setView('main');
      }
    }, [initialMedia]);

    // ==================== NATIVE APP DETECTION ====================
    const isUneraNativeApp = (): boolean => {
      return Boolean(
        (window as any).UneraNative || 
        (window as any).UNERA_IS_NATIVE_APP
      );
    };

    // ✅ Listen for native upload results
    useEffect(() => {
      const handleNativeUpload = (event: any) => {
        const media = event.detail;
        console.log("📱 Native upload received:", media);
        
        if (!media || !media.feed) {
          console.error("Invalid native upload data:", media);
          return;
        }
        
        // Add preview
        setPreviews(prev => [...prev, media.thumb || media.feed]);
        setType(media.type === 'video' ? 'video' : 'image');
        
        // Store native media metadata
        setMediaMeta(prev => [
          ...prev,
          {
            thumb: media.thumb || media.feed,
            feed: media.feed,
            full: media.full || media.feed,
            type: media.type || 'image',
          }
        ]);
        
        setMediaUrls(prev => [...prev, media.feed || media.full || media.url]);
        setMediaTypes(prev => [...prev, media.type || 'image']);
        
        // Close any open pickers
        setView('main');
      };

      window.addEventListener("uneraNativeUpload", handleNativeUpload);
      return () => {
        window.removeEventListener("uneraNativeUpload", handleNativeUpload);
      };
    }, []);

    // ✅ Debug native bridge
    useEffect(() => {
      console.log("🔍 Checking native bridge:", {
        isNativeApp: isUneraNativeApp(),
        hasUneraNative: !!(window as any).UneraNative,
        hasPostMessage: !!(window as any).UneraNative?.postMessage,
      });
    }, []);

    useEffect(() => {
      if (previewTimeout.current) {
        clearTimeout(previewTimeout.current);
      }

      if (files.length > 0 || activeBackground || mediaMeta.length > 0) {
        setLinkPreview(null);
        return;
      }

      previewTimeout.current = setTimeout(async () => {
        setIsFetchingPreview(true);
        try {
          const preview = await getLinkPreview(text);
          setLinkPreview(preview);
        } catch (error) {
          console.debug('Failed to fetch link preview');
          setLinkPreview(null);
        } finally {
          setIsFetchingPreview(false);
        }
      }, 800);

      return () => {
        if (previewTimeout.current) {
          clearTimeout(previewTimeout.current);
        }
      };
    }, [text, files, activeBackground, mediaMeta]);

    useEffect(() => {
      return () => {
        previews.forEach((p) => URL.revokeObjectURL(p));
      };
    }, [previews]);

    // ✅ Photo picker - directly opens device/phone gallery
    const handleNativePhotoClick = () => {
      fileInputRef.current?.click();
    };

    // ✅ Video picker - directly opens device/phone video gallery
    const handleNativeVideoClick = () => {
      videoInputRef.current?.click();
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = Array.from<File>(e.target.files || []);
      if (list.length === 0) return;
      const v = list.find((f) => f.type.startsWith('video/')) || list[0];
      if (v) {
        setFiles([v]);
        setPreviews([URL.createObjectURL(v)]);
        setType('video');
        setActiveBackground('');
        setLinkPreview(null);
        setView('main');
      }
      if (e.target) {
        e.target.value = '';
      }
    };

    // ✅ Camera - works in app and web
    const handleNativeCameraClick = () => {
      fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = Array.from<File>(e.target.files || []);
      if (list.length === 0) return;

      // Use file picker uniformly in app and web
      const images = list.filter((f) => f.type.startsWith('image/'));
      const videos = list.filter((f) => f.type.startsWith('video/'));

      if (videos.length > 0) {
        const v = videos[0];
        setFiles([v]);
        setPreviews([URL.createObjectURL(v)]);
        setType('video');
      } else {
        setFiles(images.slice(0, 9));
        setPreviews(images.slice(0, 9).map((f) => URL.createObjectURL(f)));
        setType('image');
      }

      setActiveBackground('');
      setLinkPreview(null);
      setView('main');

      if (e.target) {
        e.target.value = '';
      }
    };

    const handleLocationSearch = async (q: string) => {
      if (q.trim().length < 3) {
        setLocResults([]);
        return;
      }
      setLocLoading(true);
      try {
        const data = await apiFetch(`/api/locations/search?q=${encodeURIComponent(q)}`);
        setLocResults(Array.isArray(data) ? data : []);
      } catch {
        setLocResults([]);
      } finally {
        setLocLoading(false);
      }
    };

    const onLocQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocQuery(val);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => handleLocationSearch(val), 450);
    };

    const canPost =
      !!text.trim() ||
      files.length > 0 ||
      previews.length > 0 ||
      !!activeBackground ||
      mediaMeta.length > 0 ||
      mediaUrls.length > 0;

    // ✅ Updated submit with native media support
    const submit = () => {
      if (!canPost) return;

      const hasNativeMedia = mediaMeta.length > 0;
      const hasUrlsOnly = previews.length > 0 && files.length === 0;
      const computedType =
        type === 'video' || previews.some((p) => isVideoUrlInternal(p))
          ? 'video'
          : previews.length > 0
          ? 'image'
          : 'text';

      onCreatePost(text, files, {
        type: hasNativeMedia
          ? mediaMeta[0]?.type === 'video'
            ? 'video'
            : 'image'
          : files.length
          ? type
          : computedType,
        visibility,
        location: location || undefined,
        feeling: feeling || undefined,
        taggedUsers: taggedUsers.length ? taggedUsers : undefined,
        background: activeBackground || undefined,
        linkPreview: linkPreview || null,
        // ✅ Pass native uploaded URLs to App.tsx
        nativeMediaMeta: hasNativeMedia ? mediaMeta : undefined,
        nativeMediaUrls: hasNativeMedia
          ? mediaUrls
          : hasUrlsOnly
          ? previews
          : undefined,
        nativeMediaTypes: hasNativeMedia
          ? mediaTypes
          : hasUrlsOnly
          ? previews.map((p) => (isVideoUrlInternal(p) ? 'video' : 'image'))
          : undefined,
      });

      onClose();
    };

    const OptionsItem = ({
      icon,
      color,
      label,
      onClick,
    }: {
      icon: string;
      color: string;
      label: string;
      onClick: () => void;
    }) => (
      <div
        className="flex items-center gap-3 p-3 hover:bg-[#1E293B] active:bg-[#1E293B] cursor-pointer transition-colors"
        onClick={onClick}
      >
        <i className={`${icon} text-[26px] w-8 text-center`} style={{ color }}></i>
        <span className="text-[#F8FAFC] text-[19px] font-bold">{label}</span>
      </div>
    );

    if (view === 'tag') {
      return (
        <div className="fixed inset-0 z-[200] bg-[#050B18] flex flex-col animate-slide-up font-sans">
          <div className="flex items-center p-4 border-b border-[#1E293B] gap-4">
            <i
              className="fas fa-arrow-left text-[#F8FAFC] text-xl cursor-pointer"
              onClick={() => setView('main')}
            ></i>
            <h3 className="text-[#F8FAFC] text-[21px] font-bold">Tag People</h3>
            <button
              onClick={() => setView('main')}
              className="ml-auto text-[#1877F2] font-bold text-[17px]"
            >
              Done
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {users
              .filter((u: any) => safeUserId(u) !== safeUserId(currentUser))
              .map((u: any) => (
                <div
                  key={safeUserId(u)}
                  className="flex items-center justify-between p-2 hover:bg-[#1E293B] rounded-lg cursor-pointer"
                  onClick={() =>
                    setTaggedUsers((prev) =>
                      prev.includes(safeUserId(u))
                        ? prev.filter((uid) => uid !== safeUserId(u))
                        : [...prev, safeUserId(u)]
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarFrom(u)}
                      className="w-10 h-10 rounded-full object-cover"
                      alt=""
                    />
                    <span className="text-[#F8FAFC] font-bold text-[17px]">
                      {u.name || u.username || 'User'}
                    </span>
                  </div>
                  {taggedUsers.includes(safeUserId(u)) && (
                    <i className="fas fa-check-circle text-[#1877F2] text-xl"></i>
                  )}
                </div>
              ))}
          </div>
        </div>
      );
    }

    if (view === 'feeling') {
      return (
        <div className="fixed inset-0 z-[200] bg-[#050B18] flex flex-col animate-slide-up font-sans">
          <div className="flex items-center p-4 border-b border-[#1E293B] gap-4">
            <i
              className="fas fa-arrow-left text-[#F8FAFC] text-xl cursor-pointer"
              onClick={() => setView('main')}
            ></i>
            <h3 className="text-[#F8FAFC] text-[21px] font-bold">How are you feeling?</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2">
            {FEELINGS.map((f) => (
              <div
                key={f}
                className="p-3 bg-[#0B1120] rounded-lg text-center cursor-pointer hover:bg-[#1E293B] text-[#F8FAFC] text-[17px] border border-[#1E293B]"
                onClick={() => {
                  setFeeling(f);
                  setView('main');
                }}
              >
                {f}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (view === 'location') {
      return (
        <div className="fixed inset-0 z-[200] bg-[#050B18] flex flex-col animate-slide-up font-sans">
          <div className="flex items-center p-4 border-b border-[#1E293B] gap-4">
            <i
              className="fas fa-arrow-left text-[#F8FAFC] text-xl cursor-pointer"
              onClick={() => setView('main')}
            ></i>
            <h3 className="text-[#F8FAFC] text-[21px] font-bold">Search Location</h3>
          </div>

          <div className="p-4 flex-1 flex flex-col overflow-hidden">
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Where are you?"
                className="w-full bg-[#1E293B] rounded-xl p-4 pl-12 text-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#1877F2] transition-all text-[17px]"
                autoFocus
                value={locQuery}
                onChange={onLocQueryChange}
              />
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]"></i>
              {locLoading && (
                <i className="fas fa-spinner fa-spin absolute right-4 top-1/2 -translate-y-1/2 text-[#1877F2]"></i>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {locResults.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {locResults.map((loc, i) => {
                    const display =
                      loc.display_name ||
                      loc.name ||
                      loc.label ||
                      `${loc.city || ''}${loc.country ? `, ${loc.country}` : ''}`.trim();

                    const title = (display || '').split(',')[0] || 'Location';

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-4 hover:bg-[#1E293B] rounded-xl cursor-pointer border border-[#1E293B] transition-colors group"
                        onClick={() => {
                          setLocation(display);
                          setView('main');
                        }}
                      >
                        <div className="w-12 h-12 bg-[#1E293B] rounded-xl flex items-center justify-center group-hover:bg-[#1877F2] transition-colors">
                          <i className="fas fa-location-dot text-[#F8FAFC]"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[#F8FAFC] font-bold block truncate text-[17px]">
                            {title}
                          </span>
                          <span className="text-[#94A3B8] text-[14px] block truncate">
                            {display}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : locQuery.length >= 3 && !locLoading ? (
                <div className="text-center py-10">
                  <i className="fas fa-map-marked-alt text-4xl text-[#1E293B] mb-4"></i>
                  <p className="text-[#94A3B8] text-[17px]">No matching locations found.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[14px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2 px-1">
                    Nearby Suggestions
                  </p>
                  {LOCATIONS_DATA.slice(0, 6).map((loc) => (
                    <div
                      key={loc.name}
                      className="flex items-center gap-4 p-3 hover:bg-[#1E293B] rounded-xl cursor-pointer transition-colors"
                      onClick={() => {
                        setLocation(loc.name);
                        setView('main');
                      }}
                    >
                      <div className="w-10 h-10 bg-[#1E293B] rounded-full flex items-center justify-center text-xl">
                        {loc.flag}
                      </div>
                      <span className="text-[#F8FAFC] font-bold text-[17px]">{loc.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[200] bg-[#050B18] flex flex-col animate-slide-up font-sans">
        <div className="flex items-center justify-between p-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-4">
            <i
              className="fas fa-arrow-left text-[#F8FAFC] text-xl cursor-pointer"
              onClick={onClose}
            ></i>
            <h3 className="text-[#F8FAFC] text-[22px] font-bold">Create Post</h3>
          </div>
          <button
            onClick={submit}
            disabled={!canPost}
            className="text-[#F8FAFC] font-bold text-[19px] disabled:text-[#94A3B8]"
          >
            POST
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={avatarFrom(currentUser)}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <div className="flex items-center gap-1 flex-wrap">
                  <h4 className="font-bold text-[#F8FAFC] text-[19px]">
                    {(currentUser as any).name || (currentUser as any).username || 'User'}
                  </h4>
                  {feeling && (
                    <span className="text-[#F8FAFC] text-[17px]"> is feeling {feeling}</span>
                  )}
                  {location && (
                    <span className="text-[#F8FAFC] text-[17px]">
                      {' '}
                      in {location.split(',')[0]}
                    </span>
                  )}
                  {taggedUsers.length > 0 && (
                    <span className="text-[#F8FAFC] text-[17px]">
                      {' '}
                      with {taggedUsers.length} others
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <div className="bg-[#1E293B] rounded-md px-2 py-1 inline-flex items-center gap-1 text-[15px] font-bold text-[#F8FAFC] border border-[#1E293B]">
                    <i className="fas fa-globe-americas text-[14px]"></i>
                    <span>{visibility}</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`relative min-h-[150px] mb-4 transition-all ${
                activeBackground
                  ? 'flex items-center justify-center p-8 rounded-lg text-center min-h-[300px]'
                  : ''
              }`}
              style={{ background: activeBackground, backgroundSize: 'cover' }}
            >
              <textarea
                className={`w-full bg-transparent outline-none text-[#F8FAFC] placeholder-[#94A3B8] resize-none ${
                  activeBackground
                    ? 'text-center font-bold text-3xl drop-shadow-md placeholder-white/70'
                    : 'text-[26px]'
                }`}
                placeholder="What's on your mind?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={activeBackground ? 4 : 5}
              />
            </div>

            {isFetchingPreview && (
              <div className="mb-4 p-4 bg-[#0B1120] border border-[#1E293B] rounded-lg flex items-center justify-center">
                <i className="fas fa-spinner fa-spin text-[#1877F2] mr-2"></i>
                <span className="text-[#94A3B8] text-[17px]">Loading link preview...</span>
              </div>
            )}

            {linkPreview && files.length === 0 && !activeBackground && mediaMeta.length === 0 && (
              <div
                className="mb-4 bg-[#0B1120] border border-[#1E293B] rounded-lg overflow-hidden cursor-pointer hover:bg-[#1E293B] transition-colors"
                onClick={() =>
                  window.open(linkPreview.url, '_blank', 'noopener noreferrer')
                }
              >
                {linkPreview.image && (
                  <img
                    src={linkPreview.image}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-3 bg-[#1E293B]">
                  <div className="text-[#94A3B8] text-[13px] uppercase font-bold mb-1">
                    {linkPreview.domain}
                  </div>
                  <div className="text-[#F8FAFC] font-bold text-[19px] mb-1 line-clamp-1">
                    {linkPreview.title}
                  </div>
                  <div className="text-[#94A3B8] text-[16px] line-clamp-2">
                    {linkPreview.description}
                  </div>
                </div>
              </div>
            )}

            {/* Native Upload Preview */}
            {mediaMeta.length > 0 && (
              <div className="relative rounded-lg overflow-hidden border border-[#1E293B] mb-4">
                <div
                  onClick={() => {
                    setMediaMeta([]);
                    setMediaUrls([]);
                    setMediaTypes([]);
                    setPreviews([]);
                    setType('text');
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center cursor-pointer hover:bg-black/80 z-10"
                >
                  <i className="fas fa-times text-white"></i>
                </div>

                {mediaMeta[0]?.type === 'video' ? (
                  <video
                    src={mediaUrls[0]}
                    controls
                    className="w-full h-auto max-h-[400px] bg-black"
                  />
                ) : (
                  <div
                    className={`grid ${
                      mediaMeta.length === 1 ? 'grid-cols-1' : 'grid-cols-3'
                    } gap-1 bg-black`}
                  >
                    {mediaMeta.slice(0, 9).map((item, i) => (
                      <img
                        key={i}
                        src={item.feed || item.thumb}
                        className={`${
                          mediaMeta.length === 1
                            ? 'w-full h-auto max-h-[400px] object-contain'
                            : 'w-full h-28 object-cover'
                        }`}
                        alt=""
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {previews.length > 0 && mediaMeta.length === 0 && (
              <div className="relative rounded-lg overflow-hidden border border-[#1E293B] mb-4 bg-black">
                <div
                  onClick={() => {
                    setFiles([]);
                    setPreviews([]);
                    setMediaUrls([]);
                    setType('text');
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center cursor-pointer hover:bg-black/80 z-10"
                >
                  <i className="fas fa-times text-white"></i>
                </div>

                {previews.length === 1 && (type === 'video' || isVideoUrlInternal(previews[0])) ? (
                  <video
                    src={previews[0]}
                    controls
                    playsInline
                    className="w-full h-auto max-h-[400px] bg-black"
                  />
                ) : previews.length === 1 ? (
                  <img
                    src={previews[0]}
                    className="w-full h-auto max-h-[400px] object-contain mx-auto"
                    alt=""
                  />
                ) : (
                  <div
                    className={`grid ${
                      previews.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                    } gap-1 bg-black p-1`}
                  >
                    {previews.slice(0, 9).map((src, i) => {
                      const isVid = isVideoUrlInternal(src);
                      return (
                        <div
                          key={i}
                          className="relative aspect-square rounded overflow-hidden bg-[#0F172A]"
                        >
                          {isVid ? (
                            <video
                              src={src}
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={src}
                              className="w-full h-full object-cover"
                              alt=""
                            />
                          )}
                          {/* Order badge 1, 2, 3... */}
                          <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-[#1877F2] text-white font-bold text-[10px] flex items-center justify-center shadow">
                            {i + 1}
                          </div>
                          {isVid && (
                            <div className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1 font-semibold">
                              <i className="fas fa-video text-[8px] text-[#38BDF8]"></i>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {previews.length === 0 && mediaMeta.length === 0 && (
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                <div
                  className={`w-8 h-8 rounded-lg cursor-pointer border-2 bg-[#1E293B] flex items-center justify-center flex-shrink-0 ${
                    !activeBackground ? 'border-white' : 'border-[#1E293B]'
                  }`}
                  onClick={() => setActiveBackground('')}
                >
                  <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                    <i className="fas fa-font text-black text-xs"></i>
                  </div>
                </div>

                {BACKGROUNDS.filter((b) => b.id !== 'none').map((bg) => (
                  <div
                    key={bg.id}
                    className={`w-8 h-8 rounded-lg cursor-pointer border-2 flex-shrink-0 ${
                      activeBackground === bg.value ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ background: bg.value, backgroundSize: 'cover' }}
                    onClick={() => setActiveBackground(bg.value)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[#1E293B]">
            <OptionsItem
              icon="fas fa-image"
              color="#45BD62"
              label="Photo"
              onClick={handleNativePhotoClick}
            />

            <OptionsItem
              icon="fas fa-camera"
              color="#F3425F"
              label="Video"
              onClick={handleNativeVideoClick}
            />

            <OptionsItem
              icon="fas fa-user-tag"
              color="#1877F2"
              label="Tag people"
              onClick={() => setView('tag')}
            />
            <OptionsItem
              icon="far fa-smile"
              color="#F7B928"
              label="Feeling/activity"
              onClick={() => setView('feeling')}
            />
            <OptionsItem
              icon="fas fa-map-marker-alt"
              color="#F02849"
              label="Check in"
              onClick={() => setView('location')}
            />
            <div
              className="flex items-center gap-3 p-3 hover:bg-[#1E293B] active:bg-[#1E293B] cursor-pointer transition-colors border-t border-[#1E293B] mt-2"
              onClick={() => {
                onClose();
                if (onCreateEventClick) onCreateEventClick();
              }}
            >
              <i
                className="fas fa-calendar-alt text-[26px] w-8 text-center"
                style={{ color: '#F7B928' }}
              ></i>
              <span className="text-[#F8FAFC] text-[19px] font-bold">Create Event</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#1E293B]">
          <button
            onClick={submit}
            disabled={!canPost}
            className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold py-3 rounded-lg transition-colors disabled:bg-[#1E293B] text-[19px] shadow-sm"
          >
            POST
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,video/*"
          multiple
          onChange={handleFileChange}
        />
        <input
          type="file"
          ref={videoInputRef}
          className="hidden"
          accept="video/*"
          onChange={handleVideoChange}
        />
      </div>
    );
  },
  (prev, next) => {
    return prev.currentUser?.id === next.currentUser?.id;
  }
);


// ==================== COMMENTS CACHE ====================
const commentsCache = new Map<number, { data: any[]; timestamp: number; postId: number }>();


/**
 * =========================
 * ✅ COMMENTS SHEET - WITH IMAGE SUPPORT
 * =========================
 */
 
export const CommentsSheet = memo(
({
  post,
  currentUser,
  users,
  onClose,
  onComment,
  onCommentAdded,
  onLikeComment,
  getCommentAuthor,
  onProfileClick,
  onHashtagClick,
  onFollow,
  checkIsFollowing,
  onViewProductFromPost,
  onOpenAudio,
  onReact,
  onShare,
  onVideoClick,
  groups = [],
  brands = [],
  chats = [],
  onOpenGroup,
  onRSVP,
  onEventClick,
  onOpenReactions,
}: {
  post: PostType;
  currentUser: User;
  users: User[];
  onClose: () => void;
  onComment?: (postId: number, text: string, imageFile?: File) => void;
  onCommentAdded?: () => void;
  onLikeComment?: (commentId: number) => void;
  getCommentAuthor?: (id: number) => User | undefined;
  onProfileClick: (id: number) => void;
  onHashtagClick?: (tag: string) => void;
  onFollow?: (id: number) => void;
  checkIsFollowing?: (id: number) => boolean;
  onViewProductFromPost?: (productId: number) => void;
  onOpenAudio?: (item: any) => void;
  onReact: (post: PostType, type: ReactionType) => void;
  onShare: (id: number, newShareCount: number) => void;
  onVideoClick: (post: PostType) => void;
  groups?: Group[];
  brands?: Brand[];
  chats?: any[];
  onOpenGroup?: (groupId: number) => void;
  onRSVP?: (eventId: number, status: 'going' | 'interested' | 'not_going') => Promise<void>;
  onEventClick?: (eventId: number) => void;
  onOpenReactions?: (post: PostType) => void;
}) => {
  const p: any = post as any;
  const postId = getFeedItemId(p);

  const discussionsTopRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Image picker states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const itemType = getFeedItemType(p);
  const [text, setText] = useState('');
  const [comments, setComments] = useState<any[]>(() => {
    const cached = getCachedComments(itemType, postId);
    if (cached?.data?.length) return cached.data;
    const postComments = Array.isArray(p.comments) ? p.comments : [];
    return postComments;
  });
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});

  // Cleanup image preview on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Helper: Get comments endpoint based on item type
  const getCommentEndpoint = () => {
    const viewerId = safeUserId(currentUser);
    const itemType = getFeedItemType(p);

    switch (itemType) {
      case 'event':
        const eventId = p.event_id || p.id;
        return `/api/events/${eventId}/comments?viewerId=${viewerId}`;
      case 'group_post':
        const groupId = p.group_id;
        const groupPostId = p.id;
        return `/api/groups/${groupId}/posts/${groupPostId}/comments?viewerId=${viewerId}`;
      case 'product':
        const productId = p.product_id || p.id;
        return `/api/products/${productId}/reviews?viewerId=${viewerId}`;
      case 'reel':
        const reelId = p.reel_id || p.id;
        return `/api/reels/${reelId}/comments?viewerId=${viewerId}`;
      case 'music':
        const songId = p.song_id2 || p.id;
        return `/api/songs/${songId}/comments?viewerId=${viewerId}`;
      case 'podcast':
        const podcastId = p.podcast_id || p.id;
        return `/api/podcasts/${podcastId}/comments?viewerId=${viewerId}`;
      default:
        return `/api/posts/${p.id}/comments?viewerId=${viewerId}`;
    }
  };

  // Helper: Get add comment endpoint
  const getAddCommentEndpoint = () => {
    const itemType = getFeedItemType(p);

    switch (itemType) {
      case 'event':
        const eventId = p.event_id || p.id;
        return `/api/events/${eventId}/comment`;
      case 'group_post':
        const groupId = p.group_id;
        const groupPostId = p.id;
        return `/api/groups/${groupId}/posts/${groupPostId}/comment`;
      case 'product':
        const productId = p.product_id || p.id;
        return `/api/products/${productId}/review`;
      case 'reel':
        const reelId = p.reel_id || p.id;
        return `/api/reels/${reelId}/comment`;
      case 'music':
        const songId = p.song_id2 || p.id;
        return `/api/songs/${songId}/comment`;
      case 'podcast':
        const podcastId = p.podcast_id || p.id;
        return `/api/podcasts/${podcastId}/comment`;
      default:
        return `/api/posts/${p.id}/comment`;
    }
  };

  // Helper: Get reply endpoint
  const getReplyEndpoint = (commentId: number) => {
    const itemType = getFeedItemType(p);

    switch (itemType) {
      case 'event':
        return `/api/event-comments/${commentId}/reply`;
      case 'group_post':
        return `/api/group-post-comments/${commentId}/reply`;
      case 'product':
        return `/api/product-reviews/${commentId}/reply`;
      case 'reel':
        return `/api/reel-comments/${commentId}/reply`;
      case 'music':
        return `/api/song-comments/${commentId}/reply`;
      case 'podcast':
        return `/api/podcast-comments/${commentId}/reply`;
      default:
        return `/api/comments/${commentId}/reply`;
    }
  };

  // Helper: Get like endpoint
  const getLikeEndpoint = (commentId: number) => {
    const itemType = getFeedItemType(p);

    switch (itemType) {
      case 'event':
        return `/api/event-comments/${commentId}/like`;
      case 'group_post':
        return `/api/group-post-comments/${commentId}/like`;
      case 'product':
        return `/api/product-reviews/${commentId}/like`;
      case 'reel':
        return `/api/reel-comments/${commentId}/like`;
      case 'music':
        return `/api/song-comments/${commentId}/like`;
      case 'podcast':
        return `/api/podcast-comments/${commentId}/like`;
      default:
        return `/api/comments/${commentId}/like`;
    }
  };

  // Helper: Upload image to server
  const uploadCommentImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('user_id', String(safeUserId(currentUser)));

    try {
      const response = await fetch('/api/comments/upload-image', {
        method: 'POST',
        headers: {
          ...authHeaders(),
        },
        body: formData,
      });
      const data = await response.json();
      if (data.success && data.image_url) {
        return data.image_url;
      }
      return null;
    } catch (error) {
      console.error('Failed to upload comment image:', error);
      return null;
    }
  };

  // Scroll to top when post changes
  useEffect(() => {
    const t = setTimeout(() => {
      discussionsTopRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      });
    }, 0);
    return () => clearTimeout(t);
  }, [postId]);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }
    
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Resolve comment author
  const resolveAuthor = (c: any) => {
    const uid = Number(
      c?.user_id ?? c?.userId ?? c?.author_id ?? c?.authorId ?? 0
    );

    const u =
      (Number.isFinite(uid) ? users.find((x: any) => Number(x?.id) === uid) : null) ||
      (getCommentAuthor ? getCommentAuthor(uid) : null) ||
      null;

    const name =
      String(c?.author_name ?? c?.authorName ?? '').trim() ||
      String(u?.name ?? '').trim() ||
      String(u?.username ?? '').trim() ||
      'User';

    const image = avatarFrom({
      profile_image_url: c?.author_image ?? c?.authorImage ?? u?.profile_image_url,
      name,
      username: u?.username ?? c?.author_username ?? c?.username,
    });

    return { uid, name, image };
  };

  // Get reply label for comment
  const getReplyLabel = (comment: any) => {
    const a = resolveAuthor(comment);
    const uid = a.uid;

    const user = users.find((x: any) => Number(x?.id) === uid);
    const username = String(
      comment?.author_username ?? user?.username ?? comment?.username ?? ''
    ).trim();

    const display = username ? `@${username}` : a.name;
    return { ...a, username, display };
  };

  // Format count helper
  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  // Handle like comment
  const handleLikeComment = async (comment: any) => {
    if (!currentUser) return;

    const optimisticLiked = !comment.liked_by_me;
    const optimisticCount = comment.liked_by_me
      ? Math.max(0, (comment.likes_count || 0) - 1)
      : (comment.likes_count || 0) + 1;

    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id
          ? { ...c, liked_by_me: optimisticLiked, likes_count: optimisticCount }
          : c
      )
    );

    if (onLikeComment) {
      onLikeComment(comment.id);
    }
    updateCachedComment(itemType, postId, comment.id, (c) => ({
      ...c,
      liked_by_me: optimisticLiked,
      likes_count: optimisticCount,
    }));

    try {
      const endpoint = getLikeEndpoint(comment.id);
      await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ user_id: safeUserId(currentUser) }),
      });
    } catch (error) {
      console.error('Failed to like comment:', error);
      updateCachedComment(itemType, postId, comment.id, (c) => ({
        ...c,
        liked_by_me: !optimisticLiked,
        likes_count: comment.likes_count || 0,
      }));
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id
            ? { ...c, liked_by_me: !optimisticLiked, likes_count: comment.likes_count || 0 }
            : c
        )
      );
    }
  };

  // Handle follow click
  const handleFollowClick = (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (onFollow && userId && userId !== safeUserId(currentUser)) {
      onFollow(userId);
    }
  };

  // Fetch comments silently (background refresh)
  const fetchCommentsSilently = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const endpoint = getCommentEndpoint();
      const data = await apiFetch(endpoint);
      const arr = Array.isArray(data) ? data : data?.comments || [];

      if (arr.length > 0) {
        setComments(arr);
        setCachedComments(itemType, postId, arr);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      console.debug('Silent comment fetch failed:', error);
    }
  };

  // Initialize comments
  useEffect(() => {
    const initializeComments = async () => {
      const cached = getCachedComments(itemType, postId);
      if (cached && cached.data.length > 0) {
        setComments(cached.data);
      }

      const postComments = Array.isArray(p.comments) ? p.comments : [];
      if (postComments.length > 0 && (!cached || postComments.length > cached.data.length)) {
        setComments(postComments);
        setCachedComments(itemType, postId, postComments);
      }

      // Only fetch if stale (> 5 mins) or no cache
      if (!cached || !cached.isFresh || cached.data.length === 0) {
        fetchCommentsSilently();
      }
    };

    initializeComments();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [postId, p.comments, itemType]);

  // Build comment threads
  const idKey = (v: any) => String(v ?? '').trim();

  // Helper: find root comment ID for any nested reply or replyer
  const findRootCommentId = (c: any, list: any[]): string => {
    if (!c || !c.parent_comment_id) return idKey(c?.id);
    const commentMap = new Map<string, any>();
    list.forEach((item) => commentMap.set(idKey(item.id), item));

    let curr = c;
    const visited = new Set<string>();
    while (curr && curr.parent_comment_id && !visited.has(idKey(curr.id))) {
      visited.add(idKey(curr.id));
      const parent = commentMap.get(idKey(curr.parent_comment_id));
      if (parent) {
        curr = parent;
      } else {
        return idKey(curr.parent_comment_id);
      }
    }
    return idKey(curr?.id);
  };

  const buildThreads = (list: any[]) => {
    const commentMap = new Map<string, any>();
    list.forEach((c) => commentMap.set(idKey(c.id), c));

    const findRootId = (c: any): string => {
      let curr = c;
      const visited = new Set<string>();
      while (curr && curr.parent_comment_id && !visited.has(idKey(curr.id))) {
        visited.add(idKey(curr.id));
        const parent = commentMap.get(idKey(curr.parent_comment_id));
        if (parent) {
          curr = parent;
        } else {
          return idKey(curr.parent_comment_id);
        }
      }
      return idKey(curr?.id);
    };

    const roots: any[] = [];
    const repliesByRoot = new Map<string, any[]>();

    list.forEach((c) => {
      if (!c.parent_comment_id) {
        roots.push(c);
      } else {
        const rootId = findRootId(c);
        if (!repliesByRoot.has(rootId)) {
          repliesByRoot.set(rootId, []);
        }
        repliesByRoot.get(rootId)!.push(c);
      }
    });

    repliesByRoot.forEach((arr) => {
      arr.sort((a, b) => {
        const timeA = new Date(a.created_at || a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.created_at || b.createdAt || b.timestamp || 0).getTime();
        return timeA - timeB;
      });
    });

    return roots.map((root) => ({
      root,
      replies: repliesByRoot.get(idKey(root.id)) || [],
    }));
  };

  const toggleThread = (rootId: any, open: boolean) => {
    const key = String(rootId);
    setExpandedThreads((prev) => ({ ...prev, [key]: open }));
  };

  const threads = useMemo(() => buildThreads(comments), [comments]);

  // Initiate reply to a comment or a replyer
  const handleInitiateReply = (comment: any) => {
    const target = getReplyLabel(comment);
    const rootId = findRootCommentId(comment, comments);
    setReplyTo({
      ...comment,
      _reply_author: target,
      _root_id: rootId,
    });
    if (rootId) {
      toggleThread(rootId, true);
    }
    inputRef.current?.focus();
    setShowEmojiPicker(false);
  };

  // Handle comment submission with image support
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const t = text.trim();
    if (!t && !selectedImage) return;

    setUploadingImage(true);

    let uploadedImageUrl: string | null = null;
    
    // Upload image if present
    if (selectedImage) {
      uploadedImageUrl = await uploadCommentImage(selectedImage);
      if (!uploadedImageUrl && selectedImage) {
        console.error('Failed to upload image');
        setUploadingImage(false);
        alert('Failed to upload image. Please try again.');
        return;
      }
    }

    const replyDisplay = replyTo?._reply_author?.display;
    const prefix = replyDisplay ? `${replyDisplay} ` : '';
    const finalText = replyTo && !t.startsWith(prefix) ? prefix + t : t;
    const rootId = replyTo?._root_id || (replyTo ? findRootCommentId(replyTo, comments) : null);
    const parentCommentId = replyTo?.id || null;

    // Optimistic comment
    const optimisticComment = {
      id: `tmp-${Date.now()}`,
      post_id: postId,
      user_id: safeUserId(currentUser),
      text: finalText,
      image_url: uploadedImageUrl,
      parent_comment_id: parentCommentId,
      created_at: new Date().toISOString(),
      replies_count: 0,
      likes_count: 0,
      liked_by_me: false,
    };

    // Clear form
    setText('');
    setReplyTo(null);
    setShowEmojiPicker(false);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview(null);

    setComments((prev) => {
      const next = [...prev, optimisticComment];
      addCachedComment(itemType, postId, optimisticComment);
      return next;
    });

    if (rootId) {
      toggleThread(rootId, true);
    }

    if (onComment) {
      onComment(postId, finalText, selectedImage || undefined);
    }

    // Actual API call
    try {
      let endpoint = '';
      let body: any = {
        text: finalText,
        user_id: safeUserId(currentUser),
        parent_comment_id: parentCommentId,
      };
      
      if (uploadedImageUrl) {
        body.image_url = uploadedImageUrl;
      }

      if (replyTo) {
        endpoint = getReplyEndpoint(replyTo.id);
      } else {
        endpoint = getAddCommentEndpoint();
      }

      await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (onCommentAdded) {
        onCommentAdded();
      }

      fetchCommentsSilently();
    } catch (err: any) {
      console.error('Failed to post comment:', err);
      alert('Failed to post comment. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Add emoji to input
  const addEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Refresh comments on window focus
  useEffect(() => {
    const handleFocus = () => {
      const cached = getCachedComments(itemType, postId);
      if (!cached || !cached.isFresh) {
        fetchCommentsSilently();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [postId, itemType]);

  // Render single comment (Facebook style)
  const renderOneComment = (comment: any, isReply: boolean = false) => {
    const a = resolveAuthor(comment);
    const isCurrentUserComment = a.uid === safeUserId(currentUser);
    const isFollowing = checkIsFollowing ? checkIsFollowing(a.uid) : false;
    const authorUser = users.find((x: any) => Number(x?.id) === a.uid);

    return (
      <div className={`flex gap-2.5 sm:gap-3 ${isReply ? 'mt-2.5' : ''}`}>
        <img
          src={a.image}
          className={`${
            isReply ? 'w-8 h-8' : 'w-9 h-9'
          } rounded-full object-cover cursor-pointer shrink-0 mt-0.5 hover:opacity-90 transition-opacity`}
          alt=""
          onClick={() => a.uid && onProfileClick(a.uid)}
        />
        <div className="flex-1 min-w-0">
          <div className="inline-block max-w-full sm:max-w-[92%] bg-[#162137]/65 hover:bg-[#1E293B]/70 rounded-[18px] px-3.5 py-2.5 sm:px-4 sm:py-3 border border-[#1E293B]/60 shadow-sm transition-colors">
            <div
              className="text-[#F8FAFC] font-bold text-[21px] leading-tight cursor-pointer hover:underline inline-flex items-center gap-1.5"
              onClick={() => a.uid && onProfileClick(a.uid)}
            >
              <span className="truncate">{a.name}</span>
              {(comment?.is_verified || authorUser?.is_verified) && (
                <VerifiedBadge size={21} className="shrink-0" />
              )}
            </div>
            <div className={`text-[#CBD5E1] ${isReply ? 'text-[19.5px]' : 'text-[20.5px]'} leading-[1.38] font-normal whitespace-pre-wrap break-words mt-1`}>
              <RichText
                text={String(comment.text || '')}
                users={users}
                onProfileClick={onProfileClick}
                onHashtagClick={onHashtagClick}
              />
            </div>
            {comment.image_url && (
              <div className="mt-2 rounded-xl overflow-hidden">
                <img
                  src={comment.image_url}
                  alt="Comment attachment"
                  className="max-w-full max-h-[220px] object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => window.open(comment.image_url, '_blank')}
                />
              </div>
            )}
          </div>
          <div className="mt-1 ml-3 flex items-center gap-3 sm:gap-4 text-[12px]">
            <span className="text-[#B0B3B8] font-normal">
              {formatRelativeTime(comment.created_at || comment.createdAt || comment.timestamp)}
            </span>
            <button
              type="button"
              onClick={() => handleLikeComment(comment)}
              className={`font-bold hover:underline transition-colors inline-flex items-center gap-1 ${
                comment.liked_by_me
                  ? 'text-[#F43F5E]'
                  : 'text-[#B0B3B8] hover:text-[#E4E6EB]'
              }`}
            >
              <span className="text-[13px]">{comment.liked_by_me ? '❤️' : '🤍'}</span>
              <span>{comment.liked_by_me ? 'Liked' : 'Like'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleInitiateReply(comment)}
              className="font-bold text-[#B0B3B8] hover:text-[#E4E6EB] hover:underline transition-colors"
            >
              Reply
            </button>
            {comment.likes_count > 0 && (
              <span className="inline-flex items-center gap-1 bg-[#F43F5E]/15 text-[#F43F5E] px-1.5 py-0.5 rounded-full text-[11px] font-bold">
                <span className="text-[10px]">❤️</span>
                <span>{formatCount(comment.likes_count)}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="comments-sheet-root flex flex-col bg-[#0B1120]">
      {/* Header */}
      <div className="p-4 border-b border-[#1E293B] flex items-center justify-between bg-[#0B1120] sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="w-10 h-10 rounded-full hover:bg-[#1E293B] flex items-center justify-center transition-colors"
            onClick={onClose}
            aria-label="Back"
          >
            <i className="fas fa-arrow-left text-[#E4E6EB] text-xl"></i>
          </button>
          <div className="text-[#E4E6EB] font-bold text-[22px]">Post</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[#CBD5E1] text-[20.5px] font-semibold">
            {formatCount(comments.length)} discussions
          </div>
          <button
            type="button"
            className="text-[#1877F2] font-bold text-[17px] hover:underline"
            onClick={onClose}
          >
            See less
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth bg-[#0B1120]">
        {/* Original Post Card */}
        <div className="border-b border-[#1E293B] bg-[#0B1120]">
          {post && (
            <Post
              hideCommentPreview={true}
              post={post}
              author={
                (post as any).author || {
                  id: (post as any).user_id || (post as any).author_id || 0,
                  name: (post as any).name || (post as any).username || 'User',
                  username: (post as any).username || '',
                  profile_image_url: (post as any).profile_image_url || '',
                }
              }
              currentUser={currentUser}
              users={users}
              onProfileClick={onProfileClick}
              onReact={onReact}
              onShare={onShare}
              onViewImage={() => {}}
              onOpenComments={() => {}}
              onVideoClick={onVideoClick}
              onPlayAudioTrack={onOpenAudio}
              onHashtagClick={onHashtagClick}
              onViewProductFromPost={onViewProductFromPost}
              onOpenGroup={onOpenGroup}
              onOpenAudio={onOpenAudio}
              onRSVP={onRSVP}
              groups={groups}
              brands={brands}
              chats={chats}
              onFollow={onFollow}
              onEventClick={onEventClick}
              onOpenReactions={onOpenReactions}
            />
          )}
        </div>

        {/* Comments Section */}
        <div className="p-4">
          <div ref={discussionsTopRef} />

          {/* Reply To Indicator */}
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 bg-[#0B1120] px-3 py-2 rounded-2xl border border-[#1E293B]">
              <span className="text-xs text-[#94A3B8]">Replying to</span>
              <span className="text-xs text-[#1877F2] font-black">
                {replyTo?._reply_author?.display || replyTo?._reply_author?.name || 'User'}
              </span>
              <button
                onClick={() => setReplyTo(null)}
                className="ml-auto text-[#94A3B8] hover:text-white"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>
          )}

          {/* Image Preview for new comment */}
          {imagePreview && (
            <div className="mb-2 relative inline-block">
              <img
                src={imagePreview}
                className="h-20 rounded-xl border border-white/10 object-cover"
                alt="Preview"
              />
              <button
                type="button"
                onClick={() => {
                  if (imagePreview) URL.revokeObjectURL(imagePreview);
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
              >
                <i className="fas fa-times text-white text-xs" />
              </button>
            </div>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="mb-3 flex flex-wrap gap-2 bg-[#0B1120] border border-[#1E293B] rounded-2xl p-3">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  className="text-2xl leading-none active:scale-90 transition-transform hover:bg-white/10 p-1 rounded-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {comments.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-[#B0B3B8] text-[19px] mb-2">No discussions yet</div>
              <p className="text-[#B0B3B8] text-[15px]">Be the first to start a discussion!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {threads.map(({ root, replies }) => {
                const rootId = String(root.id);
                const isExpanded = !!expandedThreads[rootId];
                const MAX_PREVIEW = 1;
                const hiddenCount = Math.max(0, replies.length - MAX_PREVIEW);
                const visibleReplies = isExpanded ? replies : replies.slice(-MAX_PREVIEW);

                return (
                  <div key={rootId} className="space-y-2">
                    {renderOneComment(root, false)}

                    {!isExpanded && hiddenCount > 0 && (
                      <button
                        type="button"
                        className="ml-11 sm:ml-12 text-[#1877F2] font-semibold text-[13px] sm:text-[14px] hover:underline flex items-center gap-1.5 py-1"
                        onClick={() => toggleThread(rootId, true)}
                      >
                        <i className="fas fa-reply fa-rotate-180 text-[11px]" />
                        <span>
                          View previous {hiddenCount} repl{hiddenCount === 1 ? 'y' : 'ies'}
                        </span>
                      </button>
                    )}

                    {visibleReplies.map((reply) => (
                      <div key={String(reply.id)} className="ml-10 sm:ml-12 relative">
                        <div className="absolute -left-5 sm:-left-6 top-0 bottom-0 w-[2px] bg-[#334155]/60 rounded-full" />
                        {renderOneComment(reply, true)}
                      </div>
                    ))}

                    {isExpanded && replies.length > MAX_PREVIEW && (
                      <button
                        type="button"
                        className="ml-11 sm:ml-12 text-[#B0B3B8] text-[13px] hover:text-[#E4E6EB] hover:underline py-1"
                        onClick={() => toggleThread(rootId, false)}
                      >
                        Hide replies
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Comment Input Footer - solid dark, non-transparent */}
      <div className="p-3 pb-5 border-t border-[#1E293B] bg-[#0B1120] sticky bottom-0">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 bg-[#162137]/65 border border-[#1E293B]/60 px-3 py-2 rounded-2xl">
            <span className="text-xs text-[#B0B3B8]">Replying to</span>
            <span className="text-xs text-[#1877F2] font-black">
              {replyTo?._reply_author?.display || replyTo?._reply_author?.name || 'User'}
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="ml-auto text-[#B0B3B8] hover:text-white"
            >
              <i className="fas fa-times text-xs" />
            </button>
          </div>
        )}

        {imagePreview && (
          <div className="mb-2 relative inline-block">
            <img
              src={imagePreview}
              className="h-20 rounded-xl border border-[#1E293B] object-cover"
              alt=""
            />
            <button
              type="button"
              onClick={() => {
                if (imagePreview) URL.revokeObjectURL(imagePreview);
                setSelectedImage(null);
                setImagePreview(null);
              }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
            >
              <i className="fas fa-times text-white text-xs" />
            </button>
          </div>
        )}

        {showEmojiPicker && (
          <div className="mb-3 flex flex-wrap gap-2 bg-[#0F172A] border border-[#1E293B] rounded-2xl p-3">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="text-2xl leading-none active:scale-90 transition-transform hover:bg-[#1E293B] p-1 rounded-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <form className="flex items-center gap-2" onSubmit={handleSubmit}>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#94A3B8] hover:bg-[#1E293B] active:scale-95"
          >
            <i className="far fa-image text-[25px]" />
          </button>

          <div className="flex-1 flex items-center bg-[#0F172A] border border-[#1E293B] rounded-full px-4 py-2">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent text-[#F8FAFC] outline-none text-[16px] placeholder:text-[#64748B]"
              placeholder={
                replyTo
                  ? `Reply to ${replyTo?._reply_author?.display || replyTo?._reply_author?.name || 'user'}`
                  : `Comment as ${currentUser?.name || 'User'}`
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <button
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:bg-[#1E293B]"
              title="Sticker"
            >
              <i className="far fa-sticky-note text-[21px]" />
            </button>

            <button
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:bg-[#1E293B]"
              title="GIF"
            >
              <span className="text-[12px] font-black border border-[#64748B] text-[#94A3B8] rounded-md px-1 leading-[16px]">
                GIF
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#1E293B] ${
                showEmojiPicker ? 'text-[#1877F2]' : 'text-[#94A3B8]'
              }`}
              title="Emoji"
            >
              <i className="far fa-smile text-[23px]" />
            </button>
          </div>

          <button
            type="submit"
            disabled={(!text.trim() && !selectedImage) || uploadingImage}
            className="w-10 h-10 rounded-full bg-[#1877F2] hover:bg-[#166FE5] disabled:bg-[#1E293B] disabled:text-[#64748B] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(24,119,242,0.35)] active:scale-95 transition-all"
          >
            {uploadingImage ? (
              <i className="fas fa-spinner fa-spin text-[14px]" />
            ) : (
              <i className="fas fa-arrow-up text-[16px]" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
},
(prev, next) => isSameFeedItem(prev.post, next.post) && prev.currentUser?.id === next.currentUser?.id);

          

/**
 * =========================
 * ✅ SUGGESTED PRODUCTS WIDGET
 * =========================
 */
export const SuggestedProductsWidget = memo(
  ({
    products,
    currentUser,
    onViewProduct,
    onSeeAll,
  }: {
    products: Product[];
    currentUser: User;
    onViewProduct: (product: Product) => void;
    onSeeAll: () => void;
  }) => {
    const suggested = (products || [])
      .filter((p: any) => p.seller_id !== safeUserId(currentUser))
      .slice(0, 4);

    if (suggested.length === 0) return null;

    return (
      <div className="w-full">
        <div className="bg-[#0B1120] w-full p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[#F8FAFC] font-bold text-[21px]">Marketplace for you</h3>
            <button
              onClick={onSeeAll}
              className="text-[#1877F2] font-bold text-[17px] hover:bg-[#1E293B] px-2 py-1 rounded transition-colors"
            >
              See all
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {suggested.map((product: any) => {
              const countryData = MARKETPLACE_COUNTRIES.find((c) =>
                String(product.address || '').toLowerCase().includes(c.name.toLowerCase())
              );
              const symbol = countryData ? countryData.symbol : '$';

              return (
                <div
                  key={String(product.id)}
                  className="cursor-pointer group"
                  onClick={() => onViewProduct(product)}
                >
                  <div className="aspect-square rounded-lg overflow-hidden relative mb-1.5 shadow-sm border border-[#1E293B]">
                    <img
                      src={product.images?.[0]}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[13px] font-bold text-white">
                      {symbol}
                      {product.main_price}
                    </div>
                  </div>
                  <h4 className="text-[#F8FAFC] text-[15px] font-bold truncate px-0.5 leading-tight">
                    {product.title}
                  </h4>
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-[10px] bg-[#050B18] border-t border-white/10" />
      </div>
    );
  },
  (prev, next) => {
    return prev.products === next.products && prev.currentUser?.id === next.currentUser?.id;
  }
);

// ==================== EXPORTED HELPERS ====================
export {
  getMediaTypeInfo,
  getMarketplaceImages,
  getMarketplacePriceLine,
  normalizeEventFromFeed,
  topReactionEmojis,
  safeArray,
  safeNumber,
  safeString,
  safePostId,
  safeUserId,
  avatarFrom,
  formatReelCount,
  getReelAuthorName,
  getFeedItemType,
  getFeedItemId,
  getFeedKey,
  isSameFeedItem,
};

/**
 * =========================
 * ✅ FEED PROPS INTERFACE
 * =========================
 */


interface FeedProps {
  // ========== NEW PROPS ==========
  items?: FeedItem[];
  onOpenStory?: (story: Story) => void;
  stories?: any[];
  // ========== END NEW PROPS ==========

  feedItems: any[];

  currentUser: User | null;
  users: User[];

  onProfileClick: (id: number) => void;

  onReact: (post: PostType, type: ReactionType) => void;

  onShare: (id: number, newShareCount: number) => void;

  onOpenComments: (post: PostType) => void;

  onViewImage: (url: string) => void;

  onVideoClick: (post: PostType) => void;

  onPlayAudioTrack?: (track: AudioTrack) => void;

  onHashtagClick?: (tag: string) => void;

  onFollow?: (id: number) => void;

  followLoading?: { [key: number]: boolean };

  checkIsFollowing?: (id: number) => boolean;

  groups?: Group[];

  brands?: Brand[];

  chats?: any[];

  onViewProductFromPost?: (productId: number) => void;

  onRSVPEvent?: (
    eventId: number,
    status: "going" | "interested" | "not_going"
  ) => Promise<void>;

  getPostAuthor?: (post: PostType) => User;

  // =========================
  // Push More button props
  // =========================
  onPushMore?: (postId: number) => void;

  pushedPosts?: Record<number, boolean>;

  // =========================
  // Reel props
  // =========================
  onOpenReel?: (reelId: number | string) => void;

  onOpenReelMenu?: (reel: any) => void;

  // =========================
  // People You May Know props
  // =========================
  peopleYouMayKnow?: any[];

  peopleYouMayKnowInsertIndex1?: number;

  peopleYouMayKnowInsertIndex2?: number;

  onFollowFromPymk?: (id: number) => void;

  pymkLoading?: boolean;

  // =========================
  // Groups You May Join props
  // =========================
  groupsYouMayJoin?: any[];

  groupsYouMayJoinInsertIndex?: number;

  onJoinGroupSuggestion?: (groupId: number) => void;

  gymjLoading?: boolean;

  onOpenGroup?: (groupId: number) => void;

  // =========================
  // Login
  // =========================
  onLoginClick?: () => void;

  // =========================
  // ✅ INFINITE SCROLL
  // =========================
  onLoadMoreFeed?: () => void;

  hasMoreFeed?: boolean;

  feedLoadingMore?: boolean;

  // =========================
  // ✅ GROUP POST REACTIONS
  // =========================
  onToggleGroupPostLike?: (
    postId: number,
    type?: ReactionType
  ) => Promise<{ liked: boolean; likes_count: number } | void>;
}
  
    
/**
 * =========================
 * ✅ MAIN FEED COMPONENT (NO SPONSORED CARD - ALL POSTS GO THROUGH Post COMPONENT)
 * =========================
 */



export const Feed = memo(({
  items,
  feedItems: feedItemsProp,
  onOpenStory,
  stories = [],
  currentUser,
  users,
  onProfileClick,
  onReact,
  onShare,
  onOpenComments,
  onViewImage,
  onVideoClick,
  onPlayAudioTrack,
  onHashtagClick,
  onFollow,
  followLoading = {},
  checkIsFollowing,
  groups = [],
  brands = [],
  chats = [],
  onViewProductFromPost,
  onRSVPEvent,
  getPostAuthor,
  onPushMore,
  pushedPosts = {},
  onOpenReel,
  onOpenReelMenu,
  peopleYouMayKnow = [],
  peopleYouMayKnowInsertIndex1 = -1,
  peopleYouMayKnowInsertIndex2 = -1,
  onFollowFromPymk,
  pymkLoading = false,
  groupsYouMayJoin = [],
  groupsYouMayJoinInsertIndex = -1,
  onJoinGroupSuggestion,
  gymjLoading = false,
  onOpenGroup,
  onLoginClick,

  // ✅ new from App.tsx
  onLoadMoreFeed,
  hasMoreFeed = true,
  feedLoadingMore = false,
}: FeedProps) => {
  const feedMoreRef = useRef<HTMLDivElement | null>(null);

  const safeFeedItems = React.useMemo(() => {
    if (items && items.length > 0) {
      return items;
    }

    if (feedItemsProp && feedItemsProp.length > 0) {
      return feedItemsProp.map((item: any) => ({
        kind: "post" as const,
        data: item,
        created_at: item.created_at,
      }));
    }

    return [];
  }, [items, feedItemsProp]);

  // ✅ Facebook-style pagination: 15 posts initial + silent infinite scroll (no visible loader)
  const [visibleFeedCount, setVisibleFeedCount] = useState(15);
  const isPagingRef = useRef(false);
  const lastDbRequestTimeRef = useRef(0);

  const paginatedFeedItems = React.useMemo(() => {
    return safeFeedItems.slice(0, visibleFeedCount);
  }, [safeFeedItems, visibleFeedCount]);

  const getStableItemKey = useCallback((item: any) => {
    return getFeedKey(item);
  }, []);

  const triggerLoadMore = useCallback(() => {
    // 1. In-memory pagination first: reveal next 15 items locally (zero database requests)
    if (visibleFeedCount < safeFeedItems.length) {
      if (isPagingRef.current) return;
      isPagingRef.current = true;
      setVisibleFeedCount((prev) => Math.min(prev + 15, safeFeedItems.length));
      setTimeout(() => {
        isPagingRef.current = false;
      }, 250);
      return;
    }

    // 2. Fetch from backend only when all local items have been shown
    if (!onLoadMoreFeed) return;
    if (!hasMoreFeed) return;
    if (feedLoadingMore) return;

    const now = Date.now();
    if (now - lastDbRequestTimeRef.current < 2500) {
      // Cooldown to protect database from rapid calls
      return;
    }

    lastDbRequestTimeRef.current = now;
    onLoadMoreFeed();
  }, [visibleFeedCount, safeFeedItems.length, onLoadMoreFeed, hasMoreFeed, feedLoadingMore]);

  useEffect(() => {
    const el = feedMoreRef.current;
    if (!el) return;

    // Use IntersectionObserver with 600px margin for silent, seamless prefetching (no polling timer or scroll flood)
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          triggerLoadMore();
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
  }, [triggerLoadMore]);

  return (
    <div className="w-full flex flex-col">
      {paginatedFeedItems.map((item, index) => {
        if (item.kind === "story") {
          return (
            <FeedStoryCard
              key={`story-${item.data.id}-${index}`}
              story={item.data}
              onOpen={onOpenStory}
            />
          );
        }

        if (item.kind === "reel") {
          const reel = item.data;
          const authorId = Number(reel?.user_id || reel?.userId || 0);
          const authorObj =
            users?.find((u) => Number(u.id) === authorId) ||
            reel?.user || {
              id: authorId,
              name: reel?.author || reel?.author_name || 'Creator',
              username: reel?.username || (reel?.author || 'creator').toLowerCase().replace(/\s+/g, '_'),
              profile_image_url: reel?.avatar || reel?.avatar_url,
              is_verified: Boolean(reel?.verified),
            };

          const reelAsPost: any = {
            id: reel?.id,
            reel_id: reel?.id,
            user_id: authorId,
            content: reel?.caption || reel?.content || '',
            caption: reel?.caption || reel?.content || '',
            video_url: reel?.video_url || reel?.videoUrl || reel?.video || '',
            media_url: reel?.video_url || reel?.videoUrl || reel?.video || '',
            thumbnail_url: reel?.thumbnail_url || reel?.thumbnail || reel?.cover_url || '',
            media_type: 'video',
            type: 'video',
            shares: reel?.shares || 0,
            views: reel?.views || 0,
            likes_count: reel?.likes_count || reel?.likes || 0,
            likesCount: reel?.likes_count || reel?.likes || 0,
            reactions_count: reel?.reactions_count || reel?.likes_count || reel?.likes || 0,
            reactions: reel?.reactions || {},
            comments: reel?.comments || [],
            visibility: 'public',
            created_at: reel?.created_at || item.created_at || new Date().toISOString(),
            user: authorObj,
            author: authorObj,
          };

          const isFollowing = checkIsFollowing?.(authorId) || false;

          return (
            <article key={`reel-${reel?.id || index}`} className="w-full relative bg-[#0F172A] border-b-[8px] border-[#050B18]">
              <InstagramVideoCard
                post={reelAsPost}
                author={authorObj}
                currentUser={currentUser}
                users={users}
                stories={stories}
                autoplay={false}
                onProfileClick={(userId) => onProfileClick?.(Number(userId))}
                onReact={(p, rType) => onReact?.(p, rType)}
                onShare={(postId, newCount) => onShare?.(postId, newCount)}
                onVideoClick={() => {
                  if (onVideoClick) {
                    onVideoClick(reelAsPost);
                  } else if (onOpenReel) {
                    onOpenReel(reel?.id);
                  }
                }}
                isFollowing={isFollowing}
                onFollow={() => onFollow?.(authorId)}
                onHashtagClick={onHashtagClick}
              />
            </article>
          );
        }

        const post = item.data;
        const postAuthorId = Number(post.user_id);
        const isFollowing = checkIsFollowing?.(postAuthorId) || false;
        const isPostOwner = currentUser && Number(currentUser.id) === postAuthorId;
        const isAdminUser = currentUser && currentUser.role === "admin";
        const isPushed = Boolean(pushedPosts?.[post.id] || (post as any)?.is_pushed || (post as any)?.pushed);
        const showPushButton = (isPostOwner || isAdminUser) && onPushMore && !isPushed;

        const showFirstPymk =
          peopleYouMayKnow &&
          peopleYouMayKnow.length > 0 &&
          peopleYouMayKnowInsertIndex1 >= 0 &&
          index === peopleYouMayKnowInsertIndex1;

        const showSecondPymk =
          peopleYouMayKnow &&
          peopleYouMayKnow.length > 0 &&
          peopleYouMayKnowInsertIndex2 >= 0 &&
          index === peopleYouMayKnowInsertIndex2;

        const showGroupsYouMayJoin =
          groupsYouMayJoin &&
          groupsYouMayJoin.length > 0 &&
          groupsYouMayJoinInsertIndex >= 0 &&
          index === groupsYouMayJoinInsertIndex;

        return (
          <React.Fragment key={`post-${post.id}-${index}`}>
          <Post
  post={post as PostType}
  author={getPostAuthor?.(post as PostType) || post.author || post}
  currentUser={currentUser}
  users={users}
  stories={stories}
  onProfileClick={onProfileClick}
  onReact={onReact}
  onShare={onShare}
  onViewImage={onViewImage}
  onOpenComments={onOpenComments}
  onVideoClick={onVideoClick}
  onPlayAudioTrack={onPlayAudioTrack}
  groups={groups}
  brands={brands}
  chats={chats}
  onHashtagClick={onHashtagClick}
  isFollowing={isFollowing}
  onFollow={() => onFollow?.(postAuthorId)}
  followLoading={followLoading?.[postAuthorId] || false}
  onViewProductFromPost={onViewProductFromPost}
  onRSVP={onRSVPEvent}
  onOpenGroup={onOpenGroup}
  
  pushButton={showPushButton ? (
    <button
      onClick={() => onPushMore?.(post.id)}
      className="px-3 py-1 rounded-md text-sm font-semibold ml-2 bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
    >
      Push
    </button>
  ) : undefined}
/>
            
    

            {showFirstPymk && (
              <PeopleYouMayKnowGrid
                users={peopleYouMayKnow}
                onFollow={(id: number) => onFollowFromPymk?.(id)}
                currentUser={currentUser}
                isLoading={pymkLoading}
                onLoginClick={onLoginClick}
                onProfileClick={onProfileClick}
                title="People You May Know"
                maxDisplay={8}
              />
            )}

            {showSecondPymk && (
              <PeopleYouMayKnowGrid
                users={peopleYouMayKnow}
                onFollow={(id: number) => onFollowFromPymk?.(id)}
                currentUser={currentUser}
                isLoading={pymkLoading}
                onLoginClick={onLoginClick}
                onProfileClick={onProfileClick}
                title="More People You May Know"
                maxDisplay={8}
              />
            )}

            {showGroupsYouMayJoin && (
              <GroupsYouMayJoinCard
                groups={groupsYouMayJoin}
                currentUser={currentUser}
                isLoading={gymjLoading}
                onJoin={(groupId: number) => onJoinGroupSuggestion?.(groupId)}
                onLoginClick={onLoginClick}
                onOpenGroup={(groupId: number) => onOpenGroup?.(groupId)}
                onProfileClick={onProfileClick}
                title="Groups You May Join"
                maxDisplay={8}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Completely hidden sentinel for silent Facebook-style infinite scroll (no visible loader) */}
      {(visibleFeedCount < safeFeedItems.length || hasMoreFeed) && (
        <div
          ref={feedMoreRef}
          className="h-1 w-full opacity-0 pointer-events-none"
          aria-hidden="true"
        />
      )}
    </div>
  );
});


       
// ==================== ADDITIONAL EXPORTS ====================
export default Feed;

export type { FeedProps, PeopleSuggestion, GroupSuggestion, FeedEventItem };

export {
  reactionEmoji,
  fmtCount,
  formatReactionText,
  formatViewCount,
  getPostTextPreview,
  toDateSafe,
  safeJsonArray,
  safeParseJsonArray,
  getMarketplaceProductId,
  getPostMediaList,
  getOrientation,
  apiFetch,
  classifyOrientations,
  MediaGrid,
  ProgressiveTileImage,
  ProgressiveTileImage as ProgressiveFeedImage,
};

export { BACKGROUNDS, FEELINGS, QUICK_EMOJIS };

export const getPostType = (post: any): string => {
  if (post?.type === 'sponsored' || post?.ad_type) return 'sponsored';
  if (post?.type === 'reel' || post?.item_type === 'reel') return 'reel';
  if (post?.type === 'event' || post?.item_type === 'event') return 'event';
  if (post?.type === 'product' || post?.marketplace) return 'product';
  if (post?.group_id || post?.group) return 'group_post';
  return 'post';
};

export const isVideoPost = (post: any): boolean => {
  const mediaInfo = getMediaTypeInfo(post);
  return mediaInfo.isVideo || (post?.media_type === 'video');
};

export const isImagePost = (post: any): boolean => {
  const mediaInfo = getMediaTypeInfo(post);
  return mediaInfo.isImage || (post?.media_type === 'image');
};

export const isAudioPost = (post: any): boolean => {
  const mediaInfo = getMediaTypeInfo(post);
  return mediaInfo.isAudio || (post?.media_type === 'audio');
};


// CSS injection
const injectGlobalStyles = () => {
  if (typeof document === 'undefined') return;
  
  const styleId = 'feed-global-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes slide-up {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .animate-slide-up {
        animation: slide-up 0.3s ease-out;
      }
      
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #0B1120;
        border-radius: 10px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #1E293B;
        border-radius: 10px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #334155;
      }
      
      .line-clamp-1 {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      /* Comments Sheet Fix - prevents blank screen */
      .comments-sheet-root {
        position: fixed !important;
        inset: 0 !important;
        z-index: 99999 !important;
        width: 100vw !important;
        height: 100dvh !important;
        background: #050B18 !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
  }
};

if (typeof window !== 'undefined') {
  injectGlobalStyles();
}

export const FEED_VERSION = '2.0.0';
export const LAST_UPDATED = '2024-03-27';
                       
