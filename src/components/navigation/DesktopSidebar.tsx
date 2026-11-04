"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BookHeart,
  Gamepad2,
  Heart,
  MessageCircleHeart,
  Palette,
  Settings2,
  Sparkles,
} from "lucide-react";
import { getSanrioCharacter } from "@/lib/sanrioCharacters";
import { useAudio } from "@/context/AudioContext";
import type { AppTab, CoupleProfile, PartnerRole } from "@/lib/types";

export interface DesktopSidebarProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  profile: CoupleProfile;
  onSwitchRole: (role: PartnerRole) => void;
  onOpenCharacterModal: () => void;
  hasUnreadPrompt?: boolean;
  unreadChatCount?: number;
  notesCount: number;
  stampsCount: number;
}

const SIDEBAR_ITEMS: Array<{
  id: AppTab;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "home",
    label: "Home",
    subtitle: "Detak & Amplop",
    icon: Heart,
  },
  {
    id: "chat",
    label: "Chat Messenger",
    subtitle: "Pesan & Panggilan",
    icon: MessageCircleHeart,
  },
  {
    id: "playground",
    label: "Playground",
    subtitle: "Papan Gambar & Arcade",
    icon: Gamepad2,
  },
  {
    id: "journal",
    label: "Shared Journal",
    subtitle: "Catatan & AI Memory",
    icon: BookHeart,
  },
];

export function DesktopSidebar({
  activeTab,
  onChangeTab,
  profile,
  onSwitchRole,
  onOpenCharacterModal,
  hasUnreadPrompt = false,
  unreadChatCount = 0,
  notesCount,
  stampsCount,
}: DesktopSidebarProps) {
  const { playPop } = useAudio();
  const charA = getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const charB = getSanrioCharacter(profile.userBCharacter, "my-melody");
  const activeChar = profile.role === "user_a" ? charA : charB;
  const activeName =
    profile.role === "user_a" ? profile.userAName : profile.userBName;

  const handleTabClick = (tab: AppTab) => {
    playPop();
    onChangeTab(tab);
  };

  return (
    <aside className="hidden lg:flex lg:w-64 xl:w-68 shrink-0 flex-col justify-between border-r border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 transition-colors">
      <div className="space-y-6">
        {/* Lingora-Inspired Brand Header */}
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#BAE6FD]/60 via-white to-[#FECDD3]/60 dark:from-purple-900/40 dark:via-slate-800 dark:to-slate-900 border border-sky-100 dark:border-purple-800 shadow-sm">
            <img
              src="/characters/cinnamoroll.svg"
              alt="Cinnamoroll"
              className="h-9 w-9 object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-[#1E293B] dark:text-white">
              Cinnamelo
            </h1>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Rindu • Chat • Gambar • Main
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav aria-label="Sidebar Utama" className="space-y-1.5">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === "playground" &&
                (activeTab === "canvas" || activeTab === "play"));

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                className={`relative flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-all ${
                  isActive
                    ? "text-[#0369A1] dark:text-sky-300 font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50/90 dark:hover:bg-slate-800 hover:text-[#1E293B] dark:hover:text-white font-medium"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="lingora-sidebar-pill"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute inset-0 rounded-2xl bg-[#E0F2FE]/85 dark:bg-sky-950/70 border border-sky-200/70 dark:border-sky-800"
                  />
                )}

                <span className="relative z-10 flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      isActive
                        ? "text-[#0284C7] dark:text-sky-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  />
                  <span>
                    <span className="block text-sm leading-tight">
                      {item.label}
                    </span>
                    <span
                      className={`block text-[10px] ${
                        isActive
                          ? "text-sky-600/80 dark:text-sky-300/80"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {item.subtitle}
                    </span>
                  </span>
                </span>

                <span className="relative z-10 flex items-center gap-1.5">
                  {item.id === "home" && hasUnreadPrompt && (
                    <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                  )}
                  {item.id === "chat" && unreadChatCount > 0 && (
                    <span className="rounded-full bg-rose-500 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs animate-bounce">
                      {unreadChatCount}
                    </span>
                  )}
                  {item.id === "journal" && notesCount > 0 && (
                    <span className="rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-300">
                      {notesCount}
                    </span>
                  )}
                  {item.id === "canvas" && stampsCount > 0 && (
                    <span className="rounded-full bg-rose-50 dark:bg-rose-950/60 border border-pink-100 dark:border-rose-900 px-2 py-0.5 text-[10px] font-semibold text-rose-500 dark:text-rose-300">
                      {stampsCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Cards: 19 Sanrio Avatar Card + Active Partner Profile */}
      <div className="space-y-3 pt-6">
        {/* Lingora-Style Pastel Promo/Avatar Card */}
        <div className="relative overflow-hidden rounded-3xl border border-sky-100 dark:border-slate-800 bg-gradient-to-br from-[#EBF6FF] via-[#F5F9FF] to-[#FFF0F5] dark:from-slate-800/80 dark:via-purple-950/30 dark:to-slate-800/80 p-4">
          <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[#FECDD3]/40 blur-xl" />
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100/90 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-bold text-[#1E293B] dark:text-white">
              19 Karakter Sanrio
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 mb-3">
            Koleksi avatar pasangan &amp; stiker pesan siap dipakai!
          </p>

          <div className="flex items-center -space-x-1.5 mb-3">
            {[
              charA.svgPath,
              charB.svgPath,
              "/characters/kuromi.svg",
              "/characters/hello-kitty.svg",
              "/characters/pompompurin.svg",
            ].map((src, idx) => (
              <div
                key={idx}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-pink-100 dark:border-slate-700 shadow-sm"
              >
                <img src={src} alt="" className="h-6 w-6 object-contain" />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              playPop();
              onOpenCharacterModal();
            }}
            className="w-full rounded-full bg-[#0284C7] dark:bg-purple-600 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            Pilih Karakter
          </button>
        </div>

        {/* Active Partner Switcher Footer */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/80 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-pink-100 dark:border-slate-700 shadow-sm">
                <img
                  src={activeChar.svgPath}
                  alt={activeChar.name}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[#1E293B] dark:text-white">
                  {activeName}
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  {activeChar.name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playPop();
                onOpenCharacterModal();
              }}
              aria-label="Pengaturan Pasangan"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-500 hover:border-pink-200 hover:text-[#1E293B] dark:hover:text-white transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1 rounded-full bg-white dark:bg-slate-900 p-0.5 border border-slate-200/60 dark:border-slate-700 text-[11px]">
            <button
              type="button"
              onClick={() => onSwitchRole("user_a")}
              className={`rounded-full py-1 font-semibold transition-all truncate px-2 ${
                profile.role === "user_a"
                  ? "bg-[#BAE6FD]/80 text-[#1E293B] dark:bg-sky-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {profile.userAName}
            </button>
            <button
              type="button"
              onClick={() => onSwitchRole("user_b")}
              className={`rounded-full py-1 font-semibold transition-all truncate px-2 ${
                profile.role === "user_b"
                  ? "bg-[#FECDD3]/80 text-[#1E293B] dark:bg-pink-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {profile.userBName}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
