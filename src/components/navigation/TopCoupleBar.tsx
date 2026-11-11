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
  Heart,
  Lock,
  Moon,
  Pause,
  Play,
  QrCode,
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

  // Device Battery Status Hook (Web Battery API)
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
        sendDeviceNotification("Notifikasi Aktif 🔔", {
          body: "Perangkat ini siap menerima kabar pesan, telepon, dan detak rindu.",
          tabTitleAlert: "🔔 Notifikasi Aktif - Cinnamelo",
        });
      } else if (result === "denied" && onOpenPermissionsModal) {
        onOpenPermissionsModal();
      }
      return;
    }

    if (currentPerm === "granted") {
      sendDeviceNotification("Tes Notifikasi Berhasil 🔔", {
        body: "Notifikasi suara dan pengingat sudah aktif di perangkat ini.",
        tabTitleAlert: "🔔 Tes Notifikasi - Cinnamelo",
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

  const hasPinLock = Boolean(profile.roomPin && profile.roomPin.trim().length >= 4);
  const partnerName =
    profile.role === "user_a" ? profile.userBName : profile.userAName;

  return (
    <header className="sticky top-0 z-30 w-full bg-[#FFFDF9]/95 dark:bg-[#221B25]/95 border-b border-[#F3D8DF] dark:border-[#3B2E40]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
        {/* Left: Brand & Room Status Pill */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex lg:hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40]">
            <img
              src={isDark ? "/characters/kuromi.png" : "/characters/cinnamoroll.png"}
              alt="Cinnamelo"
              className="h-6 w-6 object-contain"
            />
          </div>

          <div className="lg:hidden min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-sm font-bold tracking-tight text-[#2D232E] dark:text-[#FAF5F7]">
                Cinnamelo
              </span>
              {hasPinLock && (
                <span title="Kamar Terkunci PIN" className="inline-flex">
                  <Lock className="h-3 w-3 text-rose-500 shrink-0" />
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-[#6E5A68] dark:text-[#B8A6B5] font-mono">
              #{profile.roomId}
            </p>
          </div>

          {/* Desktop Room & Partner Presence Pill */}
          <div className="hidden lg:flex items-center gap-2 rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] px-3.5 py-1.5 text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
            <span
              className={`h-2 w-2 rounded-full ${
                bothPartnersOnline ? "bg-emerald-500" : "bg-amber-400"
              }`}
            />
            <span className="inline-flex items-center gap-1">
              Kamar:{" "}
              <strong className="font-mono text-[#2D232E] dark:text-white">
                {profile.roomId}
              </strong>
              {hasPinLock && (
                <span title="Kamar Terkunci PIN" className="inline-flex">
                  <Lock className="h-3 w-3 text-rose-500" />
                </span>
              )}
            </span>
            <span className="text-[#E5C8D1] dark:text-[#4E3B4D]">•</span>
            <span
              className={
                bothPartnersOnline
                  ? "font-semibold text-emerald-700 dark:text-emerald-300"
                  : "text-[#6E5A68] dark:text-[#B8A6B5]"
              }
            >
              {bothPartnersOnline
                ? `${partnerName} sedang online`
                : `Menunggu ${partnerName}`}
            </span>
          </div>
        </div>

        {/* Right: Primary Controls + Progressive Disclosure Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1. Shared Music Pill */}
          {onOpenSharedMusicModal && (
            <div className="inline-flex items-center rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] p-0.5">
              <button
                type="button"
                onClick={() => {
                  playPop();
                  onOpenSharedMusicModal();
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold active:scale-[0.96] transition-transform select-none touch-manipulation cursor-pointer ${
                  isSharedPlaying
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-pink-200"
                    : "text-[#6E5A68] dark:text-[#B8A6B5] hover:text-[#2D232E] dark:hover:text-white"
                }`}
                title="Buka Musik Berdua"
              >
                <Disc3
                  className={`h-3.5 w-3.5 text-rose-500 ${
                    isSharedPlaying ? "animate-spin [animation-duration:3s]" : ""
                  }`}
                />
                <span className="hidden md:inline max-w-[100px] truncate text-xs font-bold">
                  {currentTrack?.title || "Musik"}
                </span>
                <span className="hidden sm:inline text-[11px] text-[#6E5A68] dark:text-[#B8A6B5] font-mono">
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
                aria-label={isSharedPlaying ? "Jeda Musik" : "Putar Musik"}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#6E5A68] hover:text-rose-500 dark:hover:text-pink-300 active:scale-[0.96] transition-transform cursor-pointer"
                title={isSharedPlaying ? "Jeda Musik" : "Putar Musik"}
              >
                {isSharedPlaying ? (
                  <Pause className="h-3 w-3 fill-rose-500 text-rose-500" />
                ) : (
                  <Play className="h-3 w-3 fill-rose-500 text-rose-500 ml-0.5" />
                )}
              </button>
            </div>
          )}

          {/* 2. Partner Role Switcher Pill */}
          <div className="inline-flex rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => switchRole("user_a")}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 font-semibold active:scale-[0.96] transition-transform select-none touch-manipulation cursor-pointer ${
                profile.role === "user_a"
                  ? "bg-[#BAE6FD] text-[#2D232E] shadow-2xs"
                  : "text-[#6E5A68] dark:text-[#B8A6B5]"
              }`}
            >
              <img src={charA.svgPath} alt={charA.name} className="h-4 w-4 object-contain" />
              <span className="max-w-[58px] truncate text-xs">{profile.userAName}</span>
            </button>
            <button
              type="button"
              onClick={() => switchRole("user_b")}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 font-semibold active:scale-[0.96] transition-transform select-none touch-manipulation cursor-pointer ${
                profile.role === "user_b"
                  ? "bg-[#FECDD3] text-[#2D232E] shadow-2xs"
                  : "text-[#6E5A68] dark:text-[#B8A6B5]"
              }`}
            >
              <img src={charB.svgPath} alt={charB.name} className="h-4 w-4 object-contain" />
              <span className="max-w-[58px] truncate text-xs">{profile.userBName}</span>
            </button>
          </div>

          {/* 3. 2-Device Pairing & Online Status Button */}
          <button
            type="button"
            onClick={() => {
              playPop();
              onOpenPairingModal?.();
            }}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold active:scale-[0.96] transition-transform select-none touch-manipulation cursor-pointer ${
              bothPartnersOnline
                ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/40 border border-[#F3D8DF] dark:border-rose-800 text-rose-700 dark:text-pink-200"
            }`}
            title={
              bothPartnersOnline
                ? "Terhubung dengan HP pasangan"
                : "Undang HP Pasangan (Kode QR)"
            }
          >
            {bothPartnersOnline ? (
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            ) : (
              <QrCode className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline text-xs">
              {bothPartnersOnline ? "Terhubung" : "Undang HP"}
            </span>
          </button>

          {/* 4. Theme Switcher */}
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={isDark ? "Ganti ke tema siang" : "Ganti ke tema malam"}
            className="flex h-9 w-9 sm:w-auto sm:px-3 items-center justify-center gap-1.5 rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] text-xs font-semibold text-[#2D232E] dark:text-[#FAF5F7] hover:border-rose-300 active:scale-[0.96] transition-transform select-none touch-manipulation cursor-pointer"
            title={isDark ? "Ganti ke tampilan Siang" : "Ganti ke tampilan Malam"}
          >
            {isDark ? (
              <Moon className="h-3.5 w-3.5 fill-rose-300 text-rose-300" />
            ) : (
              <Sun className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            )}
            <span className="hidden md:inline text-xs">
              {isDark ? "Malam" : "Siang"}
            </span>
          </button>

          {/* 5. Control Center Popover Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                playPop();
                setMenuOpen((prev) => !prev);
              }}
              aria-label="Menu Pengaturan"
              title="Pengaturan Karakter, PIN Kamar & Perangkat"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] text-[#2D232E] dark:text-[#FAF5F7] hover:border-rose-300 active:scale-[0.96] transition-transform cursor-pointer"
            >
              <Settings2 className="h-4 w-4" />
              {notificationPermission === "default" && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 border border-white dark:border-[#221B25]" />
              )}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 6 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 mt-2 w-72 rounded-3xl border-2 border-[#F3D8DF] dark:border-[#3B2E40] bg-[#FFFDF9] dark:bg-[#221B25] p-3.5 shadow-xl z-50 text-xs"
                >
                  {/* Couple Quick Stats Row */}
                  <div className="flex items-center justify-between gap-1.5 rounded-2xl bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] px-3 py-2 mb-2.5">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                      <Flame className="h-3.5 w-3.5 fill-amber-400" />
                      {heartbeatCount} Rindu
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400">
                      <Gem className="h-3.5 w-3.5 fill-sky-300" />
                      {telepathySyncScore}% Sehati
                    </span>
                    {batteryInfo && (
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
                        {batteryInfo.charging ? (
                          <BatteryCharging className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Battery className="h-3.5 w-3.5 text-[#6E5A68]" />
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
                      className="w-full flex items-center justify-between rounded-2xl px-3 py-2.5 text-left font-semibold text-[#2D232E] dark:text-[#FAF5F7] hover:bg-rose-50 dark:hover:bg-[#2E2433] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-rose-500" />
                        <span>Karakter &amp; PIN Kamar</span>
                      </span>
                      <span className="text-[11px] font-bold text-rose-500">
                        {hasPinLock ? "PIN Aktif" : "Atur"}
                      </span>
                    </button>

                    {/* Summon Sanrio AI Companion (Only place keeping Sparkles icon) */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        window.dispatchEvent(new CustomEvent("open-sanrio-ai"));
                      }}
                      className="w-full flex items-center justify-between rounded-2xl px-3 py-2.5 text-left font-semibold text-[#2D232E] dark:text-[#FAF5F7] hover:bg-sky-50 dark:hover:bg-[#2E2433] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-sky-500" />
                        <span>Teman Cerita AI</span>
                      </span>
                      <span className="text-[11px] text-[#6E5A68] dark:text-[#B8A6B5]">
                        Buka
                      </span>
                    </button>

                    {/* Notification Bell Action */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleBellClick();
                      }}
                      className="w-full flex items-center justify-between rounded-2xl px-3 py-2.5 text-left font-semibold text-[#2D232E] dark:text-[#FAF5F7] hover:bg-rose-50 dark:hover:bg-[#2E2433] transition-colors cursor-pointer"
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
                        className={`text-[11px] font-bold ${
                          notificationPermission === "granted"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {notificationPermission === "granted" ? "Tes" : "Aktifkan"}
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
                        className="w-full flex items-center justify-between rounded-2xl px-3 py-2.5 text-left font-semibold text-[#2D232E] dark:text-[#FAF5F7] hover:bg-emerald-50 dark:hover:bg-[#2E2433] transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          <span>Izin Kamera, Mic &amp; Lokasi</span>
                        </span>
                        <span className="text-[11px] text-[#6E5A68] dark:text-[#B8A6B5]">
                          Cek
                        </span>
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
