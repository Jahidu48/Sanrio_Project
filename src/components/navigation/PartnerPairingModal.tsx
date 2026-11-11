"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Check,
  QrCode,
  Share2,
  ExternalLink,
} from "lucide-react";
import { getSanrioCharacter } from "@/lib/sanrioCharacters";
import { generateQrMatrix } from "@/lib/qrCode";
import { hashRoomPin } from "@/lib/roomSecurity";
import type { CoupleProfile, PartnerRole } from "@/lib/types";

const PRODUCTION_VERCEL_HOST = "sanrio-project.vercel.app";
const PINNED_PREVIEW_REGEX = /^sanrio-project-[a-z0-9]+-marine-56d9\.vercel\.app$/i;

export interface PartnerPairingModalProps {
  open: boolean;
  onClose: () => void;
  profile: CoupleProfile;
  bothPartnersOnline: boolean;
  onSwitchRole: (role: PartnerRole) => void;
}

export function PartnerPairingModal({
  open,
  onClose,
  profile,
  bothPartnersOnline,
  onSwitchRole,
}: PartnerPairingModalProps) {
  const [copied, setCopied] = useState(false);
  const [pairingUrl, setPairingUrl] = useState("");
  const [isOnPinnedPreview, setIsOnPinnedPreview] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const targetRole = profile.role === "user_a" ? "user_b" : "user_a";

      const url = new URL(window.location.href);
      const onPreview = PINNED_PREVIEW_REGEX.test(url.hostname);
      setIsOnPinnedPreview(onPreview);
      if (onPreview) {
        url.hostname = PRODUCTION_VERCEL_HOST;
      }

      url.searchParams.set("role", targetRole);
      url.searchParams.set("room", profile.roomId || "couple-room");
      url.searchParams.delete("pin");

      const pinHash = hashRoomPin(profile.roomId, profile.roomPin);
      if (pinHash) {
        url.searchParams.set("invite", pinHash);
      } else {
        url.searchParams.delete("invite");
      }

      // If running on localhost on laptop, replace hostname with LAN IP for phone pairing
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        fetch("/api/realtime-sync?action=info")
          .then((res) => res.json())
          .then((data) => {
            if (data?.localIp && data.localIp !== "localhost") {
              url.hostname = data.localIp;
              setPairingUrl(url.toString());
            } else {
              setPairingUrl(url.toString());
            }
          })
          .catch(() => {
            setPairingUrl(url.toString());
          });
      } else {
        setPairingUrl(url.toString());
      }
    }
  }, [profile.role, profile.roomId, profile.roomPin, open]);

  // Generate QR Matrix 100% locally in the browser (never sent to third-party servers)
  const qrMatrix = useMemo(() => {
    if (!pairingUrl) return null;
    try {
      return generateQrMatrix(pairingUrl);
    } catch {
      return null;
    }
  }, [pairingUrl]);

  const handleCopyLink = async () => {
    if (!pairingUrl) return;
    try {
      await navigator.clipboard.writeText(pairingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const input = document.createElement("input");
      input.value = pairingUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share && pairingUrl) {
      try {
        await navigator.share({
          title: "Cinnamelo — Ruang Kita",
          text: "Buka link ini di HP kamu untuk masuk ke ruang Cinnamelo kita:",
          url: pairingUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const charA = getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const charB = getSanrioCharacter(profile.userBCharacter, "my-melody");

  const partnerRoleName =
    profile.role === "user_a" ? profile.userBName : profile.userAName;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#18131A]/65"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative w-full max-w-lg rounded-3xl bg-[#FFFDF9] dark:bg-[#221B25] border-2 border-[#F3D8DF] dark:border-[#3B2E40] p-5 sm:p-6 shadow-xl text-[#2D232E] dark:text-[#FAF5F7] max-h-[90vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup jendela undangan"
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-[#6E5A68] hover:bg-rose-50 dark:hover:bg-[#2E2433] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="text-center pb-4 border-b border-[#F3D8DF] dark:border-[#3B2E40]">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-sm">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#2D232E] dark:text-white">
                Undang HP Pasangan
              </h3>
              <p className="text-xs text-[#6E5A68] dark:text-[#B8A6B5] mt-1">
                Scan kode QR di bawah atau kirim tautannya ke HP {partnerRoleName}
              </p>
            </div>

            {/* Pinned Preview Hostname Warning */}
            {isOnPinnedPreview && (
              <div className="mt-3 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
                <span>
                  Perangkat ini membuka tautan preview lama. Pindah ke alamat utama:
                </span>
                <a
                  href={`https://${PRODUCTION_VERCEL_HOST}/?role=${profile.role}&room=${encodeURIComponent(
                    profile.roomId || "couple-room"
                  )}`}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-1.5 font-bold text-white shrink-0"
                >
                  <span>Buka Utama</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {/* Live Status Pill */}
            <div className="my-4 flex items-center justify-center">
              {bothPartnersOnline ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Kalian berdua sedang terhubung</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span>Menunggu {partnerRoleName} bergabung...</span>
                </div>
              )}
            </div>

            {/* Role Assignment Card */}
            <div className="rounded-2xl bg-[#FFF6F8] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] p-3.5 mb-4 text-xs">
              <div className="flex items-center justify-between font-semibold text-[#2D232E] dark:text-[#FAF5F7] mb-2">
                <span>Siapa yang memakai perangkat ini?</span>
                <span className="text-[11px] text-rose-500 dark:text-pink-400">
                  Ketuk untuk ganti
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSwitchRole("user_a")}
                  className={`flex items-center gap-2 rounded-xl p-2.5 border transition-all cursor-pointer ${
                    profile.role === "user_a"
                      ? "bg-white dark:bg-[#221B25] border-sky-400 shadow-xs ring-2 ring-sky-300/40"
                      : "bg-white/60 dark:bg-[#221B25]/60 border-[#F3D8DF] dark:border-[#3B2E40] opacity-75 hover:opacity-100"
                  }`}
                >
                  <img
                    src={charA.svgPath}
                    alt={charA.name}
                    className="h-7 w-7 object-contain shrink-0"
                  />
                  <div className="text-left min-w-0">
                    <p className="font-bold text-[#2D232E] dark:text-white truncate">
                      {profile.userAName}
                    </p>
                    <p className="text-[11px] text-[#6E5A68] dark:text-[#B8A6B5] truncate">
                      {charA.name}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSwitchRole("user_b")}
                  className={`flex items-center gap-2 rounded-xl p-2.5 border transition-all cursor-pointer ${
                    profile.role === "user_b"
                      ? "bg-white dark:bg-[#221B25] border-rose-400 shadow-xs ring-2 ring-rose-300/40"
                      : "bg-white/60 dark:bg-[#221B25]/60 border-[#F3D8DF] dark:border-[#3B2E40] opacity-75 hover:opacity-100"
                  }`}
                >
                  <img
                    src={charB.svgPath}
                    alt={charB.name}
                    className="h-7 w-7 object-contain shrink-0"
                  />
                  <div className="text-left min-w-0">
                    <p className="font-bold text-[#2D232E] dark:text-white truncate">
                      {profile.userBName}
                    </p>
                    <p className="text-[11px] text-[#6E5A68] dark:text-[#B8A6B5] truncate">
                      {charB.name}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Local Self-Contained SVG QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] mb-4">
              <div className="rounded-xl bg-white p-3 shadow-xs border border-[#F3D8DF]">
                {qrMatrix ? (
                  <svg
                    viewBox={`0 0 ${qrMatrix.length + 4} ${qrMatrix.length + 4}`}
                    className="h-44 w-44"
                    shapeRendering="crispEdges"
                    role="img"
                    aria-label={`Kode QR undangan untuk ${partnerRoleName}`}
                  >
                    <rect
                      width={qrMatrix.length + 4}
                      height={qrMatrix.length + 4}
                      fill="#FFFFFF"
                    />
                    {qrMatrix.map((row, rIdx) =>
                      row.map((cell, cIdx) =>
                        cell ? (
                          <rect
                            key={`${rIdx}-${cIdx}`}
                            x={cIdx + 2}
                            y={rIdx + 2}
                            width={1}
                            height={1}
                            fill="#2D232E"
                          />
                        ) : null
                      )
                    )}
                  </svg>
                ) : (
                  <div className="h-44 w-44 flex items-center justify-center text-[#6E5A68] text-xs">
                    Menyiapkan QR...
                  </div>
                )}
              </div>
              <p className="text-xs text-[#6E5A68] dark:text-[#B8A6B5] mt-2.5 text-center">
                Arahkan kamera HP pasangan ke kode QR ini untuk langsung masuk sebagai{" "}
                <strong>{partnerRoleName}</strong>.
              </p>
            </div>

            {/* URL Copy Box */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-semibold text-[#2D232E] dark:text-[#FAF5F7] block">
                Atau salin tautan undangan:
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-[#FFF6F8] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] p-1.5">
                <input
                  type="text"
                  readOnly
                  value={pairingUrl}
                  aria-label="Tautan undangan pasangan"
                  className="w-full bg-transparent px-2 text-xs font-mono text-[#2D232E] dark:text-[#FAF5F7] focus:outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-500 hover:bg-rose-600 text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Tersalin
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Salin
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 px-4 text-xs shadow-sm transition-colors cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                Bagikan Tautan
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#FAF0F3] hover:bg-[#F3D8DF] dark:bg-[#2E2433] dark:hover:bg-[#3B2E40] text-[#2D232E] dark:text-[#FAF5F7] font-semibold py-2.5 px-4 text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
