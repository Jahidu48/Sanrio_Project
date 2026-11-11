"use client";

import React from "react";
import {
  BookHeart,
  ChevronRight,
  HeartHandshake,
  MessageCircleHeart,
  Palette,
} from "lucide-react";
import { useAudio } from "@/context/AudioContext";
import type { ActiveGameId, AppTab } from "@/lib/types";

export interface SaasQuickExploreGridProps {
  onNavigateTab: (tab: AppTab) => void;
  onJumpToGame: (game: ActiveGameId) => void;
}

export function SaasQuickExploreGrid({
  onNavigateTab,
  onJumpToGame,
}: SaasQuickExploreGridProps) {
  const { playPop } = useAudio();

  const primaryShortcuts = [
    {
      id: "chat",
      title: "Obrolan & Telepon",
      desc: "Kirim pesan, voice note, foto, atau teleponan berdua.",
      cta: "Buka Obrolan",
      icon: MessageCircleHeart,
      badgeBg: "bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-pink-300",
      cardBg: "bg-[#FFF5F7] dark:bg-[#251D29]",
      characterSvg: "/characters/my-melody.svg",
      onClick: () => {
        playPop();
        onNavigateTab("chat");
      },
    },
    {
      id: "canvas",
      title: "Papan Gambar Berdua",
      desc: "Coret-coret bareng di satu kanvas dan tempel stiker Sanrio.",
      cta: "Mulai Menggambar",
      icon: Palette,
      badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300",
      cardBg: "bg-[#F7FCF9] dark:bg-[#1F2624]",
      characterSvg: "/characters/keroppi.svg",
      onClick: () => {
        playPop();
        onNavigateTab("canvas");
      },
    },
  ];

  const secondaryShortcuts = [
    {
      id: "telepathy",
      title: "Uji Telepati & Game",
      desc: "Tebak pilihan pasanganmu di 4 permainan santai.",
      icon: HeartHandshake,
      badgeBg: "bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300",
      characterSvg: "/characters/hello-kitty.svg",
      onClick: () => {
        playPop();
        onJumpToGame("telepathy");
        onNavigateTab("play");
      },
    },
    {
      id: "journal",
      title: "Jurnal & Daftar Impian",
      desc: "Simpan catatan kenangan dan rencana kencan kalian.",
      icon: BookHeart,
      badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300",
      characterSvg: "/characters/pochacco.svg",
      onClick: () => {
        playPop();
        onNavigateTab("journal");
      },
    },
  ];

  return (
    <section className="space-y-3">
      <div className="px-1">
        <h3 className="font-display text-base font-bold text-[#2D232E] dark:text-[#FAF5F7]">
          Pintasan Ruang Kita
        </h3>
        <p className="text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
          Pilih kegiatan untuk dilakukan berdua sekarang
        </p>
      </div>

      {/* Primary Featured Cards (2 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {primaryShortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`group text-left rounded-3xl scrapbook-stitched ${item.cardBg} p-5 flex flex-col justify-between hover:border-rose-400 active:scale-[0.99] transition-all cursor-pointer`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${item.badgeBg}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <h4 className="font-display text-base font-bold text-[#2D232E] dark:text-white pt-1">
                    {item.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-[#6E5A68] dark:text-[#B8A6B5]">
                    {item.desc}
                  </p>
                </div>

                <img
                  src={item.characterSvg}
                  alt=""
                  className="h-14 w-14 shrink-0 object-contain transition-transform group-hover:scale-105"
                />
              </div>

              <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-pink-300">
                <span>{item.cta}</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Secondary Compact Strip (2 Horizontal Rows/Pills) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {secondaryShortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-[#F3D8DF] dark:border-[#3B2E40] bg-white dark:bg-[#221B25] p-3.5 text-left hover:border-rose-300 active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.badgeBg}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h4 className="font-display text-sm font-bold text-[#2D232E] dark:text-white truncate">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#6E5A68] dark:text-[#B8A6B5] truncate">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <img
                  src={item.characterSvg}
                  alt=""
                  className="h-8 w-8 object-contain"
                />
                <ChevronRight className="h-4 w-4 text-[#6E5A68] group-hover:text-rose-500 transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
