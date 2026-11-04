"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  FileText,
  Pin,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { KuromiCharacter } from "@/components/characters/KuromiCharacter";
import { MyMelodyCharacter } from "@/components/characters/MyMelodyCharacter";
import { BUCKET_CATEGORY_META, MOOD_META } from "@/lib/gameData";
import type {
  BucketCategory,
  BucketItem,
  CoupleProfile,
  NoteMood,
  NoteTypingStatus,
  SharedNote,
} from "@/lib/types";

export interface SharedJournalTabProps {
  profile: CoupleProfile;
  sharedNotes: SharedNote[];
  bucketItems: BucketItem[];
  partnerTyping: NoteTypingStatus | null;
  onCreateNote: (mood?: NoteMood) => Promise<SharedNote>;
  onUpsertNote: (note: SharedNote) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onAddBucketItem: (title: string, category: BucketCategory) => Promise<void>;
  onToggleBucketItem: (itemId: string) => Promise<void>;
  onDeleteBucketItem: (itemId: string) => Promise<void>;
}

const MOOD_KEYS: NoteMood[] = [
  "romance",
  "cloud",
  "playful",
  "datenight",
  "dream",
];

const BUCKET_CATEGORIES: BucketCategory[] = ["date", "food", "travel", "dream"];

export function SharedJournalTab({
  profile,
  sharedNotes,
  bucketItems,
  partnerTyping,
  onCreateNote,
  onUpsertNote,
  onDeleteNote,
  onAddBucketItem,
  onToggleBucketItem,
  onDeleteBucketItem,
}: SharedJournalTabProps) {
  const [section, setSection] = useState<"notes" | "bucket">("notes");
  const [moodFilter, setMoodFilter] = useState<NoteMood | "all">("all");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [kuromiCelebrateKey, setKuromiCelebrateKey] = useState(0);

  // Bucket list form state
  const [bucketTitle, setBucketTitle] = useState("");
  const [bucketCategory, setBucketCategory] = useState<BucketCategory>("date");

  // Scroll-reactive Kuromi & My Melody perched atop header
  const { scrollY } = useScroll();
  const smoothScroll = useSpring(scrollY, { stiffness: 220, damping: 24 });
  const kuromiScrollY = useTransform(smoothScroll, (v) =>
    Math.sin(v / 38) * 5
  );
  const melodyScrollY = useTransform(smoothScroll, (v) =>
    Math.cos(v / 38) * 5
  );

  const sortedNotes = useMemo(() => {
    return [...sharedNotes]
      .filter((n) => moodFilter === "all" || n.mood === moodFilter)
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
  }, [moodFilter, sharedNotes]);

  const activeNote = useMemo(
    () => sharedNotes.find((n) => n.id === activeNoteId) || null,
    [activeNoteId, sharedNotes]
  );

  const isPartnerTypingInActiveNote = Boolean(
    activeNote &&
      partnerTyping &&
      partnerTyping.noteId === activeNote.id &&
      Date.now() - partnerTyping.timestamp < 3500
  );

  const completedCount = bucketItems.filter((b) => b.is_completed).length;
  const bucketProgress =
    bucketItems.length > 0
      ? Math.round((completedCount / bucketItems.length) * 100)
      : 0;

  const handleNewNote = async () => {
    const created = await onCreateNote(
      moodFilter === "all" ? "romance" : moodFilter
    );
    setActiveNoteId(created.id);
    setKuromiCelebrateKey((k) => k + 1);
  };

  const handleAddBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bucketTitle.trim()) return;
    await onAddBucketItem(bucketTitle, bucketCategory);
    setBucketTitle("");
    setKuromiCelebrateKey((k) => k + 1);
  };

  const handleToggleBucket = async (item: BucketItem) => {
    if (!item.is_completed) {
      setKuromiCelebrateKey((k) => k + 1);
    }
    await onToggleBucketItem(item.id);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Animated Header with Kuromi & My Melody Perched on Top */}
      <div className="relative pt-14">
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-end justify-center gap-4">
          <motion.div
            style={{ y: kuromiScrollY }}
            className="pointer-events-auto -mb-5"
          >
            <KuromiCharacter
              size={92}
              swingLegs
              celebrateKey={kuromiCelebrateKey}
            />
          </motion.div>

          <motion.div
            style={{ y: melodyScrollY }}
            className="pointer-events-auto -mb-5"
          >
            <MyMelodyCharacter
              size={90}
              swingLegs
              characterId={profile.userBCharacter || "my-melody"}
            />
          </motion.div>
        </div>

        <section className="saas-glow-card relative z-10 px-6 pt-9 pb-5 text-center space-y-4">
          <div className="pointer-events-none absolute -top-12 left-1/3 h-36 w-36 rounded-full bg-[#FECDD3]/30 blur-3xl" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E293B] dark:text-white">
              Jurnal Bersama {profile.userAName} &amp; {profile.userBName}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Tulis buku catatan bareng secara <em>live</em> dan wujudkan daftar{" "}
              <em>Bucket List</em> impian kalian berdua.
            </p>
          </div>

          {/* Segmented Mode Switcher: Catatan Bersama vs Bucket List */}
          <div className="inline-flex rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-pink-100 dark:border-slate-700 p-1">
            <button
              type="button"
              onClick={() => setSection("notes")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                section === "notes"
                  ? "bg-[#1E293B] dark:bg-purple-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Catatan Kita ({sharedNotes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSection("bucket");
                setActiveNoteId(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                section === "bucket"
                  ? "bg-[#1E293B] dark:bg-purple-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white"
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>
                Bucket List ({completedCount}/{bucketItems.length})
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* ==================================================================== */}
      {/* MODE 1: COLLABORATIVE SHARED NOTES                                   */}
      {/* ==================================================================== */}
      {section === "notes" && (
        <AnimatePresence mode="wait">
          {activeNote ? (
            /* Live Collaborative Note Editor */
            <motion.section
              key={`editor-${activeNote.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-3xl border border-pink-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 shadow-card space-y-4"
            >
              {/* Editor Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveNoteId(null)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-[#1E293B] dark:text-white hover:border-pink-200"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Semua Catatan</span>
                </button>

                <div className="flex items-center gap-2">
                  {isPartnerTypingInActiveNote && partnerTyping && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FECDD3]/45 dark:bg-pink-950/60 px-3 py-1 text-[11px] font-semibold text-rose-600 dark:text-pink-300 animate-pulse">
                      ✍️ {partnerTyping.name} sedang mengetik...
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      onUpsertNote({
                        ...activeNote,
                        is_pinned: !activeNote.is_pinned,
                      })
                    }
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activeNote.is_pinned
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                        : "bg-[#F8FAFC] dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-white"
                    }`}
                  >
                    <Pin className="h-3.5 w-3.5" />
                    <span>{activeNote.is_pinned ? "Dipin" : "Pin"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await onDeleteNote(activeNote.id);
                      setActiveNoteId(null);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-400 hover:border-rose-200 hover:text-rose-500 dark:hover:text-pink-400"
                    title="Hapus catatan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Mood Sticker Picker */}
              <div className="flex flex-wrap items-center gap-1.5">
                {MOOD_KEYS.map((m) => {
                  const meta = MOOD_META[m];
                  const selected = activeNote.mood === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onUpsertNote({ ...activeNote, mood: m })}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                        selected
                          ? `${meta.badgeClass} ring-1 ring-current`
                          : "bg-[#F8FAFC] dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span>{meta.emoji}</span>
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Live Title Input */}
              <input
                type="text"
                value={activeNote.title}
                onChange={(e) =>
                  onUpsertNote({ ...activeNote, title: e.target.value })
                }
                placeholder="Judul catatan bersama..."
                className="w-full border-0 bg-transparent text-lg sm:text-xl font-bold text-[#1E293B] dark:text-white placeholder:text-slate-400 focus:outline-none"
              />

              {/* Live Collaborative Textarea */}
              <textarea
                rows={10}
                value={activeNote.content}
                onChange={(e) =>
                  onUpsertNote({ ...activeNote, content: e.target.value })
                }
                placeholder="Ketik cerita, daftar tempat kencan, resep masakan, atau surat manis di sini... Pasanganmu langsung melihat ketikanmu secara realtime! ☁️🎀"
                className="w-full resize-y rounded-2xl border border-pink-100/80 dark:border-slate-700 bg-[#F8FAFC]/70 dark:bg-slate-800/80 p-4 text-sm leading-7 text-[#1E293B] dark:text-white placeholder:text-slate-400 focus:border-pink-200 dark:focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Tersimpan otomatis ke kedua layar • Diedit terakhir oleh{" "}
                  <strong className="text-slate-600 dark:text-slate-200 font-bold">
                    {activeNote.last_edited_by}
                  </strong>
                </span>
                <span>
                  {new Date(activeNote.updated_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </motion.section>
          ) : (
            /* Notes List & Filter Bar */
            <motion.div
              key="notes-grid"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMoodFilter("all")}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                      moodFilter === "all"
                        ? "bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-800 border border-pink-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    Semua
                  </button>
                  {MOOD_KEYS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMoodFilter(m)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                        moodFilter === m
                          ? `${MOOD_META[m].badgeClass} ring-1 ring-current`
                          : "bg-white dark:bg-slate-800 border border-pink-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      {MOOD_META[m].emoji} {MOOD_META[m].label}
                    </button>
                  ))}
                </div>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleNewNote}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Catatan Baru</span>
                </motion.button>
              </div>

              {sortedNotes.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-pink-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 p-10 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                    Belum ada catatan di kategori ini ☁️
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Klik tombol &ldquo;Catatan Baru&rdquo; untuk mulai menulis bersama pasanganmu!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {sortedNotes.map((note) => {
                    const meta = MOOD_META[note.mood] || MOOD_META.romance;
                    const partnerActiveHere =
                      partnerTyping &&
                      partnerTyping.noteId === note.id &&
                      Date.now() - partnerTyping.timestamp < 3500;

                    return (
                      <motion.div
                        key={note.id}
                        whileHover={{ y: -2 }}
                        onClick={() => setActiveNoteId(note.id)}
                        className={`saas-glow-card cursor-pointer border ${meta.cardBorder} p-5 flex flex-col justify-between gap-3`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                            >
                              <span>{meta.emoji}</span>
                              <span>{meta.label}</span>
                            </span>

                            <div className="flex items-center gap-1.5">
                              {partnerActiveHere && (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-500 animate-pulse">
                                  ✍️ Sedang diketik
                                </span>
                              )}
                              {note.is_pinned && (
                                <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                              )}
                            </div>
                          </div>

                          <h3 className="text-base font-bold text-[#1E293B] dark:text-white line-clamp-1">
                            {note.title || "Tanpa Judul"}
                          </h3>

                          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3 whitespace-pre-line">
                            {note.content || "Ketuk untuk mulai menulis bersama..."}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Oleh {note.last_edited_by}</span>
                          <span className="text-rose-400 dark:text-pink-400 font-medium">
                            Buka &amp; Edit →
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ==================================================================== */}
      {/* MODE 2: COUPLE BUCKET LIST & WISHLIST                                */}
      {/* ==================================================================== */}
      {section === "bucket" && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Progress Card */}
          <div className="rounded-3xl border border-pink-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-rose-400 dark:text-pink-400" />
                <span className="text-sm font-bold text-[#1E293B] dark:text-white">
                  Progress Impian Berdua
                </span>
              </div>
              <span className="text-xs font-bold text-rose-500 dark:text-pink-400">
                {completedCount} / {bucketItems.length} tercapai ({bucketProgress}%)
              </span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-pink-100 dark:border-slate-700">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${bucketProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-[#BAE6FD] via-[#FECDD3] to-[#E9D5FF]"
              />
            </div>

            {/* Add New Bucket Item Form */}
            <form onSubmit={handleAddBucket} className="pt-2 space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {BUCKET_CATEGORIES.map((cat) => {
                  const meta = BUCKET_CATEGORY_META[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setBucketCategory(cat)}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                        bucketCategory === cat
                          ? `${meta.pillClass} ring-1 ring-current`
                          : "bg-[#F8FAFC] dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {meta.emoji} {meta.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bucketTitle}
                  onChange={(e) => setBucketTitle(e.target.value)}
                  placeholder="Tambah wishlist kencan / impian baru kita..."
                  className="flex-1 rounded-full border border-pink-100 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 px-4 py-2.5 text-xs text-[#1E293B] dark:text-white placeholder:text-slate-400 focus:border-pink-300 dark:focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!bucketTitle.trim()}
                  className="inline-flex items-center gap-1 rounded-full bg-[#1E293B] dark:bg-purple-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </form>
          </div>

          {/* Bucket Items Checklist */}
          <div className="space-y-2.5">
            {bucketItems.map((item) => {
              const catMeta =
                BUCKET_CATEGORY_META[item.category] || BUCKET_CATEGORY_META.date;
              return (
                <motion.div
                  key={item.id}
                  layout
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${
                    item.is_completed
                      ? "border-pink-100/60 dark:border-slate-800 bg-[#F8FAFC]/80 dark:bg-slate-900/60"
                      : "border-pink-100 dark:border-slate-700 bg-white/95 dark:bg-slate-800/90 shadow-sm"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleBucket(item)}
                    className="flex flex-1 items-start gap-3 text-left"
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                        item.is_completed
                          ? "border-rose-400 bg-rose-400 text-white"
                          : "border-pink-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                      }`}
                    >
                      {item.is_completed && <Check className="h-3.5 w-3.5" />}
                    </span>

                    <div className="space-y-1">
                      <p
                        className={`text-sm font-semibold ${
                          item.is_completed
                            ? "line-through text-slate-400 dark:text-slate-500"
                            : "text-[#1E293B] dark:text-white"
                        }`}
                      >
                        {item.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${catMeta.pillClass}`}
                        >
                          {catMeta.emoji} {catMeta.label}
                        </span>
                        <span>Ditulis {item.created_by}</span>
                        {item.is_completed && item.completed_by && (
                          <span className="text-rose-500 font-medium">
                            • Dicentang {item.completed_by} ✨
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteBucketItem(item.id)}
                    className="rounded-full p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                    title="Hapus item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      )}
    </div>
  );
}
