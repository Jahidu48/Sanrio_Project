"use client";

import type { AppTab } from "./types";

export type NotificationPermissionState =
  | "granted"
  | "denied"
  | "default"
  | "unsupported";

const NOTIFICATION_STORAGE_KEY = "cinnamelo_notifications_enabled_v1";
const BASE_APP_TITLE = "Cinnamelo — Ruang Kecil Kita ☁️🎀";

let titleBlinkInterval: number | null = null;
let unreadBannerCount = 0;
let listenersAttached = false;

/**
 * Stops blinking browser tab title and restores default title.
 */
export function clearTabTitleNotification(): void {
  if (typeof document === "undefined") return;
  if (titleBlinkInterval !== null) {
    window.clearInterval(titleBlinkInterval);
    titleBlinkInterval = null;
  }
  unreadBannerCount = 0;
  document.title = BASE_APP_TITLE;
}

function attachFocusResetListenersOnce(): void {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;

  const handleReset = () => {
    if (!document.hidden) {
      clearTabTitleNotification();
    }
  };

  window.addEventListener("focus", handleReset);
  window.addEventListener("pointerdown", handleReset, { passive: true });
  document.addEventListener("visibilitychange", handleReset);
}

/**
 * Starts blinking document.title (WhatsApp Web / Discord Web style)
 * so desktop laptop users immediately spot incoming chats/calls/moods on any tab.
 */
export function triggerTabTitleBlink(alertLabel: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  attachFocusResetListenersOnce();

  unreadBannerCount += 1;
  if (titleBlinkInterval !== null) {
    window.clearInterval(titleBlinkInterval);
    titleBlinkInterval = null;
  }

  const formattedAlert = alertLabel.includes("(")
    ? alertLabel
    : alertLabel.replace(" — ", ` (${unreadBannerCount}) — `);

  let showAlert = true;
  document.title = formattedAlert;

  titleBlinkInterval = window.setInterval(() => {
    showAlert = !showAlert;
    document.title = showAlert ? formattedAlert : BASE_APP_TITLE;
  }, 1100);

  // If user is actively focused, still flash briefly for 5.5s then restore cleanly
  if (document.hasFocus() && !document.hidden) {
    window.setTimeout(() => {
      if (document.hasFocus() && !document.hidden) {
        clearTabTitleNotification();
      }
    }, 5500);
  }
}

/**
 * Checks if the Web Notification API is supported on this browser/device.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Returns current permission state.
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission as NotificationPermissionState;
}

/**
 * Request notification permission from the user.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return "unsupported";

  try {
    const result = await Notification.requestPermission();
    if (result === "granted") {
      try {
        window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, "true");
      } catch {}
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sanrio-notification-perm-changed"));
    }
    return result as NotificationPermissionState;
  } catch (e) {
    console.warn("Notification request failed:", e);
    return "denied";
  }
}

export type CustomNotificationOptions = NotificationOptions & {
  url?: string;
  renotify?: boolean;
  vibrate?: number[] | number;
  tabTitleAlert?: string;
  targetTab?: AppTab;
};

/**
 * 3-Tier Cross-Device Notification Engine:
 * - Tier 1: Service Worker OS Notification (reg.showNotification) with native fallback to new window.Notification()
 * - Tier 2: In-App Floating Banner + Sound Chime + Blinking Browser Tab Title (works even when Desktop tab is focused!)
 */
export async function sendDeviceNotification(
  title: string,
  options?: CustomNotificationOptions
): Promise<boolean> {
  const defaultIcon = "/characters/cinnamoroll.svg";
  const defaultBadge = "/characters/cinnamoroll.svg";

  // TIER 2A: ALWAYS dispatch In-App Floating Banner + Sound Chime (even on active Laptop tab!)
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("sanrio-in-app-toast", {
        detail: {
          title,
          body: options?.body || "",
          icon: options?.icon || defaultIcon,
          url: options?.url || "/",
          targetTab: options?.targetTab,
          timestamp: Date.now(),
        },
      })
    );
  }

  // TIER 2B: Blinking Browser Tab Title
  if (options?.tabTitleAlert) {
    triggerTabTitleBlink(options.tabTitleAlert);
  } else {
    triggerTabTitleBlink(`🔔 ${title} - Sanrio Couple`);
  }

  // Device haptic vibration on supported mobile browsers
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([100, 50, 100]);
    } catch {}
  }

  // TIER 1: OS Notification via Service Worker (Mobile PWA & Desktop) + window.Notification Fallback
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  const tag = options?.tag || `sanrio_notif_${Date.now()}`;
  const swOptions: CustomNotificationOptions = {
    body: options?.body || "",
    icon: options?.icon || defaultIcon,
    badge: options?.badge || defaultBadge,
    tag,
    renotify: options?.renotify ?? true,
    vibrate: options?.vibrate ?? [100, 50, 100],
    requireInteraction: options?.requireInteraction ?? false,
    data: {
      url: options?.url || "/",
      ...(options?.data || {}),
    },
  };

  // Primary Tier 1: Service Worker showNotification
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration | null>((resolve) =>
          window.setTimeout(() => resolve(null), 900)
        ),
      ]);

      if (reg && typeof reg.showNotification === "function") {
        await reg.showNotification(title, swOptions as NotificationOptions);
        return true;
      }
    } catch (swErr) {
      console.debug(
        "[Notifications] SW showNotification unavailable, falling back:",
        swErr
      );
    }
  }

  // Fallback Tier 1: Direct Desktop window.Notification
  try {
    const directNotif = new window.Notification(title, {
      body: swOptions.body,
      icon: swOptions.icon,
      badge: swOptions.badge,
      tag,
      requireInteraction: swOptions.requireInteraction,
      data: swOptions.data,
    });
    directNotif.onclick = () => {
      window.focus();
      directNotif.close();
    };
    return true;
  } catch (err) {
    console.debug("[Notifications] Fallback window.Notification error:", err);
    return false;
  }
}

// ----------------------------------------------------------------------------
// SPECIFIC SANRIO COUPLE NOTIFICATION HELPERS
// ----------------------------------------------------------------------------

export function notifyPartnerOnline(partnerName: string) {
  sendDeviceNotification(`${partnerName} Masuk ke Web! 🌸`, {
    body: `${partnerName} baru saja membuka ruang kita dan sedang online bersamamu!`,
    tag: "partner-online-presence",
    renotify: true,
    tabTitleAlert: `🟢 ${partnerName} Online! - Sanrio Couple`,
    targetTab: "home",
  });
}

export function notifyPartnerWaiting(partnerName: string) {
  sendDeviceNotification(`${partnerName} Sedang Menunggumu! 💌`, {
    body: `${partnerName} sedang berada di Cinnamelo menunggumu untuk masuk berdua ✨`,
    tag: "partner-waiting-alert",
    renotify: true,
    tabTitleAlert: `💌 ${partnerName} Menunggumu! - Sanrio Couple`,
    targetTab: "home",
  });
}

export function notifyHeartbeat(partnerName: string) {
  sendDeviceNotification(`Detak Rindu dari ${partnerName}! 💖`, {
    body: `${partnerName} baru saja mengirimkan gelombang rindu untukmu!`,
    tag: "partner-heartbeat",
    renotify: true,
    tabTitleAlert: `💖 Detak Rindu Baru! - Sanrio Couple`,
    targetTab: "home",
  });
}

export function notifyChatMessage(senderName: string, text: string) {
  sendDeviceNotification(`Pesan dari ${senderName} 💬`, {
    body: text.length > 85 ? `${text.slice(0, 85)}...` : text,
    tag: `chat-msg-${Date.now()}`,
    renotify: true,
    tabTitleAlert: `💬 (${unreadBannerCount + 1}) Pesan Baru! - Sanrio Couple`,
    targetTab: "chat",
    url: "/?tab=chat",
  });
}

export function notifyIncomingCall(
  callerName: string,
  callType: "audio" | "video"
) {
  const typeText = callType === "video" ? "Panggilan Video" : "Panggilan Suara";
  sendDeviceNotification(`${typeText} Masuk dari ${callerName} 📞`, {
    body: `${callerName} sedang memanggilmu sekarang! Ketuk untuk menjawab.`,
    tag: "incoming-webrtc-call",
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    tabTitleAlert: `📞 Panggilan Masuk dari ${callerName}! - Sanrio Couple`,
    targetTab: "chat",
  });
}

export function notifyMoodChange(
  partnerName: string,
  statusText: string,
  iconPath?: string
) {
  sendDeviceNotification(`Mood ${partnerName} Berubah 🌸`, {
    body: `${partnerName} sekarang merasa: ${statusText}`,
    icon: iconPath || "/characters/my-melody.svg",
    tag: "partner-mood-update",
    renotify: true,
    tabTitleAlert: `🌸 Mood ${partnerName}: ${statusText} - Sanrio Couple`,
    targetTab: "home",
  });
}

export function notifyMusicPlaying(title: string, updatedBy: string) {
  sendDeviceNotification(`Musik Baru Diputar 🎵`, {
    body: `"${title}" sedang diputar bersama oleh ${updatedBy}`,
    tag: "jockie-music-update",
    renotify: true,
    tabTitleAlert: `🎵 Lagu Baru Diputar! - Sanrio Couple`,
  });
}

export function notifyDailyAnswerSealed(partnerName: string) {
  sendDeviceNotification(`Amplop Cinta Tersegel! 💌`, {
    body: `${partnerName} telah menjawab pertanyaan harian hari ini. Segel jawabanmu untuk membukanya!`,
    tag: "daily-answer-sealed",
    renotify: true,
    tabTitleAlert: `💌 Amplop Harian Terisi! - Sanrio Couple`,
    targetTab: "home",
  });
}

export function notifyProfileCharacterChange(
  partnerName: string,
  characterName: string,
  iconPath?: string
) {
  sendDeviceNotification(`Karakter ${partnerName} Diperbarui! ✨`, {
    body: `${partnerName} kini tampil sebagai ${characterName}`,
    icon: iconPath || "/characters/cinnamoroll.svg",
    tag: "partner-character-update",
    renotify: true,
    tabTitleAlert: `✨ ${partnerName} -> ${characterName} - Sanrio Couple`,
    targetTab: "home",
  });
}
