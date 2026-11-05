"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, Smartphone } from "lucide-react";
import { getSanrioCharacter } from "@/lib/sanrioCharacters";
import type { CoupleProfile, PartnerRole } from "@/lib/types";

export interface FirstTimeRoleModalProps {
  open: boolean;
  profile: CoupleProfile;
  onSelectRole: (role: PartnerRole) => void;
}

export function FirstTimeRoleModal({
  open,
  profile,
  onSelectRole,
}: FirstTimeRoleModalProps) {
  const charA = getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const charB = getSanrioCharacter(profile.userBCharacter, "my-melody");

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-pink-200 dark:border-slate-800 p-6 shadow-2xl text-slate-800 dark:text-slate-100"
          >
            {/* Header Mascot Icon */}
            <div className="text-center pb-4">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-400 to-purple-500 text-white shadow-lg animate-bounce">
                <Heart className="h-7 w-7 fill-white" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center justify-center gap-2">
                Selamat Datang!
                <Sparkles className="h-5 w-5 text-pink-500" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                Untuk menyinkronkan 2 layar, pilih siapa kamu yang menggunakan perangkat ini:
              </p>
            </div>

            {/* Selection Cards */}
            <div className="space-y-3 my-4">
              {/* Option 1: User A (Awan / Cinnamoroll) */}
              <button
                type="button"
                onClick={() => onSelectRole("user_a")}
                className="w-full flex items-center gap-3.5 rounded-2xl p-4 bg-gradient-to-r from-sky-50 to-white dark:from-slate-800 dark:to-slate-850 border-2 border-sky-200 dark:border-sky-800/80 hover:border-sky-400 hover:shadow-md transition-all text-left cursor-pointer group"
              >
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-700 shadow-sm border border-sky-100 dark:border-slate-600 p-1">
                  <img
                    src={charA.svgPath}
                    alt={charA.name}
                    className="h-full w-full object-contain group-hover:scale-110 transition-transform"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800 dark:text-white text-base">
                      {profile.userAName}
                    </span>
                    <span className="rounded-full bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                      ☁️ Cinnamoroll
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pilih ini jika ini adalah perangkat utama / HP pertama kamu.
                  </p>
                </div>
              </button>

              {/* Option 2: User B (Melodi / My Melody) */}
              <button
                type="button"
                onClick={() => onSelectRole("user_b")}
                className="w-full flex items-center gap-3.5 rounded-2xl p-4 bg-gradient-to-r from-pink-50 to-white dark:from-slate-800 dark:to-slate-850 border-2 border-pink-200 dark:border-pink-800/80 hover:border-pink-400 hover:shadow-md transition-all text-left cursor-pointer group"
              >
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-slate-700 shadow-sm border border-pink-100 dark:border-slate-600 p-1">
                  <img
                    src={charB.svgPath}
                    alt={charB.name}
                    className="h-full w-full object-contain group-hover:scale-110 transition-transform"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800 dark:text-white text-base">
                      {profile.userBName}
                    </span>
                    <span className="rounded-full bg-pink-100 dark:bg-pink-900/60 px-2 py-0.5 text-[10px] font-bold text-pink-700 dark:text-pink-300">
                      🎀 My Melody
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pilih ini jika kamu adalah pasangan / membuka di HP kedua.
                  </p>
                </div>
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-3">
              💡 Pilihan ini disimpan di perangkat ini dan bisa diubah kapan saja di menu atas.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
