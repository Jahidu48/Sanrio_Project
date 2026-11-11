"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { RefreshCw, WifiOff } from "lucide-react";
import { TopCoupleBar } from "@/components/navigation/TopCoupleBar";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { FirstTimeRoleModal } from "@/components/navigation/FirstTimeRoleModal";
import { HeartbeatOrb, type RippleWave } from "@/components/home/HeartbeatOrb";
import { SecretEnvelopePrompt } from "@/components/home/SecretEnvelopePrompt";
import { SanrioHeroBanner } from "@/components/home/SanrioHeroBanner";
import { SanrioMoodPill } from "@/components/home/SanrioMoodPill";
import { CoupleAnniversaryWidget } from "@/components/home/CoupleAnniversaryWidget";
import { SaasQuickExploreGrid } from "@/components/home/SaasQuickExploreGrid";
import { CoupleStatsSidebarCards } from "@/components/home/CoupleStatsSidebarCards";
import type { CoopCanvasHandle } from "@/components/canvas/CoopCanvasTab";
import { JockieMusicBot } from "@/components/music/JockieMusicBot";
import { PartnerListeningBanner } from "@/components/music/PartnerListeningBanner";
import { SanrioNotificationToast } from "@/components/navigation/SanrioNotificationToast";
import { SharedMusicProvider } from "@/context/SharedMusicContext";
import type { MiniDoodleCanvasHandle } from "@/components/play/DoodleGuessGame";
import { CoupleChatTab } from "@/components/chat/CoupleChatTab";

// Code-split heavy secondary tabs & modals to shrink First Load JS and reduce initial DOM memory
const PlaygroundTab = dynamic(
  () =>
    import("@/components/play/PlaygroundTab").then((mod) => mod.PlaygroundTab),
  { ssr: false }
);
const SharedJournalTab = dynamic(
  () =>
    import("@/components/journal/SharedJournalTab").then(
      (mod) => mod.SharedJournalTab
    ),
  { ssr: false }
);
const WebRTCCallModal = dynamic(
  () =>
    import("@/components/chat/WebRTCCallModal").then(
      (mod) => mod.WebRTCCallModal
    ),
  { ssr: false }
);
const SanrioAiCompanionModal = dynamic(
  () =>
    import("@/components/ai/SanrioAiCompanionModal").then(
      (mod) => mod.SanrioAiCompanionModal
    ),
  { ssr: false }
);
const SharedMusicPlayerModal = dynamic(
  () =>
    import("@/components/music/SharedMusicPlayerModal").then(
      (mod) => mod.SharedMusicPlayerModal
    ),
  { ssr: false }
);
const PartnerPairingModal = dynamic(
  () =>
    import("@/components/navigation/PartnerPairingModal").then(
      (mod) => mod.PartnerPairingModal
    ),
  { ssr: false }
);
const SanrioCharacterPickerModal = dynamic(
  () =>
    import("@/components/navigation/SanrioCharacterPickerModal").then(
      (mod) => mod.SanrioCharacterPickerModal
    ),
  { ssr: false }
);
const DevicePermissionsModal = dynamic(
  () =>
    import("@/components/navigation/DevicePermissionsModal").then(
      (mod) => mod.DevicePermissionsModal
    ),
  { ssr: false }
);
const RoomPinLockModal = dynamic(
  () =>
    import("@/components/navigation/RoomPinLockModal").then(
      (mod) => mod.RoomPinLockModal
    ),
  { ssr: false }
);
import { useCoupleRealtime } from "@/hooks/useCoupleRealtime";
import { useAudio } from "@/context/AudioContext";
import {
  clearTabTitleNotification,
  notifyChatMessage,
  notifyHeartbeat,
  notifyIncomingCall,
  notifyMoodChange,
  notifyPartnerOnline,
  notifyPartnerWaiting,
  notifyProfileCharacterChange,
} from "@/lib/notifications";
import {
  getSanrioCharacter,
  SANRIO_CHARACTER_MAP,
  type SanrioCharacterId,
} from "@/lib/sanrioCharacters";
import type {
  AppTab,
  CoupleProfile,
  CoupleRoomMeta,
  HeartbeatEvent,
  PartnerRole,
  WebRTCCallType,
} from "@/lib/types";

const PROFILE_META_KEY = "cinnamelo_couple_meta_v1";
const SESSION_ROLE_KEY = "cinnamelo_tab_role_v1";
const DEVICE_ROLE_KEY = "cinnamelo_device_role_v1";

const TAB_SPRING_TRANSITION = {
  type: "spring" as const,
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

/** Only accept character IDs that actually exist in the 19-character registry. */
function toValidCharacter(
  value: unknown,
  fallback: SanrioCharacterId
): SanrioCharacterId {
  return typeof value === "string" && value in SANRIO_CHARACTER_MAP
    ? (value as SanrioCharacterId)
    : fallback;
}

export default function CoupleSpaceDashboard() {
  const { playChime, playSuccess, playPop } = useAudio();
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [openCharacterModal, setOpenCharacterModal] = useState(false);
  const [openMusicModal, setOpenMusicModal] = useState(false);
  const [openPairingModal, setOpenPairingModal] = useState(false);
  const [openPermissionsModal, setOpenPermissionsModal] = useState(false);
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [activeOutgoingCall, setActiveOutgoingCall] = useState<{
    type: WebRTCCallType;
  } | null>(null);

  const [profile, setProfile] = useState<CoupleProfile>({
    role: "user_a",
    userAName: "Awan",
    userBName: "Melodi",
    roomId: process.env.NEXT_PUBLIC_COUPLE_ROOM_ID || "couple-room",
    userACharacter: "cinnamoroll",
    userBCharacter: "my-melody",
  });

  // Heartbeat Orb visual state
  const [ripples, setRipples] = useState<RippleWave[]>([]);
  const [activeToast, setActiveToast] = useState<HeartbeatEvent | null>(null);
  const [characterBurstKey, setCharacterBurstKey] = useState(0);

  const toastTimerRef = useRef<number | null>(null);
  const charNotifyTimerRef = useRef<number | null>(null);
  const canvasRefHandle = useRef<CoopCanvasHandle | null>(null);
  const miniDoodleRefHandle = useRef<MiniDoodleCanvasHandle | null>(null);

  // Restore saved couple nicknames, Sanrio avatars & per-device partner role
  useEffect(() => {
    try {
      const savedMeta = window.localStorage.getItem(PROFILE_META_KEY);
      const savedDeviceRole = window.localStorage.getItem(
        DEVICE_ROLE_KEY
      ) as PartnerRole | null;
      const savedSessionRole = window.sessionStorage.getItem(
        SESSION_ROLE_KEY
      ) as PartnerRole | null;

      const params = new URLSearchParams(window.location.search);
      const queryTab = params.get("tab") as AppTab | null;
      if (
        queryTab &&
        ["home", "chat", "playground", "canvas", "play", "journal"].includes(
          queryTab
        )
      ) {
        setActiveTab(queryTab);
      }

      const queryRole = params.get("role") as PartnerRole | null;
      const queryRoom = params.get("room")?.trim() || null;

      if (queryRole === "user_a" || queryRole === "user_b") {
        window.localStorage.setItem(DEVICE_ROLE_KEY, queryRole);
        window.sessionStorage.setItem(SESSION_ROLE_KEY, queryRole);
      }

      if (!savedDeviceRole && !queryRole) {
        setShowFirstTimeModal(true);
      }

      setProfile((prev) => {
        const parsed = savedMeta ? JSON.parse(savedMeta) : {};
        const nextRole: PartnerRole =
          queryRole === "user_a" || queryRole === "user_b"
            ? queryRole
            : savedDeviceRole === "user_a" || savedDeviceRole === "user_b"
            ? savedDeviceRole
            : savedSessionRole === "user_a" || savedSessionRole === "user_b"
            ? savedSessionRole
            : prev.role;

        const nextRoomId = queryRoom || parsed.roomId || prev.roomId;
        const nextProfile: CoupleProfile = {
          role: nextRole,
          userAName: parsed.userAName || prev.userAName,
          userBName: parsed.userBName || prev.userBName,
          roomId: nextRoomId,
          userACharacter: toValidCharacter(
            parsed.userACharacter,
            prev.userACharacter || "cinnamoroll"
          ),
          userBCharacter: toValidCharacter(
            parsed.userBCharacter,
            prev.userBCharacter || "my-melody"
          ),
          roomPin: typeof parsed.roomPin === "string" ? parsed.roomPin : prev.roomPin || "",
        };

        if (queryRoom) {
          try {
            window.localStorage.setItem(
              PROFILE_META_KEY,
              JSON.stringify({
                userAName: nextProfile.userAName,
                userBName: nextProfile.userBName,
                roomId: nextProfile.roomId,
                userACharacter: nextProfile.userACharacter,
                userBCharacter: nextProfile.userBCharacter,
                roomPin: nextProfile.roomPin || "",
              })
            );
          } catch {
            // ignore
          }
        }

        return nextProfile;
      });
    } catch {
      // ignore storage errors
    }
  }, []);

  // Listen for In-App Notification Toast click navigation
  useEffect(() => {
    const handleNavigateEvent = (e: Event) => {
      const customEv = e as CustomEvent<{ tab?: AppTab }>;
      if (customEv.detail?.tab) {
        setActiveTab(customEv.detail.tab);
      }
    };
    window.addEventListener("sanrio-navigate-tab", handleNavigateEvent);
    return () => {
      window.removeEventListener("sanrio-navigate-tab", handleNavigateEvent);
    };
  }, []);

  // Apply incoming CoupleRoomMeta from partner device WITHOUT overwriting local device role!
  const handleRemoteProfileMeta = useCallback((remoteMeta: CoupleRoomMeta) => {
    setProfile((prev) => {
      const nextAName = remoteMeta.userAName || prev.userAName;
      const nextBName = remoteMeta.userBName || prev.userBName;
      const nextAChar = toValidCharacter(
        remoteMeta.userACharacter,
        prev.userACharacter || "cinnamoroll"
      );
      const nextBChar = toValidCharacter(
        remoteMeta.userBCharacter,
        prev.userBCharacter || "my-melody"
      );
      const nextRoomPin =
        remoteMeta.roomPin !== undefined
          ? remoteMeta.roomPin
          : prev.roomPin || "";

      if (
        nextAName === prev.userAName &&
        nextBName === prev.userBName &&
        nextAChar === prev.userACharacter &&
        nextBChar === prev.userBCharacter &&
        nextRoomPin === (prev.roomPin || "")
      ) {
        return prev;
      }

      // Notify if partner updated their Sanrio character live (debounced so rapid live taps stay 60fps & chime once)
      if (
        remoteMeta.updatedByRole &&
        remoteMeta.updatedByRole !== prev.role &&
        remoteMeta.updatedAt > 1000
      ) {
        const prevPartnerChar =
          prev.role === "user_a" ? prev.userBCharacter : prev.userACharacter;
        const nextPartnerChar =
          prev.role === "user_a" ? nextBChar : nextAChar;
        const nextPartnerName =
          prev.role === "user_a" ? nextBName : nextAName;

        if (prevPartnerChar !== nextPartnerChar) {
          const charMeta = getSanrioCharacter(nextPartnerChar, "my-melody");
          if (charNotifyTimerRef.current) {
            window.clearTimeout(charNotifyTimerRef.current);
          }
          charNotifyTimerRef.current = window.setTimeout(() => {
            charNotifyTimerRef.current = null;
            notifyProfileCharacterChange(
              nextPartnerName,
              charMeta.name,
              charMeta.svgPath
            );
          }, 850);
        }
      }

      try {
        window.localStorage.setItem(
          PROFILE_META_KEY,
          JSON.stringify({
            userAName: nextAName,
            userBName: nextBName,
            roomId: prev.roomId,
            userACharacter: nextAChar,
            userBCharacter: nextBChar,
            roomPin: nextRoomPin,
          })
        );
      } catch {
        // ignore
      }

      return {
        ...prev,
        // STRICTLY preserve local per-device role & roomId
        role: prev.role,
        roomId: prev.roomId,
        userAName: nextAName,
        userBName: nextBName,
        userACharacter: nextAChar,
        userBCharacter: nextBChar,
        roomPin: nextRoomPin,
      };
    });
  }, []);

  // Triggered on BOTH User A and User B's screens when Heartbeat Orb is tapped
  const handleHeartbeatReceived = useCallback(
    (event: HeartbeatEvent) => {
      const waveId = `${event.id}_${Math.random().toString(36).slice(2, 6)}`;
      setRipples((prev) => [
        ...prev.slice(-4),
        { id: waveId, createdAt: Date.now() },
      ]);
      setCharacterBurstKey((prev) => prev + 1);
      setActiveToast(event);

      if (event.senderRole !== profile.role) {
        // Tier 1 + Tier 2 Notification (also plays chime inside SanrioNotificationToast)
        notifyHeartbeat(event.senderName);
      } else {
        playChime();
      }

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {}
      }

      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== waveId));
      }, 1900);

      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setActiveToast(null);
      }, 3600);
    },
    [playChime, profile.role]
  );

  const {
    connectionMode,
    networkStatus,
    syncPresenceNow,
    onlineRoles,
    bothPartnersOnline,
    simulatePartnerOnline,
    setSimulatePartnerOnline,
    sendPartnerWaitingPing,
    anniversaryDate,
    updateAnniversaryDate,
    heartbeatCount,
    broadcastProfileMeta,
    todayQnA,
    stamps,
    partnerCursor,
    sharedNotes,
    bucketItems,
    partnerTyping,
    gamesState,
    chatMessages,
    chatTyping,
    activeIncomingCall,
    callSignalQueue,
    unreadChatCount,
    myMood,
    partnerMood,
    updateMood,
    musicSyncEvent,
    broadcastMusicSync,
    sharedPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    sendHeartbeat,
    submitDailyAnswer,
    resetTodayPrompt,
    broadcastStroke,
    placeStamp,
    clearSharedCanvas,
    broadcastCursor,
    createSharedNote,
    upsertSharedNote,
    deleteSharedNote,
    addBucketItem,
    toggleBucketItem,
    deleteBucketItem,
    updateGamesState,
    broadcastMiniDoodleStroke,
    clearMiniDoodle,
    sendChatMessage,
    sendChatTyping,
    addChatReaction,
    markChatMessagesAsRead,
    sendCallSignal,
    dismissIncomingCall,
  } = useCoupleRealtime({
    profile,
    onRemoteProfileMeta: handleRemoteProfileMeta,
    onHeartbeatReceived: handleHeartbeatReceived,
    onRemoteStroke: (segment) => {
      canvasRefHandle.current?.drawRemoteSegment(segment);
    },
    onRemoteClearCanvas: () => {
      canvasRefHandle.current?.clearLocalPixels();
    },
    onRemoteMiniDoodleStroke: (segment) => {
      miniDoodleRefHandle.current?.drawRemoteSegment(segment);
    },
    onRemoteMiniDoodleClear: () => {
      miniDoodleRefHandle.current?.clearCanvas();
    },
    onIncomingChatMessage: (msg) => {
      const textPreview =
        msg.text ||
        (msg.type === "image"
          ? "Mengirim foto 📷"
          : msg.type === "audio"
          ? "Pesan suara 🎤"
          : msg.type === "location"
          ? "Membagikan lokasi 📍"
          : "Mengirim pesan ✨");
      // Always trigger 3-Tier Notification (OS + In-App Banner + Sound Chime + Tab Blink)
      notifyChatMessage(msg.sender_name, textPreview);
    },
  });

  const handleUpdateProfile = useCallback(
    (next: CoupleProfile) => {
      const sharedMetaChanged =
        next.userAName !== profile.userAName ||
        next.userBName !== profile.userBName ||
        next.userACharacter !== profile.userACharacter ||
        next.userBCharacter !== profile.userBCharacter ||
        (next.roomPin || "") !== (profile.roomPin || "");

      setProfile(next);
      try {
        window.localStorage.setItem(DEVICE_ROLE_KEY, next.role);
        window.sessionStorage.setItem(SESSION_ROLE_KEY, next.role);
        window.localStorage.setItem(
          PROFILE_META_KEY,
          JSON.stringify({
            userAName: next.userAName,
            userBName: next.userBName,
            roomId: next.roomId,
            userACharacter: next.userACharacter,
            userBCharacter: next.userBCharacter,
            roomPin: next.roomPin || "",
          })
        );
      } catch {
        // ignore storage errors
      }

      if (sharedMetaChanged) {
        broadcastProfileMeta(next);
      }
    },
    [broadcastProfileMeta, profile]
  );

  const handleSelectFirstTimeRole = (role: PartnerRole) => {
    setShowFirstTimeModal(false);
    handleUpdateProfile({ ...profile, role });
  };

  // Trigger canvas measurement refresh when switching into Canvas or Play tab
  useEffect(() => {
    if (
      activeTab === "playground" ||
      activeTab === "canvas" ||
      activeTab === "play"
    ) {
      window.dispatchEvent(new Event("resize"));
    }
    if (activeTab === "chat") {
      clearTabTitleNotification();
    }
  }, [activeTab, gamesState.activeGame]);

  // Instant zero-jank scroll reset on tab switch
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeTab]);

  const partnerRole: PartnerRole =
    profile.role === "user_a" ? "user_b" : "user_a";
  const partnerName =
    profile.role === "user_a" ? profile.userBName : profile.userAName;

  // Presence Notification Watcher (Anti-Flicker Protected)
  const wasPartnerOnlineRef = useRef<boolean | null>(null);
  useEffect(() => {
    const isPartnerOnline = Boolean(onlineRoles?.has(partnerRole));
    if (wasPartnerOnlineRef.current === null) {
      wasPartnerOnlineRef.current = isPartnerOnline;
      if (isPartnerOnline) {
        notifyPartnerWaiting(partnerName);
      }
      return;
    }
    if (!wasPartnerOnlineRef.current && isPartnerOnline) {
      notifyPartnerOnline(partnerName);
    }
    wasPartnerOnlineRef.current = isPartnerOnline;
  }, [onlineRoles, partnerRole, partnerName]);

  // Incoming Call Notification Watcher (Deduplicated per call_id across 2s ringing pings)
  const lastNotifiedCallIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeIncomingCall && activeIncomingCall.type === "call-offer") {
      const callKey = activeIncomingCall.call_id || activeIncomingCall.id;
      if (lastNotifiedCallIdRef.current !== callKey) {
        lastNotifiedCallIdRef.current = callKey;
        notifyIncomingCall(
          activeIncomingCall.caller_name,
          activeIncomingCall.call_type || "audio"
        );
      }
    } else if (!activeIncomingCall) {
      lastNotifiedCallIdRef.current = null;
    }
  }, [activeIncomingCall]);

  // Partner Mood Change Notification Watcher (only fires on genuine mood updates, not initial sync)
  const lastPartnerMoodTextRef = useRef<string | null>(null);
  useEffect(() => {
    if (!partnerMood) return;
    if (
      lastPartnerMoodTextRef.current !== null &&
      partnerMood.updatedAt > 0 &&
      partnerMood.statusText !== lastPartnerMoodTextRef.current
    ) {
      const partnerCharId =
        profile.role === "user_a"
          ? profile.userBCharacter
          : profile.userACharacter;
      const charMeta = getSanrioCharacter(
        partnerCharId || partnerMood.characterId,
        "my-melody"
      );
      notifyMoodChange(partnerName, partnerMood.statusText, charMeta.svgPath);
    }
    lastPartnerMoodTextRef.current = partnerMood.statusText;
  }, [
    partnerMood,
    partnerName,
    profile.role,
    profile.userACharacter,
    profile.userBCharacter,
  ]);

  const myAnswerMissing =
    profile.role === "user_a"
      ? !todayQnA.user_a_answer
      : !todayQnA.user_b_answer;

  const telepathySyncScore =
    gamesState.telepathy.totalCompleted > 0
      ? Math.round(
          (gamesState.telepathy.matchedCount /
            gamesState.telepathy.totalCompleted) *
            100
        )
      : 100;

  const handleSwitchRole = (role: PartnerRole) =>
    handleUpdateProfile({ ...profile, role });

  const handleSendDareProofToChat = async (
    _type: "photo" | "voice" | "text",
    promptText: string
  ) => {
    playSuccess();
    await sendChatMessage({
      type: "dare_proof",
      text: `🎉 Selesai melakukan tantangan dare: "${promptText}"! Bukti terlampir ✨`,
    });
    setActiveTab("chat");
  };

  const handleForwardAiToChat = async (text: string) => {
    playSuccess();
    await sendChatMessage({
      type: "text",
      text,
    });
    setActiveTab("chat");
  };

  return (
    <MotionConfig reducedMotion="user">
    <SharedMusicProvider
      profile={profile}
      playlist={sharedPlaylist}
      onAddToPlaylist={addToPlaylist}
      onRemoveFromPlaylist={removeFromPlaylist}
      musicSyncEvent={musicSyncEvent}
      onBroadcastMusicSync={broadcastMusicSync}
    >
      <div className="min-h-dvh w-full max-w-full sanrio-shell-backdrop lg:p-4 xl:p-6">
        {/* Real-Time Reconnecting / Offline Status Pill */}
        <AnimatePresence>
          {networkStatus !== "connected" && (
            <div className="fixed top-2.5 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none">
              <motion.button
                type="button"
                initial={{ opacity: 0, y: -16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -14, scale: 0.94 }}
                transition={TAB_SPRING_TRANSITION}
                onClick={syncPresenceNow}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[#2D232E]/95 text-amber-200 border border-amber-400/40 px-4 py-1.5 text-xs font-bold shadow-lg active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer"
              >
                {networkStatus === "offline" ? (
                  <>
                    <WifiOff className="h-3.5 w-3.5 text-rose-400" />
                    <span>Offline • Menunggu koneksi internet...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-300" />
                    <span>Menghubungkan ulang...</span>
                  </>
                )}
              </motion.button>
            </div>
          )}
        </AnimatePresence>

        {/* Floating Sanrio Notification Toast & Permission Banner */}
        <SanrioNotificationToast />

        {/* Floating Partner Listening Sync Toast Banner */}
        <PartnerListeningBanner />

        {/* Centered Scrapbook Dashboard Frame */}
        <div className="mx-auto flex min-h-dvh lg:min-h-[calc(100dvh-3rem)] w-full max-w-[1380px] bg-[#FFFDF9] dark:bg-[#1E1721] lg:rounded-[32px] lg:border-2 lg:border-[#F3D8DF] dark:lg:border-[#3B2E40] lg:shadow-soft overflow-hidden">
          {/* Desktop Left Sidebar (lg+) */}
          <DesktopSidebar
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            profile={profile}
            onSwitchRole={handleSwitchRole}
            onOpenCharacterModal={() => setOpenCharacterModal(true)}
            hasUnreadPrompt={myAnswerMissing}
            unreadChatCount={unreadChatCount}
            notesCount={sharedNotes.length}
            stampsCount={stamps.length}
          />

          {/* Right Content Column */}
          <div className="flex min-w-0 flex-1 flex-col">
            <TopCoupleBar
              profile={profile}
              connectionMode={connectionMode}
              heartbeatCount={heartbeatCount}
              telepathySyncScore={telepathySyncScore}
              bothPartnersOnline={bothPartnersOnline}
              onUpdateProfile={handleUpdateProfile}
              onOpenCharacterModal={() => setOpenCharacterModal(true)}
              onOpenSharedMusicModal={() => setOpenMusicModal(true)}
              onOpenPairingModal={() => setOpenPairingModal(true)}
              onOpenPermissionsModal={() => setOpenPermissionsModal(true)}
            />

            <main className="w-full flex-1 px-3 sm:px-6 lg:px-8 pt-4 sm:pt-5 pb-32 lg:pb-12">
              {/* TAB 1: HOME (Hero Banner + Mood Pill + Presence Orb + Secret Envelope + Stats) */}
              {activeTab === "home" && (
                <motion.div
                  key="tab-home"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={TAB_SPRING_TRANSITION}
                  className="space-y-5 transform-gpu"
                >
                  <SanrioHeroBanner
                    profile={profile}
                    bothPartnersOnline={bothPartnersOnline}
                    onNavigateTab={setActiveTab}
                    onOpenCharacterModal={() => setOpenCharacterModal(true)}
                    onSendWaitingPing={sendPartnerWaitingPing}
                  />

                  {/* Real-time Sanrio Mood & Status Pill */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                    <SanrioMoodPill
                      profile={profile}
                      myMood={myMood}
                      partnerMood={partnerMood}
                      onUpdateMood={updateMood}
                    />
                  </div>

                  <CoupleAnniversaryWidget
                    profile={profile}
                    anniversaryDate={anniversaryDate}
                    onUpdateAnniversaryDate={updateAnniversaryDate}
                  />

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                    <div className="xl:col-span-8 space-y-5 min-w-0">
                      <HeartbeatOrb
                        bothPartnersOnline={bothPartnersOnline}
                        simulatePartnerOnline={simulatePartnerOnline}
                        onToggleSimulateOnline={() =>
                          setSimulatePartnerOnline((prev) => !prev)
                        }
                        userAName={profile.userAName}
                        userBName={profile.userBName}
                        userACharacter={profile.userACharacter}
                        userBCharacter={profile.userBCharacter}
                        ripples={ripples}
                        activeToast={activeToast}
                        characterBurstKey={characterBurstKey}
                        heartbeatCount={heartbeatCount}
                        onSendHeartbeat={sendHeartbeat}
                      />

                      <SecretEnvelopePrompt
                        profile={profile}
                        todayQnA={todayQnA}
                        onSubmitAnswer={submitDailyAnswer}
                        onResetPrompt={resetTodayPrompt}
                      />

                      <SaasQuickExploreGrid
                        onNavigateTab={setActiveTab}
                        onJumpToGame={(game) =>
                          updateGamesState((prev) => ({
                            ...prev,
                            activeGame: game,
                            activeSubTab: game,
                          }))
                        }
                      />
                    </div>

                    <div className="xl:col-span-4 min-w-0">
                      <div className="xl:sticky xl:top-20">
                        <CoupleStatsSidebarCards
                          profile={profile}
                          todayQnA={todayQnA}
                          heartbeatCount={heartbeatCount}
                          gamesState={gamesState}
                          bucketItems={bucketItems}
                          onNavigateTab={setActiveTab}
                          onOpenCharacterModal={() =>
                            setOpenCharacterModal(true)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: CHAT MESSENGER (Kept mounted for active call stream & scroll persistence) */}
              <div
                className={
                  activeTab === "chat" ? "block mx-auto max-w-4xl" : "hidden"
                }
              >
                <CoupleChatTab
                  profile={profile}
                  messages={chatMessages}
                  partnerTyping={chatTyping}
                  bothPartnersOnline={bothPartnersOnline}
                  isActiveTab={activeTab === "chat"}
                  onSendMessage={sendChatMessage}
                  onSendTyping={sendChatTyping}
                  onAddReaction={addChatReaction}
                  onMarkRead={markChatMessagesAsRead}
                  onStartCall={(type) => {
                    playPop();
                    setActiveOutgoingCall({ type });
                  }}
                />
              </div>

              {/* TAB 3: PLAYGROUND (Co-op Whiteboard Canvas & 4 Sanrio Games) */}
              <div
                className={
                  activeTab === "playground" ||
                  activeTab === "canvas" ||
                  activeTab === "play"
                    ? "block mx-auto max-w-5xl"
                    : "hidden"
                }
              >
                <PlaygroundTab
                  profile={profile}
                  gamesState={gamesState}
                  onUpdateGamesState={updateGamesState}
                  canvasRefHandle={canvasRefHandle}
                  stamps={stamps}
                  partnerCursor={partnerCursor}
                  onBroadcastStroke={broadcastStroke}
                  onPlaceStamp={placeStamp}
                  onClearCanvas={clearSharedCanvas}
                  onBroadcastCursor={broadcastCursor}
                  miniCanvasRef={miniDoodleRefHandle}
                  onBroadcastMiniStroke={broadcastMiniDoodleStroke}
                  onClearMiniDoodle={clearMiniDoodle}
                  onSendDareProof={handleSendDareProofToChat}
                  onNavigateToChat={() => setActiveTab("chat")}
                />
              </div>

              {/* TAB 4: SHARED JOURNAL (Live Collaborative Notes + Couple Bucket List) */}
              {activeTab === "journal" && (
                <motion.div
                  key="tab-journal"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={TAB_SPRING_TRANSITION}
                  className="mx-auto max-w-4xl transform-gpu"
                >
                  <SharedJournalTab
                    profile={profile}
                    sharedNotes={sharedNotes}
                    bucketItems={bucketItems}
                    partnerTyping={partnerTyping}
                    onCreateNote={createSharedNote}
                    onUpsertNote={upsertSharedNote}
                    onDeleteNote={deleteSharedNote}
                    onAddBucketItem={addBucketItem}
                    onToggleBucketItem={toggleBucketItem}
                    onDeleteBucketItem={deleteBucketItem}
                  />
                </motion.div>
              )}
            </main>
          </div>
        </div>

        {/* Mobile Floating Pill Bottom Tab Bar (< lg) */}
        <BottomTabBar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          hasUnreadPrompt={myAnswerMissing}
          unreadChatCount={unreadChatCount}
        />

        {/* 2-Device QR Pairing Modal */}
        <PartnerPairingModal
          open={openPairingModal}
          onClose={() => setOpenPairingModal(false)}
          profile={profile}
          bothPartnersOnline={bothPartnersOnline}
          onSwitchRole={handleSwitchRole}
        />

        {/* First Time Device Role Onboarding Modal */}
        <FirstTimeRoleModal
          open={showFirstTimeModal}
          profile={profile}
          onSelectRole={handleSelectFirstTimeRole}
        />

        {/* 19 Sanrio Character & Couple Profile Picker Modal */}
        <SanrioCharacterPickerModal
          open={openCharacterModal}
          onClose={() => setOpenCharacterModal(false)}
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
        />

        {/* Device & Web Permissions Hub Modal (Mic, Camera, GPS, Notifications) */}
        <DevicePermissionsModal
          open={openPermissionsModal}
          onClose={() => setOpenPermissionsModal(false)}
        />

        {/* Native WebRTC Voice & Video Call Modal */}
        <WebRTCCallModal
          profile={profile}
          incomingCall={activeIncomingCall}
          activeOutgoingCall={activeOutgoingCall}
          signalQueue={callSignalQueue}
          onSendSignal={sendCallSignal}
          onDismissIncoming={dismissIncomingCall}
          onEndCall={() => setActiveOutgoingCall(null)}
        />

        {/* 4-Digit Room Privacy PIN Lock Screen (Active when roomPin is set) */}
        <RoomPinLockModal profile={profile} onUnlocked={syncPresenceNow} />

        {/* Sanrio AI Companion Mascot Modal (Cinnamoroll, Kuromi, My Melody) */}
        <SanrioAiCompanionModal
          profile={profile}
          activeTab={activeTab}
          onForwardToCoupleChat={handleForwardAiToChat}
        />

        {/* Shared Synchronized Music Player Modal (Listen Together) */}
        <SharedMusicPlayerModal
          open={openMusicModal}
          onClose={() => setOpenMusicModal(false)}
          profile={profile}
        />

        {/* Global Jockie Music Bot Persistent Background YouTube Controller */}
        <JockieMusicBot profile={profile} />
      </div>
    </SharedMusicProvider>
    </MotionConfig>
  );
}
