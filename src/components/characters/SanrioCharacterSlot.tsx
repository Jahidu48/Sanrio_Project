"use client";

import React from "react";

export interface SanrioCharacterSlotProps {
  /**
   * Optional path or URL to a transparent PNG, GIF, or WebP character file
   * (e.g. "/characters/cinnamoroll.png"). If omitted, renders the built-in custom SVG.
   */
  imageSrc?: string;
  alt: string;
  size?: number;
  className?: string;
  children: React.ReactNode;
}

export function SanrioCharacterSlot({
  imageSrc,
  alt,
  size = 140,
  className = "",
  children,
}: SanrioCharacterSlotProps) {
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={alt}
        width={size}
        height={size}
        draggable={false}
        className={`select-none object-contain pointer-events-none ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`select-none flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}
