"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Heart, Lock, Unlock, X } from "lucide-react";
import {
  SANRIO_CHARACTERS,
  getSanrioCharacter,
  type SanrioCharacterId,
} from "@/lib/sanrioCharacters";
import {
  hashRoomPin,
  storeUnlockedRoomPinToken,
} from "@/lib/roomSecurity";
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
  const [pinInput, setPinInput] = useState("");
  const [keepExistingPin, setKeepExistingPin] = useState(
    Boolean(profile.roomPin)
  );
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
      setPinInput("");
      setKeepExistingPin(Boolean(profile.roomPin));
      setCharA(profile.userACharacter || "cinnamoroll");
      setCharB(profile.userBCharacter || "my-melody");
    } else if (open && wasOpenRef.current) {
      setCharA(profile.userACharacter || "cinnamoroll");
      setCharB(profile.userBCharacter || "my-melody");
    } else if (!open && wasOpenRef.current) {
      wasOpenRef.current = false;
    }
  }, [open, profile]);

  const activeSelectedId = targetPartner === "user_a" ? charA : charB;
  const metaA = getSanrioCharacter(charA, "cinnamoroll");
  const metaB = getSanrioCharacter(charB, "my-melody");

  const resolveEffectivePinHash = (targetRoom: string): string => {
    const cleanedDigits = pinInput.replace(/\D/g, "").slice(0, 4);
    if (cleanedDigits.length === 4) {
      return hashRoomPin(targetRoom, cleanedDigits);
    }
    if (keepExistingPin && profile.roomPin) {
      return hashRoomPin(targetRoom, profile.roomPin);
    }
    return "";
  };

  const handleSelectChar = (id: SanrioCharacterId) => {
    const nextCharA = targetPartner === "user_a" ? id : charA;
    const nextCharB = targetPartner === "user_b" ? id : charB;
    setCharA(nextCharA);
    setCharB(nextCharB);

    const cleanedRoom = roomInput.trim() || "couple-room";
    const finalPinHash = resolveEffectivePinHash(cleanedRoom);
    onUpdateProfile({
      ...profile,
      userAName: nameA.trim() || "Awan",
      userBName: nameB.trim() || "Melodi",
      roomId: cleanedRoom,
      userACharacter: nextCharA,
      userBCharacter: nextCharB,
      roomPin: finalPinHash,
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
    const finalPinHash = resolveEffectivePinHash(cleanedRoom);

    if (finalPinHash) {
      storeUnlockedRoomPinToken(cleanedRoom, finalPinHash);
    }

    onUpdateProfile({
      ...profile,
      userAName: nameA.trim() || "Awan",
      userBName: nameB.trim() || "Melodi",
      roomId: cleanedRoom,
      userACharacter: charA,
      userBCharacter: charB,
      roomPin: finalPinHash,
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#18131A]/55 p-3 sm:p-5"
        >
          <motion.form
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            onSubmit={handleSave}
            className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-2 border-[#F3D8DF] dark:border-[#3B2E40] bg-[#FFFDF9] dark:bg-[#221B25] shadow-xl"
          >
            {/* Modal Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-[#F3D8DF] dark:border-[#3B2E40] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50 dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] text-rose-500">
                  <Heart className="h-4 w-4 fill-rose-400" />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-[#2D232E] dark:text-white">
                    Profil Pasangan &amp; Karakter
                  </h3>
                  <p className="text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
                    Pilih karakter favorit kalian &amp; atur kunci kamar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup pengaturan profil"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#6E5A68] hover:bg-rose-50 dark:hover:bg-[#2E2433] transition-colors cursor-pointer"
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
                  className={`cursor-pointer rounded-2xl border-2 p-3.5 transition-all ${
                    targetPartner === "user_a"
                      ? "border-sky-400 bg-sky-50/60 dark:bg-sky-950/35"
                      : "border-[#F3D8DF] dark:border-[#3B2E40] bg-white dark:bg-[#2E2433]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={metaA.svgPath}
                      alt={metaA.name}
                      className="h-14 w-14 shrink-0 object-contain"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300">
                        Pasangan 1 • {metaA.name}
                      </span>
                      <input
                        type="text"
                        value={nameA}
                        onChange={(e) => setNameA(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Nama panggilan"
                        className="mt-1 w-full rounded-xl border border-sky-200 dark:border-[#3B2E40] bg-white dark:bg-[#18131A] px-2.5 py-1.5 text-xs font-semibold text-[#2D232E] dark:text-white focus:border-sky-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setTargetPartner("user_b")}
                  className={`cursor-pointer rounded-2xl border-2 p-3.5 transition-all ${
                    targetPartner === "user_b"
                      ? "border-rose-400 bg-rose-50/60 dark:bg-rose-950/35"
                      : "border-[#F3D8DF] dark:border-[#3B2E40] bg-white dark:bg-[#2E2433]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={metaB.svgPath}
                      alt={metaB.name}
                      className="h-14 w-14 shrink-0 object-contain"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-rose-600 dark:text-pink-300">
                        Pasangan 2 • {metaB.name}
                      </span>
                      <input
                        type="text"
                        value={nameB}
                        onChange={(e) => setNameB(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Nama panggilan"
                        className="mt-1 w-full rounded-xl border border-rose-200 dark:border-[#3B2E40] bg-white dark:bg-[#18131A] px-2.5 py-1.5 text-xs font-semibold text-[#2D232E] dark:text-white focus:border-rose-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 19 Sanrio Characters Grid */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-bold text-[#2D232E] dark:text-white">
                    Pilih Karakter untuk{" "}
                    <span
                      className={
                        targetPartner === "user_a"
                          ? "text-sky-600 dark:text-sky-400"
                          : "text-rose-500 dark:text-pink-400"
                      }
                    >
                      {targetPartner === "user_a"
                        ? nameA || "Pasangan 1"
                        : nameB || "Pasangan 2"}
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
                        className={`group relative flex flex-col items-center rounded-2xl border p-2.5 text-center transition-all cursor-pointer ${
                          isSelected
                            ? "border-rose-400 bg-rose-50/70 dark:bg-[#3B2E40] shadow-xs"
                            : "border-[#F3D8DF] dark:border-[#3B2E40] bg-white dark:bg-[#2E2433] hover:border-rose-300"
                        }`}
                      >
                        {(usedByA || usedByB) && (
                          <span
                            className={`absolute top-1.5 right-1.5 flex h-4 px-1.5 items-center justify-center rounded-full text-[10px] font-bold ${
                              usedByA
                                ? "bg-[#BAE6FD] text-sky-950"
                                : "bg-[#FECDD3] text-rose-950"
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
                          className="h-12 w-12 object-contain transition-transform group-hover:scale-105"
                        />
                        <span className="mt-1.5 text-[11px] font-semibold leading-tight text-[#2D232E] dark:text-[#FAF5F7] line-clamp-1">
                          {char.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Room Code & 4-Digit Privacy PIN */}
              <div className="rounded-2xl border border-[#F3D8DF] dark:border-[#3B2E40] bg-[#FFF6F8] dark:bg-[#2E2433] p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D232E] dark:text-[#FAF5F7] mb-1">
                      Nama Kamar Kita
                    </label>
                    <input
                      type="text"
                      value={roomInput}
                      onChange={(e) => setRoomInput(e.target.value)}
                      className="w-full rounded-xl border border-[#F3D8DF] dark:border-[#3B2E40] bg-white dark:bg-[#18131A] px-3 py-2 text-xs font-mono text-[#2D232E] dark:text-white focus:border-rose-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="flex items-center gap-1 text-xs font-semibold text-[#2D232E] dark:text-[#FAF5F7]">
                        <Lock className="h-3 w-3 text-rose-500" />
                        <span>PIN Kamar (4 Angka)</span>
                      </label>
                      {keepExistingPin && (
                        <button
                          type="button"
                          onClick={() => {
                            setKeepExistingPin(false);
                            setPinInput("");
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
                        >
                          <Unlock className="h-3 w-3" />
                          <span>Hapus PIN</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setPinInput(val);
                        if (val.length > 0) setKeepExistingPin(false);
                      }}
                      placeholder={
                        keepExistingPin
                          ? "PIN aktif (ketik 4 angka untuk ganti)"
                          : "Contoh: 1402 (kosongkan = tanpa PIN)"
                      }
                      className="w-full rounded-xl border border-[#F3D8DF] dark:border-[#3B2E40] bg-white dark:bg-[#18131A] px-3 py-2 text-xs font-mono tracking-widest text-[#2D232E] dark:text-white placeholder:tracking-normal focus:border-rose-400 focus:outline-none"
                    />
                  </div>
                </div>

                <p className="text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
                  PIN dienkripsi dan diverifikasi di server agar obrolan dan catatan kalian tidak bisa dibuka orang lain.
                </p>
              </div>
            </div>

            {/* Footer Save CTA */}
            <div className="relative z-10 flex items-center justify-end gap-2.5 border-t border-[#F3D8DF] dark:border-[#3B2E40] bg-[#FFFDF9] dark:bg-[#221B25] px-5 py-3.5">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full border border-[#F3D8DF] dark:border-[#3B2E40] px-4 py-2 text-xs font-semibold text-[#6E5A68] dark:text-[#B8A6B5] hover:bg-rose-50 dark:hover:bg-[#2E2433] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 hover:bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Simpan</span>
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
