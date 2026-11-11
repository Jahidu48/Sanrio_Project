"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, ShieldCheck, Delete } from "lucide-react";
import { getSanrioCharacter } from "@/lib/sanrioCharacters";
import { useAudio } from "@/context/AudioContext";
import {
  getPinUnlockStorageKey,
  getStoredRoomPinToken,
  hashRoomPin,
  storeUnlockedRoomPinToken,
} from "@/lib/roomSecurity";
import type { CoupleProfile } from "@/lib/types";

export { getPinUnlockStorageKey };

export interface RoomPinLockModalProps {
  profile: CoupleProfile;
  onUnlocked?: () => void;
}

export function RoomPinLockModal({
  profile,
  onUnlocked,
}: RoomPinLockModalProps) {
  const { playPop, playSuccess } = useAudio();
  const [enteredPin, setEnteredPin] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(true);

  const requiredPinHash = hashRoomPin(profile.roomId, profile.roomPin);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!requiredPinHash) {
      setIsUnlocked(true);
      return;
    }

    // Check URL invite token (?invite=... or legacy ?pin=...) from QR pairing
    const url = new URL(window.location.href);
    const inviteToken =
      url.searchParams.get("invite")?.trim() ||
      url.searchParams.get("pin")?.trim();

    if (inviteToken) {
      const candidateHash = hashRoomPin(profile.roomId, inviteToken);
      if (candidateHash === requiredPinHash) {
        storeUnlockedRoomPinToken(profile.roomId, requiredPinHash);
        // Strip sensitive token from address bar & history
        url.searchParams.delete("invite");
        url.searchParams.delete("pin");
        window.history.replaceState({}, "", url.toString());
        setIsUnlocked(true);
        onUnlocked?.();
        return;
      }
    }

    const storedHash = getStoredRoomPinToken(profile.roomId);
    setIsUnlocked(storedHash === requiredPinHash);
  }, [requiredPinHash, profile.roomId, onUnlocked]);

  const handleDigitPress = (digit: string) => {
    if (enteredPin.length >= 4) return;
    playPop();
    setHasError(false);
    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);

    if (nextPin.length === 4) {
      const candidateHash = hashRoomPin(profile.roomId, nextPin);
      if (candidateHash === requiredPinHash) {
        playSuccess();
        storeUnlockedRoomPinToken(profile.roomId, requiredPinHash);
        setIsUnlocked(true);
        setEnteredPin("");
        onUnlocked?.();
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
      {!isUnlocked && requiredPinHash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#18131A]/85 p-4 select-none"
        >
          <motion.div
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{
              scale: 1,
              y: 0,
              opacity: 1,
              x: hasError ? [0, -10, 10, -8, 8, 0] : 0,
            }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-sm rounded-3xl border-2 border-[#F3D8DF] dark:border-[#3B2E40] bg-[#FFFDF9] dark:bg-[#221B25] p-6 shadow-xl text-center"
          >
            {/* Couple Mascot Header */}
            <div className="mx-auto mb-3 flex items-center justify-center gap-2.5">
              <img
                src={charA.svgPath}
                alt={charA.name}
                className="h-12 w-12 object-contain"
              />
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-sm">
                <Lock className="h-5 w-5" />
              </div>
              <img
                src={charB.svgPath}
                alt={charB.name}
                className="h-12 w-12 object-contain"
              />
            </div>

            <h3 className="font-display text-lg font-bold text-[#2D232E] dark:text-[#FAF5F7]">
              Kamar Privat Terkunci
            </h3>
            <p className="mt-1 text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
              Masukkan 4 angka PIN milik{" "}
              <strong className="text-[#2D232E] dark:text-white">
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
                        ? "border-rose-500 bg-rose-500 scale-110"
                        : "border-[#E5C8D1] dark:border-[#4A3A50] bg-transparent"
                    }`}
                  />
                );
              })}
            </div>

            {hasError && (
              <p className="mb-3 text-xs font-bold text-rose-500" role="alert">
                PIN belum tepat, coba lagi ya.
              </p>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit)}
                  className="flex h-12 items-center justify-center rounded-2xl border border-[#F3D8DF] dark:border-[#3B2E40] bg-white dark:bg-[#2E2433] text-base font-bold text-[#2D232E] dark:text-white hover:bg-rose-50 dark:hover:bg-[#3B2E40] active:scale-95 transition-all cursor-pointer"
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
                className="flex h-12 items-center justify-center rounded-2xl border border-[#F3D8DF] dark:border-[#3B2E40] bg-white dark:bg-[#2E2433] text-base font-bold text-[#2D232E] dark:text-white hover:bg-rose-50 dark:hover:bg-[#3B2E40] active:scale-95 transition-all cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                aria-label="Hapus angka"
                className="flex h-12 items-center justify-center rounded-2xl border border-[#F3D8DF] dark:border-[#3B2E40] bg-[#FAF0F3] dark:bg-[#2E2433] text-[#6E5A68] dark:text-[#B8A6B5] hover:bg-rose-100 hover:text-rose-600 active:scale-95 transition-all cursor-pointer"
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
