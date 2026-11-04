"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Heart, Sparkles, Edit3, Check, PartyPopper } from "lucide-react";
import { getSanrioCharacter } from "@/lib/sanrioCharacters";
import { useAudio } from "@/context/AudioContext";
import type { CoupleProfile } from "@/lib/types";

export interface CoupleAnniversaryWidgetProps {
  profile: CoupleProfile;
}

const STORAGE_KEY = "cinnamelo_anniversary_date_v1";
const DEFAULT_DATE = "2024-01-01"; // Fallback anniversary start date

export function CoupleAnniversaryWidget({ profile }: CoupleAnniversaryWidgetProps) {
  const { playPop, playSuccess } = useAudio();
  const [anniversaryDate, setAnniversaryDate] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_DATE;
    }
    return DEFAULT_DATE;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draftDate, setDraftDate] = useState(anniversaryDate);

  const charA = getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const charB = getSanrioCharacter(profile.userBCharacter, "my-melody");

  // Calculate day stats
  const stats = useMemo(() => {
    const start = new Date(anniversaryDate);
    const now = new Date();

    if (isNaN(start.getTime())) {
      return { totalDays: 0, years: 0, months: 0, days: 0, nextMilestoneDays: 100 };
    }

    const diffTime = Math.max(0, now.getTime() - start.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Approximate breakdown
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      days += prevMonthLastDay;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    // Milestones: 100, 200, 365, 500, 730, 1000, 1500, etc.
    const milestones = [100, 200, 365, 500, 730, 1000, 1500, 2000, 3000];
    const nextTarget = milestones.find((m) => m > totalDays) || (Math.floor(totalDays / 500) + 1) * 500;
    const daysUntilMilestone = nextTarget - totalDays;

    return {
      totalDays,
      years: Math.max(0, years),
      months: Math.max(0, months),
      days: Math.max(0, days),
      nextTarget,
      daysUntilMilestone,
    };
  }, [anniversaryDate]);

  const handleSaveDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftDate) return;
    setAnniversaryDate(draftDate);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, draftDate);
    }
    setIsEditing(false);
    playSuccess();
  };

  return (
    <section className="saas-glow-card relative overflow-hidden p-5 sm:p-6">
      {/* Soft Romantic Radial Aura */}
      <div className="pointer-events-none absolute -top-12 -left-12 h-44 w-44 rounded-full bg-[#FECDD3]/35 dark:bg-pink-950/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-[#BAE6FD]/35 dark:bg-sky-950/40 blur-3xl" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
        {/* Left: Avatar Pair with Floating Heart */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex items-center">
            {/* Partner A */}
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="relative z-10 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[#E0F2FE]/70 dark:bg-sky-950/60 border-2 border-sky-200 dark:border-sky-800 shadow-sm"
            >
              <img
                src={charA.svgPath}
                alt={charA.name}
                className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
              />
              <span className="absolute -bottom-1.5 rounded-full bg-sky-500 text-white text-[9px] font-extrabold px-1.5 py-0.2">
                {profile.userAName}
              </span>
            </motion.div>

            {/* Glowing Heart Bridge */}
            <motion.div
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              className="-mx-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-pink-200 dark:border-pink-800 shadow-sm text-rose-500"
            >
              <Heart className="h-4 w-4 fill-rose-500 animate-pulse" />
            </motion.div>

            {/* Partner B */}
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3, delay: 0.5, ease: "easeInOut" }}
              className="relative z-10 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[#FFE4E6]/70 dark:bg-pink-950/60 border-2 border-pink-200 dark:border-pink-800 shadow-sm"
            >
              <img
                src={charB.svgPath}
                alt={charB.name}
                className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
              />
              <span className="absolute -bottom-1.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.2">
                {profile.userBName}
              </span>
            </motion.div>
          </div>
        </div>

        {/* Center: Total Days & Detailed Breakdown */}
        <div className="flex-1 text-center md:text-left min-w-0">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 dark:bg-pink-950/50 border border-pink-200/60 dark:border-pink-800 px-3 py-0.5 text-[11px] font-bold text-rose-600 dark:text-pink-300">
              <Sparkles className="h-3 w-3" />
              <span>Hari Bahagia Kita</span>
            </span>

            <button
              type="button"
              onClick={() => {
                playPop();
                setIsEditing(!isEditing);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-rose-500 dark:hover:text-pink-300 transition-colors"
              title="Ubah Tanggal Jadian"
            >
              <Edit3 className="h-3 w-3" />
              <span>{isEditing ? "Batal" : "Ubah Tanggal"}</span>
            </button>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E293B] dark:text-white">
            {stats.totalDays.toLocaleString("id-ID")}{" "}
            <span className="text-rose-500 dark:text-pink-400 font-bold text-lg sm:text-xl">
              Hari Bersama 💖
            </span>
          </h3>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
            {stats.years > 0 && `${stats.years} Tahun `}
            {stats.months > 0 && `${stats.months} Bulan `}
            {`${stats.days} Hari penuh cinta & tawa.`}
          </p>

          {/* Edit Anniversary Date Form */}
          <AnimatePresence>
            {isEditing && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSaveDate}
                className="mt-3 flex items-center gap-2 overflow-hidden"
              >
                <div className="relative">
                  <input
                    type="date"
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="rounded-xl border border-pink-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-[#1E293B] dark:text-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity"
                >
                  <Check className="h-3 w-3" />
                  <span>Simpan</span>
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Milestone Countdown Pill */}
        <div className="shrink-0 flex flex-col items-center md:items-end justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50/70 dark:from-slate-800 dark:to-purple-950/40 border border-amber-200/70 dark:border-slate-700 px-4 py-3">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-extrabold text-xs">
            <PartyPopper className="h-4 w-4" />
            <span>Target Berikutnya</span>
          </div>
          <p className="mt-0.5 text-sm font-extrabold text-[#1E293B] dark:text-white">
            {stats.nextTarget} Hari
          </p>
          <span className="mt-0.5 text-[10px] font-semibold text-rose-500 dark:text-pink-300">
            H-{stats.daysUntilMilestone} hari lagi! ✨
          </span>
        </div>
      </div>
    </section>
  );
}
