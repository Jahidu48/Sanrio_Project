"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TopCoupleBar } from "@/components/navigation/TopCoupleBar";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { SanrioCharacterPickerModal } from "@/components/navigation/SanrioCharacterPickerModal";
import { PartnerPairingModal } from "@/components/navigation/PartnerPairingModal";
import { FirstTimeRoleModal } from "@/components/navigation/FirstTimeRoleModal";
import { HeartbeatOrb, type RippleWave } from "@/components/home/HeartbeatOrb";
import { SecretEnvelopePrompt } from "@/components/home/SecretEnvelopePrompt";
import { SanrioHeroBanner } from "@/components/home/SanrioHeroBanner";
import { SanrioMoodPill } from "@/components/home/SanrioMoodPill";
import { CoupleAnniversaryWidget } from "@/components/home/CoupleAnniversaryWidget";
import { SaasQuickExploreGrid } from "@/components/home/SaasQuickExploreGrid";
import { CoupleStatsSidebarCards } from "@/components/home/CoupleStatsSidebarCards";
import {
  CoopCanvasTab,
  type CoopCanvasHandle,
} from "@/components/canvas/CoopCanvasTab";
import { PlayArcadeTab } from "@/components/play/PlayArcadeTab";
import { PlaygroundTab } from "@/components/play/PlaygroundTab";
import { SharedMusicPlayerModal } from "@/components/music/SharedMusicPlayerModal";
import { JockieMusicBot } from "@/components/music/JockieMusicBot";
import { PartnerListeningBanner } from "@/components/music/PartnerListeningBanner";
import { SanrioNotificationToast } from "@/components/navigation/SanrioNotificationToast";
import { SharedMusicProvider } from "@/context/SharedMusicContext";
import type { MiniDoodleCanvasHandle } from "@/components/play/DoodleGuessGame";
import { SharedJournalTab } from "@/components/journal/SharedJournalTab";
import { CoupleChatTab } from "@/components/chat/CoupleChatTab";
import { WebRTCCallModal } from "@/components/chat/WebRTCCallModal";
import { SanrioAiCompanionModal } from "@/components/ai/SanrioAiCompanionModal";
import { useCoupleRealtime } from "@/hooks/useCoupleRealtime";
import { useAudio } from "@/context/AudioContext";
import {
  notifyPartnerOnline,
  notifyPartnerWaiting,
  notifyHeartbeat,
  notifyChatMessage,
  notifyIncomingCall,
} from "@/lib/notifications";
import {
  SANRIO_CHARACTER_MAP,
  type SanrioCharacterId,
} from "@/lib/sanrioCharacters";
import type {
  AppTab,
  CoupleProfile,
  HeartbeatEvent,
  PartnerRole,
  WebRTCCallType,
} from "@/lib/types";

const PROFILE_META_KEY = "cinnamelo_couple_meta_v1";
const SESSION_ROLE_KEY = "cinnamelo_tab_role_v1";
const DEVICE_ROLE_KEY = "cinnamelo_device_role_v1";

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
  const [heartbeatCount, setHeartbeatCount] = useState(0);

  const toastTimerRef = useRef<number | null>(null);
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
        ["home", "chat", "canvas", "play", "journal"].includes(queryTab)
      ) {
        setActiveTab(queryTab);
      }

      const queryRole = params.get("role") as PartnerRole | null;

      // If user joined via invite link/QR (?role=user_b), store permanently as device role
      if (queryRole === "user_a" || queryRole === "user_b") {
        window.localStorage.setItem(DEVICE_ROLE_KEY, queryRole);
      }

      // If opening on a new device without any stored role or role param, show first-time chooser
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

        return {
          role: nextRole,
          userAName: parsed.userAName || prev.userAName,
          userBName: parsed.userBName || prev.userBName,
          roomId: parsed.roomId || prev.roomId,
          userACharacter: toValidCharacter(
            parsed.userACharacter,
            prev.userACharacter || "cinnamoroll"
          ),
          userBCharacter: toValidCharacter(
            parsed.userBCharacter,
            prev.userBCharacter || "my-melody"
          ),
        };
      });
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleUpdateProfile = (next: CoupleProfile) => {
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
        })
      );
    } catch {
      // ignore storage errors
    }
  };

  const handleSelectFirstTimeRole = (role: PartnerRole) => {
    setShowFirstTimeModal(false);
    handleUpdateProfile({ ...profile, role });
  };

  // Triggered on BOTH User A and User B's screens when Cinnamoroll is tapped!
  const handleHeartbeatReceived = useCallback(
    (event: HeartbeatEvent) => {
      const waveId = `${event.id}_${Math.random().toString(36).slice(2, 6)}`;
      setRipples((prev) => [
        ...prev.slice(-4),
        { id: waveId, createdAt: Date.now() },
      ]);
      setCharacterBurstKey((prev) => prev + 1);
      setHeartbeatCount((prev) => prev + 1);
      setActiveToast(event);
      playChime();

      if (event.senderRole !== profile.role && typeof document !== "undefined" && document.hidden) {
        notifyHeartbeat(event.senderName);
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
    [playChime]
  );

  const {
    connectionMode,
    onlineRoles,
    bothPartnersOnline,
    simulatePartnerOnline,
    setSimulatePartnerOnline,
    sendPartnerWaitingPing,
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
      playChime();
      if (typeof document !== "undefined" && (document.hidden || activeTab !== "chat")) {
        const textPreview =
          msg.text ||
          (msg.type === "image"
            ? "Mengirim foto 📷"
            : msg.type === "audio"
            ? "Pesan suara 🎤"
            : msg.type === "location"
            ? "Membagikan lokasi 📍"
            : "Mengirim pesan ✨");
        notifyChatMessage(msg.sender_name, textPreview);
      }
    },
  });

  // Trigger canvas measurement refresh when switching into Canvas or Play tab
  useEffect(() => {
    if (activeTab === "canvas" || activeTab === "play") {
      window.dispatchEvent(new Event("resize"));
    }
  }, [activeTab, gamesState.activeGame]);

  // Scroll back to top whenever the tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const partnerRole = profile.role === "user_a" ? "user_b" : "user_a";
  const partnerName = profile.role === "user_a" ? profile.userBName : profile.userAName;

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

  useEffect(() => {
    if (activeIncomingCall && activeIncomingCall.type === "call-offer") {
      notifyIncomingCall(
        activeIncomingCall.caller_name,
        activeIncomingCall.call_type || "audio"
      );
    }
  }, [activeIncomingCall]);

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
    type: "photo" | "voice" | "text",
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
    <SharedMusicProvider
      profile={profile}
      playlist={sharedPlaylist}
      onAddToPlaylist={addToPlaylist}
      onRemoveFromPlaylist={removeFromPlaylist}
      musicSyncEvent={musicSyncEvent}
      onBroadcastMusicSync={broadcastMusicSync}
    >
      <div className="min-h-dvh w-full max-w-full sanrio-shell-backdrop lg:p-4 xl:p-6 transition-colors">
        {/* Floating Sanrio Notification Toast & Permission Banner */}
        <SanrioNotificationToast />

        {/* Floating Partner Listening Sync Toast Banner */}
        <PartnerListeningBanner />

        {/* Lingora-Style Centered Dashboard Frame (Mobile Optimized GPU Scrolling) */}
        <div className="mx-auto flex min-h-dvh lg:min-h-[calc(100dvh-3rem)] w-full max-w-[1380px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm lg:backdrop-blur-md lg:rounded-[34px] lg:border lg:border-pink-100/80 dark:lg:border-slate-800 lg:shadow-[0_24px_70px_-15px_rgba(30,41,59,0.08)] dark:lg:shadow-[0_24px_70px_-15px_rgba(0,0,0,0.65)] transition-colors">
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
          />

          <main className="w-full flex-1 px-3 sm:px-6 lg:px-8 pt-4 sm:pt-5 pb-32 lg:pb-12">
            {/* TAB 1: HOME (Hero Banner + Mood Pill + Presence Orb + Secret Envelope + Stats) */}
            {activeTab === "home" && (
              <motion.div
                key="tab-home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="space-y-5"
              >
                <SanrioHeroBanner
                  profile={profile}
                  bothPartnersOnline={bothPartnersOnline}
                  onNavigateTab={setActiveTab}
                  onOpenCharacterModal={() => setOpenCharacterModal(true)}
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

                <CoupleAnniversaryWidget profile={profile} />

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

            {/* TAB 5: SHARED JOURNAL (Live Collaborative Notes + Couple Bucket List) */}
            {activeTab === "journal" && (
              <motion.div
                key="tab-journal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="mx-auto max-w-4xl"
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

      {/* WebRTC Voice & Video Call Modal (Incoming & Active Call) */}
      <WebRTCCallModal
        profile={profile}
        incomingCall={activeIncomingCall}
        activeOutgoingCall={activeOutgoingCall}
        signalQueue={callSignalQueue}
        onSendSignal={sendCallSignal}
        onDismissIncoming={dismissIncomingCall}
        onEndCall={() => setActiveOutgoingCall(null)}
      />

      {/* Sanrio AI Companion Mascot Widget (Cinnamoroll, Kuromi, My Melody) */}
      <SanrioAiCompanionModal
        profile={profile}
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
  );
}
