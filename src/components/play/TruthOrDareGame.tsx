"use client";

import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  FileCheck2,
  Mic,
  Plus,
  Send,
  Shuffle,
  Sparkles,
  Zap,
} from "lucide-react";
import { MyMelodyCharacter } from "@/components/characters/MyMelodyCharacter";
import { KuromiCharacter } from "@/components/characters/KuromiCharacter";
import { SWEET_DARE_PROMPTS, TRUTH_PROMPTS } from "@/lib/gameData";
import { useAudio } from "@/context/AudioContext";
import type {
  CoupleGamesState,
  CoupleProfile,
  CustomDareChallenge,
} from "@/lib/types";

export interface TruthOrDareGameProps {
  profile: CoupleProfile;
  state: CoupleGamesState["truthdare"];
  onUpdate: (
    updater: (prev: CoupleGamesState["truthdare"]) => CoupleGamesState["truthdare"]
  ) => void;
  onSendDareProof?: (type: "photo" | "voice" | "text", text: string) => void;
  onNavigateToChat?: () => void;
}

const REACTIONS = ["🥰 Gemes!", "🙈 Malu!", "🔥 Gass!", "💖 Sayang banget!"];

export function TruthOrDareGame({
  profile,
  state,
  onUpdate,
  onSendDareProof,
  onNavigateToChat,
}: TruthOrDareGameProps) {
  const { playPop, playChime, playSuccess } = useAudio();
  const [customText, setCustomText] = useState("");
  const [customType, setCustomType] = useState<"truth" | "dare">("dare");
  const [proofSentSuccess, setProofSentSuccess] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const turnName =
    state.currentTurn === "user_a" ? profile.userAName : profile.userBName;
  const isMyTurn = state.currentTurn === profile.role;

  const handleSetMode = (mode: "auto" | "custom") => {
    playPop();
    onUpdate((prev) => ({ ...prev, mode }));
  };

  const handleSetFilter = (filter: "mix" | "truth" | "dare") => {
    playPop();
    onUpdate((prev) => ({ ...prev, filter }));
  };

  const handleFlipCard = () => {
    playPop();
    onUpdate((prev) => ({ ...prev, isFlipped: !prev.isFlipped }));
  };

  const handleNextCard = () => {
    playChime();
    onUpdate((prev) => {
      const nextType: "truth" | "dare" =
        prev.filter === "truth"
          ? "truth"
          : prev.filter === "dare"
          ? "dare"
          : Math.random() > 0.45
          ? "truth"
          : "dare";

      const pool = nextType === "truth" ? TRUTH_PROMPTS : SWEET_DARE_PROMPTS;
      const nextPrompt =
        pool[(prev.cardCount + Math.floor(Math.random() * pool.length)) % pool.length];

      return {
        ...prev,
        currentTurn: prev.currentTurn === "user_a" ? "user_b" : "user_a",
        cardType: nextType,
        promptText: nextPrompt,
        isFlipped: true,
        reaction: null,
        cardCount: prev.cardCount + 1,
      };
    });
  };

  const handleReaction = (emojiText: string) => {
    playPop();
    onUpdate((prev) => ({ ...prev, reaction: emojiText }));
  };

  // --------------------------------------------------------------------------
  // Custom Challenges Handlers
  // --------------------------------------------------------------------------
  const handleAddToPool = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customText.trim();
    if (!trimmed) return;
    playSuccess();

    const author =
      profile.role === "user_a" ? profile.userAName : profile.userBName;
    const challenge: CustomDareChallenge = {
      id: `cd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      creatorRole: profile.role,
      creatorName: author,
      type: customType,
      text: trimmed,
      createdAt: Date.now(),
    };

    onUpdate((prev) => ({
      ...prev,
      customPool: [challenge, ...(prev.customPool || [])],
    }));
    setCustomText("");
  };

  const handleSendDirectChallenge = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    playChime();

    const author =
      profile.role === "user_a" ? profile.userAName : profile.userBName;

    onUpdate((prev) => ({
      ...prev,
      directChallenge: {
        id: `dc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        senderRole: profile.role,
        senderName: author,
        type: customType,
        text: trimmed,
        receivedAt: Date.now(),
      },
    }));
    setCustomText("");
  };

  const handleDismissDirectChallenge = () => {
    playPop();
    onUpdate((prev) => ({ ...prev, directChallenge: null }));
  };

  const handleCompleteProof = (type: "photo" | "voice" | "text") => {
    playSuccess();
    setProofSentSuccess(true);
    const textDesc = state.directChallenge?.text || state.promptText;

    if (onSendDareProof) {
      onSendDareProof(type, textDesc);
    }

    setTimeout(() => {
      setProofSentSuccess(false);
      if (onNavigateToChat) {
        onNavigateToChat();
      }
    }, 1200);
  };

  return (
    <div className="rounded-3xl border border-pink-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 shadow-card space-y-6">
      {/* Hidden photo input for proof */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={() => handleCompleteProof("photo")}
        className="hidden"
      />

      {/* DIRECT SECRET CHALLENGE ALERT BANNER (If Active) */}
      <AnimatePresence>
        {state.directChallenge && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            className="relative overflow-hidden rounded-3xl border-2 border-rose-300 dark:border-pink-500 bg-gradient-to-r from-rose-50 via-pink-50 to-purple-50 dark:from-slate-800 dark:via-purple-950/50 dark:to-slate-800 p-5 shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-sm">
                  <Zap className="h-5 w-5 animate-pulse" />
                </span>
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-300">
                    Tantangan Rahasia Langsung!
                  </span>
                  <h4 className="text-sm font-extrabold text-[#1E293B] dark:text-white mt-0.5">
                    Dari {state.directChallenge.senderName}:
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismissDirectChallenge}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Tutup
              </button>
            </div>

            <p className="mt-3 text-sm sm:text-base font-bold text-[#1E293B] dark:text-slate-100 leading-relaxed bg-white/70 dark:bg-slate-900/70 p-3.5 rounded-2xl border border-pink-100 dark:border-slate-700">
              &ldquo;{state.directChallenge.text}&rdquo;
            </p>

            {/* Proof Buttons */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-pink-200/50 dark:border-slate-700">
              <span className="text-xs font-semibold text-rose-500">
                Selesaikan tantangan &amp; kirim buktinya:
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-600 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Bukti Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCompleteProof("voice")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1E293B] dark:bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-90 transition-opacity"
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>Bukti Suara di Chat ↗</span>
                </button>
              </div>
            </div>

            {proofSentSuccess && (
              <p className="mt-2 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-bounce">
                🎉 Bukti siap dikirim! Membuka tab Chat...
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER & DUAL MODE SELECTOR */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-pink-100/70 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Kartu #{state.cardCount} • Giliran {turnName}
          </span>
          <h3 className="text-base font-bold text-[#334155] dark:text-white">
            Truth or Sweet Dare 🃏
          </h3>
        </div>

        {/* Dual Mode Switcher: Otomatis vs Manual */}
        <div className="inline-flex rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-pink-100 dark:border-slate-700 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleSetMode("auto")}
            className={`rounded-full px-3.5 py-1.5 transition-all cursor-pointer ${
              state.mode !== "custom"
                ? "bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            🎲 Mode 1: Otomatis
          </button>
          <button
            type="button"
            onClick={() => handleSetMode("custom")}
            className={`rounded-full px-3.5 py-1.5 transition-all cursor-pointer ${
              state.mode === "custom"
                ? "bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            ✍️ Mode 2: Manual
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODE 1: OTOMATIS (RANDOM CURATED DECK)                               */}
      {/* ==================================================================== */}
      {state.mode !== "custom" && (
        <div className="space-y-5">
          {/* Deck Filter: Mix / Truth / Dare */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Pilih jenis kartu:</span>
            <div className="inline-flex rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-pink-100 dark:border-slate-700 p-0.5 text-[11px] font-medium">
              {(
                [
                  { id: "mix", label: "🎲 Campur" },
                  { id: "truth", label: "💌 Truth" },
                  { id: "dare", label: "🎀 Dare" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSetFilter(f.id)}
                  className={`rounded-full px-2.5 py-1 transition-all ${
                    state.filter === f.id
                      ? "bg-rose-500 text-white font-bold"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Flip Card */}
          <div className="flex flex-col items-center">
            <motion.div
              onClick={handleFlipCard}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              animate={{ rotateY: state.isFlipped ? 0 : 180 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className={`relative w-full max-w-md min-h-[240px] cursor-pointer rounded-3xl border-2 p-6 flex flex-col items-center justify-center text-center shadow-soft ${
                !state.isFlipped
                  ? "border-pink-200 bg-gradient-to-br from-[#BAE6FD]/35 via-white to-[#FECDD3]/40 dark:from-purple-950/40 dark:via-slate-900 dark:to-indigo-950/40"
                  : state.cardType === "truth"
                  ? "border-pink-200 bg-gradient-to-b from-[#FFF1F2] to-white dark:from-rose-950/30 dark:to-slate-900"
                  : "border-purple-200 bg-gradient-to-b from-[#FAF5FF] to-white dark:from-purple-950/30 dark:to-slate-900"
              }`}
            >
              {!state.isFlipped ? (
                <div
                  style={{ transform: "rotateY(180deg)" }}
                  className="space-y-2"
                >
                  <MyMelodyCharacter size={92} withEnvelope />
                  <p className="text-sm font-bold text-[#334155] dark:text-white">
                    Kartu Rahasia untuk {turnName}
                  </p>
                  <p className="text-xs text-slate-400">
                    Ketuk kartu ini untuk membuka bersama pasanganmu ✨
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    {state.cardType === "truth" ? (
                      <MyMelodyCharacter size={78} />
                    ) : (
                      <KuromiCharacter size={78} celebrateKey={state.cardCount} />
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      state.cardType === "truth"
                        ? "bg-[#FECDD3]/60 text-rose-600 dark:text-rose-300"
                        : "bg-[#E9D5FF]/75 text-purple-700 dark:text-purple-300"
                    }`}
                  >
                    <Sparkles className="h-3 w-3" />
                    {state.cardType === "truth"
                      ? `Jujur dari Hati (${turnName})`
                      : `Tantangan Manis (${turnName})`}
                  </span>

                  <p className="text-sm sm:text-base font-semibold leading-relaxed text-[#334155] dark:text-slate-100">
                    &ldquo;{state.promptText}&rdquo;
                  </p>

                  {state.cardType === "dare" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        photoInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-rose-600 transition-colors"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>Bukti Selesai (Kirim ke Chat)</span>
                    </button>
                  )}

                  {state.reaction && (
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="inline-block rounded-full bg-white dark:bg-slate-800 border border-pink-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-rose-500 shadow-sm"
                    >
                      Reaksi Pasangan: {state.reaction}
                    </motion.span>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Quick Reactions & Next Draw */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {REACTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleReaction(r)}
                  className={`rounded-full border px-3 py-1 text-xs transition-all ${
                    state.reaction === r
                      ? "border-rose-300 bg-pink-50 text-rose-600 font-semibold dark:bg-rose-950/60"
                      : "border-slate-200/80 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-pink-200"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleNextCard}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity shrink-0 cursor-pointer"
            >
              <Shuffle className="h-3.5 w-3.5" />
              <span>Kocok Kartu Berikutnya</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODE 2: MANUAL (CUSTOM CHALLENGE & SHARED POOL)                      */}
      {/* ==================================================================== */}
      {state.mode === "custom" && (
        <div className="space-y-6">
          {/* Create Custom Challenge Form */}
          <form
            onSubmit={handleAddToPool}
            className="rounded-2xl border border-pink-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/60 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1E293B] dark:text-white">
                Tulis Tantangan Kustom untuk Pasanganmu:
              </span>

              <div className="inline-flex rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setCustomType("truth")}
                  className={`rounded-full px-2.5 py-0.5 font-semibold ${
                    customType === "truth"
                      ? "bg-rose-100 text-rose-600 dark:bg-rose-950"
                      : "text-slate-400"
                  }`}
                >
                  Truth
                </button>
                <button
                  type="button"
                  onClick={() => setCustomType("dare")}
                  className={`rounded-full px-2.5 py-0.5 font-semibold ${
                    customType === "dare"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-950"
                      : "text-slate-400"
                  }`}
                >
                  Dare
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={
                customType === "truth"
                  ? "Tanyakan sesuatu yang bikin deg-degan atau penasaran..."
                  : "Beri tantangan seru, misalnya tirukan pose karakter favorit atau nyanyikan lagu cinta 💖"
              }
              className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs sm:text-sm text-[#1E293B] dark:text-white placeholder:text-slate-400 focus:border-pink-300 focus:outline-none"
            />

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="submit"
                disabled={!customText.trim()}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Simpan ke Pool Bersama</span>
              </button>

              <button
                type="button"
                disabled={!customText.trim()}
                onClick={handleSendDirectChallenge}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-600 disabled:opacity-40 transition-colors"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Kirim Langsung Sekarang ⚡</span>
              </button>
            </div>
          </form>

          {/* Shared Custom Pool List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pool Tantangan Buatan Kalian ({state.customPool?.length || 0}):
            </h4>

            {(!state.customPool || state.customPool.length === 0) && (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400">
                Belum ada tantangan kustom di pool. Buat tantangan pertama kalian di atas! ☁️
              </div>
            )}

            <div className="space-y-2">
              {state.customPool?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-3.5 shadow-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        item.type === "truth"
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-950/60"
                      }`}
                    >
                      {item.type.toUpperCase()} • dari {item.creatorName}
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-white">
                      &ldquo;{item.text}&rdquo;
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playChime();
                      onUpdate((prev) => ({
                        ...prev,
                        directChallenge: {
                          id: item.id,
                          senderRole: item.creatorRole,
                          senderName: item.creatorName,
                          type: item.type,
                          text: item.text,
                          receivedAt: Date.now(),
                        },
                      }));
                    }}
                    className="shrink-0 rounded-full bg-rose-50 dark:bg-slate-700 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-pink-300 hover:bg-rose-100 transition-colors"
                  >
                    Mainkan ⚡
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
