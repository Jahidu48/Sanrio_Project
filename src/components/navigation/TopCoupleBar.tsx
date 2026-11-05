"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Battery,
  BatteryCharging,
  Bell,
  BellRing,
  Disc3,
  Flame,
  Gem,
  Moon,
  Music,
  Pause,
  Play,
  QrCode,
  Radio,
  RotateCcw,
  Settings2,
  Smartphone,
  Sun,
  Upload,
  Volume2,
  VolumeX,
} from "lucide-react";
import { getSanrioCharacter } from "@/lib/sanrioCharacters";
import { useTheme } from "@/context/ThemeContext";
import { useAudio } from "@/context/AudioContext";
import { useSharedMusic } from "@/context/SharedMusicContext";
import type { CoupleProfile, PartnerRole } from "@/lib/types";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendDeviceNotification,
  type NotificationPermissionState,
} from "@/lib/notifications";

function formatMinSec(sec: number): string {
  if (isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export interface TopCoupleBarProps {
  profile: CoupleProfile;
  connectionMode: "supabase" | "local-realtime";
  heartbeatCount: number;
  telepathySyncScore: number;
  bothPartnersOnline: boolean;
  onUpdateProfile: (next: CoupleProfile) => void;
  onOpenCharacterModal: () => void;
  onOpenSharedMusicModal?: () => void;
  onOpenPairingModal?: () => void;
}

export function TopCoupleBar({
  profile,
  connectionMode,
  heartbeatCount,
  telepathySyncScore,
  bothPartnersOnline,
  onUpdateProfile,
  onOpenCharacterModal,
  onOpenSharedMusicModal,
  onOpenPairingModal,
}: TopCoupleBarProps) {
  const { isDark, toggleTheme } = useTheme();
  const {
    currentTrack,
    isPlaying: isSharedPlaying,
    togglePlayPause: toggleSharedPlayPause,
    currentTime: sharedCurrentTime,
  } = useSharedMusic();
  const {
    playPop,
  } = useAudio();

  const charA = getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const charB = getSanrioCharacter(profile.userBCharacter, "my-melody");

  // Real-time Device Battery Status Hook (Web Battery API)
  const [batteryInfo, setBatteryInfo] = useState<{
    level: number;
    charging: boolean;
  } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const nav = navigator as any;
    if (typeof nav.getBattery !== "function") return;

    let mounted = true;
    let batteryObj: any = null;

    nav
      .getBattery()
      .then((battery: any) => {
        if (!mounted) return;
        batteryObj = battery;
        const update = () => {
          setBatteryInfo({
            level: Math.round(battery.level * 100),
            charging: Boolean(battery.charging),
          });
        };
        update();
        battery.addEventListener("levelchange", update);
        battery.addEventListener("chargingchange", update);
      })
      .catch(() => {});

    return () => {
      mounted = false;
      if (batteryObj) {
        try {
          batteryObj.removeEventListener("levelchange", null);
          batteryObj.removeEventListener("chargingchange", null);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const switchRole = (role: PartnerRole) => {
    playPop();
    onUpdateProfile({ ...profile, role });
  };

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>("default");

  useEffect(() => {
    setNotificationPermission(getNotificationPermission());
  }, []);

  const handleToggleNotification = async () => {
    playPop();
    if (notificationPermission === "granted") {
      sendDeviceNotification("Notifikasi Cinnamelo Aktif! 🔔💖", {
        body: "Kamu akan menerima kabar saat pasangan masuk web, kirim chat, atau detak rindu!",
      });
      return;
    }
    const res = await requestNotificationPermission();
    setNotificationPermission(res);
    if (res === "granted") {
      sendDeviceNotification("Notifikasi Berhasil Diaktifkan! 🔔✨", {
        body: "Sekarang kamu dan pasangan akan selalu terhubung di HP & Laptop!",
      });
    } else if (res === "denied") {
      alert("Izin notifikasi diblokir di browser. Buka pengaturan browser (ikon gembok di bilah URL) untuk mengizinkan notifikasi!");
    }
  };

  const handleToggleTheme = () => {
    playPop();
    toggleTheme();
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:px-4 sm:py-2.5">
        {/* Mobile Brand / Desktop Room Status Pill */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex lg:hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#BAE6FD]/60 via-white to-[#FECDD3]/60 dark:from-purple-900/40 dark:via-slate-800 dark:to-slate-900 border border-pink-100 dark:border-purple-800 shadow-sm">
            <img
              src={isDark ? "/characters/kuromi.svg" : "/characters/cinnamoroll.svg"}
              alt="Mascot"
              className="h-7 w-7 object-contain"
            />
          </div>

          <div className="lg:hidden min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight text-[#1E293B] dark:text-white">
                Cinnamelo
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                <Radio
                  className={`h-2.5 w-2.5 ${
                    connectionMode === "supabase"
                      ? "text-emerald-500"
                      : "text-sky-400"
                  }`}
                />
                {connectionMode === "supabase" ? "Supabase" : "Live"}
              </span>
            </div>
            <p className="truncate text-[10px] text-slate-400 font-mono">
              #{profile.roomId}
            </p>
          </div>

          {/* Desktop Lingora-Style Room & Live Sync Pill */}
          <div className="hidden lg:flex items-center gap-2.5 rounded-full bg-[#F5F8FC] dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 px-4 py-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Radio
              className={`h-3.5 w-3.5 ${
                connectionMode === "supabase"
                  ? "text-emerald-500"
                  : "text-sky-500"
              }`}
            />
            <span>
              Channel:{" "}
              <strong className="font-mono text-[#1E293B] dark:text-white">
                {profile.roomId}
              </strong>
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span
              className={
                bothPartnersOnline
                  ? "font-semibold text-rose-500 dark:text-pink-400"
                  : "text-slate-400"
              }
            >
              {bothPartnersOnline
                ? "Pasangan Online Bersama 💖"
                : "Siap Sinkronisasi 2-Arah"}
            </span>
          </div>
        </div>

        {/* Right Section: Theme Switcher, BGM Player, Stats & Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* 2-WAY SYNCHRONIZED SHARED MUSIC BAR (LISTEN TOGETHER) */}
          {onOpenSharedMusicModal && (
            <div className="inline-flex items-center rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-pink-200/80 dark:border-slate-700 p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  playPop();
                  onOpenSharedMusicModal();
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  isSharedPlaying
                    ? "bg-pink-100 text-rose-700 dark:bg-purple-950/80 dark:text-pink-300"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
                }`}
                title="Buka Pemutar Musik Berdua (Listen Together Sync)"
              >
                <Disc3
                  className={`h-3.5 w-3.5 text-pink-500 ${
                    isSharedPlaying ? "animate-spin [animation-duration:3s]" : ""
                  }`}
                />
                <span className="hidden md:inline max-w-[110px] truncate text-[11px] font-bold">
                  {currentTrack?.title || "Playlist Bersama"}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono">
                  {formatMinSec(sharedCurrentTime)}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playPop();
                  toggleSharedPlayPause();
                }}
                className="p-1 rounded-full text-slate-400 hover:text-rose-500 dark:hover:text-pink-300 cursor-pointer"
                title={isSharedPlaying ? "Jeda Lagu Bersama" : "Putar Lagu Bersama"}
              >
                {isSharedPlaying ? (
                  <Pause className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-pink-500 text-pink-500 ml-0.5" />
                )}
              </button>
            </div>
          )}

          {/* ANIMATED THEME SWITCHER TOGGLE (Light: Day Cloud / Dark: Kuromi Midnight) */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={handleToggleTheme}
            className="flex items-center gap-1.5 rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-pink-100 dark:border-slate-700 p-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-pink-200 transition-all shadow-xs"
            title={
              isDark
                ? "Ganti ke Tema Siang (Day Cloud Cinnamoroll ☀️)"
                : "Ganti ke Tema Malam (Kuromi Midnight 🌙)"
            }
          >
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-pink-100 dark:border-purple-800 shadow-2xs">
              <img
                src={
                  isDark
                    ? "/characters/kuromi.svg"
                    : "/characters/cinnamoroll.svg"
                }
                alt=""
                className="h-4 w-4 object-contain"
              />
            </div>
            <span className="hidden md:inline-flex text-[11px] pr-1">
              {isDark ? "Midnight" : "Day Cloud"}
            </span>
            <span className="text-amber-500 dark:text-purple-400 pr-1">
              {isDark ? (
                <Moon className="h-3 w-3 fill-purple-400" />
              ) : (
                <Sun className="h-3 w-3 fill-amber-400 text-amber-500" />
              )}
            </span>
          </motion.button>

          {/* Streak Badge */}
          <div
            className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300"
            title="Gelombang rindu terkirim"
          >
            <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            <span>{heartbeatCount + 3}</span>
          </div>

          {/* Soulmate Points Pill */}
          <div
            className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200/70 dark:border-sky-900 px-3 py-1 text-xs font-bold text-sky-700 dark:text-sky-300"
            title="Skor frekuensi pasangan"
          >
            <Gem className="h-3.5 w-3.5 fill-sky-300 text-sky-500" />
            <span>{telepathySyncScore}%</span>
          </div>

          {/* Partner Role Switcher */}
          <div className="inline-flex rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-pink-100 dark:border-slate-700 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => switchRole("user_a")}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold transition-all ${
                profile.role === "user_a"
                  ? "bg-[#BAE6FD]/80 text-[#1E293B] dark:bg-sky-900 dark:text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500"
              }`}
            >
              <img
                src={charA.svgPath}
                alt={charA.name}
                className="h-4 w-4 object-contain"
              />
              <span className="max-w-[62px] truncate">{profile.userAName}</span>
            </button>
            <button
              type="button"
              onClick={() => switchRole("user_b")}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold transition-all ${
                profile.role === "user_b"
                  ? "bg-[#FECDD3]/80 text-[#1E293B] dark:bg-pink-900 dark:text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500"
              }`}
            >
              <img
                src={charB.svgPath}
                alt={charB.name}
                className="h-4 w-4 object-contain"
              />
              <span className="max-w-[62px] truncate">{profile.userBName}</span>
            </button>
          </div>

          {/* 2-Device Pairing & Sync Button */}
          <button
            type="button"
            onClick={() => {
              playPop();
              onOpenPairingModal?.();
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all shadow-xs cursor-pointer ${
              bothPartnersOnline
                ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                : "bg-pink-100/90 dark:bg-pink-950/60 border border-pink-300 dark:border-pink-800 text-pink-700 dark:text-pink-300 animate-pulse"
            }`}
            title={
              bothPartnersOnline
                ? "Berdua Terhubung (2 Perangkat Sinkron)"
                : "Hubungkan HP Pasangan (Scan QR Code)"
            }
          >
            {bothPartnersOnline ? (
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <QrCode className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {bothPartnersOnline ? "Berdua Online 🟢" : "Hubungkan HP 📱"}
            </span>
          </button>

          {/* Real-time Battery Status Indicator */}
          {batteryInfo && (
            <div
              className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2 py-1 text-[11px] font-mono text-slate-600 dark:text-slate-300 shadow-2xs"
              title={`Status Baterai: ${batteryInfo.level}% ${batteryInfo.charging ? "(Sedang Mengisi Daya ⚡)" : ""}`}
            >
              {batteryInfo.charging ? (
                <BatteryCharging className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              ) : (
                <Battery
                  className={`h-3.5 w-3.5 ${
                    batteryInfo.level <= 20
                      ? "text-rose-500 font-bold"
                      : "text-slate-400"
                  }`}
                />
              )}
              <span>{batteryInfo.level}%</span>
            </div>
          )}

          {/* Device Push Notification Toggle Button */}
          <button
            type="button"
            onClick={handleToggleNotification}
            aria-label="Notifikasi Perangkat HP / Laptop"
            title={
              notificationPermission === "granted"
                ? "Notifikasi Perangkat Aktif 🔔 (Klik untuk tes)"
                : notificationPermission === "denied"
                ? "Izin Notifikasi Diblokir di Browser (Klik untuk info)"
                : "Aktifkan Notifikasi Perangkat (Pasangan masuk web, chat, dll)"
            }
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
              notificationPermission === "granted"
                ? "bg-pink-50 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800 text-pink-600 dark:text-pink-300 shadow-2xs"
                : "bg-[#F8FAFC] dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-400 hover:text-pink-500 hover:border-pink-300"
            }`}
          >
            {notificationPermission === "granted" ? (
              <BellRing className="h-3.5 w-3.5 animate-pulse text-pink-500" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Settings Modal Button */}
          <button
            type="button"
            onClick={() => {
              playPop();
              onOpenCharacterModal();
            }}
            aria-label="Pengaturan Pasangan & 19 Karakter Sanrio"
            title="Pilih dari 19 Karakter Sanrio & Ubah Profil"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-500 hover:border-pink-200 dark:hover:border-purple-600 hover:text-[#1E293B] dark:hover:text-white transition-colors"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
