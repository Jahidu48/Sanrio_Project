"use client";

import React from "react";
import {
  ArrowUpRight,
  BookHeart,
  Brush,
  HeartHandshake,
  MessageCircleHeart,
  Palette,
  Plus,
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

  const cards = [
    {
      id: "chat",
      title: "Chat & Panggilan Berdua",
      desc: "Pesan realtime: voice note, foto, dokumen, bagi lokasi & panggilan suara/video WebRTC.",
      cta: "Buka Chat",
      icon: MessageCircleHeart,
      iconBadge: "bg-rose-100/90 text-rose-600 dark:bg-rose-950/80 dark:text-rose-300",
      glowClass: "bg-rose-300/35",
      characterSvg: "/characters/my-melody.svg",
      onClick: () => {
        playPop();
        onNavigateTab("chat");
      },
    },
    {
      id: "canvas",
      title: "Co-op Sanrio Whiteboard",
      desc: "Gambar bareng secara live dengan kuas pastel & tempel 19 stiker karakter Sanrio asli.",
      cta: "Buka Canvas",
      icon: Palette,
      iconBadge: "bg-emerald-100/90 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
      glowClass: "bg-emerald-300/30",
      characterSvg: "/characters/keroppi.svg",
      onClick: () => {
        playPop();
        onNavigateTab("canvas");
      },
    },
    {
      id: "telepathy",
      title: "Telepati Satu Frekuensi",
      desc: "Jawab rahasia di layar masing-masing & buktikan seberapa sehati pilihan kalian.",
      cta: "Uji Telepati",
      icon: HeartHandshake,
      iconBadge: "bg-sky-100/90 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300",
      glowClass: "bg-sky-300/35",
      characterSvg: "/characters/hello-kitty.svg",
      onClick: () => {
        playPop();
        onJumpToGame("telepathy");
        onNavigateTab("play");
      },
    },
    {
      id: "journal",
      title: "Catatan & Bucket List",
      desc: "Tulis jurnal kolaboratif berdua secara realtime lengkap dengan mood Sanrio & wishlist.",
      cta: "Tulis Bareng",
      icon: BookHeart,
      iconBadge: "bg-purple-100/90 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300",
      glowClass: "bg-purple-300/30",
      characterSvg: "/characters/pochacco.svg",
      onClick: () => {
        playPop();
        onNavigateTab("journal");
      },
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-[#1E293B] dark:text-white">
            Aktivitas Seru Berdua
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Pilih ruang interaktif realtime untuk dimainkan bersama pasanganmu
          </p>
        </div>
      </div>

      {/* SaaS Reference Card Grid with Soft Radial Inner Pastel Glows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={card.onClick}
              className="saas-glow-card group cursor-pointer p-5 flex flex-col justify-between"
            >
              {/* Signature SaaS Soft Radial Inner Pastel Glow */}
              <div
                className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-36 w-36 rounded-full blur-3xl transition-opacity duration-300 opacity-75 group-hover:opacity-100 ${card.glowClass}`}
              />

              <div className="relative z-10">
                {/* Top Row: Pastel Rounded Icon Badge + Corner Arrow */}
                <div className="flex items-center justify-between mb-3.5">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.iconBadge} shadow-xs`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-[#1E293B] dark:group-hover:text-white transition-colors" />
                </div>

                {/* Title & Description */}
                <h4 className="text-[15px] font-bold tracking-tight text-[#1E293B] dark:text-white">
                  {card.title}
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {card.desc}
                </p>
              </div>

              {/* Bottom Row: Hairline "Learn more" Pill Button + Character Mini Pills */}
              <div className="relative z-10 mt-5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    card.onClick();
                  }}
                  className="saas-pill-btn"
                >
                  <span>{card.cta}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50/90 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <img
                      src={card.characterSvg}
                      alt=""
                      className="h-6 w-6 object-contain transition-transform group-hover:scale-110"
                    />
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50/90 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 group-hover:text-[#1E293B] dark:group-hover:text-white">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
