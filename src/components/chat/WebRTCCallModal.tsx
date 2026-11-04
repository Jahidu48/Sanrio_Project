"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Sparkles,
  Video,
  VideoOff,
} from "lucide-react";
import { getSanrioCharacter } from "@/lib/sanrioCharacters";
import { useAudio } from "@/context/AudioContext";
import type { CoupleProfile, WebRTCCallType, WebRTCSignalMessage } from "@/lib/types";

export interface WebRTCCallModalProps {
  profile: CoupleProfile;
  incomingCall: WebRTCSignalMessage | null;
  activeOutgoingCall: { type: WebRTCCallType } | null;
  signalQueue: WebRTCSignalMessage | null;
  onSendSignal: (
    signal: Omit<
      WebRTCSignalMessage,
      "id" | "room_id" | "caller_role" | "caller_name" | "timestamp"
    >
  ) => void;
  onDismissIncoming: () => void;
  onEndCall: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function WebRTCCallModal({
  profile,
  incomingCall,
  activeOutgoingCall,
  signalQueue,
  onSendSignal,
  onDismissIncoming,
  onEndCall,
}: WebRTCCallModalProps) {
  const { startCallRing, stopCallRing, playPop } = useAudio();
  const [callState, setCallState] = useState<
    "idle" | "incoming" | "calling" | "connected"
  >("idle");
  const [callType, setCallType] = useState<WebRTCCallType>("audio");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const partnerChar =
    profile.role === "user_a"
      ? getSanrioCharacter(profile.userBCharacter, "my-melody")
      : getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const partnerName =
    profile.role === "user_a" ? profile.userBName : profile.userAName;

  // Handle incoming call ring
  useEffect(() => {
    if (incomingCall && callState === "idle") {
      setCallState("incoming");
      setCallType(incomingCall.call_type);
      startCallRing();
    }
  }, [incomingCall, callState, startCallRing]);

  // Handle outgoing call trigger
  useEffect(() => {
    if (activeOutgoingCall && callState === "idle") {
      setCallState("calling");
      setCallType(activeOutgoingCall.type);
      initiateOutgoingCall(activeOutgoingCall.type);
    }
  }, [activeOutgoingCall]);

  // Handle incoming WebRTC signals
  useEffect(() => {
    if (!signalQueue) return;
    const signal = signalQueue;

    async function processSignal() {
      if (signal.type === "call-reject" || signal.type === "call-end") {
        cleanupCall();
        setCallState("idle");
        stopCallRing();
        onEndCall();
        return;
      }

      if (signal.type === "call-answer" && signal.sdp && pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(signal.sdp)
          );
          setCallState("connected");
          stopCallRing();
          startTimer();
        } catch {
          // ignore
        }
      }

      if (signal.type === "call-ice" && signal.candidate && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(
            new RTCIceCandidate(signal.candidate)
          );
        } catch {
          // ignore
        }
      }
    }

    processSignal();
  }, [signalQueue, stopCallRing, onEndCall]);

  const startTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setCallDuration(0);
    timerRef.current = window.setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
  };

  const cleanupCall = () => {
    stopCallRing();
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  const setupPeerConnection = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onSendSignal({
          type: "call-ice",
          call_type: callType,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const initiateOutgoingCall = async (type: WebRTCCallType) => {
    try {
      const pc = setupPeerConnection();
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === "video" ? { facingMode: "user" } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      onSendSignal({
        type: "call-offer",
        call_type: type,
        sdp: offer,
      });
    } catch {
      cleanupCall();
      setCallState("idle");
      onEndCall();
    }
  };

  const handleAcceptIncoming = async () => {
    stopCallRing();
    playPop();
    if (!incomingCall?.sdp) return;

    try {
      const pc = setupPeerConnection();
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: incomingCall.call_type === "video" ? { facingMode: "user" } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      onSendSignal({
        type: "call-answer",
        call_type: incomingCall.call_type,
        sdp: answer,
      });

      setCallState("connected");
      startTimer();
      onDismissIncoming();
    } catch {
      handleRejectIncoming();
    }
  };

  const handleRejectIncoming = () => {
    stopCallRing();
    playPop();
    onSendSignal({
      type: "call-reject",
      call_type: callType,
    });
    cleanupCall();
    setCallState("idle");
    onDismissIncoming();
    onEndCall();
  };

  const handleHangup = () => {
    playPop();
    onSendSignal({
      type: "call-end",
      call_type: callType,
    });
    cleanupCall();
    setCallState("idle");
    onDismissIncoming();
    onEndCall();
  };

  const toggleMute = () => {
    playPop();
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    playPop();
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (callState === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
      >
        {/* INCOMING CALL PROMPT MODAL */}
        {callState === "incoming" && (
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-sm rounded-[32px] border border-pink-200/50 bg-gradient-to-b from-white via-pink-50/50 to-white dark:from-slate-900 dark:via-purple-950/40 dark:to-slate-900 p-8 text-center shadow-2xl space-y-6"
          >
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-rose-400/25 animate-ping" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white dark:bg-slate-800 border-2 border-pink-300 dark:border-purple-400 shadow-lg">
                <img
                  src={partnerChar.svgPath}
                  alt={partnerChar.name}
                  className="h-16 w-16 object-contain"
                />
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 dark:bg-rose-950/80 px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-300">
                <PhoneIncoming className="h-3.5 w-3.5 animate-bounce" />
                <span>
                  Panggilan {callType === "video" ? "Video" : "Suara"} Masuk...
                </span>
              </span>
              <h3 className="mt-2 text-xl font-extrabold text-[#1E293B] dark:text-white">
                {partnerName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Pasanganmu ingin berbicara berdua sekarang 💖
              </p>
            </div>

            <div className="flex items-center justify-center gap-6 pt-2">
              {/* Reject */}
              <button
                type="button"
                onClick={handleRejectIncoming}
                className="flex flex-col items-center gap-1.5 text-xs text-rose-500 hover:opacity-80 transition-opacity"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/40">
                  <PhoneOff className="h-6 w-6" />
                </span>
                <span>Tolak</span>
              </button>

              {/* Accept */}
              <button
                type="button"
                onClick={handleAcceptIncoming}
                className="flex flex-col items-center gap-1.5 text-xs text-emerald-500 hover:opacity-80 transition-opacity"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 animate-pulse">
                  <Phone className="h-6 w-6" />
                </span>
                <span>Terima</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ACTIVE / CALLING SCREEN */}
        {(callState === "calling" || callState === "connected") && (
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            className="relative flex h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-[32px] border border-pink-200/50 dark:border-purple-800 bg-slate-900 shadow-2xl text-white"
          >
            {/* Top Bar with Status & Timer */}
            <div className="relative z-20 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                  <img
                    src={partnerChar.svgPath}
                    alt={partnerChar.name}
                    className="h-7 w-7 object-contain"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold leading-tight">
                    {partnerName}
                  </h4>
                  <p className="text-[11px] text-pink-200/80">
                    {callState === "calling"
                      ? "Menghubungkan..."
                      : `Tersambung • ${formatDuration(callDuration)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-pink-300" />
                <span>{callType === "video" ? "Video Call" : "Audio Call"}</span>
              </div>
            </div>

            {/* Video Streams / Audio Avatars */}
            <div className="relative flex-1 overflow-hidden bg-slate-950 flex items-center justify-center">
              {callType === "video" ? (
                <>
                  {/* Remote Video (Full Screen) */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />

                  {/* Remote fallback avatar if no video stream yet */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/90 pointer-events-none">
                    <img
                      src={partnerChar.svgPath}
                      alt={partnerChar.name}
                      className="h-28 w-28 object-contain animate-pulse"
                    />
                    <p className="text-xs text-slate-400">
                      Menunggu video dari {partnerName}...
                    </p>
                  </div>

                  {/* Local Pip Video */}
                  <div className="absolute top-4 right-4 z-20 h-36 w-24 overflow-hidden rounded-2xl border-2 border-white/60 bg-black shadow-lg">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover scale-x-[-1]"
                    />
                  </div>
                </>
              ) : (
                /* Audio Call Screen with Animated Harmonic Waves */
                <div className="flex flex-col items-center justify-center gap-6 p-6 text-center">
                  <div className="relative flex h-36 w-36 items-center justify-center">
                    <motion.span
                      animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
                      transition={{
                        repeat: Infinity,
                        duration: 2.2,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-0 rounded-full bg-pink-400/25 blur-md"
                    />
                    <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-tr from-rose-400 via-pink-400 to-purple-500 p-1 shadow-2xl">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900">
                        <img
                          src={partnerChar.svgPath}
                          alt={partnerChar.name}
                          className="h-20 w-20 object-contain drop-shadow"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold">{partnerName}</h3>
                    <p className="mt-1 text-xs text-pink-200">
                      {callState === "calling"
                        ? "Memanggil..."
                        : `Durasi Obrolan: ${formatDuration(callDuration)}`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Call Controls Toolbar */}
            <div className="relative z-20 flex items-center justify-center gap-5 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-6">
              {/* Mute Mic */}
              <button
                type="button"
                onClick={toggleMute}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                  isMuted
                    ? "bg-rose-500/80 text-white"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
                title={isMuted ? "Aktifkan Mikrofon" : "Bisukan Mikrofon"}
              >
                {isMuted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>

              {/* End Call (Red) */}
              <button
                type="button"
                onClick={handleHangup}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/50 hover:bg-rose-600 transition-colors"
                title="Akhiri Panggilan"
              >
                <PhoneOff className="h-6 w-6" />
              </button>

              {/* Toggle Video (if video call) */}
              {callType === "video" && (
                <button
                  type="button"
                  onClick={toggleVideo}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                    !isVideoEnabled
                      ? "bg-rose-500/80 text-white"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                  title={isVideoEnabled ? "Matikan Kamera" : "Nyalakan Kamera"}
                >
                  {isVideoEnabled ? (
                    <Video className="h-5 w-5" />
                  ) : (
                    <VideoOff className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
