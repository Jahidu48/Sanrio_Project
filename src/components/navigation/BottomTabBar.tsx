"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookHeart, Gamepad2, Heart, MessageCircleHeart, Palette } from "lucide-react";
import { useAudio } from "@/context/AudioContext";
import type { AppTab } from "@/lib/types";

export interface BottomTabBarProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  hasUnreadPrompt?: boolean;
  unreadChatCount?: number;
}

const TABS: Array<{
  id: AppTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accentBg: string;
}> = [
  {
    id: "home",
    label: "Home",
    icon: Heart,
    accentBg: "bg-[#BAE6FD]/75 dark:bg-sky-900/70",
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageCircleHeart,
    accentBg: "bg-[#FECDD3]/75 dark:bg-pink-900/70",
  },
  {
    id: "playground",
    label: "Playground",
    icon: Gamepad2,
    accentBg: "bg-amber-100/85 dark:bg-amber-950/70",
  },
  {
    id: "journal",
    label: "Journal",
    icon: BookHeart,
    accentBg: "bg-[#E9D5FF]/75 dark:bg-purple-900/70",
  },
];

export function BottomTabBar({
  activeTab,
  onChangeTab,
  hasUnreadPrompt = false,
  unreadChatCount = 0,
}: BottomTabBarProps) {
  const { playPop } = useAudio();

  const handleTabClick = (tab: AppTab) => {
    playPop();
    onChangeTab(tab);
  };

  return (
    <nav
      aria-label="Navigasi Utama Mobile"
      className="fixed bottom-3.5 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-lg lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-between rounded-full bg-white/92 dark:bg-slate-900/90 backdrop-blur-md border border-pink-100 dark:border-slate-800 p-1.5 shadow-pill">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.id ||
            (tab.id === "playground" &&
              (activeTab === "canvas" || activeTab === "play"));

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className="relative flex-1 flex items-center justify-center gap-1 rounded-full py-2 px-1 text-xs font-semibold transition-colors focus:outline-none"
            >
              {isActive && (
                <motion.span
                  layoutId="sanrio-bottom-tab-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className={`absolute inset-0 rounded-full ${tab.accentBg} border border-white/80 dark:border-slate-700 shadow-sm`}
                />
              )}

              <span className="relative z-10 flex items-center gap-1 text-[#1E293B] dark:text-white">
                <Icon
                  className={`h-4 w-4 transition-transform ${
                    isActive
                      ? "scale-110 text-[#1E293B] dark:text-white"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span
                  className={`text-[11px] ${
                    isActive
                      ? "font-bold text-[#1E293B] dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {tab.label}
                </span>

                {/* Prompt badge on Home */}
                {tab.id === "home" && hasUnreadPrompt && !isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                )}

                {/* Unread badge on Chat */}
                {tab.id === "chat" && unreadChatCount > 0 && !isActive && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                    {unreadChatCount}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
