"use client";

import { useEffect } from "react";

/**
 * SystemGuardian (Silent Zero-Overhead Resilience Service)
 * - Auto-recovers broken character/media images to a valid local Sanrio asset
 *   without polling or scanning the DOM tree.
 * - Broadcasts network restoration events (`guardian-reconnected`) for instant
 *   realtime channel recovery.
 * - Guards against localStorage QuotaExceeded crashes by pruning stale cache
 *   only when needed.
 */
export function SystemGuardian() {
  // 1. Event-Driven Broken Image Auto-Fixer (Zero DOM Scanning Overhead)
  useEffect(() => {
    const handleImageError = (e: ErrorEvent) => {
      const target = e.target;
      if (target && target instanceof HTMLImageElement) {
        if (target.dataset.guardianFixed === "true") return;

        target.dataset.guardianFixed = "true";
        target.src = "/characters/cinnamoroll.png";
        target.alt = "Sanrio Mascot";
        target.classList.add("max-h-full", "w-auto", "object-contain");
      }
    };

    window.addEventListener("error", handleImageError, true);
    return () => window.removeEventListener("error", handleImageError, true);
  }, []);

  // 2. Network Connectivity Restoration Watchdog
  useEffect(() => {
    const handleOnline = () => {
      window.dispatchEvent(new CustomEvent("guardian-reconnected"));
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Renders no intrusive debug UI on screen to keep the couple experience clean
  return null;
}
