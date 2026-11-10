"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, ShieldCheck, Sparkles, Delete } from "lucide-react";
import { getSanrioCharacter } from "@/lib/sanrioCharacters";
import { useAudio } from "@/context/AudioContext";
import type { CoupleProfile } from "@/lib/types";

export interface RoomPinLockModalProps {
  profile: CoupleProfile;
}

export function getPinUnlockStorageKey(roomId: string): string {
  return `cinnamelo_pin_unlocked_${roomId}`;
}

export function RoomPinLockModal({ profile }: RoomPinLockModalProps) {
  const { playPop, playSuccess } = useAudio();
  const [enteredPin, setEnteredPin] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(true);

  const requiredPin = (profile.roomPin || "").trim();

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!requiredPin) {
      setIsUnlocked(true);
      return;
    }

    // Check URL invite param first (?pin=...) for seamless QR pairing
    const params = new URLSearchParams(window.location.search);
    const urlPin = params.get("pin")?.trim();
    const storageKey = getPinUnlockStorageKey(profile.roomId);

    if (urlPin && urlPin === requiredPin) {
      window.localStorage.setItem(storageKey, requiredPin);
      setIsUnlocked(true);
      return;
    }

    const storedPin = window.localStorage.getItem(storageKey);
    setIsUnlocked(storedPin === requiredPin);
  }, [requiredPin, profile.roomId]);

  const handleDigitPress = (digit: string) => {
    if (enteredPin.length >= 4) return;
    playPop();
    setHasError(false);
    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);

    if (nextPin.length === 4) {
      if (nextPin === requiredPin) {
        playSuccess();
        try {
          window.localStorage.setItem(
            getPinUnlockStorageKey(profile.roomId),
            requiredPin
          );
        } catch {}
        setIsUnlocked(true);
        setEnteredPin("");
      } else {
        setHasError(true);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate([80, 40, 80]);
          } catch {}
        }
        setTimeout(() => {
          setEnteredPin("");
        }, 450);
      }
    }
  };

  const handleBackspace = () => {
    if (!enteredPin) return;
    playPop();
    setHasError(false);
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  const charA = getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const charB = getSanrioCharacter(profile.userBCharacter, "my-melody");

  return (
    <AnimatePresence>
      {!isUnlocked && requiredPin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-xl p-4 select-none"
        >
          <motion.div
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{
              scale: 1,
              y: 0,
              opacity: 1,
              x: hasError ? [0, -10, 10, -8, 8, 0] : 0,
            }}
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-sm rounded-[32px] border border-pink-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl text-center"
          >
            {/* Couple Mascot Header */}
            <div className="mx-auto mb-3 flex items-center justify-center gap-2">
              <img
                src={charA.svgPath}
                alt={charA.name}
                className="h-12 w-12 object-contain drop-shadow-sm"
              />
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white shadow-md">
                <Lock className="h-5 w-5" />
              </div>
              <img
                src={charB.svgPath}
                alt={charB.name}
                className="h-12 w-12 object-contain drop-shadow-sm"
              />
            </div>

            <h3 className="text-lg font-extrabold text-[#1E293B] dark:text-white flex items-center justify-center gap-1.5">
              <span>Ruang Privat Terkunci</span>
              <Sparkles className="h-4 w-4 text-pink-500" />
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Masukkan 4 digit PIN privasi milik{" "}
              <strong className="text-slate-700 dark:text-slate-200">
                {profile.userAName} &amp; {profile.userBName}
              </strong>{" "}
              untuk membuka kamar <code>#{profile.roomId}</code>
            </p>

            {/* 4-Digit Indicator Dots */}
            <div className="my-5 flex items-center justify-center gap-3.5">
              {[0, 1, 2, 3].map((idx) => {
                const filled = idx < enteredPin.length;
                return (
                  <div
                    key={idx}
                    className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${
                      hasError
                        ? "border-rose-500 bg-rose-500 scale-110"
                        : filled
                        ? "border-pink-500 bg-pink-500 scale-110 shadow-[0_0_10px_rgba(244,114,182,0.7)]"
                        : "border-slate-300 dark:border-slate-700 bg-transparent"
                    }`}
                  />
                );
              })}
            </div>

            {hasError && (
              <p className="mb-3 text-xs font-bold text-rose-500">
                PIN tidak sesuai. Silakan coba lagi ya! 🔒
              </p>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit)}
                  className="flex h-12 items-center justify-center rounded-2xl border border-pink-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/80 text-base font-extrabold text-[#1E293B] dark:text-white hover:bg-pink-50 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <div className="flex h-12 items-center justify-center text-emerald-500">
                <ShieldCheck className="h-5 w-5 opacity-60" />
              </div>
              <button
                type="button"
                onClick={() => handleDigitPress("0")}
                className="flex h-12 items-center justify-center rounded-2xl border border-pink-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/80 text-base font-extrabold text-[#1E293B] dark:text-white hover:bg-pink-50 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                aria-label="Hapus digit"
                className="flex h-12 items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-500 active:scale-95 transition-all cursor-pointer"
              >
                <Delete className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
