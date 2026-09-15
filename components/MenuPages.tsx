//
import React, { useState, useEffect, useMemo } from 'react';
import { User, Event, Group, Product, Post as PostType, AudioTrack } from '../types';
import { MARKETPLACE_COUNTRIES } from '../constants';
import { Post } from './Feed';
import { AllEvents } from './AllEvents'; // 

// --- SUGGESTED PROFILES PAGE ---
interface SuggestedProfilesPageProps {
    currentUser: User;
    users: User[];
    onFollow: (id: number) => void;
    onProfileClick: (id: number) => void;
    onBack?: () => void;
}

export const SuggestedProfilesPage: React.FC<SuggestedProfilesPageProps> = ({ 
    currentUser, users, onFollow, onProfileClick, onBack 
}) => {
    const [hiddenUserIds, setHiddenUserIds] = useState<number[]>([]);

    const availableUsers = useMemo(() => {
        if (!users || !Array.isArray(users)) return [];
        return users.filter(u => {
            if (!currentUser) return true;
            if (u.id === currentUser.id) return false; 
            if (currentUser.following?.includes(u.id)) return false; 
            if (hiddenUserIds.includes(u.id)) return false;
            return true;
        }).map(u => {
            let score = 0;
            let reason = "Suggested for you";
            if(currentUser && u.location === currentUser.location) score += 5;
            return { user: u, score, reason };
        }).sort((a, b) => b.score - a.score);
    }, [users, currentUser, hiddenUserIds]);

    const handleFollow = (id: number) => {
        onFollow(id);
        setHiddenUserIds(prev => [...prev, id]);
    };

    return (
        <div className="w-full max-w-[700px] mx-auto p-4 font-sans pb-20 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="w-10 h-10 rounded-full bg-[#1E293B] hover:bg-[#334155] border border-[#1E293B] text-[#F8FAFC] flex items-center justify-center transition-colors shadow-sm shrink-0"
                        aria-label="Back"
                    >
                        <i className="fas fa-arrow-left text-lg"></i>
                    </button>
                )}
                <h2 className="text-2xl font-bold text-[#F8FAFC]">Discover People</h2>
            </div>
            {availableUsers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableUsers.slice(0, 12).map(({ user, reason }) => (
                        <div key={user.id} className="bg-[#0B1120] rounded-xl border border-[#1E293B] overflow-hidden flex flex-col shadow-sm">
                            <div className="h-20 bg-gradient-to-r from-blue-900 to-slate-900 relative">
                                 {user.cover_image_url && <img src={user.cover_image_url} className="w-full h-full object-cover opacity-40" alt="" />}
                                 <div className="absolute -bottom-6 left-4">
                                     <img src={user.profile_image_url} className="w-16 h-16 rounded-full border-4 border-[#0B1120] object-cover bg-[#0B1120]" alt="" />
                                 </div>
                            </div>
                            <div className="pt-8 px-4 pb-4 flex-1 flex flex-col">
                                <div onClick={() => onProfileClick(user.id)} className="cursor-pointer">
                                    <h3 className="text-[#F8FAFC] font-bold text-lg hover:underline truncate">{user.name || user.username}</h3>
                                </div>
                                <p className="text-[#94A3B8] text-xs mb-4 line-clamp-1">{user.location || reason}</p>
                                <div className="mt-auto">
                                    <button onClick={() => handleFollow(user.id)} className="w-full bg-[#1877F2] text-white py-2 rounded-lg font-semibold hover:bg-[#166FE5] transition-colors">Follow</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-[#94A3B8]">
                    <p>No new suggestions at the moment.</p>
                </div>
            )}
        </div>
    );
};

// --- BIRTHDAYS PAGE COMPONENT ---
interface BirthdaysPageProps { 
    currentUser: User; 
    users: User[]; 
    onMessage: (id: number) => void;
    onProfileClick: (id: number) => void;
    onBack?: () => void;
}

export const BirthdaysPage: React.FC<BirthdaysPageProps> = ({
  currentUser,
  users,
  onMessage,
  onProfileClick,
  onBack,
}) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  const allUsers = Array.isArray(users) ? users : [];

  const getBirthDate = (u: any) => u?.birth_date || u?.birthDate || u?.dob || u?.birthday;

  const isBirthdayToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const s = String(dateStr).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return false;
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    return month === currentMonth && day === currentDay;
  };

  const birthdayPeople = allUsers.filter(
    (u) => Number(u?.id) !== Number(currentUser?.id) && isBirthdayToday(getBirthDate(u))
  );

  return (
    <div className="w-full max-w-[800px] mx-auto p-4 md:p-6 font-sans pb-20 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-[#1E293B] hover:bg-[#334155] border border-[#1E293B] text-[#F8FAFC] flex items-center justify-center transition-colors shadow-sm shrink-0"
            aria-label="Back"
          >
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
        )}
        <div className="w-14 h-14 bg-gradient-to-tr from-[#FF0080] to-[#7928CA] rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 shrink-0">
          <i className="fas fa-birthday-cake text-white text-2xl"></i>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white leading-tight">Birthdays</h1>
          <p className="text-[#94A3B8]">Celebrate special moments with your community.</p>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
          Today's Stars{" "}
          <span className="text-xs bg-[#F3425F] px-2 py-0.5 rounded-full animate-pulse-slow uppercase tracking-wider">
            Live
          </span>
        </h2>

        {birthdayPeople.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {birthdayPeople.map((person: any) => (
              <div
                key={person.id}
                className="relative group overflow-hidden rounded-3xl bg-[#0B1120] border border-[#1E293B] hover:border-[#1877F2]/50 transition-all duration-300 shadow-xl p-6 flex flex-col items-center text-center"
              >
                <div className="relative mb-4">
                  <div className="absolute -inset-1 bg-gradient-to-tr from-[#1877F2] via-[#F3425F] to-[#FAB400] rounded-full animate-spin-slow opacity-50 blur-sm"></div>
                  <img
                    src={person.profile_image_url}
                    className="w-24 h-24 rounded-full object-cover border-4 border-[#0B1120] relative z-10 cursor-pointer"
                    onClick={() => onProfileClick(person.id)}
                    alt=""
                  />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {person.name || person.username || "User"}
                </h3>
                <p className="text-[#94A3B8] text-sm mb-6 flex items-center gap-1">
                  <i className="fas fa-map-marker-alt text-[10px]"></i>{" "}
                  {person.location || "World Citizen"}
                </p>
                <button
                  onClick={() => onMessage(person.id)}
                  className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  Wish Him/Her
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#0B1120] rounded-3xl p-10 text-center border border-[#1E293B] shadow-inner">
            <i className="fas fa-calendar-day text-[#94A3B8] text-4xl mb-4 opacity-50"></i>
            <h3 className="text-white font-bold text-lg">No Birthdays Today</h3>
            <p className="text-[#94A3B8] text-sm mt-2">
              Check back tomorrow or see upcoming birthdays.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MEMORIES PAGE ---
export const MemoriesPage = ({
  currentUser,
  posts,
  users,
  onProfileClick,
  onReact,
  onShare,
  onViewImage,
  onOpenComments,
  onVideoClick,
  onPlayAudioTrack,
  onHashtagClick,
  onBack,
}: any) => {
  // ---- Defensive helpers (avoid blank screen) ----
  const safeArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
  const safeNumber = (v: any, fallback = 0) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const safeString = (v: any, fallback = "") => (typeof v === "string" ? v : fallback);

  const allPosts = safeArray<PostType>(posts);
  const allUsers = safeArray<User>(users);

  // ---- Find author safely (important for feed Post component) ----
  const authorOf = (p: any) =>
    allUsers.find((u: any) => Number(u?.id) === Number(p?.user_id)) || currentUser;

  // ---- Date utilities ----
  const parseDate = (d: any): Date | null => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const formatMonthDay = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "long", day: "numeric" });

  const formatYear = (d: Date) => String(d.getFullYear());

  // ---- Memory Mode State ----
  type MemoryMode = 'classic' | 'last_week_day' | 'last_7_days';
  const [mode, setMode] = useState<MemoryMode>('last_7_days');    
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [onlyMine, setOnlyMine] = useState<boolean>(true);

  const today = useMemo(() => new Date(), []);

  const selectedLabel = useMemo(() => {
    const d = new Date();
    d.setMonth(selectedMonth);
    d.setDate(selectedDay);
    return formatMonthDay(d);
  }, [selectedMonth, selectedDay]);

  // ---- Combined Memories Logic (3 modes) ----
  const memoriesByYear = useMemo(() => {
    const now = new Date();
    const nowYear = now.getFullYear();

    const start7 = new Date(now);
    start7.setDate(now.getDate() - 7);

    const exactLastWeekStart = new Date(now);
    exactLastWeekStart.setDate(now.getDate() - 7);
    exactLastWeekStart.setHours(0, 0, 0, 0);

    const exactLastWeekEnd = new Date(exactLastWeekStart);
    exactLastWeekEnd.setDate(exactLastWeekStart.getDate() + 1);

    const filtered = allPosts
      .filter((p: any) => {
        const created = parseDate(p?.created_at || p?.createdAt || p?.created || p?.date);

        if (!created) return false;

        // Only my posts (optional toggle)
        if (onlyMine && Number(p?.user_id) !== Number(currentUser?.id)) return false;

        if (mode === 'classic') {
          // same month/day picked + previous years only
          if (created.getMonth() !== selectedMonth) return false;
          if (created.getDate() !== selectedDay) return false;
          if (created.getFullYear() >= nowYear) return false;
          return true;
        }

        if (mode === 'last_week_day') {
          // exactly 7 days ago (same calendar day)
          return created >= exactLastWeekStart && created < exactLastWeekEnd;
        }

        // mode === 'last_7_days'
        return created >= start7 && created < now;
      })
      .map((p: any) => ({
        ...p,
        id: safeNumber(p?.id ?? p?.post_id ?? p?.postId),
        user_id: safeNumber(p?.user_id),
      created_at: p?.created_at ?? p?.createdAt ?? p?.created ?? p?.date ?? new Date().toISOString(),
      }));

    // Grouping:
    // - classic -> group by YEAR
    // - last week day / last 7 days -> group by DATE label (nice timeline)
    const groups: Record<string, any[]> = {};

    for (const p of filtered) {
      const d = parseDate(p.created_at);
      let key = 'Unknown';

      if (d) {
        if (mode === 'classic') key = String(d.getFullYear());
        else key = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }

    // Sort posts inside each group: newest first
    Object.keys(groups).forEach((k) => {
      groups[k].sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)));
    });

    // Sort groups
    const sortedKeys =
      mode === 'classic'
        ? Object.keys(groups).sort((a, b) => Number(b) - Number(a))
        : Object.keys(groups).sort((a, b) => {
            // for date labels we sort by actual date by reading first post date
            const ad = parseDate(groups[a]?.[0]?.created_at)?.getTime() || 0;
            const bd = parseDate(groups[b]?.[0]?.created_at)?.getTime() || 0;
            return bd - ad;
          });

    return sortedKeys.map((k) => ({ year: k, posts: groups[k] }));
  }, [allPosts, currentUser?.id, onlyMine, selectedMonth, selectedDay, mode, today]);

  // ---- Some "nice" stats ----
  const totalMemories = useMemo(
    () => memoriesByYear.reduce((acc: number, g: any) => acc + safeArray(g.posts).length, 0),
    [memoriesByYear]
  );

  // ---- Get mode description ----
  const getModeDescription = () => {
    switch(mode) {
      case 'classic':
        return `posts from previous years on ${selectedLabel}`;
      case 'last_week_day': {
        const lastWeekDate = new Date();
        lastWeekDate.setDate(lastWeekDate.getDate() - 7);
        return `posts from exactly 7 days ago (${lastWeekDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })})`;
      }
      case 'last_7_days':
        return 'posts from any time in the last 7 days';
      default:
        return '';
    }
  };

  // ---- UI ----
  return (
    <div className="w-full max-w-[900px] mx-auto p-4 md:p-6 font-sans pb-20 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-[#1E293B] hover:bg-[#334155] border border-[#1E293B] text-[#F8FAFC] flex items-center justify-center transition-colors shadow-sm shrink-0"
            aria-label="Back"
          >
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
        )}
        <div className="w-14 h-14 bg-gradient-to-tr from-[#1877F2] to-[#00C6FF] rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 shrink-0">
          <i className="fas fa-history text-white text-2xl"></i>
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-white leading-tight">Memories</h1>
          <p className="text-[#94A3B8]">
            Relive your past moments — <span className="text-white font-semibold">{getModeDescription()}</span>
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setMode('classic')}
          className={`px-4 py-2.5 rounded-lg font-semibold transition-all active:scale-95 ${
            mode === 'classic' 
              ? 'bg-[#1877F2] text-white shadow-lg' 
              : 'bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC]'
          }`}
        >
          <i className="fas fa-calendar-star mr-2"></i> Classic
        </button>

        <button
          onClick={() => setMode('last_week_day')}
          className={`px-4 py-2.5 rounded-lg font-semibold transition-all active:scale-95 ${
            mode === 'last_week_day' 
              ? 'bg-[#1877F2] text-white shadow-lg' 
              : 'bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC]'
          }`}
        >
          <i className="fas fa-calendar-week mr-2"></i> Same day last week
        </button>

        <button
          onClick={() => setMode('last_7_days')}
          className={`px-4 py-2.5 rounded-lg font-semibold transition-all active:scale-95 ${
            mode === 'last_7_days' 
              ? 'bg-[#1877F2] text-white shadow-lg' 
              : 'bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC]'
          }`}
        >
          <i className="fas fa-calendar-day mr-2"></i> Past 7 days
        </button>
      </div>

      {/* Controls */}
      <div className="bg-[#0B1120] rounded-2xl border border-[#1E293B] p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Date Picker (only for classic mode) */}
          {mode === 'classic' && (
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-[#94A3B8] text-sm font-semibold">Pick a date:</span>

              {/* Month */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-[#0F172A] border border-[#1E293B] rounded-lg px-3 py-2 text-[#F8FAFC] outline-none focus:border-[#1877F2] transition-colors"
              >
                {Array.from({ length: 12 }).map((_, m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m, 1).toLocaleDateString(undefined, { month: "long" })}
                  </option>
                ))}
              </select>

              {/* Day */}
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="bg-[#0F172A] border border-[#1E293B] rounded-lg px-3 py-2 text-[#F8FAFC] outline-none focus:border-[#1877F2] transition-colors"
              >
                {Array.from({ length: 31 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setSelectedMonth(today.getMonth());
                  setSelectedDay(today.getDate());
                }}
                className="px-3 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] font-semibold transition-colors active:scale-95"
              >
                <i className="fas fa-calendar-alt mr-2"></i> Today
              </button>
            </div>
          )}

          <div className="md:ml-auto flex items-center gap-2">
            <button
              onClick={() => setOnlyMine(true)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors active:scale-95 flex items-center gap-2 ${
                onlyMine
                  ? "bg-[#1877F2] text-white shadow-lg"
                  : "bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC]"
              }`}
            >
              <i className="fas fa-user"></i> My memories
            </button>
            <button
              onClick={() => setOnlyMine(false)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors active:scale-95 flex items-center gap-2 ${
                !onlyMine
                  ? "bg-[#1877F2] text-white shadow-lg"
                  : "bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC]"
              }`}
            >
              <i className="fas fa-users"></i> All memories
            </button>
          </div>
        </div>

        <div className="mt-3 text-[#94A3B8] text-sm">
          Found <span className="text-white font-bold">{totalMemories}</span> memory(ies) • 
          <span className="ml-2 text-[#1877F2] font-medium">
            {mode === 'classic' && `Showing: ${selectedLabel} from previous years`}
            {mode === 'last_week_day' && 'Showing: Posts from exactly 7 days ago'}
            {mode === 'last_7_days' && 'Showing: Posts from the past week'}
          </span>
        </div>
      </div>

      {/* Memories timeline */}
      {memoriesByYear.length === 0 ? (
        <div className="bg-[#0B1120] rounded-3xl p-10 text-center border border-[#1E293B] shadow-inner">
          <i className="fas fa-clock text-[#94A3B8] text-4xl mb-4 opacity-50"></i>
          <h3 className="text-white font-bold text-lg mb-1">No Memories Found</h3>
          <p className="text-[#94A3B8]">
            {mode === 'classic' && `You don't have posts from previous years on ${selectedLabel}.`}
            {mode === 'last_week_day' && "You don't have posts from exactly 7 days ago."}
            {mode === 'last_7_days' && "You don't have posts from the past 7 days."}
          </p>
          <p className="text-[#94A3B8] text-sm mt-2">Try switching to a different mode or changing the date.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {memoriesByYear.map((group: any) => (
            <div key={group.year}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {mode === 'classic' ? (
                    <>
                      {selectedLabel} • {group.year}
                      <span className="text-xs bg-[#1E293B] px-2 py-1 rounded-full">
                        {group.year === new Date().getFullYear() - 1 ? 'Last Year' : 
                         group.year < new Date().getFullYear() - 5 ? 'Old Memory' : 
                         `${new Date().getFullYear() - parseInt(group.year)} years ago`}
                      </span>
                    </>
                  ) : (
                    <>
                      {group.year}
                      <span className="text-xs bg-[#1E293B] px-2 py-1 rounded-full">
                        {group.year === new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) 
                          ? 'Today' 
                          : group.year.includes('Today') ? 'Recent' : 'This Week'}
                      </span>
                    </>
                  )}
                </h2>
                <span className="text-[#94A3B8] text-sm">
                  {safeArray(group.posts).length} post(s)
                </span>
              </div>

              <div className="space-y-4">
                {safeArray(group.posts).map((post: any) => (
                  <Post
                    key={post.id}
                    post={post}
                    author={authorOf(post)}
                    currentUser={currentUser}
                    onProfileClick={onProfileClick}
                    onReact={onReact}
                    onShare={onShare}
                    onViewImage={onViewImage}
                    onOpenComments={onOpenComments}
                    onVideoClick={onVideoClick}
                    onPlayAudioTrack={onPlayAudioTrack}
                    onHashtagClick={onHashtagClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- SETTINGS PAGE ---
export const SettingsPage = () => {
  return <div className="p-6 text-white">SettingsPage not implemented yet.</div>;
};

// Note: EventsPage has been removed. Use AllEvents component directly for the Events page.
