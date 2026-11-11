"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Edit3, Smile, X } from "lucide-react";
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
    label: "Kangen ☁️",
  },
  {
    id: "peluk",
    characterId: "kuromi",
    statusText: "Butuh Peluk 🎀",
    emoji: "🎀",
    label: "Butuh Peluk 🎀",
  },
  {
    id: "semangat",
    characterId: "my-melody",
    statusText: "Semangat! 🌸",
    emoji: "🌸",
    label: "Semangat! 🌸",
  },
  {
    id: "lapar",
    characterId: "pompompurin",
    statusText: "Lapar 🍮",
    emoji: "🍮",
    label: "Lapar 🍮",
  },
  {
    id: "jalan",
    characterId: "pochacco",
    statusText: "Jalan-jalan 🐾",
    emoji: "🐾",
    label: "Jalan-jalan 🐾",
  },
  {
    id: "happy",
    characterId: "hello-kitty",
    statusText: "Senang Banget 🍓",
    emoji: "🍓",
    label: "Senang Banget 🍓",
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
      emoji: "🌸",
    });
    setCustomText("");
    setOpenModal(false);
  };

  return (
    <>
      {/* Interactive Mood Bar Widget */}
      <div className="flex flex-wrap items-center gap-2">
        {/* My Mood Pill */}
        <button
          type="button"
          onClick={() => {
            playPop();
            setOpenModal(true);
          }}
          className="inline-flex min-h-9 items-center gap-2 rounded-full bg-white dark:bg-[#221B25] border border-[#F3D8DF] dark:border-[#3B2E40] px-3.5 py-1.5 text-xs font-semibold text-[#2D232E] dark:text-[#FAF5F7] shadow-2xs hover:border-rose-300 transition-colors cursor-pointer"
          title="Ketuk untuk mengganti suasana hatimu"
        >
          <img
            src={myMeta.svgPath}
            alt={myMeta.name}
            className="h-4 w-4 object-contain"
          />
          <span className="text-[#6E5A68] dark:text-[#B8A6B5] font-normal">
            {myName}:
          </span>
          <span className="text-rose-600 dark:text-pink-300 font-bold flex items-center gap-1">
            {myMood.statusText}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[#6E5A68]" />
        </button>

        {/* Partner Mood Pill */}
        <div className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] px-3.5 py-1.5 text-xs font-semibold text-[#2D232E] dark:text-[#FAF5F7]">
          <img
            src={partnerMeta.svgPath}
            alt={partnerMeta.name}
            className="h-4 w-4 object-contain"
          />
          <span className="text-[#6E5A68] dark:text-[#B8A6B5] font-normal">
            {partnerName}:
          </span>
          <span className="text-sky-700 dark:text-sky-300 font-bold">
            {partnerMood ? partnerMood.statusText : "Sedang santai 🌸"}
          </span>
        </div>
      </div>

      {/* Mood Selector Modal */}
      <AnimatePresence>
        {openModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#18131A]/55">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="w-full max-w-sm rounded-3xl bg-[#FFFDF9] dark:bg-[#221B25] border-2 border-[#F3D8DF] dark:border-[#3B2E40] p-5 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#F3D8DF] dark:border-[#3B2E40]">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-rose-50 dark:bg-[#2E2433] flex items-center justify-center text-rose-500">
                    <Smile className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-[#2D232E] dark:text-white">
                      Kabar Suasana Hatimu
                    </h3>
                    <p className="text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
                      Langsung tampil di layar {partnerName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playPop();
                    setOpenModal(false);
                  }}
                  aria-label="Tutup pilihan mood"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#6E5A68] hover:bg-rose-50 dark:hover:bg-[#2E2433] cursor-pointer"
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
                      className={`flex items-center gap-2 rounded-2xl p-2.5 text-left text-xs font-semibold transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-rose-50 dark:bg-[#3B2E40] border-rose-400 text-rose-700 dark:text-pink-200"
                          : "bg-white dark:bg-[#2E2433] border-[#F3D8DF] dark:border-[#3B2E40] text-[#2D232E] dark:text-[#FAF5F7] hover:border-rose-300"
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
                <label className="text-xs font-bold text-[#2D232E] dark:text-[#FAF5F7] flex items-center gap-1.5">
                  <Edit3 className="h-3.5 w-3.5 text-rose-500" />
                  <span>Atau tulis statusmu sendiri:</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    maxLength={32}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Contoh: Mau ngopi sore ini ☕"
                    className="flex-1 rounded-full border border-[#F3D8DF] dark:border-[#3B2E40] bg-white dark:bg-[#18131A] px-3.5 py-2 text-xs text-[#2D232E] dark:text-white placeholder:text-[#6E5A68]/60 focus:outline-none focus:border-rose-400"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-rose-500 hover:bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-2xs cursor-pointer shrink-0"
                  >
                    Simpan
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
