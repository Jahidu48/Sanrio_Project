"use client";

import React from "react";
import { Check, Flame, Gift, Heart, Trophy } from "lucide-react";
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

  const todayJsDay = new Date().getDay();
  const todayMonIndex = todayJsDay === 0 ? 6 : todayJsDay - 1;

  const bucketPercent =
    bucketItems.length > 0
      ? Math.round((completedBuckets / bucketItems.length) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Card 1: Daily Couple Activity Progress */}
      <div className="scrapbook-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-bold text-[#2D232E] dark:text-[#FAF5F7]">
            Kegiatan Hari Ini
          </h3>
          <span className="rounded-full bg-rose-50 dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:text-pink-300">
            {ringPercent}% Selesai
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Circular Progress Ring */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 88 88">
              <circle
                cx="44"
                cy="44"
                r="36"
                fill="none"
                stroke="currentColor"
                className="text-[#F3D8DF] dark:text-[#3B2E40]"
                strokeWidth="7"
              />
              <circle
                cx="44"
                cy="44"
                r="36"
                fill="none"
                stroke="#F43F5E"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-500 mb-0.5" />
              <span className="text-sm font-extrabold text-[#2D232E] dark:text-white">
                {missionsDone} / 4
              </span>
              <span className="text-[11px] text-[#6E5A68] dark:text-[#B8A6B5]">
                Hari ini
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1 text-xs">
            <p className="font-bold text-[#2D232E] dark:text-white">
              {missionsDone === 4
                ? "Lengkap! Kalian kompak banget hari ini"
                : "Lengkapi momen kalian hari ini"}
            </p>
            <p className="text-xs leading-relaxed text-[#6E5A68] dark:text-[#B8A6B5]">
              Kirim detak rindu, isi surat harian, dan main satu ronde game berdua.
            </p>
          </div>
        </div>

        {/* Mon - Sun Check Bubbles */}
        <div className="mt-4 grid grid-cols-7 gap-1 pt-3 border-t border-[#F3D8DF] dark:border-[#3B2E40]">
          {WEEK_DAYS.map((day, idx) => {
            const checked = idx <= todayMonIndex;
            return (
              <div key={day} className="flex flex-col items-center gap-1">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    checked
                      ? "bg-rose-500 text-white"
                      : "border border-[#F3D8DF] dark:border-[#3B2E40] bg-[#FFFBF5] dark:bg-[#2E2433] text-transparent"
                  }`}
                >
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-[11px] font-medium text-[#6E5A68] dark:text-[#B8A6B5]">
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 2: Couple Game Scoreboard */}
      <div className="scrapbook-card p-5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="font-display text-sm font-bold text-[#2D232E] dark:text-[#FAF5F7]">
              Papan Skor Kita
            </h3>
          </div>
          <button
            type="button"
            onClick={onOpenCharacterModal}
            className="rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] px-2.5 py-1 text-xs font-semibold text-[#6E5A68] dark:text-[#B8A6B5] hover:text-rose-600 transition-colors cursor-pointer"
          >
            Ubah Karakter
          </button>
        </div>

        <div className="space-y-2.5">
          {/* Partner A Row */}
          <div className="flex items-center justify-between rounded-2xl bg-[#F0F9FF] dark:bg-sky-950/35 border border-sky-200/70 dark:border-sky-900/60 px-3 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={charA.svgPath}
                alt={charA.name}
                className="h-8 w-8 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[#2D232E] dark:text-white">
                  {profile.userAName}
                </p>
                <p className="truncate text-[11px] text-sky-700 dark:text-sky-300">
                  {charA.name}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-sky-700 dark:text-sky-300">
              {gamesState.tictac.scoreA} menang
            </span>
          </div>

          {/* Partner B Row */}
          <div className="flex items-center justify-between rounded-2xl bg-[#FFF1F2] dark:bg-rose-950/35 border border-rose-200/70 dark:border-rose-900/60 px-3 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={charB.svgPath}
                alt={charB.name}
                className="h-8 w-8 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[#2D232E] dark:text-white">
                  {profile.userBName}
                </p>
                <p className="truncate text-[11px] text-rose-600 dark:text-pink-300">
                  {charB.name}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-600 dark:text-pink-300">
              {gamesState.tictac.scoreB} menang
            </span>
          </div>

          {/* Team Telepathy & Doodle Row */}
          <div className="flex items-center justify-between rounded-2xl bg-[#FFFBF5] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] px-3 py-2 text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-400" />
              Skor Kompak (Telepati &amp; Gambar)
            </span>
            <strong className="text-[#2D232E] dark:text-white font-bold">
              {gamesState.telepathy.matchedCount + gamesState.doodle.teamScore} poin
            </strong>
          </div>
        </div>
      </div>

      {/* Card 3: Daftar Impian Berdua */}
      <div className="rounded-3xl scrapbook-stitched bg-[#FFFBF5] dark:bg-[#221B25] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] text-rose-500">
            <Gift className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#6E5A68] dark:text-[#B8A6B5]">
              Rencana Kencan &amp; Harapan
            </p>
            <h4 className="font-display text-sm font-bold text-[#2D232E] dark:text-white">
              Daftar Impian Kita
            </h4>
          </div>
        </div>

        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6E5A68] dark:text-[#B8A6B5]">
            <span>Sudah terwujud</span>
            <span>
              {completedBuckets} dari {bucketItems.length}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white dark:bg-[#2E2433] p-0.5 border border-[#F3D8DF] dark:border-[#3B2E40]">
            <div
              className="h-full rounded-full bg-rose-400 transition-all duration-500"
              style={{ width: `${bucketPercent}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab("journal")}
          className="scrapbook-pill-btn mt-3.5 w-full cursor-pointer"
        >
          <span>Buka Daftar Impian &amp; Jurnal</span>
        </button>
      </div>
    </div>
  );
}
