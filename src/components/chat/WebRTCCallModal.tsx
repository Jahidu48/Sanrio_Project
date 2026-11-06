"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Camera,
  ExternalLink,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  Radio,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
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
    // 1. Google Public STUN
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },

    // 2. Open Relay Project (Metered) STUN & TURN Relay
    { urls: "stun:openrelay.metered.ca:80" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turns:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
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
  const { startCallRing, stopCallRing, playPop, playChime } = useAudio();
  const [callState, setCallState] = useState<
    "idle" | "incoming" | "calling" | "connected"
  >("idle");
  const [callType, setCallType] = useState<WebRTCCallType>("audio");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionLabel, setConnectionLabel] = useState("Menghubungkan sinyal...");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioNeedsUnlock, setAudioNeedsUnlock] = useState(false);

  // Streams in React state to guarantee binding to DOM video/audio elements immediately
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const timerRef = useRef<number | null>(null);

  const partnerChar =
    profile.role === "user_a"
      ? getSanrioCharacter(profile.userBCharacter, "my-melody")
      : getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const partnerName =
    profile.role === "user_a" ? profile.userBName : profile.userAName;

  // 1. DOM BINDING FOR LOCAL VIDEO PIP
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, callState]);

  // 2. DOM BINDING FOR REMOTE AUDIO & VIDEO
  useEffect(() => {
    if (remoteStream) {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current
          .play()
          .then(() => setAudioNeedsUnlock(false))
          .catch(() => setAudioNeedsUnlock(true));
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
    }
  }, [remoteStream, callState]);

  // Flush queued ICE candidates once remoteDescription is set
  const flushIceCandidates = async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) return;
    const candidates = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];
    for (const cand of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn("[WebRTC] Error adding buffered ICE candidate:", err);
      }
    }
  };

  // Handle incoming call ring
  useEffect(() => {
    if (incomingCall && callState === "idle") {
      setCallState("incoming");
      setCallType(incomingCall.call_type);
      setConnectionLabel("Panggilan Masuk...");
      setPermissionError(null);
      startCallRing();
    }
  }, [incomingCall, callState, startCallRing]);

  // Handle outgoing call trigger
  useEffect(() => {
    if (activeOutgoingCall && callState === "idle") {
      setCallState("calling");
      setCallType(activeOutgoingCall.type);
      setConnectionLabel("Menghubungkan sinyal...");
      setPermissionError(null);
      initiateOutgoingCall(activeOutgoingCall.type);
    }
  }, [activeOutgoingCall]);

  // Unified Signal Processing Function
  const processSignal = async (signal: WebRTCSignalMessage) => {
    if (!signal) return;

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
        await flushIceCandidates(pcRef.current);
        setCallState("connected");
        stopCallRing();
        playChime();
        startTimer();
      } catch (err) {
        console.warn("[WebRTC] setRemoteDescription error on call-answer:", err);
      }
    }

    if (signal.type === "call-ice" && signal.candidate) {
      const pc = pcRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (err) {
          console.warn("[WebRTC] Direct addIceCandidate error:", err);
        }
      } else {
        pendingIceCandidatesRef.current.push(signal.candidate);
      }
    }
  };

  // Process via React prop signalQueue
  useEffect(() => {
    if (signalQueue) {
      processSignal(signalQueue);
    }
  }, [signalQueue]);

  // Process via synchronous custom window event
  useEffect(() => {
    const handleEventSignal = (e: CustomEvent<WebRTCSignalMessage>) => {
      if (e.detail) {
        processSignal(e.detail);
      }
    };

    window.addEventListener("sanrio-webrtc-signal" as any, handleEventSignal as EventListener);
    return () => {
      window.removeEventListener("sanrio-webrtc-signal" as any, handleEventSignal as EventListener);
    };
  }, []);

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
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteStream(null);
    pendingIceCandidatesRef.current = [];
    setHasRemoteVideo(false);
    setPermissionError(null);
    setAudioNeedsUnlock(false);
    setConnectionLabel("Menghubungkan...");
  };

  const setupPeerConnection = (activeType: WebRTCCallType) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onSendSignal({
          type: "call-ice",
          call_type: activeType,
          candidate: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          },
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      setRemoteStream(stream);

      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        setHasRemoteVideo(true);
        videoTracks[0].onmute = () => setHasRemoteVideo(false);
        videoTracks[0].onunmute = () => setHasRemoteVideo(true);
        videoTracks[0].onended = () => setHasRemoteVideo(false);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        setConnectionLabel("Tersambung • Suara Jernih 2-Arah 🔊");
        setCallState("connected");
      } else if (state === "connecting") {
        setConnectionLabel("Menghubungkan jalur media via Relay...");
      } else if (state === "failed") {
        setConnectionLabel("Koneksi P2P terhalang NAT operator. Beralih ke WhatsApp disarankan.");
      } else if (state === "disconnected") {
        setConnectionLabel("Jaringan tidak stabil...");
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      if (iceState === "connected" || iceState === "completed") {
        setConnectionLabel("Tersambung");
        setCallState("connected");
      } else if (iceState === "checking") {
        setConnectionLabel("Menghubungkan jalur suara...");
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const initiateOutgoingCall = async (type: WebRTCCallType) => {
    try {
      setCallType(type);
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          type === "video"
            ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
            : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      const pc = setupPeerConnection(type);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Complete SDP gathering: wait 700ms for candidates to embed inside offer SDP
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve();
        } else {
          const timeout = setTimeout(resolve, 700);
          const onGather = () => {
            if (pc.iceGatheringState === "complete") {
              clearTimeout(timeout);
              pc.removeEventListener("icegatheringstatechange", onGather);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", onGather);
        }
      });

      const desc = pc.localDescription || offer;
      onSendSignal({
        type: "call-offer",
        call_type: type,
        sdp: {
          type: desc.type,
          sdp: desc.sdp,
        },
      });
    } catch (err: any) {
      console.warn("[WebRTC] initiateOutgoingCall getUserMedia failed:", err);
      setPermissionError(
        err?.name === "NotAllowedError" || err?.message?.includes("Permission")
          ? "Izin Mikrofon / Kamera ditolak oleh browser. Klik ikon gembok 🔒 di samping link URL untuk mengizinkan."
          : `Gagal mengakses perangkat: ${err?.message || "Periksa mikrofon dan kamera"}`
      );
    }
  };

  const handleAcceptIncoming = async () => {
    stopCallRing();
    playPop();
    if (!incomingCall?.sdp) return;

    try {
      const activeType = incomingCall.call_type || "audio";
      setCallType(activeType);

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          activeType === "video"
            ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
            : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      const pc = setupPeerConnection(activeType);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));
      await flushIceCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Complete SDP gathering: wait 700ms for candidates to embed inside answer SDP
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve();
        } else {
          const timeout = setTimeout(resolve, 700);
          const onGather = () => {
            if (pc.iceGatheringState === "complete") {
              clearTimeout(timeout);
              pc.removeEventListener("icegatheringstatechange", onGather);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", onGather);
        }
      });

      const desc = pc.localDescription || answer;
      onSendSignal({
        type: "call-answer",
        call_type: activeType,
        sdp: {
          type: desc.type,
          sdp: desc.sdp,
        },
      });

      setCallState("connected");
      startTimer();
      onDismissIncoming();
    } catch (err: any) {
      console.warn("[WebRTC] handleAcceptIncoming failed:", err);
      setPermissionError(
        err?.name === "NotAllowedError" || err?.message?.includes("Permission")
          ? "Izin Mikrofon / Kamera ditolak. Izinkan di ikon gembok 🔒 bilah browser untuk menerima panggilan."
          : `Gagal menghubungkan panggilan: ${err?.message || "Kesalahan perangkat"}`
      );
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

  const handleManualAudioUnlock = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current
        .play()
        .then(() => setAudioNeedsUnlock(false))
        .catch(() => {});
    }
  };

  const toggleMute = () => {
    playPop();
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    playPop();
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
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

  return (
    <>
      {/* Permanent Audio Element for Remote Voice */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <AnimatePresence>
        {(callState !== "idle" || permissionError) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
          >
            {/* PERMISSION ERROR DIALOG */}
            {permissionError ? (
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-sm rounded-[32px] border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 p-7 text-center shadow-2xl space-y-5 text-[#1E293B] dark:text-white"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-8 w-8" />
                </div>

                <div>
                  <h3 className="text-base font-extrabold">Akses Perangkat Dibutuhkan 🎤📷</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {permissionError}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPermissionError(null);
                      cleanupCall();
                      setCallState("idle");
                      onEndCall();
                    }}
                    className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white py-2.5 text-xs font-bold transition-all cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPermissionError(null);
                      initiateOutgoingCall(callType);
                    }}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 text-white py-2.5 text-xs font-bold transition-all shadow-md shadow-pink-500/25 cursor-pointer"
                  >
                    Coba Lagi 🔄
                  </button>
                </div>
              </motion.div>
            ) : callState === "incoming" ? (
              /* INCOMING CALL PROMPT MODAL */
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
                  <button
                    type="button"
                    onClick={handleRejectIncoming}
                    className="flex flex-col items-center gap-1.5 text-xs text-rose-500 hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/40">
                      <PhoneOff className="h-6 w-6" />
                    </span>
                    <span>Tolak</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAcceptIncoming}
                    className="flex flex-col items-center gap-1.5 text-xs text-emerald-500 hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 animate-pulse">
                      <Phone className="h-6 w-6" />
                    </span>
                    <span>Terima</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ACTIVE / CALLING SCREEN */
              (callState === "calling" || callState === "connected") && (
                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  className="relative flex h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-[32px] border border-pink-200/50 dark:border-purple-800 bg-slate-900 shadow-2xl text-white"
                >
                  {/* Top Bar with Status & Timer */}
                  <div className="relative z-20 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                        <img
                          src={partnerChar.svgPath}
                          alt={partnerChar.name}
                          className="h-7 w-7 object-contain"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold leading-tight flex items-center gap-1.5">
                          <span>{partnerName}</span>
                          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        </h4>
                        <p className="text-[11px] text-pink-200/80">
                          {callState === "calling"
                            ? connectionLabel
                            : `Durasi: ${formatDuration(callDuration)}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Direct WhatsApp Call Quick Launch */}
                      <a
                        href="https://api.whatsapp.com/send?text=Ayo%20teleponan%20sekarang%20sayang%20%F0%9F%92%96"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[11px] font-bold shadow-xs transition-colors"
                        title="Buka Panggilan di WhatsApp (bisa jalan di latar belakang/layar mati)"
                      >
                        <PhoneCall className="h-3 w-3" />
                        <span>WhatsApp</span>
                      </a>

                      <div className="flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold">
                        <span>{callType === "video" ? "Video" : "Suara"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Audio Unlock Banner if Android Chrome blocked unprompted autoplay */}
                  {audioNeedsUnlock && (
                    <div className="relative z-30 mx-4 my-1">
                      <button
                        type="button"
                        onClick={handleManualAudioUnlock}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs font-bold py-2 px-3 shadow-lg animate-bounce cursor-pointer"
                      >
                        <Volume2 className="h-4 w-4" />
                        <span>Ketuk di sini untuk Mengaktifkan Suara Pasangan 🔊</span>
                      </button>
                    </div>
                  )}

                  {/* Video Streams / Audio Avatars */}
                  <div className="relative flex-1 overflow-hidden bg-slate-950 flex items-center justify-center">
                    {callType === "video" ? (
                      <>
                        {/* Remote Video Stream */}
                        <video
                          ref={remoteVideoRef}
                          autoPlay
                          playsInline
                          className="h-full w-full object-cover"
                        />

                        {/* Remote fallback avatar if remote video track is not active yet */}
                        {!hasRemoteVideo && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/90 pointer-events-none">
                            <img
                              src={partnerChar.svgPath}
                              alt={partnerChar.name}
                              className="h-28 w-28 object-contain animate-pulse"
                            />
                            <p className="text-xs text-slate-400">
                              {connectionLabel}
                            </p>
                          </div>
                        )}

                        {/* Local Camera Pip Video (Self Preview) */}
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
                      /* Audio Call Screen with Harmonic Animation */
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
                            {connectionLabel}
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
                      className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors cursor-pointer ${
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
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/50 hover:bg-rose-600 transition-colors cursor-pointer"
                      title="Akhiri Panggilan"
                    >
                      <PhoneOff className="h-6 w-6" />
                    </button>

                    {/* Toggle Video (if video call) */}
                    {callType === "video" && (
                      <button
                        type="button"
                        onClick={toggleVideo}
                        className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors cursor-pointer ${
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
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
