"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Lock,
  MailOpen,
  RefreshCw,
  Send,
  Sparkles,
  Unlock,
} from "lucide-react";
import { MyMelodyCharacter } from "@/components/characters/MyMelodyCharacter";
import { DAILY_ROMANTIC_PROMPTS } from "@/lib/prompts";
import type { CoupleProfile, DailyQnA } from "@/lib/types";

export interface SecretEnvelopePromptProps {
  profile: CoupleProfile;
  todayQnA: DailyQnA;
  onSubmitAnswer: (answer: string, overrideRole?: "user_a" | "user_b") => Promise<void>;
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

const CONFETTI_COLORS = ["#FECDD3", "#BAE6FD", "#E9D5FF", "#FB7185", "#38BDF8"];

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
  const partnerAnswer = isUserA ? todayQnA.user_b_answer : todayQnA.user_a_answer;

  const isUnlocked = Boolean(
    todayQnA.is_unlocked ||
      (todayQnA.user_a_answer?.trim() && todayQnA.user_b_answer?.trim())
  );

  // Trigger celebratory confetti burst when transitioning from locked -> unlocked!
  useEffect(() => {
    if (isUnlocked && !prevUnlockedRef.current) {
      const pieces: ConfettiPiece[] = Array.from({ length: 28 }).map((_, i) => {
        const angle = (i / 28) * Math.PI * 2;
        const dist = 70 + (i % 4) * 38;
        return {
          id: Date.now() + i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 25,
          rotate: (i * 47) % 360,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          size: 7 + (i % 3) * 3,
        };
      });
      setConfetti(pieces);
      const timer = window.setTimeout(() => setConfetti([]), 2200);
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
    <section className="saas-glow-card p-6 sm:p-7">
      {/* Subtle SaaS Rose Radial Inner Glow */}
      <div className="pointer-events-none absolute -top-12 right-12 h-44 w-44 rounded-full bg-[#FECDD3]/30 blur-3xl" />

      {/* Celebratory Confetti / Sparkle Burst Overlay */}
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
                scale: [0.4, 1.25, 0.8],
                rotate: piece.rotate,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
              style={{
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
              }}
              className="absolute rounded-full shadow-sm"
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Header with Animated My Melody Holding Sealed Love Letter */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-5 border-b border-pink-100/80 dark:border-slate-800">
        <div className="shrink-0 -mt-2">
          <MyMelodyCharacter
            size={108}
            withEnvelope
            characterId={profile.userBCharacter || "my-melody"}
          />
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FECDD3]/35 dark:bg-pink-950/60 border border-pink-200/50 dark:border-pink-900/60 px-3 py-1 text-[11px] font-semibold tracking-wide text-rose-500 dark:text-pink-300">
              {isUnlocked ? (
                <>
                  <MailOpen className="h-3.5 w-3.5" />
                  <span>SURAT HARI INI TERBUKA</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>MY MELODY SECRET ENVELOPE</span>
                </>
              )}
            </span>

            <button
              type="button"
              onClick={handleCycleQuestion}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-500 dark:hover:text-pink-300 transition-colors"
              title="Ganti pertanyaan hari ini"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Pertanyaan lain</span>
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-bold leading-relaxed text-[#1E293B] dark:text-white">
            &ldquo;{todayQnA.question}&rdquo;
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Segel surat hanya terbuka saat {profile.userAName} &amp;{" "}
            {profile.userBName} sama-sama sudah menjawab.
          </p>
        </div>
      </div>

      {/* Input Form if Current Partner Has Not Answered Yet */}
      {!myAnswer ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Tulis jawaban jujurmu sebagai{" "}
            <span className="font-bold text-rose-500 dark:text-pink-400">{myName}</span>:
          </label>
          <textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ceritakan isi hatimu di sini... 💌"
            className="w-full resize-none rounded-2xl border border-pink-100 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 px-4 py-3 text-sm text-[#1E293B] dark:text-white placeholder:text-slate-400 focus:border-pink-300 dark:focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400 dark:text-slate-400">
              {partnerAnswer
                ? `✨ ${partnerName} sudah mengirim jawabannya!`
                : `Menunggu jawabanmu & ${partnerName}`}
            </span>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.96 }}
              disabled={!draft.trim() || isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 dark:from-purple-600 dark:to-pink-600 dark:hover:opacity-95 px-5 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-40 transition-all cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Segel Jawaban</span>
            </motion.button>
          </div>
        </form>
      ) : null}

      {/* Answer Cards Grid (My Answer + Time-Locked / Unlocked Partner Card) */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current User Card */}
        <div className="rounded-2xl border border-sky-100 dark:border-slate-800 bg-[#F8FAFC]/90 dark:bg-slate-800/90 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-white">
              {myName} <span className="text-slate-400 dark:text-slate-500 font-normal">(Kamu)</span>
            </span>
            {myAnswer ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Tersimpan
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Belum diisi</span>
            )}
          </div>
          {myAnswer ? (
            <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">{myAnswer}</p>
          ) : (
            <p className="text-xs italic text-slate-400 dark:text-slate-500">
              Isi jawabanmu di atas untuk membuka amplop rahasia berdua.
            </p>
          )}
        </div>

        {/* Partner Answer Card (Blurred with Wiggling Padlock until BOTH have answered!) */}
        <div className="relative overflow-hidden rounded-2xl border border-pink-100 dark:border-slate-800 bg-[#FFF9FB] dark:bg-slate-800/90 p-4 min-h-[116px] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-white">
              {partnerName}
            </span>
            {isUnlocked ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 dark:text-pink-400 font-medium">
                <Unlock className="h-3.5 w-3.5" />
                Terbuka!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 dark:text-pink-400 font-medium">
                <Lock className="h-3 w-3" />
                Terkunci
              </span>
            )}
          </div>

          {isUnlocked ? (
            <motion.p
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.55 }}
              className="text-sm leading-relaxed text-[#1E293B] dark:text-slate-200"
            >
              {partnerAnswer}
            </motion.p>
          ) : (
            <>
              {/* Masked Cipher Placeholder (Never exposes plaintext partner answer in DOM before unlock) */}
              <p
                aria-hidden="true"
                className="select-none text-sm leading-relaxed text-slate-400 blur-[6px] opacity-70"
              >
                Rahasia hati tersimpan rapat di dalam segel pita My Melody sampai kedua belah pihak menulis jawaban.
              </p>

              {/* Frosted Glass Lock Overlay with Wiggling Padlock */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/65 dark:bg-slate-900/80 backdrop-blur-md p-3 text-center">
                <motion.div
                  animate={{
                    rotate: [0, -12, 12, -8, 8, 0],
                    scale: [1, 1.06, 1],
                  }}
                  transition={{
                    repeat: Infinity,
                    repeatDelay: 1.5,
                    duration: 0.75,
                    ease: "easeInOut",
                  }}
                  className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#FECDD3]/60 dark:bg-pink-900/60 border border-pink-200 dark:border-pink-700 text-rose-500 dark:text-pink-300 shadow-sm"
                >
                  <Lock className="h-4 w-4" />
                </motion.div>

                <p className="text-xs font-semibold text-[#1E293B] dark:text-white">
                  {partnerAnswer
                    ? `${partnerName} sudah menjawab! Kirim punyamu untuk membuka 💌`
                    : `Menunggu jawaban ${partnerName}...`}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
