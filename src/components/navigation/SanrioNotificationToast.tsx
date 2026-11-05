"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellRing, Sparkles, X } from "lucide-react";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendDeviceNotification,
  type NotificationPermissionState,
} from "@/lib/notifications";
import { useAudio } from "@/context/AudioContext";

interface ToastData {
  id: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  timestamp: number;
}

export function SanrioNotificationToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [permission, setPermission] = useState<NotificationPermissionState>("granted");
  const [showPromptBanner, setShowPromptBanner] = useState(false);
  const { playPop, playChime } = useAudio();

  useEffect(() => {
    const currentPerm = getNotificationPermission();
    setPermission(currentPerm);
    if (currentPerm === "default") {
      setShowPromptBanner(true);
    }

    const handleInAppToast = (e: CustomEvent<any>) => {
      if (!e.detail) return;
      playChime();
      const newToast: ToastData = {
        id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: e.detail.title || "Kabar dari Pasangan 💖",
        body: e.detail.body || "",
        icon: e.detail.icon || "/characters/cinnamoroll.svg",
        url: e.detail.url || "/",
        timestamp: Date.now(),
      };
      setToast(newToast);
    };

    window.addEventListener("sanrio-in-app-toast" as any, handleInAppToast as EventListener);

    return () => {
      window.removeEventListener("sanrio-in-app-toast" as any, handleInAppToast as EventListener);
    };
  }, [playChime]);

  // Auto-dismiss active toast after 4.5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleRequestPermission = async () => {
    playPop();
    const res = await requestNotificationPermission();
    setPermission(res);
    setShowPromptBanner(false);

    if (res === "granted") {
      sendDeviceNotification("Notifikasi Cinnamelo Aktif! 🔔💖", {
        body: "Sekarang kamu akan selalu mendapat kabar saat pasangan masuk web atau kirim chat!",
      });
    } else if (res === "denied") {
      alert(
        "Izin notifikasi diblokir di peramban. Silakan klik ikon gembok di sebelah kiri bilah URL untuk mengizinkan notifikasi!"
      );
    }
  };

  return (
    <>
      {/* 1. FLOATING PERMISSION PROMPT BANNER (Shown when permission is not yet granted) */}
      <AnimatePresence>
        {showPromptBanner && permission === "default" && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-lg rounded-2xl bg-gradient-to-r from-pink-500/95 via-rose-500/95 to-purple-600/95 text-white p-3 shadow-xl backdrop-blur-md border border-white/20"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 border border-white/30">
                  <BellRing className="h-5 w-5 text-white animate-pulse" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold leading-tight flex items-center gap-1">
                    <span>Aktifkan Notifikasi Cinnamelo!</span>
                    <Sparkles className="h-3 w-3 text-amber-300" />
                  </h4>
                  <p className="text-[11px] text-pink-100 truncate">
                    Dapatkan kabar langsung saat pasangan masuk web, kirim chat &amp; rindu!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="rounded-full bg-white hover:bg-pink-50 text-pink-600 px-3 py-1 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Aktifkan ✨
                </button>
                <button
                  type="button"
                  onClick={() => setShowPromptBanner(false)}
                  className="text-white/80 hover:text-white p-1 cursor-pointer"
                  title="Tutup banner"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. FLOATING REALTIME SANRIO IN-APP NOTIFICATION TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.aside
            key={toast.id}
            initial={{ opacity: 0, y: -30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-pink-300 dark:border-purple-600 p-3 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-sky-100 dark:from-purple-950 dark:to-slate-800 border border-pink-200 dark:border-purple-700 shadow-xs">
                  <img
                    src={toast.icon || "/characters/cinnamoroll.svg"}
                    alt=""
                    className="h-7 w-7 object-contain drop-shadow-xs"
                  />
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 truncate">
                    <span>{toast.title}</span>
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
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer shrink-0"
                title="Tutup pemberitahuan"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
