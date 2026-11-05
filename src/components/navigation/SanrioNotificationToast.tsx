"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, ShieldAlert, Sparkles, X } from "lucide-react";
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
  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const [dismissedPrompt, setDismissedPrompt] = useState(false);
  const { playPop, playChime } = useAudio();

  // Re-check notification permission state on mount and window focus
  useEffect(() => {
    const updatePerm = () => {
      const current = getNotificationPermission();
      setPermission(current);
    };

    updatePerm();
    window.addEventListener("focus", updatePerm);
    return () => window.removeEventListener("focus", updatePerm);
  }, []);

  // Listen to in-app toast event dispatch
  useEffect(() => {
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

  // Auto-dismiss in-app toast after 4.5 seconds
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

    if (res === "granted") {
      setDismissedPrompt(true);
      sendDeviceNotification("Notifikasi Cinnamelo Aktif! 🔔💖", {
        body: "Kamu & pasangan sekarang akan selalu terhubung di HP & Laptop!",
      });
    } else if (res === "denied") {
      alert(
        "Izin notifikasi diblokir di browser. Buka pengaturan browser (ikon gembok 🔒 di sebelah kiri URL) untuk mengizinkan notifikasi!"
      );
    }
  };

  const showBanner = !dismissedPrompt && (permission === "default" || permission === "denied");

  return (
    <>
      {/* 
        1. FLOATING PERMISSION PROMPT BANNER 
        Properly centered across all devices via inset-x-0 & flex justify-center 
        (NEVER cut off on mobile!)
      */}
      <AnimatePresence>
        {showBanner && (
          <div className="fixed top-16 sm:top-20 inset-x-0 z-50 flex justify-center px-3 sm:px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -18, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.95 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className={`w-full max-w-lg pointer-events-auto rounded-2xl p-3 shadow-2xl backdrop-blur-xl border ${
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
                      <span>
                        {permission === "denied"
                          ? "Izin Notifikasi Diblokir"
                          : "Aktifkan Notifikasi Cinnamelo!"}
                      </span>
                      {permission !== "denied" && <Sparkles className="h-3 w-3 text-amber-300" />}
                    </h4>
                    <p className="text-[11px] opacity-90 truncate mt-0.5">
                      {permission === "denied"
                        ? "Klik ikon gembok 🔒 di bilah URL peramban untuk mengizinkan."
                        : "Dapatkan kabar saat pasangan masuk web, kirim chat & rindu!"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {permission === "default" && (
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      className="rounded-full bg-white hover:bg-pink-50 text-pink-600 px-3 py-1.5 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    >
                      Aktifkan ✨
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDismissedPrompt(true)}
                    className="opacity-80 hover:opacity-100 p-1 cursor-pointer"
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

      {/* 
        2. FLOATING REALTIME SANRIO IN-APP NOTIFICATION TOAST 
        Properly centered via flex wrapper (NEVER cut off!)
      */}
      <AnimatePresence>
        {toast && (
          <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-3 sm:px-4 pointer-events-none">
            <motion.aside
              key={toast.id}
              initial={{ opacity: 0, y: -25, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="w-full max-w-md pointer-events-auto rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-pink-300 dark:border-purple-600 p-3 shadow-2xl"
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
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
