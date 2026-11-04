"use client";

import React from "react";
import { Check, Flame, Gift, Sparkles, Trophy } from "lucide-react";
import { getSanrioCharacter } from "@/lib/sanrioCharacters";
import type {
  AppTab,
  BucketItem,
  CoupleGamesState,
  CoupleProfile,
  DailyQnA,
} from "@/lib/types";

export interface CoupleStatsSidebarCardsProps {
  profile: CoupleProfile;
  todayQnA: DailyQnA;
  heartbeatCount: number;
  gamesState: CoupleGamesState;
  bucketItems: BucketItem[];
  onNavigateTab: (tab: AppTab) => void;
  onOpenCharacterModal: () => void;
}

const WEEK_DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function CoupleStatsSidebarCards({
  profile,
  todayQnA,
  heartbeatCount,
  gamesState,
  bucketItems,
  onNavigateTab,
  onOpenCharacterModal,
}: CoupleStatsSidebarCardsProps) {
  const charA = getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const charB = getSanrioCharacter(profile.userBCharacter, "my-melody");

  const hasHeartbeat = heartbeatCount > 0;
  const hasAnsweredToday = Boolean(
    todayQnA.user_a_answer || todayQnA.user_b_answer
  );
  const hasPlayedGame =
    gamesState.telepathy.totalCompleted > 0 ||
    gamesState.tictac.scoreA + gamesState.tictac.scoreB > 0 ||
    gamesState.doodle.teamScore > 0 ||
    gamesState.truthdare.cardCount > 1;
  const completedBuckets = bucketItems.filter((b) => b.is_completed).length;
  const hasBucket = completedBuckets > 0;

  const missionsDone =
    Number(hasHeartbeat) +
    Number(hasAnsweredToday) +
    Number(hasPlayedGame) +
    Number(hasBucket);
  const ringPercent = Math.round((missionsDone / 4) * 100);
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (ringPercent / 100) * circumference;

  const todayJsDay = new Date().getDay(); // 0=Sun..6=Sat
  const todayMonIndex = todayJsDay === 0 ? 6 : todayJsDay - 1;

  const bucketPercent =
    bucketItems.length > 0
      ? Math.round((completedBuckets / bucketItems.length) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Card 1: Lingora "Your Daily Goal" Circular Ring Card */}
      <div className="saas-glow-card p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#BAE6FD]/35 blur-2xl" />

        <div className="relative z-10 flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#1E293B] dark:text-white">
            Misi Manis Hari Ini
          </h3>
          <span className="rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 px-2.5 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-300">
            {ringPercent}% Selesai
          </span>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          {/* Circular SVG Progress Ring */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 88 88">
              <circle
                cx="44"
                cy="44"
                r="36"
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
                strokeWidth="7"
              />
              <circle
                cx="44"
                cy="44"
                r="36"
                fill="none"
                stroke="#0284C7"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-500 mb-0.5" />
              <span className="text-sm font-extrabold text-[#1E293B] dark:text-white">
                {missionsDone} / 4
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500">Hari ini</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5 text-xs">
            <p className="font-bold text-[#1E293B] dark:text-white">
              {missionsDone === 4
                ? "Kompak banget hari ini! 💖"
                : "Yuk lengkapi momen kalian!"}
            </p>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-300">
              Kirim detak rindu, buka amplop My Melody, &amp; main 1 ronde game berdua.
            </p>
          </div>
        </div>

        {/* Mon - Sun Check Bubbles (Lingora Style) */}
        <div className="relative z-10 mt-4 grid grid-cols-7 gap-1 pt-3 border-t border-slate-100 dark:border-slate-800">
          {WEEK_DAYS.map((day, idx) => {
            const checked = idx <= todayMonIndex;
            return (
              <div key={day} className="flex flex-col items-center gap-1">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                    checked
                      ? "bg-[#0284C7] dark:bg-sky-500 text-white shadow-sm"
                      : "border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-transparent"
                  }`}
                >
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-[9px] font-medium text-slate-400 dark:text-slate-400">
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 2: Lingora "Leaderboard" -> Couple Score & Avatar Card */}
      <div className="saas-glow-card p-5">
        <div className="pointer-events-none absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-[#FECDD3]/30 blur-2xl" />

        <div className="relative z-10 flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-[#1E293B] dark:text-white">
              Skor &amp; Karakter Kita
            </h3>
          </div>
          <button
            type="button"
            onClick={onOpenCharacterModal}
            className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-purple-900/40 hover:text-rose-600 dark:hover:text-pink-300 transition-colors"
          >
            Ubah Avatar
          </button>
        </div>

        <div className="relative z-10 space-y-2.5">
          {/* Partner A Row */}
          <div className="flex items-center justify-between rounded-2xl bg-[#E0F2FE]/55 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 px-3 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-300 text-[10px] font-extrabold text-amber-950">
                A
              </span>
              <img
                src={charA.svgPath}
                alt={charA.name}
                className="h-8 w-8 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[#1E293B] dark:text-white">
                  {profile.userAName}
                </p>
                <p className="truncate text-[10px] text-sky-700 dark:text-sky-300">
                  {charA.name}
                </p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-[#0369A1] dark:text-sky-300">
              {gamesState.tictac.scoreA} menang
            </span>
          </div>

          {/* Partner B Row */}
          <div className="flex items-center justify-between rounded-2xl bg-[#FFE4E6]/55 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900/60 px-3 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-300 text-[10px] font-extrabold text-rose-950">
                B
              </span>
              <img
                src={charB.svgPath}
                alt={charB.name}
                className="h-8 w-8 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[#1E293B] dark:text-white">
                  {profile.userBName}
                </p>
                <p className="truncate text-[10px] text-rose-600 dark:text-pink-300">
                  {charB.name}
                </p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-rose-600 dark:text-pink-400">
              {gamesState.tictac.scoreB} menang
            </span>
          </div>

          {/* Team Telepathy & Doodle Row */}
          <div className="flex items-center justify-between rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
              Kompak Telepati &amp; Doodle
            </span>
            <strong className="text-[#1E293B] dark:text-white font-bold">
              {gamesState.telepathy.matchedCount + gamesState.doodle.teamScore} poin
            </strong>
          </div>
        </div>
      </div>

      {/* Card 3: Lingora Gift / Bucket List Progress Card */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-100 dark:border-slate-800 bg-gradient-to-br from-[#E6F4FE] via-[#F2F8FF] to-[#FFF1F5] dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-pink-100 dark:border-purple-800 shadow-sm text-rose-500 dark:text-pink-400">
            <Gift className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Wishlist Kencan Berdua
            </p>
            <h4 className="text-sm font-extrabold text-[#1E293B] dark:text-white">
              Couple Bucket List ✨
            </h4>
          </div>
        </div>

        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <span>Terwujud bersama</span>
            <span>
              {completedBuckets} / {bucketItems.length}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/80 dark:bg-slate-800 p-0.5 border border-slate-100 dark:border-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#38BDF8] via-[#FB7185] to-[#C084FC] transition-all duration-500"
              style={{ width: `${bucketPercent}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab("journal")}
          className="saas-pill-btn mt-3.5 w-full"
        >
          <span>Buka Wishlist &amp; Jurnal</span>
        </button>
      </div>
    </div>
  );
}
