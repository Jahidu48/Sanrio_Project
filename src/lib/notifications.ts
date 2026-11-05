"use client";

export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

const NOTIFICATION_STORAGE_KEY = "cinnamelo_notifications_enabled_v1";

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
};

/**
 * Core function to dispatch a device notification.
 * Dispatches both an in-app visual toast AND a native OS/PWA push notification.
 * Uses ServiceWorkerRegistration.showNotification with a fallback to native new Notification().
 */
export async function sendDeviceNotification(
  title: string,
  options?: CustomNotificationOptions
): Promise<boolean> {
  const defaultIcon = "/characters/cinnamoroll.svg";
  const defaultBadge = "/characters/cinnamoroll.svg";

  // 1. ALWAYS dispatch in-app visible toast first so the user sees it immediately on screen!
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("sanrio-in-app-toast", {
        detail: {
          title,
          body: options?.body || "",
          icon: options?.icon || defaultIcon,
          url: options?.url || "/",
          timestamp: Date.now(),
        },
      })
    );
  }

  // 2. Trigger device haptic vibration if available (Android Chrome)
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([150, 70, 150]);
    } catch {}
  }

  // 3. Check if OS notifications are supported and granted
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  const payload: CustomNotificationOptions = {
    icon: defaultIcon,
    badge: defaultBadge,
    vibrate: [200, 100, 200],
    ...options,
    data: {
      url: options?.url || "/",
      ...(options?.data || {}),
    },
  };

  // 4. On Desktop, try direct window Notification first or in parallel for immediate OS balloon
  let showedDirectNotification = false;
  try {
    const n = new Notification(title, {
      ...payload,
      tag: payload.tag || `notif_${Date.now()}`,
    } as NotificationOptions);
    n.onclick = () => {
      window.focus();
      n.close();
    };
    showedDirectNotification = true;
  } catch (err) {
    // Some mobile browsers (Android Chrome) require ServiceWorker showNotification
    console.debug("Direct Notification() not supported or requires ServiceWorker:", err);
  }

  // 5. Also dispatch via Service Worker Registration (essential for PWA and Mobile background push)
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const regPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 800)
      );
      const reg = await Promise.race([regPromise, timeoutPromise]);
      if (reg && "showNotification" in reg) {
        await reg.showNotification(title, payload);
        return true;
      }
    } catch (e) {
      console.warn("ServiceWorker showNotification failed:", e);
    }
  }

  return showedDirectNotification;
}

// ----------------------------------------------------------------------------
// SPECIFIC SANRIO COUPLE NOTIFICATION HELPERS
// ----------------------------------------------------------------------------

/**
 * Triggered when partner enters the web / becomes online.
 */
export function notifyPartnerOnline(partnerName: string) {
  sendDeviceNotification(`${partnerName} Masuk ke Web! 🌸`, {
    body: `${partnerName} baru saja membuka Cinnamelo dan sedang online bersamamu. Ayo sapa sekarang!`,
    tag: "partner-online-presence",
    renotify: true,
  });
}

/**
 * Triggered when partner is waiting on the web.
 */
export function notifyPartnerWaiting(partnerName: string) {
  sendDeviceNotification(`${partnerName} Sedang Menunggumu! 💌`, {
    body: `${partnerName} sedang berada di Cinnamelo menunggumu untuk masuk berdua ✨`,
    tag: "partner-waiting-alert",
    renotify: true,
  });
}

/**
 * Triggered when partner sends a Heartbeat / Detak Rindu.
 */
export function notifyHeartbeat(partnerName: string) {
  sendDeviceNotification(`Detak Rindu dari ${partnerName}! 💖`, {
    body: `${partnerName} baru saja mengirimkan gelombang rindu untukmu!`,
    tag: "partner-heartbeat",
    renotify: true,
  });
}

/**
 * Triggered when a new chat message arrives while user is in another tab/app.
 */
export function notifyChatMessage(senderName: string, text: string) {
  sendDeviceNotification(`Pesan dari ${senderName} 💬`, {
    body: text.length > 80 ? `${text.slice(0, 80)}...` : text,
    tag: `chat-msg-${Date.now()}`,
    renotify: true,
  });
}

/**
 * Triggered when partner initiates a WebRTC voice/video call.
 */
export function notifyIncomingCall(callerName: string, callType: "audio" | "video") {
  const typeText = callType === "video" ? "Panggilan Video" : "Panggilan Suara";
  sendDeviceNotification(`${typeText} Masuk dari ${callerName} 📞`, {
    body: `${callerName} sedang memanggilmu! Ketuk untuk mengangkat panggilan.`,
    tag: "incoming-webrtc-call",
    renotify: true,
    requireInteraction: true,
  });
}

/**
 * Triggered when partner plays a new track or adds to queue on Jockie Music Bot.
 */
export function notifyMusicPlaying(title: string, updatedBy: string) {
  sendDeviceNotification(`Musik Baru Diputar 🎵`, {
    body: `"${title}" sedang diputar bersama oleh ${updatedBy}`,
    tag: "jockie-music-update",
  });
}

/**
 * Triggered when partner seals their secret daily answer.
 */
export function notifyDailyAnswerSealed(partnerName: string) {
  sendDeviceNotification(`Amplop Cinta Tersegel! 💌`, {
    body: `${partnerName} telah menjawab pertanyaan harian hari ini. Segel jawabanmu untuk membukanya!`,
    tag: "daily-answer-sealed",
    renotify: true,
  });
}
