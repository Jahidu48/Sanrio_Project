"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Check,
  QrCode,
  Share2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { getSanrioCharacter } from "@/lib/sanrioCharacters";
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
  }, [profile.role, profile.roomId, open]);

  const handleCopyLink = async () => {
    if (!pairingUrl) return;
    try {
      await navigator.clipboard.writeText(pairingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
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
          title: "Cinnamelo Love Space 💖",
          text: `Halo sayang! Buka link ini di HP kamu untuk bergabung di Cinnamelo Love Space kita:`,
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

  const qrImageUrl = pairingUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
        pairingUrl
      )}&color=475569&bgcolor=ffffff&qzone=2`
    : "";

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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-pink-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="text-center pb-4 border-b border-pink-100 dark:border-slate-800">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-400 to-purple-500 text-white shadow-md">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center justify-center gap-1.5">
                Hubungkan 2 Perangkat
                <Sparkles className="h-4 w-4 text-pink-500" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Scan QR Code atau kirim link ke HP pasanganmu agar tersinkronisasi 2 arah secara real-time!
              </p>
            </div>

            {/* Pinned Preview Hostname Warning */}
            {isOnPinnedPreview && (
              <div className="mt-3 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
                <span>
                  Perangkat ini membuka <strong>Link Preview Lama</strong> yang tidak ikut ter-update otomatis. Pindah ke Link Utama:
                </span>
                <a
                  href={`https://${PRODUCTION_VERCEL_HOST}/?role=${profile.role}&room=${encodeURIComponent(
                    profile.roomId || "couple-room"
                  )}`}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-1.5 font-bold text-white shrink-0"
                >
                  <span>Buka Link Utama</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {/* Live Status Pill */}
            <div className="my-4 flex items-center justify-center">
              {bothPartnersOnline ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>🟢 Berdua Terhubung: 2 Perangkat Aktif & Sinkron!</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span>🟡 Menunggu HP Pasangan Terhubung...</span>
                </div>
              )}
            </div>

            {/* Role Assignment Card */}
            <div className="rounded-2xl bg-gradient-to-r from-pink-50/70 via-sky-50/70 to-purple-50/70 dark:from-slate-800/60 dark:to-slate-800/60 border border-pink-100 dark:border-slate-700 p-3.5 mb-4 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <span>Peran di Perangkat Ini:</span>
                <span className="text-[11px] text-pink-600 dark:text-pink-400">
                  (Klik untuk menukar jika perlu)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSwitchRole("user_a")}
                  className={`flex items-center gap-2 rounded-xl p-2.5 border transition-all cursor-pointer ${
                    profile.role === "user_a"
                      ? "bg-white dark:bg-slate-700 border-sky-400 shadow-xs ring-2 ring-sky-300/40"
                      : "bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={charA.svgPath}
                    alt={charA.name}
                    className="h-7 w-7 object-contain shrink-0"
                  />
                  <div className="text-left min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white truncate">
                      {profile.userAName}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      ☁️ Cinnamoroll (HP 1 / Kamu)
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSwitchRole("user_b")}
                  className={`flex items-center gap-2 rounded-xl p-2.5 border transition-all cursor-pointer ${
                    profile.role === "user_b"
                      ? "bg-white dark:bg-slate-700 border-pink-400 shadow-xs ring-2 ring-pink-300/40"
                      : "bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={charB.svgPath}
                    alt={charB.name}
                    className="h-7 w-7 object-contain shrink-0"
                  />
                  <div className="text-left min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white truncate">
                      {profile.userBName}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      🎀 My Melody (HP 2 / Pasangan)
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 mb-4">
              <div className="rounded-xl bg-white p-3 shadow-md border border-slate-100">
                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="QR Code Pairing"
                    className="h-44 w-44 object-contain"
                  />
                ) : (
                  <div className="h-44 w-44 flex items-center justify-center text-slate-400 text-xs">
                    Memuat QR...
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 text-center font-medium">
                Arahkan kamera HP pasangan ke QR Code ini untuk otomatis login sebagai <strong>{partnerRoleName}</strong>!
              </p>
            </div>

            {/* URL Copy Box */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Atau salin tautan undangan pasangan:
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5">
                <input
                  type="text"
                  readOnly
                  value={pairingUrl}
                  className="w-full bg-transparent px-2 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-hidden truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    copied
                      ? "bg-emerald-500 text-white"
                      : "bg-pink-500 hover:bg-pink-600 text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Salin Link
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
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-2.5 px-4 text-xs shadow-md transition-all cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                Kirim via WhatsApp / Medsos
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2.5 px-4 text-xs transition-colors cursor-pointer"
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
