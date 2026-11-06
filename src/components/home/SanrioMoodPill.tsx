"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Edit3, Heart, Smile, Sparkles, X } from "lucide-react";
import { useAudio } from "@/context/AudioContext";
import {
  getSanrioCharacter,
  type SanrioCharacterId,
} from "@/lib/sanrioCharacters";
import type { CoupleProfile, PartnerMoodStatus } from "@/lib/types";

export interface SanrioMoodPillProps {
  profile: CoupleProfile;
  myMood: PartnerMoodStatus;
  partnerMood: PartnerMoodStatus | null;
  onUpdateMood: (status: {
    characterId?: SanrioCharacterId;
    statusText: string;
    emoji: string;
  }) => void;
}

const PRESET_MOODS: Array<{
  id: string;
  characterId: SanrioCharacterId;
  statusText: string;
  emoji: string;
  label: string;
}> = [
  {
    id: "kangen",
    characterId: "cinnamoroll",
    statusText: "Kangen ☁️",
    emoji: "☁️",
    label: "Cinnamoroll: Kangen ☁️",
  },
  {
    id: "peluk",
    characterId: "kuromi",
    statusText: "Butuh Peluk 💜",
    emoji: "💜",
    label: "Kuromi: Butuh Peluk 💜",
  },
  {
    id: "semangat",
    characterId: "my-melody",
    statusText: "Semangat! 🌸",
    emoji: "🌸",
    label: "My Melody: Semangat! 🌸",
  },
  {
    id: "lapar",
    characterId: "pompompurin",
    statusText: "Lapar 🍮",
    emoji: "🍮",
    label: "Pompompurin: Lapar 🍮",
  },
  {
    id: "jalan",
    characterId: "pochacco",
    statusText: "Jalan-jalan 🐾",
    emoji: "🐾",
    label: "Pochacco: Jalan-jalan 🐾",
  },
  {
    id: "happy",
    characterId: "hello-kitty",
    statusText: "Happy Banget ✨",
    emoji: "✨",
    label: "Hello Kitty: Happy Banget ✨",
  },
];

export function SanrioMoodPill({
  profile,
  myMood,
  partnerMood,
  onUpdateMood,
}: SanrioMoodPillProps) {
  const { playPop, playSuccess } = useAudio();
  const [openModal, setOpenModal] = useState(false);
  const [customText, setCustomText] = useState("");

  const myName =
    profile.role === "user_a" ? profile.userAName : profile.userBName;
  const partnerName =
    profile.role === "user_a" ? profile.userBName : profile.userAName;

  const partnerCharId =
    profile.role === "user_a"
      ? profile.userBCharacter
      : profile.userACharacter;
  const partnerMeta = getSanrioCharacter(
    partnerCharId || partnerMood?.characterId,
    "my-melody"
  );

  const myCharId =
    profile.role === "user_a"
      ? profile.userACharacter
      : profile.userBCharacter;
  const myMeta = getSanrioCharacter(
    myCharId || myMood.characterId,
    "cinnamoroll"
  );

  const handleSelectPreset = (preset: (typeof PRESET_MOODS)[0]) => {
    playSuccess();
    onUpdateMood({
      characterId: myCharId || preset.characterId,
      statusText: preset.statusText,
      emoji: preset.emoji,
    });
    setOpenModal(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    playSuccess();
    onUpdateMood({
      characterId: myCharId,
      statusText: customText.trim(),
      emoji: "💖",
    });
    setCustomText("");
    setOpenModal(false);
  };

  return (
    <>
      {/* Interactive Mood Bar Widget */}
      <div className="flex flex-wrap items-center gap-2">
        {/* My Mood Pill (Clickable) */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            playPop();
            setOpenModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-pink-200/80 dark:border-purple-800/80 px-3.5 py-1.5 text-xs font-semibold text-[#1E293B] dark:text-slate-100 shadow-sm hover:border-pink-300 dark:hover:border-purple-600 transition-all cursor-pointer"
          title="Klik untuk mengubah mood kamu sekarang"
        >
          <img
            src={myMeta.svgPath}
            alt={myMeta.name}
            className="h-4 w-4 object-contain"
          />
          <span className="text-slate-500 dark:text-slate-400 font-normal">
            {myName}:
          </span>
          <span className="text-pink-600 dark:text-pink-300 font-bold flex items-center gap-1">
            {myMood.statusText}
          </span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </motion.button>

        {/* Partner Mood Pill (Live Synchronized) */}
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50/90 dark:bg-slate-800/90 border border-sky-200/80 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-[#1E293B] dark:text-slate-100 shadow-sm">
          <img
            src={partnerMeta.svgPath}
            alt={partnerMeta.name}
            className="h-4 w-4 object-contain"
          />
          <span className="text-slate-500 dark:text-slate-400 font-normal">
            {partnerName}:
          </span>
          <span className="text-sky-600 dark:text-sky-300 font-bold">
            {partnerMood ? partnerMood.statusText : "Sedang santai 🌸"}
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* Mood Selector Modal */}
      <AnimatePresence>
        {openModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-[28px] bg-white dark:bg-slate-900 border border-pink-100 dark:border-slate-800 p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-pink-50 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-pink-100 dark:bg-pink-950/60 flex items-center justify-center text-pink-500">
                    <Smile className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B] dark:text-white">
                      Bagikan Mood Sanrio-mu ☁️
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tersinkronisasi langsung ke layar pasanganmu
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playPop();
                    setOpenModal(false);
                  }}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Preset Mood Options */}
              <div className="grid grid-cols-2 gap-2">
                {PRESET_MOODS.map((preset) => {
                  const meta = getSanrioCharacter(
                    preset.characterId,
                    "cinnamoroll"
                  );
                  const isSelected = myMood.statusText === preset.statusText;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`flex items-center gap-2 rounded-2xl p-2.5 text-left text-xs font-semibold transition-all border ${
                        isSelected
                          ? "bg-pink-50 dark:bg-purple-950/50 border-pink-300 dark:border-purple-600 text-pink-700 dark:text-pink-300 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 text-[#1E293B] dark:text-slate-200 hover:bg-pink-50/50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <img
                        src={meta.svgPath}
                        alt={meta.name}
                        className="h-5 w-5 object-contain shrink-0"
                      />
                      <span className="truncate">{preset.statusText}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Status Input Form */}
              <form onSubmit={handleCustomSubmit} className="space-y-2 pt-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Edit3 className="h-3 w-3 text-pink-500" />
                  <span>Atau tulis status manismu sendiri:</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    maxLength={32}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Contoh: Mau ngopi bareng sore ini ☕"
                    className="flex-1 rounded-full border border-pink-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs text-[#1E293B] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-purple-600"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95 cursor-pointer shrink-0"
                  >
                    Kirim
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
