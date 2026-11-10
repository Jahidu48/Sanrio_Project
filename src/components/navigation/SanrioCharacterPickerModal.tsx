"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Lock, Sparkles, X } from "lucide-react";
import {
  SANRIO_CHARACTERS,
  getSanrioCharacter,
  type SanrioCharacterId,
} from "@/lib/sanrioCharacters";
import { getPinUnlockStorageKey } from "./RoomPinLockModal";
import type { CoupleProfile, PartnerRole } from "@/lib/types";

export interface SanrioCharacterPickerModalProps {
  open: boolean;
  onClose: () => void;
  profile: CoupleProfile;
  onUpdateProfile: (next: CoupleProfile) => void;
}

export function SanrioCharacterPickerModal({
  open,
  onClose,
  profile,
  onUpdateProfile,
}: SanrioCharacterPickerModalProps) {
  const [targetPartner, setTargetPartner] = useState<PartnerRole>(profile.role);
  const [nameA, setNameA] = useState(profile.userAName);
  const [nameB, setNameB] = useState(profile.userBName);
  const [roomInput, setRoomInput] = useState(profile.roomId);
  const [pinInput, setPinInput] = useState(profile.roomPin || "");
  const [charA, setCharA] = useState<SanrioCharacterId>(
    profile.userACharacter || "cinnamoroll"
  );
  const [charB, setCharB] = useState<SanrioCharacterId>(
    profile.userBCharacter || "my-melody"
  );

  const wasOpenRef = React.useRef(false);
  const initialProfileRef = React.useRef<CoupleProfile>(profile);

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      initialProfileRef.current = profile;
      setTargetPartner(profile.role);
      setNameA(profile.userAName);
      setNameB(profile.userBName);
      setRoomInput(profile.roomId);
      setPinInput(profile.roomPin || "");
      setCharA(profile.userACharacter || "cinnamoroll");
      setCharB(profile.userBCharacter || "my-melody");
    } else if (open && wasOpenRef.current) {
      // Keep characters live-synced if partner updates while modal is open
      setCharA(profile.userACharacter || "cinnamoroll");
      setCharB(profile.userBCharacter || "my-melody");
    } else if (!open && wasOpenRef.current) {
      wasOpenRef.current = false;
    }
  }, [open, profile]);

  const activeSelectedId = targetPartner === "user_a" ? charA : charB;
  const metaA = getSanrioCharacter(charA, "cinnamoroll");
  const metaB = getSanrioCharacter(charB, "my-melody");

  const handleSelectChar = (id: SanrioCharacterId) => {
    const nextCharA = targetPartner === "user_a" ? id : charA;
    const nextCharB = targetPartner === "user_b" ? id : charB;
    setCharA(nextCharA);
    setCharB(nextCharB);

    const cleanedPin = pinInput.replace(/\D/g, "").slice(0, 4);
    // Zero-delay live broadcast on tap so partner device updates instantaneously (<50ms)
    onUpdateProfile({
      ...profile,
      userAName: nameA.trim() || "Awan",
      userBName: nameB.trim() || "Melodi",
      roomId: roomInput.trim() || "couple-room",
      userACharacter: nextCharA,
      userBCharacter: nextCharB,
      roomPin: cleanedPin.length === 4 ? cleanedPin : "",
    });
  };

  const handleCancel = () => {
    const snap = initialProfileRef.current;
    if (
      snap.userACharacter !== profile.userACharacter ||
      snap.userBCharacter !== profile.userBCharacter ||
      snap.userAName !== profile.userAName ||
      snap.userBName !== profile.userBName ||
      snap.roomPin !== profile.roomPin
    ) {
      onUpdateProfile(snap);
    }
    onClose();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedRoom = roomInput.trim() || "couple-room";
    const cleanedPin = pinInput.replace(/\D/g, "").slice(0, 4);
    const finalPin = cleanedPin.length === 4 ? cleanedPin : "";

    if (finalPin && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          getPinUnlockStorageKey(cleanedRoom),
          finalPin
        );
      } catch {}
    }

    onUpdateProfile({
      ...profile,
      userAName: nameA.trim() || "Awan",
      userBName: nameB.trim() || "Melodi",
      roomId: cleanedRoom,
      userACharacter: charA,
      userBCharacter: charB,
      roomPin: finalPin,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-3 sm:p-5"
        >
          <motion.form
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            onSubmit={handleSave}
            className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-pink-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
          >
            {/* Ambient Glow */}
            <div className="pointer-events-none absolute -top-20 -left-16 h-48 w-48 rounded-full bg-[#BAE6FD]/35 dark:bg-sky-950/40 blur-3xl" />
            <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-[#FECDD3]/35 dark:bg-purple-950/40 blur-3xl" />

            {/* Modal Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-pink-50 dark:bg-pink-950/50 border border-pink-100 dark:border-pink-900 text-rose-500 dark:text-pink-300">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#1E293B] dark:text-white">
                    Profil Pasangan &amp; 19 Karakter Sanrio
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-400">
                    Pilih avatar favorit kalian &amp; atur nama ruang bersama
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="relative z-10 flex-1 overflow-y-auto p-5 space-y-5">
              {/* Partner A vs Partner B Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setTargetPartner("user_a")}
                  className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                    targetPartner === "user_a"
                      ? "border-sky-300 dark:border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 ring-2 ring-sky-200/70 dark:ring-sky-800/60"
                      : "border-slate-200/80 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={metaA.svgPath}
                      alt={metaA.name}
                      className="h-14 w-14 shrink-0 object-contain drop-shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                        Partner A • {metaA.name}
                      </span>
                      <input
                        type="text"
                        value={nameA}
                        onChange={(e) => setNameA(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Nama Partner A"
                        className="mt-1 w-full rounded-xl border border-sky-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-[#1E293B] dark:text-white focus:border-sky-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setTargetPartner("user_b")}
                  className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                    targetPartner === "user_b"
                      ? "border-pink-300 dark:border-pink-500 bg-rose-50/60 dark:bg-pink-950/40 ring-2 ring-pink-200/70 dark:ring-pink-800/60"
                      : "border-slate-200/80 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={metaB.svgPath}
                      alt={metaB.name}
                      className="h-14 w-14 shrink-0 object-contain drop-shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-pink-400">
                        Partner B • {metaB.name}
                      </span>
                      <input
                        type="text"
                        value={nameB}
                        onChange={(e) => setNameB(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Nama Partner B"
                        className="mt-1 w-full rounded-xl border border-pink-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-[#1E293B] dark:text-white focus:border-pink-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 19 Sanrio Characters Grid */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-bold text-[#1E293B] dark:text-white">
                    Pilih Karakter untuk{" "}
                    <span
                      className={
                        targetPartner === "user_a"
                          ? "text-sky-600 dark:text-sky-400"
                          : "text-rose-500 dark:text-pink-400"
                      }
                    >
                      {targetPartner === "user_a"
                        ? nameA || "Partner A"
                        : nameB || "Partner B"}
                    </span>{" "}
                    <span className="font-normal text-slate-400 dark:text-slate-400">
                      (19 Karakter Sanrio Asli)
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {SANRIO_CHARACTERS.map((char) => {
                    const isSelected = activeSelectedId === char.id;
                    const usedByA = charA === char.id;
                    const usedByB = charB === char.id;
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => handleSelectChar(char.id)}
                        className={`group relative flex flex-col items-center rounded-2xl border p-2.5 text-center transition-all ${
                          isSelected
                            ? "border-sky-400 dark:border-purple-400 bg-gradient-to-b from-white to-pink-50/50 dark:from-slate-800 dark:to-purple-950/40 shadow-sm scale-[1.02]"
                            : "border-slate-100 dark:border-slate-700/60 bg-[#F8FAFC]/80 dark:bg-slate-800/60 hover:border-pink-200 dark:hover:border-purple-500 hover:bg-white dark:hover:bg-slate-800"
                        }`}
                      >
                        {(usedByA || usedByB) && (
                          <span
                            className={`absolute top-1.5 right-1.5 flex h-4 px-1.5 items-center justify-center rounded-full text-[9px] font-bold ${
                              usedByA
                                ? "bg-[#BAE6FD] dark:bg-sky-800 text-sky-900 dark:text-white"
                                : "bg-[#FECDD3] dark:bg-pink-800 text-rose-900 dark:text-white"
                            }`}
                          >
                            {usedByA && usedByB
                              ? "A&B"
                              : usedByA
                              ? "A"
                              : "B"}
                          </span>
                        )}
                        <img
                          src={char.svgPath}
                          alt={char.name}
                          className="h-12 w-12 object-contain transition-transform group-hover:scale-110"
                        />
                        <span className="mt-1.5 text-[11px] font-semibold leading-tight text-[#1E293B] dark:text-slate-200 line-clamp-1">
                          {char.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Realtime Room Code & 4-Digit Privacy PIN */}
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/60 p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Kode Channel Realtime Bersama
                    </label>
                    <input
                      type="text"
                      value={roomInput}
                      onChange={(e) => setRoomInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-[#1E293B] dark:text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      <Lock className="h-3 w-3 text-pink-500" />
                      <span>Kunci PIN Kamar (Opsional 4 Angka)</span>
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) =>
                        setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="Contoh: 1402 (Kosongkan = Tanpa PIN)"
                      className="w-full rounded-xl border border-pink-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono tracking-widest text-[#1E293B] dark:text-white placeholder:tracking-normal focus:border-pink-400 focus:outline-none"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-400">
                  Buka web ini di 2 perangkat dengan kode ruang yang sama. Jika PIN 4 angka diisi, hanya kalian berdua yang tahu PIN-nya (atau yang scan QR undangan) yang bisa membuka ruang ini! 🔒
                </p>
              </div>
            </div>

            {/* Footer Save CTA */}
            <div className="relative z-10 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3.5">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1E293B] dark:bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:hover:bg-purple-500 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Simpan Profil &amp; Karakter</span>
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
