"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";
import { CinnamorollCharacter } from "@/components/characters/CinnamorollCharacter";
import { KuromiCharacter } from "@/components/characters/KuromiCharacter";
import { TELEPATHY_QUESTIONS } from "@/lib/gameData";
import type { CoupleGamesState, CoupleProfile } from "@/lib/types";

export interface TelepathyGameProps {
  profile: CoupleProfile;
  state: CoupleGamesState["telepathy"];
  onUpdate: (
    updater: (prev: CoupleGamesState["telepathy"]) => CoupleGamesState["telepathy"]
  ) => void;
}

export function TelepathyGame({ profile, state, onUpdate }: TelepathyGameProps) {
  const currentQ =
    TELEPATHY_QUESTIONS[state.questionIndex % TELEPATHY_QUESTIONS.length];

  const isUserA = profile.role === "user_a";
  const myChoice = isUserA ? state.choiceA : state.choiceB;
  const partnerChoice = isUserA ? state.choiceB : state.choiceA;
  const partnerName = isUserA ? profile.userBName : profile.userAName;

  const bothChosen = Boolean(state.choiceA && state.choiceB);
  const isMatch = bothChosen && state.choiceA === state.choiceB;

  const syncRate =
    state.totalCompleted > 0
      ? Math.round((state.matchedCount / state.totalCompleted) * 100)
      : 100;

  const handlePick = (choice: "A" | "B", targetRole = profile.role) => {
    onUpdate((prev) => {
      const nextA = targetRole === "user_a" ? choice : prev.choiceA;
      const nextB = targetRole === "user_b" ? choice : prev.choiceB;
      const wasBoth = Boolean(prev.choiceA && prev.choiceB);
      const nowBoth = Boolean(nextA && nextB);

      let matchedCount = prev.matchedCount;
      let totalCompleted = prev.totalCompleted;

      if (!wasBoth && nowBoth) {
        totalCompleted += 1;
        if (nextA === nextB) {
          matchedCount += 1;
        }
      }

      return {
        ...prev,
        choiceA: nextA,
        choiceB: nextB,
        matchedCount,
        totalCompleted,
      };
    });
  };

  const handleNextRound = () => {
    onUpdate((prev) => ({
      ...prev,
      round: prev.round + 1,
      questionIndex: (prev.questionIndex + 1) % TELEPATHY_QUESTIONS.length,
      choiceA: null,
      choiceB: null,
    }));
  };

  return (
    <div className="rounded-3xl border border-pink-100 bg-white/90 backdrop-blur-md p-6 shadow-card space-y-5">
      {/* Top Soulmate Frequency Meter */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-pink-100/70 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 dark:text-pink-300">
            Ronde #{state.round} • Uji Satu Frekuensi
          </span>
          <h3 className="text-base font-bold text-[#1E293B] dark:text-white">
            Telepati {profile.userAName} &amp; {profile.userBName}
          </h3>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border border-pink-100 dark:border-slate-700 px-3.5 py-2">
          <Sparkles className="h-4 w-4 text-rose-400 dark:text-pink-300" />
          <div className="text-right">
            <p className="text-[10px] text-slate-400 leading-none">
              Soulmate Meter
            </p>
            <p className="text-sm font-bold text-[#1E293B] dark:text-white">
              {syncRate}%{" "}
              <span className="text-[11px] font-normal text-slate-400">
                ({state.matchedCount}/{state.totalCompleted} cocok)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#BAE6FD]/20 via-white to-[#FECDD3]/25 dark:from-slate-800 dark:via-slate-900 dark:to-purple-950/30 border border-sky-100 dark:border-slate-700 p-5 text-center shadow-xs">
        <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-white leading-relaxed">
          &ldquo;{currentQ.prompt}&rdquo;
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Pilih jawabanmu diam-diam! Hasilnya terbuka saat kalian berdua sudah memilih.
        </p>
      </div>

      {/* Two Secret Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {(["A", "B"] as const).map((optKey) => {
          const label = optKey === "A" ? currentQ.optionA : currentQ.optionB;
          const emoji = optKey === "A" ? currentQ.emojiA : currentQ.emojiB;
          const selectedByMe = myChoice === optKey;
          const chosenByA = bothChosen && state.choiceA === optKey;
          const chosenByB = bothChosen && state.choiceB === optKey;

          return (
            <motion.button
              key={optKey}
              type="button"
              whileHover={!bothChosen ? { scale: 1.015 } : undefined}
              whileTap={!bothChosen ? { scale: 0.98 } : undefined}
              disabled={bothChosen}
              onClick={() => handlePick(optKey)}
              className={`relative flex flex-col items-center justify-center rounded-2xl border p-5 text-center transition-all ${
                selectedByMe
                  ? "border-rose-300 dark:border-pink-500 bg-[#FECDD3]/30 dark:bg-pink-950/40 shadow-sm"
                  : "border-slate-200/80 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 hover:border-pink-200 dark:hover:border-purple-500 hover:bg-white dark:hover:bg-slate-700"
              }`}
            >
              <span className="text-3xl mb-2">{emoji}</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {label}
              </span>

              {selectedByMe && !bothChosen && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white dark:bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold text-rose-500 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
                  <Check className="h-3 w-3" /> Pilihanmu terkunci
                </span>
              )}

              {bothChosen && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                  {chosenByA && (
                    <span className="rounded-full bg-[#BAE6FD]/75 dark:bg-sky-900 px-2.5 py-0.5 text-[10px] font-bold text-[#1E293B] dark:text-white">
                      ☁️ {profile.userAName}
                    </span>
                  )}
                  {chosenByB && (
                    <span className="rounded-full bg-[#FECDD3]/80 dark:bg-pink-900 px-2.5 py-0.5 text-[10px] font-bold text-[#1E293B] dark:text-white">
                      🎀 {profile.userBName}
                    </span>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Status / Result Celebration Area */}
      {!bothChosen ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-rose-400" />
            <span>
              {partnerChoice
                ? `✨ ${partnerName} sudah mengunci pilihannya! Ayo pilih punyamu!`
                : myChoice
                ? `Menunggu ${partnerName} memilih di layarnya...`
                : `Silakan pilih salah satu kartu di atas`}
            </span>
          </div>

          {myChoice && !partnerChoice && (
            <button
              type="button"
              onClick={() =>
                handlePick(
                  Math.random() > 0.35 ? myChoice : myChoice === "A" ? "B" : "A",
                  isUserA ? "user_b" : "user_a"
                )
              }
              className="rounded-full bg-white dark:bg-slate-700 border border-pink-200 dark:border-slate-600 px-3 py-1 text-[11px] font-medium text-rose-500 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-slate-600 cursor-pointer"
            >
              Simulasikan Pilihan {partnerName}
            </button>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex flex-col items-center rounded-3xl border p-5 text-center ${
            isMatch
              ? "border-pink-200 dark:border-pink-800 bg-gradient-to-b from-[#FECDD3]/25 to-[#BAE6FD]/20 dark:from-pink-950/30 dark:to-slate-900"
              : "border-purple-200 dark:border-purple-800 bg-[#E9D5FF]/20 dark:bg-purple-950/30"
          }`}
        >
          {isMatch ? (
            <>
              <CinnamorollCharacter
                size={112}
                showCloud={false}
                externalBurstKey={state.round}
              />
              <h4 className="text-base font-bold text-rose-600 dark:text-pink-300">
                100% TELEPATI COCOK! ☁️💖
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Kalian berdua kompak memilih jawaban yang sama persis!
              </p>
            </>
          ) : (
            <>
              <KuromiCharacter size={102} celebrateKey={state.round} />
              <h4 className="text-base font-bold text-purple-700 dark:text-purple-300">
                Hehe Beda Pilihan Nih! 💜
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Kata Kuromi: justru seru karena bisa gantian coba dua-duanya bareng!
              </p>
            </>
          )}

          <button
            type="button"
            onClick={handleNextRound}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 dark:from-purple-600 dark:to-pink-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
          >
            <span>Pertanyaan Berikutnya</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
