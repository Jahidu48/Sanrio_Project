"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BookHeart,
  Gamepad2,
  Heart,
  MessageCircleHeart,
  Settings2,
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
    label: "Beranda",
    subtitle: "Detak Rindu & Surat",
    icon: Heart,
  },
  {
    id: "chat",
    label: "Obrolan",
    subtitle: "Pesan & Telepon",
    icon: MessageCircleHeart,
  },
  {
    id: "playground",
    label: "Main Bareng",
    subtitle: "Papan Gambar & Game",
    icon: Gamepad2,
  },
  {
    id: "journal",
    label: "Jurnal Kita",
    subtitle: "Catatan & Daftar Impian",
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
    <aside className="hidden lg:flex lg:w-64 xl:w-68 shrink-0 flex-col justify-between border-r border-[#F3D8DF] dark:border-[#3B2E40] bg-[#FFFDF9] dark:bg-[#221B25] p-5">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] shadow-2xs">
            <img
              src="/characters/cinnamoroll.svg"
              alt="Cinnamoroll"
              className="h-9 w-9 object-contain"
            />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight text-[#2D232E] dark:text-[#FAF5F7]">
              Cinnamelo
            </h1>
            <p className="text-xs font-medium text-[#6E5A68] dark:text-[#B8A6B5]">
              Ruang Kecil Kita Berdua
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav aria-label="Menu Utama" className="space-y-1.5">
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
                className={`relative flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left active:scale-[0.98] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer ${
                  isActive
                    ? "text-rose-700 dark:text-pink-200 font-bold"
                    : "text-[#6E5A68] dark:text-[#B8A6B5] hover:bg-[#FFF5F7] dark:hover:bg-[#2E2433] hover:text-[#2D232E] dark:hover:text-white font-medium"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="scrapbook-sidebar-pill"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                      mass: 0.8,
                    }}
                    className="absolute inset-0 rounded-2xl bg-[#FFF0F3] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#4E3B4D]"
                  />
                )}

                <span className="relative z-10 flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      isActive
                        ? "text-rose-500 dark:text-pink-300"
                        : "text-[#6E5A68] dark:text-[#B8A6B5]"
                    }`}
                  />
                  <span>
                    <span className="block text-sm leading-tight">
                      {item.label}
                    </span>
                    <span
                      className={`block text-[11px] ${
                        isActive
                          ? "text-rose-600/80 dark:text-pink-300/80"
                          : "text-[#6E5A68]/80 dark:text-[#B8A6B5]/80"
                      }`}
                    >
                      {item.subtitle}
                    </span>
                  </span>
                </span>

                <span className="relative z-10 flex items-center gap-1.5">
                  {item.id === "home" && hasUnreadPrompt && (
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                  )}
                  {item.id === "chat" && unreadChatCount > 0 && (
                    <span className="rounded-full bg-rose-500 text-white px-2 py-0.5 text-[11px] font-bold">
                      {unreadChatCount}
                    </span>
                  )}
                  {item.id === "journal" && notesCount > 0 && (
                    <span className="rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] px-2 py-0.5 text-[11px] font-semibold text-[#6E5A68] dark:text-[#B8A6B5]">
                      {notesCount}
                    </span>
                  )}
                  {item.id === "playground" && stampsCount > 0 && (
                    <span className="rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] px-2 py-0.5 text-[11px] font-semibold text-rose-500 dark:text-pink-300">
                      {stampsCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Cards: Scrapbook Character Card + Active Partner Profile */}
      <div className="space-y-3 pt-6">
        <div className="relative overflow-hidden rounded-3xl scrapbook-stitched bg-[#FFFBF5] dark:bg-[#2E2433] p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-100 dark:bg-[#3B2E40] text-rose-600 dark:text-pink-300">
              <Heart className="h-3.5 w-3.5 fill-rose-500" />
            </span>
            <span className="font-display text-xs font-bold text-[#2D232E] dark:text-white">
              Koleksi Karakter
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[#6E5A68] dark:text-[#B8A6B5] mb-3">
            19 karakter Sanrio untuk avatar profil dan stiker papan gambar.
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
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-[#221B25] border border-[#F3D8DF] dark:border-[#3B2E40]"
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
            className="w-full rounded-full bg-rose-500 hover:bg-rose-600 py-2 text-xs font-bold text-white shadow-2xs active:scale-[0.98] transition-all select-none touch-manipulation cursor-pointer"
          >
            Ganti Karakter
          </button>
        </div>

        {/* Active Partner Switcher Footer */}
        <div className="rounded-2xl border border-[#F3D8DF] dark:border-[#3B2E40] bg-[#FFF5F7] dark:bg-[#2E2433] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-[#221B25] border border-[#F3D8DF] dark:border-[#3B2E40]">
                <img
                  src={activeChar.svgPath}
                  alt={activeChar.name}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[#2D232E] dark:text-white">
                  {activeName}
                </p>
                <p className="truncate text-[11px] text-[#6E5A68] dark:text-[#B8A6B5]">
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white dark:bg-[#221B25] border border-[#F3D8DF] dark:border-[#3B2E40] text-[#6E5A68] dark:text-[#B8A6B5] hover:border-rose-300 hover:text-[#2D232E] dark:hover:text-white active:scale-[0.96] transition-transform select-none touch-manipulation cursor-pointer"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1 rounded-full bg-white dark:bg-[#221B25] p-0.5 border border-[#F3D8DF] dark:border-[#3B2E40] text-xs">
            <button
              type="button"
              onClick={() => onSwitchRole("user_a")}
              className={`rounded-full py-1 font-semibold truncate px-2 active:scale-[0.96] transition-transform select-none touch-manipulation cursor-pointer ${
                profile.role === "user_a"
                  ? "bg-[#BAE6FD] text-[#2D232E]"
                  : "text-[#6E5A68] dark:text-[#B8A6B5]"
              }`}
            >
              {profile.userAName}
            </button>
            <button
              type="button"
              onClick={() => onSwitchRole("user_b")}
              className={`rounded-full py-1 font-semibold truncate px-2 active:scale-[0.96] transition-transform select-none touch-manipulation cursor-pointer ${
                profile.role === "user_b"
                  ? "bg-[#FECDD3] text-[#2D232E]"
                  : "text-[#6E5A68] dark:text-[#B8A6B5]"
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
