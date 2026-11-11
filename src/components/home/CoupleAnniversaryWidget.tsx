"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarHeart, Edit3, Check, PartyPopper } from "lucide-react";
import { useAudio } from "@/context/AudioContext";
import type { CoupleProfile } from "@/lib/types";

export interface CoupleAnniversaryWidgetProps {
  profile: CoupleProfile;
  anniversaryDate: string;
  onUpdateAnniversaryDate: (date: string) => void;
}

export function CoupleAnniversaryWidget({
  anniversaryDate,
  onUpdateAnniversaryDate,
}: CoupleAnniversaryWidgetProps) {
  const { playPop, playSuccess } = useAudio();
  const [isEditing, setIsEditing] = useState(false);
  const [draftDate, setDraftDate] = useState(anniversaryDate);

  useEffect(() => {
    if (!isEditing) {
      setDraftDate(anniversaryDate);
    }
  }, [anniversaryDate, isEditing]);

  const stats = useMemo(() => {
    const start = new Date(anniversaryDate);
    const now = new Date();

    if (isNaN(start.getTime())) {
      return {
        totalDays: 0,
        years: 0,
        months: 0,
        days: 0,
        nextTarget: 100,
        daysUntilMilestone: 100,
      };
    }

    const diffTime = Math.max(0, now.getTime() - start.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonthLastDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        0
      ).getDate();
      days += prevMonthLastDay;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const milestones = [100, 200, 365, 500, 730, 1000, 1500, 2000, 3000];
    const nextTarget =
      milestones.find((m) => m > totalDays) ||
      (Math.floor(totalDays / 500) + 1) * 500;
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
    onUpdateAnniversaryDate(draftDate);
    setIsEditing(false);
    playSuccess();
  };

  return (
    <section className="scrapbook-card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Calendar Badge & Days Together */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] text-rose-500">
            <CalendarHeart className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-rose-600 dark:text-pink-300">
                Hari Bahagia Kita
              </span>
              <button
                type="button"
                onClick={() => {
                  playPop();
                  setIsEditing(!isEditing);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] px-2.5 py-0.5 text-xs font-medium text-[#6E5A68] dark:text-[#B8A6B5] hover:text-rose-500 transition-colors cursor-pointer"
                title="Ubah Tanggal Jadian"
              >
                <Edit3 className="h-3 w-3" />
                <span>{isEditing ? "Batal" : "Atur Tanggal"}</span>
              </button>
            </div>

            <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#2D232E] dark:text-[#FAF5F7]">
                {stats.totalDays.toLocaleString("id-ID")} Hari Bersama
              </h3>
              <span className="text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
                ({stats.years > 0 ? `${stats.years} tahun ` : ""}
                {stats.months > 0 ? `${stats.months} bulan ` : ""}
                {stats.days} hari)
              </span>
            </div>

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
                  <input
                    type="date"
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="rounded-xl border border-[#F3D8DF] dark:border-[#3B2E40] bg-white dark:bg-[#18131A] px-3 py-1.5 text-xs font-semibold text-[#2D232E] dark:text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-xl bg-rose-500 hover:bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Simpan</span>
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Milestone Countdown Pill */}
        <div className="shrink-0 flex items-center sm:flex-col sm:items-end justify-between rounded-2xl scrapbook-stitched bg-[#FFFBF5] dark:bg-[#2E2433] px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-xs">
            <PartyPopper className="h-4 w-4" />
            <span>Menuju {stats.nextTarget} Hari</span>
          </div>
          <span className="text-xs font-semibold text-rose-500 dark:text-pink-300">
            {stats.daysUntilMilestone} hari lagi
          </span>
        </div>
      </div>
    </section>
  );
}
