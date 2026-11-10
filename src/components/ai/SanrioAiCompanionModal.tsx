"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ChevronDown,
  MessageSquareShare,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { getSanrioCharacter } from "@/lib/sanrioCharacters";
import { useAudio } from "@/context/AudioContext";
import type {
  AiChatMessage,
  AppTab,
  CoupleProfile,
  SanrioMascotId,
} from "@/lib/types";

export interface SanrioAiCompanionModalProps {
  profile: CoupleProfile;
  activeTab?: AppTab;
  onForwardToCoupleChat?: (text: string) => void;
}

const MASCOTS: Array<{
  id: SanrioMascotId;
  name: string;
  title: string;
  avatarSvg: string;
  badgeClass: string;
  borderClass: string;
}> = [
  {
    id: "cinnamoroll",
    name: "Cinnamoroll",
    title: "Sahabat Awan Lembut ☁️",
    avatarSvg: "/characters/cinnamoroll.svg",
    badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300",
    borderClass: "border-sky-200 dark:border-sky-800",
  },
  {
    id: "kuromi",
    name: "Kuromi",
    title: "Tsundere Bestie 😈",
    avatarSvg: "/characters/kuromi.svg",
    badgeClass:
      "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300",
    borderClass: "border-purple-200 dark:border-purple-800",
  },
  {
    id: "my-melody",
    name: "My Melody",
    title: "Putri Bunga Manis 🎀",
    avatarSvg: "/characters/my-melody.svg",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300",
    borderClass: "border-pink-200 dark:border-pink-800",
  },
];

const SUGGESTIONS = [
  "Beri ide kencan manis & hemat akhir pekan ini 🎀",
  "Tuliskan puisi cinta pendek yang bikin pasangan tersenyum 💌",
  "Bikin tantangan Truth or Dare lucu buat kami berdua 🎲",
  "Tengahi debat kami: siapa yang lebih sering kangen duluan? ☁️",
];

export function SanrioAiCompanionModal({
  profile,
  activeTab = "home",
  onForwardToCoupleChat,
}: SanrioAiCompanionModalProps) {
  const { playPop, playChime } = useAudio();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpenEvent = () => setIsOpen(true);
    window.addEventListener("open-sanrio-ai", handleOpenEvent);
    return () => window.removeEventListener("open-sanrio-ai", handleOpenEvent);
  }, []);
  const [activeMascotId, setActiveMascotId] =
    useState<SanrioMascotId>("cinnamoroll");
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [forwardedId, setForwardedId] = useState<string | null>(null);

  const [chatLog, setChatLog] = useState<AiChatMessage[]>([
    {
      id: "ai-welcome",
      sender: "mascot",
      mascotId: "cinnamoroll",
      text: `Halo ${profile.userAName} & ${profile.userBName}! ☁️ Cinnamoroll siap menemani kalian. Mau ide kencan, bantuan bikin puisi cinta, atau tanya apa saja hari ini? 💖`,
      timestamp: Date.now(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatLog, isOpen]);

  const currentMascot =
    MASCOTS.find((m) => m.id === activeMascotId) || MASCOTS[0];

  const handleSelectMascot = (id: SanrioMascotId) => {
    playPop();
    setActiveMascotId(id);
    const m = MASCOTS.find((x) => x.id === id);
    const greeting =
      id === "cinnamoroll"
        ? `Halo lagi! ☁️ Cinnamoroll siap bantu kalian berdua hari ini yaa!`
        : id === "kuromi"
        ? `Hmph! Kuromi is here! 😈 Mau tantangan seru apa nih buat ${profile.userBName}?`
        : `Senang bertemu denganmu! 🎀 My Melody ada di sini untuk mendengarkan kalian 🌸`;

    setChatLog((prev) => [
      ...prev,
      {
        id: `m-sw-${Date.now()}`,
        sender: "mascot",
        mascotId: id,
        text: greeting,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputText).trim();
    if (!promptToSend || isLoading) return;

    playPop();
    setInputText("");

    const userMsg: AiChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      mascotId: activeMascotId,
      text: promptToSend,
      timestamp: Date.now(),
    };

    setChatLog((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/sanrio-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          mascotId: activeMascotId,
          userAName: profile.userAName,
          userBName: profile.userBName,
        }),
      });

      const data = await res.json();
      const replyText =
        data.reply || "Awan lembut mengirim pelukan manis untuk kalian berdua! ☁️💖";

      playChime();
      setChatLog((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "mascot",
          mascotId: activeMascotId,
          text: replyText,
          timestamp: Date.now(),
        },
      ]);
    } catch {
      setChatLog((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: "mascot",
          mascotId: activeMascotId,
          text: "Waduh, koneksi awan sedikit terputus. Tapi ingat, kalian berdua tetap yang paling kompak yaa! ☁️💖",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForwardToChat = (msg: AiChatMessage) => {
    playPop();
    if (onForwardToCoupleChat) {
      onForwardToCoupleChat(
        `💬 *Pesan dari ${currentMascot.name} AI:*\n\n${msg.text}`
      );
      setForwardedId(msg.id);
      setTimeout(() => setForwardedId(null), 2000);
    }
  };

  return (
    <>
      {/* FLOATING LAUNCHER BUTTON (Placed on bottom-left & hidden on Chat tab to prevent overlapping Send button or Jockie Music Bot) */}
      {activeTab !== "chat" && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            playPop();
            setIsOpen(true);
          }}
          className="fixed bottom-20 left-4 lg:bottom-6 lg:left-6 z-30 flex items-center gap-2 rounded-full bg-white/95 dark:bg-slate-900 border-2 border-pink-200 dark:border-purple-600 p-1.5 sm:p-2 shadow-xl hover:shadow-2xl transition-all cursor-pointer"
          title="Sanrio AI Mascot Companion"
        >
          <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#BAE6FD] via-[#FECDD3] to-[#E9D5FF] p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-slate-800">
              <img
                src={currentMascot.avatarSvg}
                alt=""
                className="h-6 w-6 sm:h-7 sm:w-7 object-contain"
              />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] text-white">
              <Sparkles className="h-2 w-2" />
            </span>
          </div>
          <span className="hidden sm:inline-block pr-2 text-xs font-bold text-[#1E293B] dark:text-white">
            Sanrio AI ✨
          </span>
        </motion.button>
      )}

      {/* EXPANDABLE AI MODAL / DRAWER */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex h-[82dvh] w-[94vw] max-w-md flex-col overflow-hidden rounded-[32px] border border-pink-200/80 dark:border-purple-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl"
          >
            {/* Header with Mascot Switcher Tabs */}
            <div className="border-b border-pink-100 dark:border-slate-800 bg-gradient-to-r from-pink-50/50 via-white to-sky-50/50 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-pink-100 dark:bg-purple-950 text-rose-500">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#1E293B] dark:text-white">
                      Sanrio AI Companion
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Didukung Gemini 3.8 Flash • Teman manis kalian berdua
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 3 Selectable Mascot Tabs */}
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800 p-1">
                {MASCOTS.map((m) => {
                  const isSelected = activeMascotId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectMascot(m.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 px-2 text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs scale-102"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                      }`}
                    >
                      <img
                        src={m.avatarSvg}
                        alt=""
                        className="h-4 w-4 object-contain"
                      />
                      <span className="truncate">{m.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 sanrio-dotted-grid dark:bg-slate-950">
              {chatLog.map((msg) => {
                const isUser = msg.sender === "user";
                const mascot =
                  MASCOTS.find((m) => m.id === msg.mascotId) || currentMascot;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isUser && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-pink-100 dark:border-slate-700 shadow-xs mb-1">
                        <img
                          src={mascot.avatarSvg}
                          alt=""
                          className="h-5 w-5 object-contain"
                        />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                        isUser
                          ? "bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 text-white rounded-br-xs"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-pink-100 dark:border-slate-700 rounded-bl-xs space-y-2"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Forward to couple chat button */}
                      {!isUser && onForwardToCoupleChat && (
                        <div className="pt-1 flex justify-end border-t border-slate-100 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleForwardToChat(msg)}
                            className="inline-flex items-center gap-1 rounded-full bg-pink-50 dark:bg-purple-950/60 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-pink-300 hover:bg-pink-100 transition-colors"
                          >
                            <MessageSquareShare className="h-3 w-3" />
                            <span>
                              {forwardedId === msg.id
                                ? "Terkirim ke Chat! ✨"
                                : "Kirim ke Chat Kita ↗"}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                  <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
                  <span>{currentMascot.name} sedang memikirkan kata manis...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="border-t border-pink-100/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 px-3 py-2 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(s)}
                  className="shrink-0 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:border-pink-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 border-t border-pink-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Tanya ${currentMascot.name} apa saja... ☁️`}
                className="flex-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs text-[#1E293B] dark:text-white placeholder:text-slate-400 focus:border-pink-300 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs hover:bg-rose-600 disabled:opacity-40 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
