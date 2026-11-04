"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Check,
  CheckCheck,
  Download,
  FileText,
  Headphones,
  Heart,
  ImageIcon,
  MapPin,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Play,
  Pause,
  Plus,
  Reply,
  RotateCcw,
  Send,
  Smile,
  Sparkles,
  StopCircle,
  Video,
  X,
  Youtube,
} from "lucide-react";
import { getSanrioCharacter } from "@/lib/sanrioCharacters";
import { useAudio } from "@/context/AudioContext";
import { uploadChatMedia } from "@/lib/supabase";
import { ScratchCardPolaroid } from "./ScratchCardPolaroid";
import type {
  ChatMessage,
  ChatMessageLocation,
  ChatMessageReplyTo,
  ChatMessageType,
  ChatTypingStatus,
  CoupleProfile,
  WebRTCCallType,
} from "@/lib/types";

export interface CoupleChatTabProps {
  profile: CoupleProfile;
  messages: ChatMessage[];
  partnerTyping: ChatTypingStatus | null;
  bothPartnersOnline: boolean;
  onSendMessage: (input: {
    type: ChatMessageType;
    text?: string;
    media_url?: string;
    file_name?: string;
    file_size?: number;
    audio_duration?: number;
    location?: ChatMessageLocation;
    reply_to?: ChatMessageReplyTo;
    is_scratch_card?: boolean;
  }) => Promise<void>;
  onSendTyping: () => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onMarkRead: () => void;
  onStartCall: (type: WebRTCCallType) => void;
}

const QUICK_EMOJIS = ["💖", "🥰", "🥺", "🌸", "✨", "🔥"];

export function CoupleChatTab({
  profile,
  messages,
  partnerTyping,
  bothPartnersOnline,
  onSendMessage,
  onSendTyping,
  onAddReaction,
  onMarkRead,
  onStartCall,
}: CoupleChatTabProps) {
  const { playPop, playChime } = useAudio();
  const [inputText, setInputText] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [sendAsScratchCard, setSendAsScratchCard] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessageReplyTo | null>(null);
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);
  const [showMusicPanel, setShowMusicPanel] = useState(false);
  const [musicUrlInput, setMusicUrlInput] = useState("");

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // Audio playback state for voice notes in chat
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const activeAudioElemRef = useRef<HTMLAudioElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const partnerChar =
    profile.role === "user_a"
      ? getSanrioCharacter(profile.userBCharacter, "my-melody")
      : getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const partnerName =
    profile.role === "user_a" ? profile.userBName : profile.userAName;

  const myChar =
    profile.role === "user_a"
      ? getSanrioCharacter(profile.userACharacter, "cinnamoroll")
      : getSanrioCharacter(profile.userBCharacter, "my-melody");

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    onMarkRead();
  }, [messages.length, onMarkRead]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (activeAudioElemRef.current) {
        activeAudioElemRef.current.pause();
        activeAudioElemRef.current = null;
      }
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
      }
    };
  }, []);

  // Listen for YouTube Error 150/101 embed restriction from Jockie Music Bot
  useEffect(() => {
    const handleEmbedError = (e: CustomEvent<{ videoId?: string }>) => {
      onSendMessage({
        type: "text",
        text: `⚠️ [Jockie Music Bot] Video YouTube ini dibatasi hak cipta oleh pemiliknya (Error 150/101 - pemutaran di situs lain diblokir). Silakan coba link versi audio/lirik atau gunakan perintah !skip! 💖`,
      });
    };

    window.addEventListener(
      "jockie-embed-error" as any,
      handleEmbedError as EventListener
    );
    return () => {
      window.removeEventListener(
        "jockie-embed-error" as any,
        handleEmbedError as EventListener
      );
    };
  }, [onSendMessage]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onSendTyping();
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    playPop();

    const replyData = replyingTo || undefined;
    setInputText("");
    setReplyingTo(null);

    // Check for Jockie Music Bot command (!play, !pause, !resume, !sync, !skip)
    const isBotCommand = trimmed.startsWith("!");

    await onSendMessage({
      type: "text",
      text: trimmed,
      reply_to: replyData,
    });

    if (isBotCommand && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("jockie-command", { detail: { text: trimmed } })
      );

      const parts = trimmed.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const arg = parts.slice(1).join(" ");
      let botResponse = "";

      if (cmd === "!stop") {
        botResponse = `🛑 [Jockie Music Bot] Musik dihentikan seketika dan antrean telah dikosongkan.`;
      } else if (cmd === "!play") {
        botResponse = arg
          ? `🎶 [Jockie Music Bot] Menerima lagu YouTube: ${arg} 💖\nSedang memutar dan menyinkronkan audio di kedua layar...`
          : `🎵 [Jockie Music Bot] Melanjutkan pemutaran musik bersama.`;
      } else if (cmd === "!pause") {
        botResponse = `⏸️ [Jockie Music Bot] Musik dijeda di kedua perangkat.`;
      } else if (cmd === "!resume") {
        botResponse = `▶️ [Jockie Music Bot] Melanjutkan pemutaran musik secara serentak.`;
      } else if (cmd === "!sync") {
        botResponse = `🔄 [Jockie Music Bot] Menyelaraskan detik pemutaran kedua layar secara presisi!`;
      } else if (cmd === "!skip") {
        botResponse = `⏭️ [Jockie Music Bot] Melewati track dan memutar musik berikutnya.`;
      }

      if (botResponse) {
        setTimeout(async () => {
          await onSendMessage({
            type: "text",
            text: botResponse,
          });
        }, 300);
      }
    }
  };

  // --------------------------------------------------------------------------
  // Media Attachments Handlers
  // --------------------------------------------------------------------------
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playPop();
    setShowAttachMenu(false);

    const path = `${profile.roomId}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const url = await uploadChatMedia(file, path);

    await onSendMessage({
      type: "image",
      media_url: url,
      file_name: file.name,
      reply_to: replyingTo || undefined,
      is_scratch_card: sendAsScratchCard,
    });
    setReplyingTo(null);
    setSendAsScratchCard(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playPop();
    setShowAttachMenu(false);

    const path = `${profile.roomId}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const url = await uploadChatMedia(file, path);

    await onSendMessage({
      type: "file",
      media_url: url,
      file_name: file.name,
      file_size: file.size,
      reply_to: replyingTo || undefined,
    });
    setReplyingTo(null);
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const handleShareLocation = () => {
    playPop();
    setShowAttachMenu(false);

    if (!navigator.geolocation) {
      alert("Geolocation tidak didukung di perangkat ini.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await onSendMessage({
          type: "location",
          text: "📍 Lokasi kencan / posisiku saat ini",
          location: {
            lat: latitude,
            lng: longitude,
            label: "Posisiku sekarang",
          },
        });
      },
      () => {
        alert("Gagal membaca lokasi. Pastikan izin GPS aktif.");
      },
      { timeout: 8000 }
    );
  };

  // --------------------------------------------------------------------------
  // Voice Recording (MediaRecorder)
  // --------------------------------------------------------------------------
  const startVoiceRecording = async () => {
    try {
      playPop();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          const path = `${profile.roomId}/${Date.now()}_voice.webm`;
          const url = await uploadChatMedia(audioBlob, path);

          await onSendMessage({
            type: "audio",
            media_url: url,
            audio_duration: recordingSeconds || 2,
            reply_to: replyingTo || undefined,
          });
          setReplyingTo(null);
        }
        setIsRecording(false);
        setRecordingSeconds(0);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      alert("Izin mikrofon diperlukan untuk merekam pesan suara.");
    }
  };

  const stopVoiceRecording = () => {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelVoiceRecording = () => {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // --------------------------------------------------------------------------
  // Audio Player for Voice Notes
  // --------------------------------------------------------------------------
  const togglePlayAudio = (msgId: string, url?: string) => {
    if (!url) return;
    playPop();

    if (playingAudioId === msgId && activeAudioElemRef.current) {
      activeAudioElemRef.current.pause();
      setPlayingAudioId(null);
      return;
    }

    if (activeAudioElemRef.current) {
      activeAudioElemRef.current.pause();
    }

    const audio = new Audio(url);
    activeAudioElemRef.current = audio;
    setPlayingAudioId(msgId);

    audio.play().catch(() => setPlayingAudioId(null));
    audio.onended = () => setPlayingAudioId(null);
    audio.onerror = () => setPlayingAudioId(null);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Berkas";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatMessageTime = (iso?: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const isPartnerTypingNow =
    partnerTyping &&
    partnerTyping.role !== profile.role &&
    Date.now() - partnerTyping.timestamp < 3500;

  return (
    <div className="relative flex h-[calc(100dvh-13rem)] min-h-[520px] max-h-[820px] w-full flex-col overflow-hidden rounded-3xl border border-pink-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md shadow-card">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.zip,.txt"
        onChange={handleDocUpload}
        className="hidden"
      />

      {/* TOP CHAT HEADER */}
      <div className="flex items-center justify-between border-b border-pink-100/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900 px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-sky-100 dark:from-purple-900/40 dark:to-slate-800 border border-pink-100 dark:border-purple-800 shadow-sm">
            <img
              src={partnerChar.svgPath}
              alt={partnerChar.name}
              className="h-8 w-8 object-contain"
            />
            {bothPartnersOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-extrabold text-[#1E293B] dark:text-white">
              {partnerName}
            </h3>
            <p className="truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {isPartnerTypingNow ? (
                <span className="text-rose-500 font-semibold animate-pulse">
                  Sedang mengetik...
                </span>
              ) : bothPartnersOnline ? (
                <span className="text-emerald-500">Online bersama 💖</span>
              ) : (
                `Ruang #${profile.roomId}`
              )}
            </p>
          </div>
        </div>

        {/* Quick Actions: Jockie Bot Music, Voice Call & Video Call */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              playPop();
              setShowMusicPanel(!showMusicPanel);
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all cursor-pointer ${
              showMusicPanel
                ? "bg-pink-500 text-white border-pink-500 shadow-sm"
                : "bg-[#F8FAFC] dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-pink-600 dark:text-pink-400 hover:bg-pink-50"
            }`}
            title="Jockie Music Bot 🎵 (Putar YouTube Bersama)"
          >
            <Headphones className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onStartCall("audio")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors"
            title="Panggilan Suara"
          >
            <Phone className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onStartCall("video")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors"
            title="Panggilan Video"
          >
            <Video className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* EXPANDABLE JOCKIE MUSIC BOT CONTROL PANEL */}
      <AnimatePresence>
        {showMusicPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-pink-100 dark:border-slate-800 bg-gradient-to-r from-pink-50/90 via-white to-purple-50/90 dark:from-slate-900 dark:via-purple-950/20 dark:to-slate-900 p-3 sm:px-5"
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex-1 flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500 shrink-0" />
                <input
                  type="text"
                  value={musicUrlInput}
                  onChange={(e) => setMusicUrlInput(e.target.value)}
                  placeholder="Tempel link YouTube (misal: https://youtu.be/...)"
                  className="flex-1 rounded-xl bg-white dark:bg-slate-800 border border-pink-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-pink-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = musicUrlInput.trim();
                    if (!url) return;
                    playPop();
                    handleSendText(undefined);
                    // Also fire directly
                    window.dispatchEvent(
                      new CustomEvent("jockie-command", {
                        detail: { text: `!play ${url}` },
                      })
                    );
                    onSendMessage({
                      type: "text",
                      text: `!play ${url}`,
                    });
                    setMusicUrlInput("");
                  }}
                  className="rounded-xl bg-pink-500 hover:bg-pink-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer shrink-0"
                >
                  ▶ Putar
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    playPop();
                    const url = "https://www.youtube.com/watch?v=fOdML_XhHvQ";
                    window.dispatchEvent(
                      new CustomEvent("jockie-command", {
                        detail: { text: `!play ${url}` },
                      })
                    );
                    onSendMessage({
                      type: "text",
                      text: `!play ${url}`,
                    });
                  }}
                  className="rounded-lg bg-white/90 dark:bg-slate-800 border border-pink-200/70 dark:border-slate-700 px-2 py-1 font-semibold text-pink-700 dark:text-pink-300 hover:bg-pink-100 shrink-0 cursor-pointer"
                >
                  🌧️ Heize (On Rainy Days)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playPop();
                    const url = "https://www.youtube.com/watch?v=jfKfPfyJRdk";
                    window.dispatchEvent(
                      new CustomEvent("jockie-command", {
                        detail: { text: `!play ${url}` },
                      })
                    );
                    onSendMessage({
                      type: "text",
                      text: `!play ${url}`,
                    });
                  }}
                  className="rounded-lg bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 shrink-0 cursor-pointer"
                >
                  ☕ Lofi Girl Chill
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playPop();
                    window.dispatchEvent(
                      new CustomEvent("jockie-command", {
                        detail: { text: "!sync" },
                      })
                    );
                  }}
                  className="rounded-lg bg-sky-100 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 px-2 py-1 font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-200 shrink-0 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3 inline mr-1" />
                  !sync
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MESSAGES FEED */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 sanrio-dotted-grid dark:bg-slate-950">
        {messages.map((msg) => {
          const isMe = msg.sender_role === profile.role;
          const senderChar = isMe ? myChar : partnerChar;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`group flex items-end gap-2 ${
                isMe ? "justify-end" : "justify-start"
              }`}
            >
              {/* Partner Avatar on incoming */}
              {!isMe && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-pink-100 dark:border-slate-700 shadow-xs mb-1">
                  <img
                    src={senderChar.svgPath}
                    alt=""
                    className="h-5 w-5 object-contain"
                  />
                </div>
              )}

              <div
                className={`relative max-w-[82%] sm:max-w-md rounded-2xl px-4 py-2.5 shadow-sm transition-all ${
                  isMe
                    ? "rounded-br-xs bg-gradient-to-r from-sky-100 to-sky-200 text-sky-950 dark:from-purple-900/80 dark:to-indigo-900/90 dark:text-white border border-sky-300/80 dark:border-purple-700/60 font-medium"
                    : "rounded-bl-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-pink-100/90 dark:border-slate-700 shadow-xs font-medium"
                }`}
              >
                {/* Reply To Preview Quote */}
                {msg.reply_to && (
                  <div className="mb-2 rounded-xl border-l-3 border-rose-400 bg-black/5 dark:bg-white/5 p-2 text-[11px] leading-tight text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-rose-500 block">
                      {msg.reply_to.sender_name}
                    </span>
                    <span className="truncate block opacity-85">
                      {msg.reply_to.text}
                    </span>
                  </div>
                )}

                {/* Dare Proof Tag */}
                {msg.type === "dare_proof" && (
                  <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                    <Sparkles className="h-3 w-3" />
                    <span>Bukti Tantangan Sweet Dare ✨</span>
                  </div>
                )}

                {/* CONTENT BY TYPE */}
                {/* 1. Text Message */}
                {msg.type === "text" && (
                  <div className="space-y-1">
                    {msg.text?.startsWith("!") && (
                      <span className="inline-block text-[9px] font-mono font-bold bg-pink-100 dark:bg-purple-950/80 text-pink-700 dark:text-pink-300 px-1.5 py-0.5 rounded-md mb-0.5">
                        🎵 Jockie Music Command
                      </span>
                    )}
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                  </div>
                )}

                {/* 2. Image Message (Regular or 3D Scratch-Card Polaroid) */}
                {(msg.type === "image" || msg.type === "dare_proof") &&
                  msg.media_url && (
                    <div className="space-y-1.5">
                      {msg.is_scratch_card ? (
                        <ScratchCardPolaroid
                          imageSrc={msg.media_url}
                          caption={msg.text || msg.file_name}
                          timestamp={formatMessageTime(msg.created_at)}
                        />
                      ) : (
                        <div
                          onClick={() => setActiveLightboxImg(msg.media_url || null)}
                          className="overflow-hidden rounded-xl border border-pink-100/70 dark:border-slate-700 cursor-pointer max-h-64"
                        >
                          <img
                            src={msg.media_url}
                            alt="Lampiran Foto"
                            className="w-full object-cover hover:scale-102 transition-transform duration-200"
                          />
                        </div>
                      )}
                      {!msg.is_scratch_card && msg.text && (
                        <p className="text-xs sm:text-sm leading-relaxed mt-1">
                          {msg.text}
                        </p>
                      )}
                    </div>
                  )}

                {/* 3. Audio Voice Note */}
                {msg.type === "audio" && msg.media_url && (
                  <div className="flex items-center gap-3 py-1 min-w-[180px]">
                    <button
                      type="button"
                      onClick={() => togglePlayAudio(msg.id, msg.media_url)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm hover:scale-105 transition-transform"
                    >
                      {playingAudioId === msg.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4 ml-0.5" />
                      )}
                    </button>

                    {/* Cute Animated Audio Waveform */}
                    <div className="flex flex-1 items-center gap-1 h-5">
                      {[14, 22, 10, 26, 18, 12, 24, 16, 20, 10].map((h, i) => (
                        <span
                          key={i}
                          className={`w-1 rounded-full transition-all ${
                            playingAudioId === msg.id
                              ? "bg-rose-500 animate-pulse"
                              : "bg-slate-300 dark:bg-slate-600"
                          }`}
                          style={{
                            height:
                              playingAudioId === msg.id
                                ? `${Math.max(6, (h * (i % 2 === 0 ? 1.2 : 0.8)))}px`
                                : `${h}px`,
                          }}
                        />
                      ))}
                    </div>

                    <span className="text-[10px] font-semibold opacity-75">
                      {msg.audio_duration ? `0:${msg.audio_duration.toString().padStart(2, "0")}` : "0:12"}
                    </span>
                  </div>
                )}

                {/* 4. Document File */}
                {msg.type === "file" && (
                  <a
                    href={msg.media_url}
                    download={msg.file_name}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 rounded-xl bg-black/5 dark:bg-white/5 p-2.5 hover:bg-black/10 transition-colors"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 dark:bg-purple-900/60 text-rose-500">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold leading-tight">
                        {msg.file_name || "Dokumen"}
                      </p>
                      <p className="text-[10px] opacity-70">
                        {formatFileSize(msg.file_size)}
                      </p>
                    </div>
                    <Download className="h-4 w-4 text-slate-400" />
                  </a>
                )}

                {/* 5. Location Card */}
                {msg.type === "location" && msg.location && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                      <MapPin className="h-4 w-4" />
                      <span>{msg.location.label || "Lokasi Kencan"}</span>
                    </div>

                    {/* OpenStreetMap Iframe Preview */}
                    <div className="h-36 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                      <iframe
                        title="Map Preview"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                          msg.location.lng - 0.005
                        }%2C${msg.location.lat - 0.005}%2C${
                          msg.location.lng + 0.005
                        }%2C${
                          msg.location.lat + 0.005
                        }&layer=mapnik&marker=${msg.location.lat}%2C${
                          msg.location.lng
                        }`}
                      />
                    </div>

                    <a
                      href={`https://www.google.com/maps?q=${msg.location.lat},${msg.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-rose-500 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-600 transition-colors"
                    >
                      <span>Buka di Google Maps</span>
                      <span>↗</span>
                    </a>
                  </div>
                )}

                {/* Bottom Metadata: Time & Double Checks */}
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-60">
                  <span>
                    {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isMe && (
                    <span>
                      {msg.is_read ? (
                        <CheckCheck className="h-3.5 w-3.5 text-rose-600 dark:text-pink-400 stroke-[2.5]" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </span>
                  )}
                </div>

                {/* Displayed Emoji Reactions */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="absolute -bottom-3 left-2 flex items-center gap-1 rounded-full bg-white dark:bg-slate-800 border border-pink-100 dark:border-slate-700 px-1.5 py-0.5 shadow-xs text-xs">
                    {Object.entries(msg.reactions).map(([emoji, roles]) => (
                      <span key={emoji} className="flex items-center gap-0.5">
                        <span>{emoji}</span>
                        {roles.length > 1 && (
                          <span className="text-[9px] font-bold text-slate-400">
                            {roles.length}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Hover/Touch Action Bar: Reply & Quick Reactions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 flex items-center gap-1 rounded-full bg-white/95 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 shadow-md z-10 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      playPop();
                      setReplyingTo({
                        id: msg.id,
                        sender_name: msg.sender_name,
                        text: msg.text || `[${msg.type}]`,
                      });
                    }}
                    className="p-1 text-slate-400 hover:text-rose-500"
                    title="Balas pesan"
                  >
                    <Reply className="h-3.5 w-3.5" />
                  </button>
                  {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        playPop();
                        onAddReaction(msg.id, emoji);
                      }}
                      className="hover:scale-125 transition-transform p-0.5"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* TYPING STATUS BAR */}
      {isPartnerTypingNow && (
        <div className="flex items-center gap-2 px-5 py-1.5 bg-white/90 dark:bg-slate-900 text-xs text-rose-500 font-medium">
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-bounce" />
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-bounce [animation-delay:0.2s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-bounce [animation-delay:0.4s]" />
          </span>
          <span>{partnerName} sedang mengetik...</span>
        </div>
      )}

      {/* REPLY BANNER (When Replying) */}
      {replyingTo && (
        <div className="flex items-center justify-between border-t border-pink-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/80 px-4 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-rose-500">
                Membalas {replyingTo.sender_name}
              </span>
              <p className="truncate text-slate-500 dark:text-slate-400">
                {replyingTo.text}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="rounded-full p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ATTACHMENT MENU DRAWER */}
      <AnimatePresence>
        {showAttachMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-18 left-4 z-30 grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-3xl border border-pink-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900 p-3 shadow-xl"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 dark:bg-purple-900/60 text-rose-500">
                <ImageIcon className="h-5 w-5" />
              </span>
              <span>Kirim Foto</span>
            </button>

            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-600">
                <FileText className="h-5 w-5" />
              </span>
              <span>Dokumen File</span>
            </button>

            <button
              type="button"
              onClick={handleShareLocation}
              className="flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600">
                <MapPin className="h-5 w-5" />
              </span>
              <span>Bagi Lokasi</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAttachMenu(false);
                startVoiceRecording();
              }}
              className="flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600">
                <Mic className="h-5 w-5" />
              </span>
              <span>Pesan Suara</span>
            </button>

            {/* Scratch Card Option Toggle */}
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-pink-50 dark:border-slate-800 flex items-center justify-between px-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-pink-600 dark:text-pink-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendAsScratchCard}
                  onChange={(e) => setSendAsScratchCard(e.target.checked)}
                  className="rounded border-pink-300 text-pink-500 focus:ring-pink-400"
                />
                <span>Kirim foto sebagai Scratch Card (Kartu Gosok) 🪙</span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM INPUT / RECORDING BAR */}
      <div className="border-t border-pink-100/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-3.5">
        {isRecording ? (
          /* Live Voice Recording Bar */
          <div className="flex items-center justify-between rounded-full bg-rose-50 dark:bg-slate-800 border border-rose-200 dark:border-rose-900 px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                Merekam Suara: 0:{recordingSeconds.toString().padStart(2, "0")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="rounded-full px-3 py-1 text-xs font-semibold text-slate-500 hover:text-rose-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-600"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Kirim</span>
              </button>
            </div>
          </div>
        ) : (
          /* Standard Text Input Bar with Jockie Music Bot Shortcuts */
          <div className="space-y-1.5">
            {inputText.startsWith("!") && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
                <span className="font-bold text-pink-600 dark:text-pink-300 shrink-0">
                  Bot Commands:
                </span>
                <button
                  type="button"
                  onClick={() => setInputText("!play ")}
                  className="rounded-full bg-pink-100 dark:bg-purple-950 px-2 py-0.5 font-mono font-semibold text-pink-700 dark:text-pink-300 hover:bg-pink-200"
                >
                  !play &lt;url&gt;
                </button>
                <button
                  type="button"
                  onClick={() => setInputText("!stop")}
                  className="rounded-full bg-rose-100 dark:bg-rose-950 px-2 py-0.5 font-mono font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-200"
                >
                  !stop
                </button>
                <button
                  type="button"
                  onClick={() => setInputText("!pause")}
                  className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  !pause
                </button>
                <button
                  type="button"
                  onClick={() => setInputText("!resume")}
                  className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  !resume
                </button>
                <button
                  type="button"
                  onClick={() => setInputText("!sync")}
                  className="rounded-full bg-sky-100 dark:bg-sky-950 px-2 py-0.5 font-mono text-sky-700 dark:text-sky-300 hover:bg-sky-200"
                >
                  !sync
                </button>
                <button
                  type="button"
                  onClick={() => setInputText("!skip")}
                  className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  !skip
                </button>
              </div>
            )}

            <form
              onSubmit={handleSendText}
              className="flex items-center gap-2"
            >
            {/* Plus / Attach Button */}
            <button
              type="button"
              onClick={() => {
                playPop();
                setShowAttachMenu(!showAttachMenu);
              }}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform ${
                showAttachMenu
                  ? "bg-rose-500 text-white rotate-45"
                  : "bg-[#F8FAFC] dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-pink-50"
              }`}
              title="Lampirkan foto, berkas, suara, atau lokasi"
            >
              <Plus className="h-5 w-5" />
            </button>

            {/* Input Field */}
            <input
              type="text"
              value={inputText}
              onChange={handleTextChange}
              placeholder={`Ketik pesan manis untuk ${partnerName}... ☁️`}
              className="flex-1 rounded-full border border-pink-100 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 px-4 py-2.5 text-xs sm:text-sm text-[#1E293B] dark:text-white placeholder:text-slate-400 focus:border-pink-300 dark:focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
            />

            {/* Send or Record Voice Button */}
            {inputText.trim() ? (
              <button
                type="submit"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 text-white shadow-sm hover:scale-105 transition-transform cursor-pointer"
                title="Kirim pesan"
              >
                <Send className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startVoiceRecording}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm hover:scale-105 transition-transform"
                title="Tahan untuk rekam pesan suara"
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
            </form>
          </div>
        )}
      </div>

      {/* FULL-SCREEN IMAGE LIGHTBOX MODAL */}
      <AnimatePresence>
        {activeLightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveLightboxImg(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          >
            <button
              type="button"
              onClick={() => setActiveLightboxImg(null)}
              className="absolute top-5 right-5 z-20 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
            >
              <X className="h-6 w-6" />
            </button>

            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={activeLightboxImg}
              alt="Pratinjau Foto"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
