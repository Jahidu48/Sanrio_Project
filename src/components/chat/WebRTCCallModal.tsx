"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneOff,
  RefreshCw,
  ShieldAlert,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import { getSanrioCharacter } from "@/lib/sanrioCharacters";
import { useAudio } from "@/context/AudioContext";
import type {
  CoupleProfile,
  WebRTCCallType,
  WebRTCSignalMessage,
} from "@/lib/types";

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

type CallLifecycleState =
  | "idle"
  | "calling"
  | "ringing"
  | "incoming"
  | "connected";

/**
 * Multi-STUN + Free Open-Relay TURN + Custom Env TURN Configuration
 * Engineered to traverse strict Indonesian ISP NAT/CGNAT (Telkomsel, IndiHome, XL, By.U).
 */
function buildIceConfiguration(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    // 1. Google & Cloudflare Low-Latency Anycast STUN
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];

  // 2. Custom Environment TURN Server (UDP + TCP 443 Firewall Bypass)
  const customTurnUrl = process.env.NEXT_PUBLIC_TURN_URL?.trim();
  const customTurnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME?.trim();
  const customTurnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL?.trim();

  if (customTurnUrl) {
    const rawUrls = customTurnUrl
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
    const expandedUrls = new Set<string>();

    for (const u of rawUrls) {
      expandedUrls.add(u);
      if (
        (u.startsWith("turn:") || u.startsWith("turns:")) &&
        !u.includes("?transport=")
      ) {
        expandedUrls.add(`${u}?transport=udp`);
        expandedUrls.add(`${u}?transport=tcp`);
      }
    }

    const serverEntry: RTCIceServer = {
      urls: Array.from(expandedUrls),
    };
    if (customTurnUsername) serverEntry.username = customTurnUsername;
    if (customTurnCredential) serverEntry.credential = customTurnCredential;
    iceServers.push(serverEntry);
  }

  // 3. Open-Relay TURN Fallback (UDP 80/443 + TCP 443 + TLS 443 for CGNAT Traversal)
  iceServers.push(
    { urls: "stun:openrelay.metered.ca:80" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:80?transport=tcp",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
        "turns:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    }
  );

  return {
    iceServers,
    iceCandidatePoolSize: 10,
  };
}

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

  const [callState, setCallState] = useState<CallLifecycleState>("idle");
  const [callType, setCallType] = useState<WebRTCCallType>("audio");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionLabel, setConnectionLabel] = useState("Calling...");
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioNeedsUnlock, setAudioNeedsUnlock] = useState(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Refs for synchronous access without stale closures
  const callStateRef = useRef<CallLifecycleState>("idle");
  callStateRef.current = callState;

  const callTypeRef = useRef<WebRTCCallType>("audio");
  callTypeRef.current = callType;

  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const activeCallIdRef = useRef<string | null>(null);
  const isCallerRef = useRef<boolean>(false);
  const hasResentCandidatesOnAckRef = useRef<boolean>(false);
  const latestIncomingOfferRef = useRef<WebRTCSignalMessage | null>(null);

  // ICE Candidate Queueing (WhatsApp / Discord pattern)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const gatheredLocalCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const processedSignalIdsRef = useRef<Set<string>>(new Set());

  // Timers
  const durationTimerRef = useRef<number | null>(null);
  const offerPingIntervalRef = useRef<number | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);
  const iceRestartTimerRef = useRef<number | null>(null);

  const onSendSignalRef = useRef(onSendSignal);
  onSendSignalRef.current = onSendSignal;
  const onDismissIncomingRef = useRef(onDismissIncoming);
  onDismissIncomingRef.current = onDismissIncoming;
  const onEndCallRef = useRef(onEndCall);
  onEndCallRef.current = onEndCall;

  const partnerChar =
    profile.role === "user_a"
      ? getSanrioCharacter(profile.userBCharacter, "my-melody")
      : getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const partnerName =
    profile.role === "user_a" ? profile.userBName : profile.userAName;

  // Bind local camera stream to PiP video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, callState]);

  // Bind remote stream to permanent <audio> + <video> elements
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

  const stopOfferPingLoop = useCallback(() => {
    if (offerPingIntervalRef.current) {
      window.clearInterval(offerPingIntervalRef.current);
      offerPingIntervalRef.current = null;
    }
    if (ringTimeoutRef.current) {
      window.clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  const startCallDurationTimer = useCallback(() => {
    if (durationTimerRef.current) return;
    setCallDuration(0);
    durationTimerRef.current = window.setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
  }, []);

  /**
   * Cleanly stops all hardware media tracks (turning off camera/mic indicator LEDs)
   * and closes RTCPeerConnection on both devices.
   */
  const cleanupCall = useCallback(() => {
    stopCallRing();
    stopOfferPingLoop();

    if (durationTimerRef.current) {
      window.clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (iceRestartTimerRef.current) {
      window.clearTimeout(iceRestartTimerRef.current);
      iceRestartTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }
    setLocalStream(null);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }

    setRemoteStream(null);
    pendingCandidatesRef.current = [];
    gatheredLocalCandidatesRef.current = [];
    latestIncomingOfferRef.current = null;
    activeCallIdRef.current = null;
    isCallerRef.current = false;
    hasResentCandidatesOnAckRef.current = false;
    setIsMuted(false);
    setIsVideoEnabled(true);
    setHasRemoteVideo(false);
    setIsReconnecting(false);
    setAudioNeedsUnlock(false);
    setCallDuration(0);
    setConnectionLabel("Calling...");
  }, [stopCallRing, stopOfferPingLoop]);

  // Ensure hardware tracks are released if component ever unmounts
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  /**
   * Drain queued ICE candidates immediately after remoteDescription is ready.
   */
  const flushPendingCandidates = useCallback(
    async (pc: RTCPeerConnection) => {
      if (!pc.remoteDescription || !pc.remoteDescription.type) return;
      if (pendingCandidatesRef.current.length === 0) return;

      const queued = [...pendingCandidatesRef.current];
      pendingCandidatesRef.current = [];

      for (const candidateInit of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch (err) {
          console.debug("[WebRTC] Skipped buffered ICE candidate:", err);
        }
      }
    },
    []
  );

  /**
   * Acquire camera/mic stream with echoCancellation/noiseSuppression.
   * Falls back to audio-only if a desktop device has no physical webcam attached.
   */
  const acquireMediaStream = useCallback(
    async (requestedType: WebRTCCallType): Promise<MediaStream> => {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video:
            requestedType === "video"
              ? {
                  facingMode: "user",
                  width: { ideal: 640 },
                  height: { ideal: 480 },
                }
              : false,
        });
      } catch (err: any) {
        if (
          requestedType === "video" &&
          (err?.name === "NotFoundError" ||
            err?.name === "DevicesNotFoundError" ||
            err?.name === "OverconstrainedError")
        ) {
          // Device has no camera (e.g., Desktop PC) -> fallback gracefully to microphone
          setIsVideoEnabled(false);
          return await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false,
          });
        }
        throw err;
      }
    },
    []
  );

  /**
   * Trigger ICE Restart renegotiation when mobile network switches or drops briefly.
   */
  const triggerIceRestart = useCallback(async () => {
    const pc = pcRef.current;
    const callId = activeCallIdRef.current;
    if (!pc || !callId || pc.signalingState === "closed") return;

    try {
      pc.restartIce();
    } catch {}

    if (pc.signalingState !== "stable") return;

    try {
      setIsReconnecting(true);
      setConnectionLabel("Menyambungkan ulang jalur suara/video...");
      const restartOffer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(restartOffer);

      onSendSignalRef.current({
        type: "call-offer",
        call_id: callId,
        call_type: callTypeRef.current,
        is_renegotiation: true,
        sdp: {
          type: restartOffer.type,
          sdp: restartOffer.sdp,
        },
      });
    } catch (err) {
      console.warn("[WebRTC] ICE restart offer failed:", err);
    }
  }, []);

  /**
   * Create RTCPeerConnection with Trickle ICE, Remote Track binding, and Auto-Reconnect.
   */
  const setupPeerConnection = useCallback(
    (activeType: WebRTCCallType, callId: string) => {
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch {}
      }

      const pc = new RTCPeerConnection(buildIceConfiguration());

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const serializedCandidate: RTCIceCandidateInit = {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment ?? undefined,
          };
          gatheredLocalCandidatesRef.current.push(serializedCandidate);

          onSendSignalRef.current({
            type: "call-ice",
            call_id: callId,
            call_type: activeType,
            candidate: serializedCandidate,
          });
        }
      };

      pc.ontrack = (event) => {
        const stream =
          event.streams && event.streams[0]
            ? event.streams[0]
            : new MediaStream([event.track]);

        setRemoteStream(stream);

        const updateVideoPresence = () => {
          const liveVideo = stream
            .getVideoTracks()
            .some((t) => t.readyState === "live" && !t.muted);
          setHasRemoteVideo(liveVideo);
        };

        updateVideoPresence();
        event.track.onmute = updateVideoPresence;
        event.track.onunmute = updateVideoPresence;
        event.track.onended = updateVideoPresence;
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "connected") {
          stopOfferPingLoop();
          stopCallRing();
          setIsReconnecting(false);
          setConnectionLabel("Tersambung");
          setCallState("connected");
          startCallDurationTimer();
        } else if (state === "connecting") {
          if (callStateRef.current === "connected") {
            setConnectionLabel("Menyambungkan jalur media...");
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState;
        if (iceState === "connected" || iceState === "completed") {
          if (iceRestartTimerRef.current) {
            window.clearTimeout(iceRestartTimerRef.current);
            iceRestartTimerRef.current = null;
          }
          stopOfferPingLoop();
          stopCallRing();
          setIsReconnecting(false);
          setConnectionLabel("Tersambung");
          setCallState("connected");
          startCallDurationTimer();
        } else if (iceState === "disconnected" || iceState === "failed") {
          setIsReconnecting(true);
          setConnectionLabel("Sinyal melemah • Menyambungkan ulang...");

          try {
            pc.restartIce();
          } catch {}

          if (iceRestartTimerRef.current) {
            window.clearTimeout(iceRestartTimerRef.current);
          }
          // Caller initiates ICE restart faster; callee waits slightly to avoid glare
          const delayMs = isCallerRef.current || iceState === "failed" ? 900 : 2400;
          iceRestartTimerRef.current = window.setTimeout(() => {
            if (
              pcRef.current &&
              (pcRef.current.iceConnectionState === "disconnected" ||
                pcRef.current.iceConnectionState === "failed")
            ) {
              triggerIceRestart();
            }
          }, delayMs);
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [
      startCallDurationTimer,
      stopCallRing,
      stopOfferPingLoop,
      triggerIceRestart,
    ]
  );

  /**
   * Outgoing Call: Acquire stream -> Create SDP Offer -> Trickle ICE + 2s Ringing Ping.
   */
  const initiateOutgoingCall = useCallback(
    async (type: WebRTCCallType) => {
      cleanupCall();
      const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      activeCallIdRef.current = callId;
      isCallerRef.current = true;
      hasResentCandidatesOnAckRef.current = false;

      setCallType(type);
      setCallState("calling");
      setPermissionError(null);
      setConnectionLabel("Calling...");

      try {
        const stream = await acquireMediaStream(type);
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = setupPeerConnection(type, callId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === "video",
        });
        await pc.setLocalDescription(offer);

        // Send initial SDP Offer immediately (pure Trickle ICE)
        onSendSignalRef.current({
          type: "call-offer",
          call_id: callId,
          call_type: type,
          sdp: {
            type: offer.type,
            sdp: offer.sdp,
          },
        });

        // Repeat ringing offer ping every 2 seconds until answered/rejected (handles late tab open)
        offerPingIntervalRef.current = window.setInterval(() => {
          const currentState = callStateRef.current;
          const activePc = pcRef.current;
          if (
            (currentState !== "calling" && currentState !== "ringing") ||
            !activePc ||
            activeCallIdRef.current !== callId
          ) {
            stopOfferPingLoop();
            return;
          }

          const latestDesc = activePc.localDescription || offer;
          onSendSignalRef.current({
            type: "call-offer",
            call_id: callId,
            call_type: type,
            sdp: {
              type: latestDesc.type,
              sdp: latestDesc.sdp,
            },
          });
        }, 2000);

        // Auto-timeout after 45 seconds if unanswered
        ringTimeoutRef.current = window.setTimeout(() => {
          if (
            callStateRef.current === "calling" ||
            callStateRef.current === "ringing"
          ) {
            onSendSignalRef.current({
              type: "call-end",
              call_id: callId,
              call_type: type,
            });
            cleanupCall();
            setCallState("idle");
            onEndCallRef.current();
          }
        }, 45000);
      } catch (err: any) {
        console.warn("[WebRTC] initiateOutgoingCall error:", err);
        cleanupCall();
        setCallState("idle");
        setPermissionError(
          err?.name === "NotAllowedError" ||
            err?.message?.toLowerCase().includes("permission")
            ? "Izin Mikrofon / Kamera ditolak oleh browser. Klik ikon gembok di bilah alamat browser untuk mengizinkan akses."
            : `Gagal mengakses mikrofon/kamera: ${err?.message || "Periksa perangkat Anda"}`
        );
      }
    },
    [acquireMediaStream, cleanupCall, setupPeerConnection, stopOfferPingLoop]
  );

  // Trigger outgoing call when parent sets activeOutgoingCall
  useEffect(() => {
    if (activeOutgoingCall && callStateRef.current === "idle") {
      initiateOutgoingCall(activeOutgoingCall.type);
    }
  }, [activeOutgoingCall, initiateOutgoingCall]);

  /**
   * Unified Full-Duplex Signal Processor (Deduplicated across prop & CustomEvent)
   */
  const processSignal = useCallback(
    async (signal: WebRTCSignalMessage) => {
      if (!signal || !signal.id) return;
      if (signal.caller_role === profile.role) return;

      // Deduplicate identical signal IDs so prop + CustomEvent never double-process
      if (processedSignalIdsRef.current.has(signal.id)) return;
      processedSignalIdsRef.current.add(signal.id);
      if (processedSignalIdsRef.current.size > 300) {
        const oldest = processedSignalIdsRef.current.values().next().value;
        if (oldest) processedSignalIdsRef.current.delete(oldest);
      }

      const incomingCallId = signal.call_id || signal.id;

      // 1. CALL END / REJECT / BUSY
      if (
        signal.type === "call-end" ||
        signal.type === "call-reject" ||
        signal.type === "call-busy"
      ) {
        if (
          activeCallIdRef.current &&
          signal.call_id &&
          signal.call_id !== activeCallIdRef.current
        ) {
          return;
        }
        cleanupCall();
        setCallState("idle");
        onDismissIncomingRef.current();
        onEndCallRef.current();
        return;
      }

      // 2. CALL OFFER (Initial Incoming, 2s Ringing Ping, or Mid-Call ICE Restart)
      if (signal.type === "call-offer" && signal.sdp) {
        const currentState = callStateRef.current;

        // 2a. Mid-call ICE Restart Renegotiation for the active call
        if (
          currentState === "connected" &&
          pcRef.current &&
          (!activeCallIdRef.current ||
            signal.call_id === activeCallIdRef.current ||
            signal.is_renegotiation)
        ) {
          try {
            const pc = pcRef.current;
            await pc.setRemoteDescription(
              new RTCSessionDescription(signal.sdp)
            );
            await flushPendingCandidates(pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            onSendSignalRef.current({
              type: "call-answer",
              call_id: activeCallIdRef.current || incomingCallId,
              call_type: callTypeRef.current,
              is_renegotiation: true,
              sdp: {
                type: answer.type,
                sdp: answer.sdp,
              },
            });
            setIsReconnecting(false);
            setConnectionLabel("Tersambung");
          } catch (err) {
            console.warn("[WebRTC] Mid-call renegotiation failed:", err);
          }
          return;
        }

        // 2b. Busy on another call
        if (
          currentState !== "idle" &&
          currentState !== "incoming" &&
          activeCallIdRef.current &&
          signal.call_id &&
          signal.call_id !== activeCallIdRef.current
        ) {
          onSendSignalRef.current({
            type: "call-busy",
            call_id: signal.call_id,
            call_type: signal.call_type,
          });
          return;
        }

        // 2c. Glare resolution: if both partners pressed Call simultaneously, user_a wins as caller
        if (
          (currentState === "calling" || currentState === "ringing") &&
          signal.call_id !== activeCallIdRef.current
        ) {
          if (profile.role === "user_a") {
            return;
          }
          cleanupCall();
        }

        // 2d. Incoming Call or 2s Offer Ping Refresh
        if (activeCallIdRef.current !== incomingCallId) {
          pendingCandidatesRef.current = [];
          activeCallIdRef.current = incomingCallId;
        }
        isCallerRef.current = false;
        latestIncomingOfferRef.current = signal;

        if (callStateRef.current === "idle") {
          setCallType(signal.call_type);
          setCallState("incoming");
          setPermissionError(null);
          setConnectionLabel("Panggilan Masuk...");
          startCallRing();
        }

        // Always send back call-ringing-ack so caller switches from "Calling..." to "Ringing..."
        onSendSignalRef.current({
          type: "call-ringing-ack",
          call_id: incomingCallId,
          call_type: signal.call_type,
        });
        return;
      }

      // 3. CALL RINGING ACK (Caller updates status from "Calling..." -> "Ringing...")
      if (signal.type === "call-ringing-ack") {
        if (
          signal.call_id &&
          activeCallIdRef.current &&
          signal.call_id !== activeCallIdRef.current
        ) {
          return;
        }
        if (
          callStateRef.current === "calling" ||
          callStateRef.current === "ringing"
        ) {
          if (callStateRef.current === "calling") {
            setCallState("ringing");
            startCallRing();
          }
          setConnectionLabel("Ringing... Berdering di perangkat pasangan 🔔");

          // Re-push gathered Trickle ICE candidates once on first ack in case partner opened tab late
          if (
            !hasResentCandidatesOnAckRef.current &&
            gatheredLocalCandidatesRef.current.length > 0
          ) {
            hasResentCandidatesOnAckRef.current = true;
            for (const cand of gatheredLocalCandidatesRef.current) {
              onSendSignalRef.current({
                type: "call-ice",
                call_id: activeCallIdRef.current || undefined,
                call_type: callTypeRef.current,
                candidate: cand,
              });
            }
          }
        }
        return;
      }

      // 4. CALL ANSWER (Caller sets remote description & flushes queued ICE candidates)
      if (signal.type === "call-answer" && signal.sdp) {
        if (
          signal.call_id &&
          activeCallIdRef.current &&
          signal.call_id !== activeCallIdRef.current
        ) {
          return;
        }

        const pc = pcRef.current;
        if (!pc) return;

        stopOfferPingLoop();
        stopCallRing();

        if (pc.signalingState === "have-local-offer") {
          try {
            await pc.setRemoteDescription(
              new RTCSessionDescription(signal.sdp)
            );
            await flushPendingCandidates(pc);
            setIsReconnecting(false);
            setCallState("connected");
            setConnectionLabel("Tersambung");
            playChime();
            startCallDurationTimer();
          } catch (err) {
            console.warn("[WebRTC] Failed to apply call-answer SDP:", err);
          }
        }
        return;
      }

      // 5. TRICKLE ICE CANDIDATE (Add immediately if remoteDescription ready, else queue)
      if (signal.type === "call-ice" && signal.candidate) {
        if (
          signal.call_id &&
          activeCallIdRef.current &&
          signal.call_id !== activeCallIdRef.current
        ) {
          return;
        }

        const pc = pcRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (err) {
            console.debug("[WebRTC] addIceCandidate warning:", err);
          }
        } else {
          pendingCandidatesRef.current.push(signal.candidate);
        }
      }
    },
    [
      cleanupCall,
      flushPendingCandidates,
      playChime,
      profile.role,
      startCallDurationTimer,
      startCallRing,
      stopCallRing,
      stopOfferPingLoop,
    ]
  );

  const processSignalRef = useRef(processSignal);
  processSignalRef.current = processSignal;

  // Handle incomingCall prop if modal mounted with an offer already present
  useEffect(() => {
    if (incomingCall && incomingCall.type === "call-offer") {
      processSignalRef.current(incomingCall);
    }
  }, [incomingCall]);

  // Handle signalQueue prop updates
  useEffect(() => {
    if (signalQueue) {
      processSignalRef.current(signalQueue);
    }
  }, [signalQueue]);

  // Handle instant synchronous window CustomEvent signals
  useEffect(() => {
    const onCustomSignal = (e: Event) => {
      const customEv = e as CustomEvent<WebRTCSignalMessage>;
      if (customEv.detail) {
        processSignalRef.current(customEv.detail);
      }
    };

    window.addEventListener("sanrio-webrtc-signal", onCustomSignal);
    return () => {
      window.removeEventListener("sanrio-webrtc-signal", onCustomSignal);
    };
  }, []);

  /**
   * Callee presses Accept: Acquire stream -> setRemoteDescription(offer) -> Flush ICE Queue -> Answer.
   */
  const handleAcceptIncoming = async () => {
    stopCallRing();
    playPop();

    const offerSignal = latestIncomingOfferRef.current || incomingCall;
    if (!offerSignal?.sdp) return;

    const activeType = offerSignal.call_type || "audio";
    const callId =
      offerSignal.call_id || activeCallIdRef.current || offerSignal.id;
    activeCallIdRef.current = callId;
    isCallerRef.current = false;

    setCallType(activeType);
    setPermissionError(null);
    setConnectionLabel("Menghubungkan jalur suara & video...");

    try {
      const stream = await acquireMediaStream(activeType);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = setupPeerConnection(activeType, callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(
        new RTCSessionDescription(offerSignal.sdp)
      );
      // Immediately drain any ICE candidates that arrived while phone was ringing!
      await flushPendingCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      onSendSignal({
        type: "call-answer",
        call_id: callId,
        call_type: activeType,
        sdp: {
          type: answer.type,
          sdp: answer.sdp,
        },
      });

      setCallState("connected");
      setConnectionLabel("Tersambung");
      startCallDurationTimer();
      onDismissIncoming();
    } catch (err: any) {
      console.warn("[WebRTC] handleAcceptIncoming failed:", err);
      cleanupCall();
      setCallState("idle");
      setPermissionError(
        err?.name === "NotAllowedError" ||
          err?.message?.toLowerCase().includes("permission")
          ? "Izin Mikrofon / Kamera ditolak. Klik ikon gembok di bilah alamat browser untuk mengizinkan sebelum menerima panggilan."
          : `Gagal menyambungkan panggilan: ${err?.message || "Kesalahan perangkat"}`
      );
    }
  };

  const handleRejectIncoming = () => {
    stopCallRing();
    playPop();
    onSendSignal({
      type: "call-reject",
      call_id: activeCallIdRef.current || undefined,
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
      call_id: activeCallIdRef.current || undefined,
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
    const stream = localStreamRef.current || localStream;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    playPop();
    const stream = localStreamRef.current || localStream;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
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

  const isCallScreenVisible =
    callState === "calling" ||
    callState === "ringing" ||
    callState === "connected";

  return (
    <>
      {/* Always-mounted remote audio output so audio stream never detaches */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <AnimatePresence>
        {(callState !== "idle" || permissionError) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 lg:backdrop-blur-md p-4"
          >
            {/* 1. PERMISSION ERROR DIALOG */}
            {permissionError ? (
              <motion.div
                initial={{ scale: 0.92, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.8 }}
                className="relative w-full max-w-sm rounded-[32px] border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 p-7 text-center shadow-2xl space-y-5 text-[#1E293B] dark:text-white"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-8 w-8" />
                </div>

                <div>
                  <h3 className="text-base font-extrabold">
                    Akses Mikrofon / Kamera Dibutuhkan
                  </h3>
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
                      onDismissIncoming();
                      onEndCall();
                    }}
                    className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white py-2.5 text-xs font-bold active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPermissionError(null);
                      initiateOutgoingCall(callType);
                    }}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 text-white py-2.5 text-xs font-bold shadow-md shadow-pink-500/25 active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                </div>
              </motion.div>
            ) : callState === "incoming" ? (
              /* 2. INCOMING CALL MODAL */
              <motion.div
                initial={{ scale: 0.92, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.8 }}
                className="relative w-full max-w-sm rounded-[32px] border border-[#F3D8DF] dark:border-[#3B2E40] bg-white dark:bg-[#221B25] p-8 text-center shadow-2xl space-y-6"
              >
                <div className="relative mx-auto flex h-24 w-24 items-center justify-center transform-gpu">
                  <span className="absolute inset-0 rounded-full bg-rose-400/25 animate-ping" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#FFFDF9] dark:bg-[#2E2433] border-2 border-rose-300 dark:border-rose-700 shadow-lg">
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
                      Panggilan {callType === "video" ? "Video" : "Suara"} Masuk
                    </span>
                  </span>
                  <h3 className="mt-2.5 text-xl font-extrabold text-[#1E293B] dark:text-white">
                    {partnerName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Pasanganmu memanggil secara langsung di ruang kita 💖
                  </p>
                </div>

                <div className="flex items-center justify-center gap-8 pt-2">
                  <button
                    type="button"
                    onClick={handleRejectIncoming}
                    className="flex flex-col items-center gap-1.5 text-xs font-semibold text-rose-500 active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/40">
                      <PhoneOff className="h-6 w-6" />
                    </span>
                    <span>Tolak</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAcceptIncoming}
                    className="flex flex-col items-center gap-1.5 text-xs font-semibold text-emerald-500 active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 animate-pulse">
                      <Phone className="h-6 w-6" />
                    </span>
                    <span>Terima</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              /* 3. CALLING / RINGING / CONNECTED NATIVE CALL SCREEN */
              isCallScreenVisible && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.8 }}
                  className="relative flex h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-[32px] border border-pink-200/40 dark:border-purple-800 bg-slate-900 shadow-2xl text-white"
                >
                  {/* Top Header Status & Duration */}
                  <div className="relative z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/20">
                        <img
                          src={partnerChar.svgPath}
                          alt={partnerChar.name}
                          className="h-7 w-7 object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold leading-tight flex items-center gap-1.5 truncate">
                          <span className="truncate">{partnerName}</span>
                          <span
                            className={`flex h-2 w-2 shrink-0 rounded-full ${
                              callState === "connected" && !isReconnecting
                                ? "bg-emerald-400"
                                : "bg-amber-400 animate-pulse"
                            }`}
                          />
                        </h4>
                        <p className="text-[11px] text-pink-200/90 truncate flex items-center gap-1.5">
                          {isReconnecting && (
                            <RefreshCw className="h-3 w-3 animate-spin text-amber-300 shrink-0" />
                          )}
                          <span>
                            {callState === "connected" && !isReconnecting
                              ? `Tersambung • ${formatDuration(callDuration)}`
                              : connectionLabel}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isReconnecting && (
                        <button
                          type="button"
                          onClick={triggerIceRestart}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-500/25 border border-amber-400/40 px-2.5 py-1 text-[11px] font-semibold text-amber-200 active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer"
                          title="Segarkan jalur koneksi"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Reconnect</span>
                        </button>
                      )}
                      <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">
                        <span>
                          {callType === "video" ? "Video Call" : "Voice Call"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Autoplay Audio Unlock Prompt (if browser blocked audio) */}
                  {audioNeedsUnlock && (
                    <div className="relative z-30 mx-4 my-1">
                      <button
                        type="button"
                        onClick={handleManualAudioUnlock}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs font-bold py-2.5 px-3 shadow-lg active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer"
                      >
                        <Volume2 className="h-4 w-4" />
                        <span>Ketuk untuk Mengaktifkan Suara Pasangan</span>
                      </button>
                    </div>
                  )}

                  {/* Main Stage: Video Canvas or Voice Avatar */}
                  <div className="relative flex-1 overflow-hidden bg-slate-950 flex items-center justify-center">
                    {callType === "video" ? (
                      <>
                        <video
                          ref={remoteVideoRef}
                          autoPlay
                          playsInline
                          className="h-full w-full object-cover"
                        />

                        {!hasRemoteVideo && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/92 pointer-events-none px-6 text-center">
                            <img
                              src={partnerChar.svgPath}
                              alt={partnerChar.name}
                              className="h-28 w-28 object-contain animate-pulse"
                            />
                            <p className="text-xs font-medium text-pink-200">
                              {callState === "calling"
                                ? "Calling... Menghubungkan ke pasangan"
                                : callState === "ringing"
                                ? "Ringing... Berdering di perangkat pasangan 🔔"
                                : `Menunggu kamera ${partnerName}...`}
                            </p>
                          </div>
                        )}

                        {/* Self Preview PiP */}
                        <div className="absolute top-4 right-4 z-20 h-36 w-24 sm:h-40 sm:w-28 overflow-hidden rounded-2xl border-2 border-white/60 bg-slate-900 shadow-xl transform-gpu">
                          <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`h-full w-full object-cover scale-x-[-1] ${
                              !isVideoEnabled ? "hidden" : ""
                            }`}
                          />
                          {!isVideoEnabled && (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-800 text-[10px] text-slate-300">
                              <VideoOff className="h-4 w-4 text-rose-400" />
                              <span>Kamera Off</span>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      /* Voice Call Stage */
                      <div className="flex flex-col items-center justify-center gap-6 p-6 text-center">
                        <div className="relative flex h-36 w-36 items-center justify-center transform-gpu">
                          <motion.span
                            animate={{
                              scale: [1, 1.24, 1],
                              opacity: [0.3, 0.65, 0.3],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 2.2,
                              ease: "easeInOut",
                            }}
                            className="absolute inset-0 rounded-full bg-pink-400/25 blur-md transform-gpu"
                          />
                          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-rose-400 p-1 shadow-2xl">
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#18131A]">
                              <img
                                src={partnerChar.svgPath}
                                alt={partnerChar.name}
                                className="h-20 w-20 object-contain drop-shadow"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-display font-bold">
                            {partnerName}
                          </h3>
                          <p className="mt-1.5 text-xs font-medium text-rose-200">
                            {callState === "connected" && !isReconnecting
                              ? `Suara Tersambung • ${formatDuration(callDuration)}`
                              : connectionLabel}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Controls */}
                  <div className="relative z-20 flex items-center justify-center gap-5 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-6">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className={`flex h-12 w-12 items-center justify-center rounded-full active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer ${
                        isMuted
                          ? "bg-rose-500 text-white"
                          : "bg-white/20 text-white hover:bg-white/30"
                      }`}
                      title={
                        isMuted ? "Aktifkan Mikrofon" : "Bisukan Mikrofon"
                      }
                    >
                      {isMuted ? (
                        <MicOff className="h-5 w-5" />
                      ) : (
                        <Mic className="h-5 w-5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleHangup}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/50 hover:bg-rose-600 active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer"
                      title="Akhiri Panggilan"
                    >
                      <PhoneOff className="h-6 w-6" />
                    </button>

                    {callType === "video" && (
                      <button
                        type="button"
                        onClick={toggleVideo}
                        className={`flex h-12 w-12 items-center justify-center rounded-full active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer ${
                          !isVideoEnabled
                            ? "bg-rose-500 text-white"
                            : "bg-white/20 text-white hover:bg-white/30"
                        }`}
                        title={
                          isVideoEnabled ? "Matikan Kamera" : "Nyalakan Kamera"
                        }
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
