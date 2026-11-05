"use client";

import React, { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellRing,
  Camera,
  CheckCircle2,
  HelpCircle,
  Laptop,
  MapPin,
  Mic,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendDeviceNotification,
  type NotificationPermissionState,
} from "@/lib/notifications";
import { useAudio } from "@/context/AudioContext";

export interface DevicePermissionsModalProps {
  open: boolean;
  onClose: () => void;
}

export function DevicePermissionsModal({ open, onClose }: DevicePermissionsModalProps) {
  const { playPop, playChime } = useAudio();

  const [notifState, setNotifState] = useState<NotificationPermissionState>("default");
  const [micState, setMicState] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const [cameraState, setCameraState] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const [geoState, setGeoState] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");

  const [testingMic, setTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micSuccess, setMicSuccess] = useState(false);

  const [testingCamera, setTestingCamera] = useState(false);
  const [cameraSuccess, setCameraSuccess] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const [geoCoords, setGeoCoords] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshAllPermissions = async () => {
    // 1. Notification
    setNotifState(getNotificationPermission());

    // 2. Query Permissions API if supported
    if (typeof navigator !== "undefined" && "permissions" in navigator) {
      try {
        const notifQuery = await navigator.permissions.query({ name: "notifications" as any });
        setNotifState(notifQuery.state as NotificationPermissionState);
        notifQuery.onchange = () => setNotifState(notifQuery.state as NotificationPermissionState);
      } catch {}

      try {
        const micQuery = await navigator.permissions.query({ name: "microphone" as any });
        setMicState(micQuery.state as any);
        micQuery.onchange = () => setMicState(micQuery.state as any);
      } catch {}

      try {
        const camQuery = await navigator.permissions.query({ name: "camera" as any });
        setCameraState(camQuery.state as any);
        camQuery.onchange = () => setCameraState(camQuery.state as any);
      } catch {}

      try {
        const geoQuery = await navigator.permissions.query({ name: "geolocation" as any });
        setGeoState(geoQuery.state as any);
        geoQuery.onchange = () => setGeoState(geoQuery.state as any);
      } catch {}
    }
  };

  useEffect(() => {
    if (open) {
      refreshAllPermissions();
    }
  }, [open]);

  // Request & Test Notification
  const handleTestNotification = async () => {
    playPop();
    setStatusMessage("Meminta izin notifikasi browser...");
    const res = await requestNotificationPermission();
    setNotifState(res);

    if (res === "granted") {
      playChime();
      setStatusMessage("✅ Notifikasi aktif! Mengirimkan notifikasi tes ke layar...");
      const sent = await sendDeviceNotification("Tes Notifikasi Cinnamelo 🔔💖", {
        body: "Halo! Notifikasi perangkatmu di Laptop / HP sudah aktif dan siap beroperasi!",
        tag: `test-notif-${Date.now()}`,
      });
      if (sent) {
        setStatusMessage("🎉 Notifikasi tes berhasil dikirim! Periksa banner pop-up atau Action Center.");
      }
    } else if (res === "denied") {
      setStatusMessage("⚠️ Izin notifikasi diblokir oleh browser. Silakan buka ikon gembok 🔒 di bilah URL.");
    }
  };

  // Request & Test Microphone
  const handleTestMic = async () => {
    playPop();
    setTestingMic(true);
    setMicSuccess(false);
    setStatusMessage("Membuka mikrofon...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicState("granted");
      setMicSuccess(true);
      setStatusMessage("🎙️ Mikrofon terhubung! Mencoba mendeteksi suara...");

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let count = 0;
      const interval = setInterval(() => {
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const avg = Math.min(100, Math.round((sum / buffer.length) * 1.5));
        setMicLevel(avg);
        count++;
        if (count >= 15) {
          clearInterval(interval);
          stream.getTracks().forEach((t) => t.stop());
          audioCtx.close();
          setTestingMic(false);
          setStatusMessage("✅ Tes mikrofon selesai: Suara terdeteksi dengan jernih!");
        }
      }, 200);
    } catch (err: any) {
      setTestingMic(false);
      setMicState("denied");
      setStatusMessage(`❌ Akses mikrofon gagal: ${err?.message || "Izin ditolak oleh peramban"}`);
    }
  };

  // Request & Test Camera
  const handleTestCamera = async () => {
    playPop();
    setTestingCamera(true);
    setCameraSuccess(false);
    setStatusMessage("Membuka kamera...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setCameraState("granted");
      setCameraSuccess(true);
      setStatusMessage("📷 Kamera aktif! Menampilkan pratinjau langsung...");

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }

      setTimeout(() => {
        stream.getTracks().forEach((t) => t.stop());
        setTestingCamera(false);
        setStatusMessage("✅ Tes kamera selesai: Kamera siap untuk Video Call 2-arah!");
      }, 4000);
    } catch (err: any) {
      setTestingCamera(false);
      setCameraState("denied");
      setStatusMessage(`❌ Akses kamera gagal: ${err?.message || "Izin ditolak oleh peramban"}`);
    }
  };

  // Request & Test Geolocation
  const handleTestGeo = () => {
    playPop();
    setStatusMessage("Mendeteksi lokasi GPS...");
    if (!("geolocation" in navigator)) {
      setGeoState("denied");
      setStatusMessage("❌ Browser tidak mendukung GPS Geolocation");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState("granted");
        const coords = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
        setGeoCoords(coords);
        setStatusMessage(`📍 Lokasi GPS berhasil didapatkan: ${coords}`);
      },
      (err) => {
        setGeoState("denied");
        setStatusMessage(`❌ Akses lokasi GPS gagal: ${err.message}`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Request All Permissions Sequentially
  const handleAuthorizeAll = async () => {
    playPop();
    setStatusMessage("Memulai aktivasi semua izin web...");
    await handleTestNotification();
    await handleTestMic();
    await handleTestCamera();
    handleTestGeo();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-pink-200 dark:border-purple-800 shadow-2xl overflow-hidden p-5 sm:p-6 text-[#1E293B] dark:text-white my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white shadow-md shadow-pink-500/25">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-1.5">
                  <span>Pusat Izin & Pengaturan Perangkat</span>
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pastikan izin Notifikasi, Suara, Kamera & GPS aktif di HP & Laptop
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Status Message Alert */}
          {statusMessage && (
            <div className="mt-3 rounded-2xl bg-pink-50 dark:bg-purple-950/50 border border-pink-200 dark:border-purple-700 p-2.5 text-xs font-medium text-pink-700 dark:text-pink-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-pink-500 animate-spin" />
              <span className="flex-1">{statusMessage}</span>
            </div>
          )}

          {/* Permissions Grid */}
          <div className="mt-4 space-y-3">
            {/* 1. NOTIFICATIONS */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    notifState === "granted"
                      ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300"
                      : notifState === "denied"
                      ? "bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300"
                      : "bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300"
                  }`}
                >
                  {notifState === "granted" ? (
                    <BellRing className="h-5 w-5" />
                  ) : (
                    <Bell className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">Notifikasi Desktop / HP</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        notifState === "granted"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                          : notifState === "denied"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                      }`}
                    >
                      {notifState === "granted"
                        ? "Aktif 🟢"
                        : notifState === "denied"
                        ? "Diblokir 🔴"
                        : "Belum Diizinkan 🟡"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    Kabar saat pasangan masuk web, chat baru & detak rindu
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestNotification}
                className="shrink-0 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white text-xs font-bold px-3 py-1.5 shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                {notifState === "granted" ? "Tes Notif 🔔" : "Aktifkan ✨"}
              </button>
            </div>

            {/* 2. MICROPHONE */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    micState === "granted"
                      ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300"
                      : micState === "denied"
                      ? "bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300"
                      : "bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-300"
                  }`}
                >
                  <Mic className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">Mikrofon (Suara 2-Arah)</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        micState === "granted"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                          : micState === "denied"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"
                          : "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300"
                      }`}
                    >
                      {micState === "granted"
                        ? "Aktif 🟢"
                        : micState === "denied"
                        ? "Diblokir 🔴"
                        : "Siap Diminta 🎤"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    Telepon suara langsung & pesan suara audio note
                  </p>
                  {testingMic && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Volume2 className="h-3 w-3 text-emerald-500 animate-pulse" />
                      <div className="h-2 w-28 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-75"
                          style={{ width: `${micLevel}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-emerald-500">{micLevel}%</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestMic}
                disabled={testingMic}
                className="shrink-0 rounded-full bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white text-xs font-bold px-3 py-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                {testingMic ? "Menguji..." : micSuccess ? "Tes Ulang 🎤" : "Izinkan & Tes 🎙️"}
              </button>
            </div>

            {/* 3. CAMERA */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      cameraState === "granted"
                        ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300"
                        : cameraState === "denied"
                        ? "bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300"
                        : "bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300"
                    }`}
                  >
                    <Camera className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">Kamera (Video Call)</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          cameraState === "granted"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                            : cameraState === "denied"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
                        }`}
                      >
                        {cameraState === "granted"
                          ? "Aktif 🟢"
                          : cameraState === "denied"
                          ? "Diblokir 🔴"
                          : "Siap Diminta 📷"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      Panggilan video dua arah di Laptop & HP
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestCamera}
                  disabled={testingCamera}
                  className="shrink-0 rounded-full bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white text-xs font-bold px-3 py-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  {testingCamera ? "Merekam..." : cameraSuccess ? "Tes Ulang 📷" : "Izinkan & Tes 📷"}
                </button>
              </div>

              {/* Video Preview Box during test */}
              {testingCamera && (
                <div className="h-32 w-full rounded-xl overflow-hidden bg-black relative border border-slate-700">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover scale-x-[-1]"
                  />
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white">
                    Live Camera Mirror Preview
                  </span>
                </div>
              )}
            </div>

            {/* 4. GEOLOCATION GPS */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    geoState === "granted"
                      ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300"
                      : geoState === "denied"
                      ? "bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300"
                      : "bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300"
                  }`}
                >
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">Lokasi GPS</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        geoState === "granted"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                          : geoState === "denied"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"
                      }`}
                    >
                      {geoState === "granted"
                        ? "Aktif 🟢"
                        : geoState === "denied"
                        ? "Diblokir 🔴"
                        : "Siap Diminta 📍"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {geoCoords ? `Koordinat: ${geoCoords}` : "Bagikan lokasi posisi kamu ke pasangan di chat"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestGeo}
                className="shrink-0 rounded-full bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white text-xs font-bold px-3 py-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                {geoCoords ? "Tes Lagi 📍" : "Izinkan GPS 🗺️"}
              </button>
            </div>
          </div>

          {/* Master "Aktifkan Semua Izin" Button */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleAuthorizeAll}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white font-bold text-xs px-5 py-2.5 shadow-lg shadow-pink-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Izinkan Semua Izin Sekaligus 🚀</span>
            </button>

            <button
              type="button"
              onClick={refreshAllPermissions}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Perbarui Status</span>
            </button>
          </div>

          {/* Browser Troubleshooting Tips */}
          <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 border border-slate-200/60 dark:border-slate-700/60">
            <p className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-pink-500" />
              <span>Jika Izin Tertulis "Diblokir 🔴" di Laptop atau HP:</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-1 leading-relaxed">
              <li>
                <strong>Laptop (Chrome/Edge):</strong> Klik ikon <strong>Gembok / Setelan 🔒</strong> di bilah URL paling kiri atas, ubah Notifikasi, Mikrofon, dan Kamera menjadi <strong>"Izinkan" (Allow)</strong>, lalu segarkan halaman (F5).
              </li>
              <li>
                <strong>Windows Notifications:</strong> Pastikan <em>Bantuan Fokus / Do Not Disturb</em> di pojok kanan bawah jam Windows dalam posisi mati, dan notifikasi Google Chrome diizinkan di Windows Settings.
              </li>
              <li>
                <strong>HP (Android Chrome):</strong> Ketuk titik tiga di pojok kanan atas &gt; Setelan &gt; Setelan Situs &gt; Notifikasi & Mikrofon &gt; Izinkan.
              </li>
            </ol>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}