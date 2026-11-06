"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, ShieldAlert, Sparkles, X } from "lucide-react";
import {
  clearTabTitleNotification,
  getNotificationPermission,
  requestNotificationPermission,
  sendDeviceNotification,
  type NotificationPermissionState,
} from "@/lib/notifications";
import { useAudio } from "@/context/AudioContext";
import type { AppTab } from "@/lib/types";

interface ToastData {
  id: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  targetTab?: AppTab;
  timestamp: number;
}

export function SanrioNotificationToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [permission, setPermission] =
    useState<NotificationPermissionState>("default");
  const [dismissedPrompt, setDismissedPrompt] = useState(false);
  const { playPop, playChime } = useAudio();

  // Re-check notification permission state on mount, focus, and explicit permission events
  useEffect(() => {
    const updatePerm = () => {
      setPermission(getNotificationPermission());
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

  // Listen to In-App Toast event dispatch (Tier 2 Notification Engine)
  useEffect(() => {
    const handleInAppToast = (e: Event) => {
      const customEv = e as CustomEvent<any>;
      if (!customEv.detail) return;
      playChime();
      const newToast: ToastData = {
        id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: customEv.detail.title || "Kabar dari Pasangan 💖",
        body: customEv.detail.body || "",
        icon: customEv.detail.icon || "/characters/cinnamoroll.svg",
        url: customEv.detail.url || "/",
        targetTab: customEv.detail.targetTab,
        timestamp: Date.now(),
      };
      setToast(newToast);
    };

    window.addEventListener("sanrio-in-app-toast", handleInAppToast);
    return () => {
      window.removeEventListener("sanrio-in-app-toast", handleInAppToast);
    };
  }, [playChime]);

  // Auto-dismiss in-app toast after 4.5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleRequestPermission = async () => {
    playPop();
    const res = await requestNotificationPermission();
    setPermission(res);

    if (res === "granted") {
      setDismissedPrompt(true);
      sendDeviceNotification("Notifikasi Cinnamelo Aktif! 🔔💖", {
        body: "Kamu & pasangan sekarang akan selalu terhubung di HP & Laptop!",
      });
    }
  };

  const handleClickToast = () => {
    clearTabTitleNotification();
    if (toast?.targetTab && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sanrio-navigate-tab", {
          detail: { tab: toast.targetTab },
        })
      );
    }
    setToast(null);
  };

  const showBanner =
    !dismissedPrompt && (permission === "default" || permission === "denied");

  return (
    <>
      {/* 1. FLOATING PERMISSION PROMPT BANNER (Mobile-Safe Centered Wrapper) */}
      <AnimatePresence>
        {showBanner && (
          <div className="fixed top-16 sm:top-20 inset-x-0 z-40 flex justify-center px-3 sm:px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 30,
                mass: 0.8,
              }}
              className={`w-full max-w-lg pointer-events-auto rounded-2xl p-3 shadow-2xl border transform-gpu ${
                permission === "denied"
                  ? "bg-slate-900/95 border-amber-400/40 text-amber-200"
                  : "bg-gradient-to-r from-pink-500/95 via-rose-500/95 to-purple-600/95 border-white/30 text-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 border border-white/30">
                    {permission === "denied" ? (
                      <ShieldAlert className="h-5 w-5 text-amber-300" />
                    ) : (
                      <BellRing className="h-5 w-5 text-white animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold leading-tight flex items-center gap-1">
                      <span className="truncate">
                        {permission === "denied"
                          ? "Izin Notifikasi Browser Diblokir"
                          : "Aktifkan Notifikasi HP & Laptop"}
                      </span>
                      {permission !== "denied" && (
                        <Sparkles className="h-3 w-3 shrink-0 text-amber-300" />
                      )}
                    </h4>
                    <p className="text-[11px] opacity-90 truncate mt-0.5">
                      {permission === "denied"
                        ? "Klik ikon gembok di bilah alamat browser untuk mengizinkan."
                        : "Dapatkan kabar instan saat pasangan chat, telepon, atau rindu!"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {permission === "default" && (
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      className="rounded-full bg-white hover:bg-pink-50 text-pink-600 px-3 py-1.5 text-xs font-bold shadow-xs active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer whitespace-nowrap"
                    >
                      Aktifkan ✨
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDismissedPrompt(true)}
                    className="opacity-80 hover:opacity-100 p-1 active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer"
                    title="Tutup banner"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. FLOATING IN-APP NOTIFICATION BANNER (Desktop & Mobile Active Tab) */}
      <AnimatePresence>
        {toast && (
          <div className="fixed top-3.5 inset-x-0 z-50 flex justify-center px-3 sm:px-4 pointer-events-none">
            <motion.aside
              key={toast.id}
              initial={{ opacity: 0, y: -24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.95 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 28,
                mass: 0.8,
              }}
              onClick={handleClickToast}
              className="w-full max-w-md pointer-events-auto cursor-pointer rounded-2xl bg-white/98 dark:bg-slate-900/98 lg:backdrop-blur-md border border-pink-300 dark:border-purple-600 p-3 shadow-2xl transform-gpu active:scale-[0.98] transition-transform duration-100"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-sky-100 dark:from-purple-950 dark:to-slate-800 border border-pink-200 dark:border-purple-700 shadow-xs">
                    <img
                      src={toast.icon || "/characters/cinnamoroll.svg"}
                      alt=""
                      className="h-7 w-7 object-contain"
                    />
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 truncate">
                      <span className="truncate">{toast.title}</span>
                    </h4>
                    {toast.body && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                        {toast.body}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setToast(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 shrink-0 active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer"
                  title="Tutup pemberitahuan"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
