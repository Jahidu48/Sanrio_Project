"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckSquare,
  FileText,
  Gift,
  Heart,
  Pin,
  Plus,
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

  const [bucketTitle, setBucketTitle] = useState("");
  const [bucketCategory, setBucketCategory] = useState<BucketCategory>("date");

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
      {/* Header with Kuromi & My Melody Perched on Top */}
      <div className="relative pt-14">
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-end justify-center gap-4">
          <motion.div
            style={{ y: kuromiScrollY }}
            className="pointer-events-auto -mb-5"
          >
            <KuromiCharacter
              size={90}
              swingLegs
              celebrateKey={kuromiCelebrateKey}
            />
          </motion.div>

          <motion.div
            style={{ y: melodyScrollY }}
            className="pointer-events-auto -mb-5"
          >
            <MyMelodyCharacter
              size={88}
              swingLegs
              characterId={profile.userBCharacter || "my-melody"}
            />
          </motion.div>
        </div>

        <section className="scrapbook-card relative z-10 px-6 pt-9 pb-5 text-center space-y-4">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#2D232E] dark:text-[#FAF5F7]">
              Jurnal Kita: {profile.userAName} &amp; {profile.userBName}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#6E5A68] dark:text-[#B8A6B5] max-w-md mx-auto">
              Simpan cerita berdua dan tulis daftar impian yang ingin kalian wujudkan.
            </p>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="inline-flex rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] p-1">
            <button
              type="button"
              onClick={() => setSection("notes")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                section === "notes"
                  ? "bg-rose-500 text-white shadow-2xs"
                  : "text-[#6E5A68] dark:text-[#B8A6B5] hover:text-[#2D232E] dark:hover:text-white"
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
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                section === "bucket"
                  ? "bg-rose-500 text-white shadow-2xs"
                  : "text-[#6E5A68] dark:text-[#B8A6B5] hover:text-[#2D232E] dark:hover:text-white"
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>
                Daftar Impian ({completedCount}/{bucketItems.length})
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* MODE 1: COLLABORATIVE SHARED NOTES */}
      {section === "notes" && (
        <AnimatePresence mode="wait">
          {activeNote ? (
            <motion.section
              key={`editor-${activeNote.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="scrapbook-card p-6 space-y-4"
            >
              {/* Editor Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F3D8DF] dark:border-[#3B2E40]">
                <button
                  type="button"
                  onClick={() => setActiveNoteId(null)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] px-3.5 py-1.5 text-xs font-semibold text-[#2D232E] dark:text-white hover:border-rose-300 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Semua Catatan</span>
                </button>

                <div className="flex items-center gap-2">
                  {isPartnerTypingInActiveNote && partnerTyping && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 px-3 py-1 text-xs font-semibold text-rose-600 dark:text-pink-300">
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
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      activeNote.is_pinned
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                        : "bg-[#FFF5F7] dark:bg-[#2E2433] border-[#F3D8DF] dark:border-[#3B2E40] text-[#6E5A68] dark:text-[#B8A6B5]"
                    }`}
                  >
                    <Pin className="h-3.5 w-3.5" />
                    <span>{activeNote.is_pinned ? "Disematkan" : "Sematkan"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await onDeleteNote(activeNote.id);
                      setActiveNoteId(null);
                    }}
                    aria-label="Hapus catatan"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] text-[#6E5A68] hover:border-rose-300 hover:text-rose-500 cursor-pointer"
                    title="Hapus catatan"
                  >
                    <Trash2 className="h-4 w-4" />
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
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                        selected
                          ? `${meta.badgeClass} ring-1 ring-current`
                          : "bg-[#FFF5F7] dark:bg-[#2E2433] text-[#6E5A68] dark:text-[#B8A6B5]"
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
                placeholder="Judul catatan..."
                className="font-display w-full border-0 bg-transparent text-lg sm:text-xl font-bold text-[#2D232E] dark:text-white placeholder:text-[#6E5A68]/60 focus:outline-none"
              />

              {/* Live Collaborative Textarea */}
              <textarea
                rows={10}
                value={activeNote.content}
                onChange={(e) =>
                  onUpsertNote({ ...activeNote, content: e.target.value })
                }
                placeholder="Tulis cerita, tempat kencan favorit, atau surat kecil di sini..."
                className="w-full resize-y rounded-2xl border border-[#F3D8DF] dark:border-[#3B2E40] bg-[#FFFBF5] dark:bg-[#18131A] p-4 text-sm leading-7 text-[#2D232E] dark:text-white placeholder:text-[#6E5A68]/60 focus:border-rose-400 focus:outline-none"
              />

              <div className="flex items-center justify-between text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
                <span>
                  Tersimpan otomatis • Ditulis oleh{" "}
                  <strong className="text-[#2D232E] dark:text-white font-bold">
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
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      moodFilter === "all"
                        ? "bg-rose-500 text-white shadow-2xs"
                        : "bg-white dark:bg-[#221B25] border border-[#F3D8DF] dark:border-[#3B2E40] text-[#6E5A68] dark:text-[#B8A6B5] hover:border-rose-300"
                    }`}
                  >
                    Semua
                  </button>
                  {MOOD_KEYS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMoodFilter(m)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        moodFilter === m
                          ? `${MOOD_META[m].badgeClass} ring-1 ring-current`
                          : "bg-white dark:bg-[#221B25] border border-[#F3D8DF] dark:border-[#3B2E40] text-[#6E5A68] dark:text-[#B8A6B5] hover:border-rose-300"
                      }`}
                    >
                      {MOOD_META[m].emoji} {MOOD_META[m].label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleNewNote}
                  className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 hover:bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tulis Catatan Baru</span>
                </button>
              </div>

              {sortedNotes.length === 0 ? (
                <div className="rounded-3xl scrapbook-stitched bg-[#FFFBF5] dark:bg-[#221B25] p-10 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] text-rose-500">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-base font-bold text-[#2D232E] dark:text-white">
                      Jurnal kalian masih kosong
                    </p>
                    <p className="text-xs text-[#6E5A68] dark:text-[#B8A6B5] max-w-sm mx-auto">
                      Mulai tulis cerita kencan pertama, daftar makanan favorit, atau surat kecil untuk pasanganmu.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleNewNote}
                    className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 hover:bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Buat Catatan Pertama</span>
                  </button>
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
                      <div
                        key={note.id}
                        onClick={() => setActiveNoteId(note.id)}
                        className={`scrapbook-card cursor-pointer border ${meta.cardBorder} p-5 flex flex-col justify-between gap-3`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                            >
                              <span>{meta.emoji}</span>
                              <span>{meta.label}</span>
                            </span>

                            <div className="flex items-center gap-1.5">
                              {partnerActiveHere && (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-500">
                                  ✍️ Sedang diketik
                                </span>
                              )}
                              {note.is_pinned && (
                                <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                              )}
                            </div>
                          </div>

                          <h3 className="font-display text-base font-bold text-[#2D232E] dark:text-white line-clamp-1">
                            {note.title || "Tanpa Judul"}
                          </h3>

                          <p className="text-xs leading-relaxed text-[#6E5A68] dark:text-[#B8A6B5] line-clamp-3 whitespace-pre-line">
                            {note.content || "Ketuk untuk mulai menulis..."}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[#F3D8DF] dark:border-[#3B2E40] flex items-center justify-between text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
                          <span>Oleh {note.last_edited_by}</span>
                          <span className="text-rose-500 dark:text-pink-300 font-semibold">
                            Buka →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* MODE 2: COUPLE WISHLIST / DAFTAR IMPIAN */}
      {section === "bucket" && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Progress Card */}
          <div className="scrapbook-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500 fill-rose-400" />
                <span className="font-display text-sm font-bold text-[#2D232E] dark:text-white">
                  Daftar Impian Kita
                </span>
              </div>
              <span className="text-xs font-bold text-rose-500 dark:text-pink-300">
                {completedCount} dari {bucketItems.length} terwujud ({bucketProgress}%)
              </span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${bucketProgress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full rounded-full bg-rose-400"
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
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                        bucketCategory === cat
                          ? `${meta.pillClass} ring-1 ring-current`
                          : "bg-[#FFF5F7] dark:bg-[#2E2433] text-[#6E5A68] dark:text-[#B8A6B5]"
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
                  placeholder="Tulis rencana kencan atau impian baru..."
                  className="flex-1 rounded-full border border-[#F3D8DF] dark:border-[#3B2E40] bg-[#FFFBF5] dark:bg-[#18131A] px-4 py-2.5 text-xs text-[#2D232E] dark:text-white placeholder:text-[#6E5A68]/60 focus:border-rose-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!bucketTitle.trim()}
                  className="inline-flex items-center gap-1 rounded-full bg-rose-500 hover:bg-rose-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </form>
          </div>

          {/* Bucket Items Checklist */}
          {bucketItems.length === 0 ? (
            <div className="rounded-3xl scrapbook-stitched bg-[#FFFBF5] dark:bg-[#221B25] p-10 text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] text-rose-500">
                <Gift className="h-6 w-6" />
              </div>
              <p className="font-display text-base font-bold text-[#2D232E] dark:text-white">
                Belum ada daftar impian
              </p>
              <p className="text-xs text-[#6E5A68] dark:text-[#B8A6B5] max-w-sm mx-auto">
                Tulis tempat yang ingin kalian kunjungi, makanan yang ingin dicoba, atau rencana seru di kolom atas.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {bucketItems.map((item) => {
                const catMeta =
                  BUCKET_CATEGORY_META[item.category] ||
                  BUCKET_CATEGORY_META.date;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${
                      item.is_completed
                        ? "border-[#F3D8DF]/60 dark:border-[#3B2E40] bg-[#FFFBF5]/80 dark:bg-[#1E1721]"
                        : "border-[#F3D8DF] dark:border-[#3B2E40] bg-white dark:bg-[#221B25] shadow-2xs"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleBucket(item)}
                      className="flex flex-1 items-start gap-3 text-left cursor-pointer"
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                          item.is_completed
                            ? "border-rose-500 bg-rose-500 text-white"
                            : "border-[#F3D8DF] dark:border-[#4E3B4D] bg-white dark:bg-[#2E2433]"
                        }`}
                      >
                        {item.is_completed && <Check className="h-3.5 w-3.5" />}
                      </span>

                      <div className="space-y-1">
                        <p
                          className={`text-sm font-semibold ${
                            item.is_completed
                              ? "line-through text-[#6E5A68]/70 dark:text-[#B8A6B5]/60"
                              : "text-[#2D232E] dark:text-white"
                          }`}
                        >
                          {item.title}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${catMeta.pillClass}`}
                          >
                            {catMeta.emoji} {catMeta.label}
                          </span>
                          <span>Ditulis {item.created_by}</span>
                          {item.is_completed && item.completed_by && (
                            <span className="text-rose-500 font-medium">
                              • Terwujud bersama {item.completed_by}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteBucketItem(item.id)}
                      aria-label="Hapus impian"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[#6E5A68] hover:bg-rose-50 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Hapus item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>
      )}
    </div>
  );
}
