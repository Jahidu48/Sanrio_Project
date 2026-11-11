"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
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
            className="fixed inset-0 bg-[#18131A]/70"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            className="relative w-full max-w-md rounded-3xl bg-[#FFFDF9] dark:bg-[#221B25] border-2 border-[#F3D8DF] dark:border-[#3B2E40] p-6 shadow-xl text-[#2D232E] dark:text-[#FAF5F7]"
          >
            {/* Header Mascot Icon */}
            <div className="text-center pb-4">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-sm">
                <Heart className="h-6 w-6 fill-white" />
              </div>
              <h3 className="font-display text-xl font-bold text-[#2D232E] dark:text-white">
                Siapa yang memakai HP ini?
              </h3>
              <p className="text-xs text-[#6E5A68] dark:text-[#B8A6B5] mt-1 max-w-xs mx-auto">
                Pilih namamu supaya pesan dan detak rindu tersambung ke pasanganmu.
              </p>
            </div>

            {/* Selection Cards */}
            <div className="space-y-3 my-4">
              {/* Option 1: User A */}
              <button
                type="button"
                onClick={() => onSelectRole("user_a")}
                className="w-full flex items-center gap-3.5 rounded-2xl p-4 bg-[#F5FAFF] dark:bg-[#2E2433] border-2 border-sky-200 dark:border-sky-800/70 hover:border-sky-400 transition-all text-left cursor-pointer group"
              >
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-[#221B25] border border-sky-100 dark:border-[#3B2E40] p-1">
                  <img
                    src={charA.svgPath}
                    alt={charA.name}
                    className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2D232E] dark:text-white text-base">
                      {profile.userAName}
                    </span>
                    <span className="rounded-full bg-sky-100 dark:bg-sky-900/60 px-2.5 py-0.5 text-[11px] font-bold text-sky-800 dark:text-sky-200">
                      {charA.name}
                    </span>
                  </div>
                  <p className="text-xs text-[#6E5A68] dark:text-[#B8A6B5] mt-0.5">
                    Pilih jika ini perangkat milik {profile.userAName}.
                  </p>
                </div>
              </button>

              {/* Option 2: User B */}
              <button
                type="button"
                onClick={() => onSelectRole("user_b")}
                className="w-full flex items-center gap-3.5 rounded-2xl p-4 bg-[#FFF5F7] dark:bg-[#2E2433] border-2 border-rose-200 dark:border-rose-800/70 hover:border-rose-400 transition-all text-left cursor-pointer group"
              >
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white dark:bg-[#221B25] border border-rose-100 dark:border-[#3B2E40] p-1">
                  <img
                    src={charB.svgPath}
                    alt={charB.name}
                    className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2D232E] dark:text-white text-base">
                      {profile.userBName}
                    </span>
                    <span className="rounded-full bg-rose-100 dark:bg-rose-900/60 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 dark:text-pink-200">
                      {charB.name}
                    </span>
                  </div>
                  <p className="text-xs text-[#6E5A68] dark:text-[#B8A6B5] mt-0.5">
                    Pilih jika ini perangkat milik {profile.userBName}.
                  </p>
                </div>
              </button>
            </div>

            <p className="text-xs text-center text-[#6E5A68] dark:text-[#B8A6B5] mt-3">
              Bisa diganti kapan saja lewat tombol nama di bagian atas.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
