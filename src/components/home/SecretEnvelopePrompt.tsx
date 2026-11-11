"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Lock,
  MailOpen,
  RefreshCw,
  Send,
  Unlock,
} from "lucide-react";
import { MyMelodyCharacter } from "@/components/characters/MyMelodyCharacter";
import { DAILY_ROMANTIC_PROMPTS } from "@/lib/prompts";
import type { CoupleProfile, DailyQnA } from "@/lib/types";

export interface SecretEnvelopePromptProps {
  profile: CoupleProfile;
  todayQnA: DailyQnA;
  onSubmitAnswer: (
    answer: string,
    overrideRole?: "user_a" | "user_b"
  ) => Promise<void>;
  onResetPrompt: (newQuestion?: string) => Promise<void>;
}

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotate: number;
  color: string;
  size: number;
}

const CONFETTI_COLORS = ["#FECDD3", "#BAE6FD", "#FDE68A", "#FB7185", "#38BDF8"];

export function SecretEnvelopePrompt({
  profile,
  todayQnA,
  onSubmitAnswer,
  onResetPrompt,
}: SecretEnvelopePromptProps) {
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const prevUnlockedRef = useRef<boolean>(todayQnA.is_unlocked);

  const isUserA = profile.role === "user_a";
  const myName = isUserA ? profile.userAName : profile.userBName;
  const partnerName = isUserA ? profile.userBName : profile.userAName;
  const myAnswer = isUserA ? todayQnA.user_a_answer : todayQnA.user_b_answer;
  const partnerAnswer = isUserA
    ? todayQnA.user_b_answer
    : todayQnA.user_a_answer;

  const isUnlocked = Boolean(
    todayQnA.is_unlocked ||
      (todayQnA.user_a_answer?.trim() && todayQnA.user_b_answer?.trim())
  );

  useEffect(() => {
    if (isUnlocked && !prevUnlockedRef.current) {
      const pieces: ConfettiPiece[] = Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const dist = 65 + (i % 4) * 35;
        return {
          id: Date.now() + i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 20,
          rotate: (i * 47) % 360,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          size: 7 + (i % 3) * 3,
        };
      });
      setConfetti(pieces);
      const timer = window.setTimeout(() => setConfetti([]), 2000);
      prevUnlockedRef.current = true;
      return () => window.clearTimeout(timer);
    }
    prevUnlockedRef.current = isUnlocked;
  }, [isUnlocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitAnswer(draft);
      setDraft("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCycleQuestion = async () => {
    const currentIdx = DAILY_ROMANTIC_PROMPTS.indexOf(todayQnA.question);
    const nextQuestion =
      DAILY_ROMANTIC_PROMPTS[(currentIdx + 1) % DAILY_ROMANTIC_PROMPTS.length];
    await onResetPrompt(nextQuestion);
  };

  return (
    <section className="scrapbook-card p-5 sm:p-6">
      {/* Celebratory Confetti Overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-30">
        <AnimatePresence>
          {confetti.map((piece) => (
            <motion.span
              key={piece.id}
              initial={{ opacity: 1, x: 0, y: 0, scale: 0.3, rotate: 0 }}
              animate={{
                opacity: [1, 1, 0],
                x: piece.x,
                y: piece.y,
                scale: [0.4, 1.2, 0.8],
                rotate: piece.rotate,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
              }}
              className="absolute rounded-full"
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Header with My Melody Holding Sealed Letter */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-5 border-b border-[#F3D8DF] dark:border-[#3B2E40]">
        <div className="shrink-0 -mt-1">
          <MyMelodyCharacter
            size={96}
            withEnvelope
            characterId={profile.userBCharacter || "my-melody"}
          />
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] px-3 py-1 text-xs font-bold text-rose-600 dark:text-pink-300">
              {isUnlocked ? (
                <>
                  <MailOpen className="h-3.5 w-3.5" />
                  <span>Surat Hari Ini Terbuka</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>Amplop Rahasia Hari Ini</span>
                </>
              )}
            </span>

            <button
              type="button"
              onClick={handleCycleQuestion}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-[#6E5A68] dark:text-[#B8A6B5] hover:bg-[#FFF5F7] dark:hover:bg-[#2E2433] hover:text-rose-500 transition-colors cursor-pointer"
              title="Ganti pertanyaan hari ini"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Pertanyaan lain</span>
            </button>
          </div>

          <h2 className="font-display text-base sm:text-lg font-bold leading-relaxed text-[#2D232E] dark:text-[#FAF5F7]">
            &ldquo;{todayQnA.question}&rdquo;
          </h2>
          <p className="mt-1 text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
            Segel amplop baru terbuka setelah {profile.userAName} dan{" "}
            {profile.userBName} sama-sama menjawab.
          </p>
        </div>
      </div>

      {/* Input Form if Current Partner Has Not Answered Yet */}
      {!myAnswer ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label className="block text-xs font-semibold text-[#2D232E] dark:text-[#FAF5F7]">
            Tulis jawabanmu sebagai{" "}
            <span className="font-bold text-rose-500 dark:text-pink-400">
              {myName}
            </span>
            :
          </label>
          <textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Tulis isi hatimu di sini..."
            className="w-full resize-none rounded-2xl border border-[#F3D8DF] dark:border-[#3B2E40] bg-[#FFFBF5] dark:bg-[#18131A] px-4 py-3 text-sm text-[#2D232E] dark:text-white placeholder:text-[#6E5A68]/60 focus:border-rose-400 focus:outline-none transition-colors"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
              {partnerAnswer
                ? `${partnerName} sudah mengirim jawabannya!`
                : `Menunggu jawabanmu dan ${partnerName}`}
            </span>
            <button
              type="submit"
              disabled={!draft.trim() || isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-rose-500 hover:bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-40 active:scale-95 transition-all cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Simpan Jawaban</span>
            </button>
          </div>
        </form>
      ) : null}

      {/* Answer Cards Grid */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current User Card */}
        <div className="rounded-2xl scrapbook-stitched bg-[#FFFBF5] dark:bg-[#2E2433] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#2D232E] dark:text-white">
              {myName}{" "}
              <span className="text-[#6E5A68] dark:text-[#B8A6B5] font-normal">
                (Kamu)
              </span>
            </span>
            {myAnswer ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Tersimpan
              </span>
            ) : (
              <span className="text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
                Belum diisi
              </span>
            )}
          </div>
          {myAnswer ? (
            <p className="text-sm leading-relaxed text-[#2D232E] dark:text-[#FAF5F7]">
              {myAnswer}
            </p>
          ) : (
            <p className="text-xs italic text-[#6E5A68] dark:text-[#B8A6B5]">
              Isi jawabanmu di atas untuk membuka surat hari ini.
            </p>
          )}
        </div>

        {/* Partner Answer Card */}
        <div className="relative overflow-hidden rounded-2xl scrapbook-stitched bg-[#FFF5F7] dark:bg-[#2E2433] p-4 min-h-[116px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#2D232E] dark:text-white">
              {partnerName}
            </span>
            {isUnlocked ? (
              <span className="inline-flex items-center gap-1 text-xs text-rose-500 dark:text-pink-300 font-semibold">
                <Unlock className="h-3.5 w-3.5" />
                Terbuka
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-[#6E5A68] dark:text-[#B8A6B5] font-medium">
                <Lock className="h-3 w-3" />
                Terkunci
              </span>
            )}
          </div>

          {isUnlocked ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="text-sm leading-relaxed text-[#2D232E] dark:text-[#FAF5F7]"
            >
              {partnerAnswer}
            </motion.p>
          ) : (
            <div className="flex flex-col items-center justify-center py-3 text-center">
              <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-[#221B25] border border-[#F3D8DF] dark:border-[#3B2E40] text-rose-500">
                <Lock className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-[#2D232E] dark:text-[#FAF5F7]">
                {partnerAnswer
                  ? `${partnerName} sudah menjawab! Kirim jawabanmu untuk membaca.`
                  : `Menunggu jawaban ${partnerName}...`}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
