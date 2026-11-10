"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Battery,
  BatteryCharging,
  Bell,
  BellOff,
  BellRing,
  Disc3,
  Flame,
  Gem,
  Lock,
  Moon,
  Pause,
  Play,
  QrCode,
  Radio,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
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
  onOpenPermissionsModal?: () => void;
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
  onOpenPermissionsModal,
}: TopCoupleBarProps) {
  const { isDark, toggleTheme } = useTheme();
  const {
    currentTrack,
    isPlaying: isSharedPlaying,
    togglePlayPause: toggleSharedPlayPause,
    currentTime: sharedCurrentTime,
  } = useSharedMusic();
  const { playPop } = useAudio();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const charA = getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const charB = getSanrioCharacter(profile.userBCharacter, "my-melody");

  // Close popover when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

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
    let updateHandler: (() => void) | null = null;

    nav
      .getBattery()
      .then((battery: any) => {
        if (!mounted) return;
        batteryObj = battery;
        updateHandler = () => {
          setBatteryInfo({
            level: Math.round(battery.level * 100),
            charging: Boolean(battery.charging),
          });
        };
        updateHandler();
        battery.addEventListener("levelchange", updateHandler);
        battery.addEventListener("chargingchange", updateHandler);
      })
      .catch(() => {});

    return () => {
      mounted = false;
      if (batteryObj && updateHandler) {
        try {
          batteryObj.removeEventListener("levelchange", updateHandler);
          batteryObj.removeEventListener("chargingchange", updateHandler);
        } catch {}
      }
    };
  }, []);

  const switchRole = (role: PartnerRole) => {
    playPop();
    onUpdateProfile({ ...profile, role });
  };

  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>("default");

  useEffect(() => {
    const updatePerm = () => {
      setNotificationPermission(getNotificationPermission());
    };
    updatePerm();
    window.addEventListener("focus", updatePerm);
    window.addEventListener("sanrio-notification-perm-changed", updatePerm);
    return () => {
      window.removeEventListener("focus", updatePerm);
      window.removeEventListener(
        "sanrio-notification-perm-changed",
        updatePerm
      );
    };
  }, []);

  const handleBellClick = async () => {
    playPop();

    const currentPerm = getNotificationPermission();
    setNotificationPermission(currentPerm);

    if (currentPerm === "default") {
      const result = await requestNotificationPermission();
      setNotificationPermission(result);
      if (result === "granted") {
        sendDeviceNotification("Notifikasi Berhasil Diaktifkan! 🔔💖", {
          body: "Laptop & HP kamu siap menerima chat, panggilan masuk, mood, dan detak rindu!",
          tabTitleAlert: "🔔 Notifikasi Aktif! - Sanrio Couple",
        });
      } else if (result === "denied" && onOpenPermissionsModal) {
        onOpenPermissionsModal();
      }
      return;
    }

    if (currentPerm === "granted") {
      sendDeviceNotification("Tes Notifikasi Lintas Perangkat 🔔✨", {
        body: "Sistem notifikasi OS + Banner + Suara aktif dengan sempurna di perangkat ini!",
        tabTitleAlert: "🔔 Tes Notifikasi Berhasil! - Sanrio Couple",
      });
      return;
    }

    if (onOpenPermissionsModal) {
      onOpenPermissionsModal();
    }
  };

  const handleToggleTheme = () => {
    playPop();
    toggleTheme();
  };

  const hasPinLock = Boolean(profile.roomPin && profile.roomPin.trim().length === 4);

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
        {/* Left: Brand & Room Status Pill */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex lg:hidden h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#BAE6FD]/60 via-white to-[#FECDD3]/60 dark:from-purple-900/40 dark:via-slate-800 dark:to-slate-900 border border-pink-100 dark:border-purple-800 shadow-2xs">
            <img
              src={isDark ? "/characters/kuromi.png" : "/characters/cinnamoroll.png"}
              alt="Mascot"
              className="h-6 w-6 object-contain"
            />
          </div>

          <div className="lg:hidden min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight text-[#1E293B] dark:text-white">
                Cinnamelo
              </span>
              {hasPinLock && (
                <span title="Kamar Terkunci PIN 4 Angka" className="inline-flex">
                  <Lock className="h-3 w-3 text-pink-500 shrink-0" />
                </span>
              )}
            </div>
            <p className="truncate text-[10px] text-slate-400 font-mono">
              #{profile.roomId}
            </p>
          </div>

          {/* Desktop Room & Live Sync Pill */}
          <div className="hidden lg:flex items-center gap-2 rounded-full bg-[#F5F8FC] dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 px-3.5 py-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Radio
              className={`h-3.5 w-3.5 ${
                connectionMode === "supabase" ? "text-emerald-500" : "text-sky-500"
              }`}
            />
            <span className="inline-flex items-center gap-1">
              Channel:{" "}
              <strong className="font-mono text-[#1E293B] dark:text-white">
                {profile.roomId}
              </strong>
              {hasPinLock && (
                <span title="Terlindungi PIN 4-Digit" className="inline-flex">
                  <Lock className="h-3 w-3 text-pink-500" />
                </span>
              )}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span
              className={
                bothPartnersOnline
                  ? "font-semibold text-rose-500 dark:text-pink-400"
                  : "text-slate-400"
              }
            >
              {bothPartnersOnline ? "Pasangan Online Bersama 💖" : "Siap Sinkronisasi 2-Arah"}
            </span>
          </div>
        </div>

        {/* Right: Streamlined Primary Controls + Progressive Disclosure Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1. Shared Music Pill */}
          {onOpenSharedMusicModal && (
            <div className="inline-flex items-center rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-pink-200/80 dark:border-slate-700 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  playPop();
                  onOpenSharedMusicModal();
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold active:scale-[0.96] transition-transform select-none touch-manipulation cursor-pointer ${
                  isSharedPlaying
                    ? "bg-pink-100 text-rose-700 dark:bg-purple-950/80 dark:text-pink-300"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
                }`}
                title="Buka Playlist Musik Bersama"
              >
                <Disc3
                  className={`h-3.5 w-3.5 text-pink-500 ${
                    isSharedPlaying ? "animate-spin [animation-duration:3s]" : ""
                  }`}
                />
                <span className="hidden md:inline max-w-[100px] truncate text-[11px] font-bold">
                  {currentTrack?.title || "Musik"}
                </span>
                <span className="hidden sm:inline text-[10px] text-slate-400 font-mono">
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
                className="p-1 rounded-full text-slate-400 hover:text-rose-500 dark:hover:text-pink-300 active:scale-[0.96] transition-transform cursor-pointer"
                title={isSharedPlaying ? "Jeda Musik" : "Putar Musik"}
              >
                {isSharedPlaying ? (
                  <Pause className="h-3 w-3 fill-rose-500 text-rose-500" />
                ) : (
                  <Play className="h-3 w-3 fill-pink-500 text-pink-500 ml-0.5" />
                )}
              </button>
            </div>
          )}

          {/* 2. Partner Role Switcher Pill */}
          <div className="inline-flex rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-pink-100 dark:border-slate-700 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => switchRole("user_a")}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold active:scale-[0.96] transition-transform select-none touch-manipulation cursor-pointer ${
                profile.role === "user_a"
                  ? "bg-[#BAE6FD]/85 text-[#1E293B] dark:bg-sky-900 dark:text-white shadow-2xs"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500"
              }`}
            >
              <img src={charA.svgPath} alt={charA.name} className="h-4 w-4 object-contain" />
              <span className="max-w-[54px] truncate text-[11px]">{profile.userAName}</span>
            </button>
            <button
              type="button"
              onClick={() => switchRole("user_b")}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold active:scale-[0.96] transition-transform select-none touch-manipulation cursor-pointer ${
                profile.role === "user_b"
                  ? "bg-[#FECDD3]/85 text-[#1E293B] dark:bg-pink-900 dark:text-white shadow-2xs"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500"
              }`}
            >
              <img src={charB.svgPath} alt={charB.name} className="h-4 w-4 object-contain" />
              <span className="max-w-[54px] truncate text-[11px]">{profile.userBName}</span>
            </button>
          </div>

          {/* 3. 2-Device Pairing & Online Status Button */}
          <button
            type="button"
            onClick={() => {
              playPop();
              onOpenPairingModal?.();
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold shadow-2xs active:scale-[0.96] transition-transform select-none touch-manipulation cursor-pointer ${
              bothPartnersOnline
                ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                : "bg-pink-100/90 dark:bg-pink-950/60 border border-pink-300 dark:border-pink-800 text-pink-700 dark:text-pink-300"
            }`}
            title={
              bothPartnersOnline
                ? "Berdua Online (2 Perangkat Sinkron)"
                : "Hubungkan HP Pasangan (Scan QR Code)"
            }
          >
            {bothPartnersOnline ? (
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <QrCode className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline text-[11px]">
              {bothPartnersOnline ? "Berdua Online" : "Hubungkan HP"}
            </span>
          </button>

          {/* 4. Instant Theme Switcher */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="flex h-8 w-8 sm:w-auto sm:px-2.5 items-center justify-center gap-1.5 rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-pink-100 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-pink-200 shadow-2xs active:scale-[0.96] transition-transform select-none touch-manipulation cursor-pointer"
            title={
              isDark
                ? "Ganti ke Tema Siang (Day Cloud ☀️)"
                : "Ganti ke Tema Malam (Kuromi Midnight 🌙)"
            }
          >
            {isDark ? (
              <Moon className="h-3.5 w-3.5 fill-purple-400 text-purple-400" />
            ) : (
              <Sun className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            )}
            <span className="hidden md:inline text-[11px]">
              {isDark ? "Midnight" : "Day Cloud"}
            </span>
          </button>

          {/* 5. Unified Control Center Popover Menu (Progressive Disclosure) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                playPop();
                setMenuOpen((prev) => !prev);
              }}
              aria-label="Menu Kontrol & Pengaturan Pasangan"
              title="Menu Karakter, PIN Kamar, AI & Perangkat"
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-pink-300 dark:hover:border-purple-500 active:scale-[0.96] transition-transform cursor-pointer"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {notificationPermission === "default" && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 border border-white dark:border-slate-900" />
              )}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-72 rounded-3xl border border-pink-100 dark:border-slate-800 bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl p-3.5 shadow-2xl z-50 text-xs"
                >
                  {/* Couple Quick Stats Row */}
                  <div className="flex items-center justify-between gap-1.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 px-3 py-2 mb-2.5">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                      <Flame className="h-3.5 w-3.5 fill-amber-400" />
                      {heartbeatCount} Detak
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400">
                      <Gem className="h-3.5 w-3.5 fill-sky-300" />
                      {telepathySyncScore}% Kompak
                    </span>
                    {batteryInfo && (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {batteryInfo.charging ? (
                          <BatteryCharging className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Battery className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        {batteryInfo.level}%
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {/* 19 Characters & PIN Modal */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenCharacterModal();
                      }}
                      className="w-full flex items-center justify-between rounded-2xl px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-200 hover:bg-pink-50/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-pink-500" />
                        <span>19 Karakter &amp; PIN Kamar</span>
                      </span>
                      <span className="text-[10px] font-bold text-pink-500">
                        {hasPinLock ? "🔒 PIN Aktif" : "Atur"}
                      </span>
                    </button>

                    {/* Summon Sanrio AI Companion */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        window.dispatchEvent(new CustomEvent("open-sanrio-ai"));
                      }}
                      className="w-full flex items-center justify-between rounded-2xl px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-sky-500" />
                        <span>Sanrio AI Companion</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Tanya AI ✨</span>
                    </button>

                    {/* Notification Bell Action */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleBellClick();
                      }}
                      className="w-full flex items-center justify-between rounded-2xl px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-200 hover:bg-pink-50/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        {notificationPermission === "granted" ? (
                          <BellRing className="h-4 w-4 text-emerald-500" />
                        ) : notificationPermission === "denied" ? (
                          <BellOff className="h-4 w-4 text-rose-500" />
                        ) : (
                          <Bell className="h-4 w-4 text-amber-500" />
                        )}
                        <span>Notifikasi Perangkat</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          notificationPermission === "granted"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {notificationPermission === "granted" ? "Tes 🔔" : "Aktifkan"}
                      </span>
                    </button>

                    {/* Hardware Permissions Hub */}
                    {onOpenPermissionsModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenPermissionsModal();
                        }}
                        className="w-full flex items-center justify-between rounded-2xl px-3 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          <span>Izin Kamera, Mic &amp; GPS</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Cek Status</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
