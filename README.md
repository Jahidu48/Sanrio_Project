# Cinnamelo — Minimalist Romantic Sanrio Couples PWA ☁️🎀💜

A responsive, mobile-first Progressive Web App (PWA) for couples built with **Next.js (App Router)**, **Tailwind CSS**, **Framer Motion**, **Lucide React**, **Supabase Realtime**, and **Google Gemini API (`@google/genai`)**.

## ✨ Core Features

1. **Animated Sanrio Character System (`src/components/characters/`)**
   - **Cinnamoroll (`CinnamorollCharacter.tsx`)**: Gentle continuous floating (`y: [0, -8, 0]`), joyful ear-flap bounce on tap, and floating pastel hearts.
   - **My Melody (`MyMelodyCharacter.tsx`)**: Subtle breathing scale (`1 -> 1.04 -> 1`), shy head-tilt rotation (`-3deg <-> 3deg`), and sealed love envelope variant.
   - **Kuromi (`KuromiCharacter.tsx`)**: Playful bounce, cheeky wink, and purple skull/heart sparkles upon completing actions.
   - **Easy Asset Swap (`SanrioCharacterSlot.tsx`)**: Built-in crisp custom SVGs out of the box, or pass `imageSrc="/characters/..."` to use transparent PNG/GIF/WebP files.

2. **Tab 1 — Home: Heartbeat Ripple & Secret Envelope (`src/components/home/`)**
   - **Cinnamoroll Presence Orb**: Tap Cinnamoroll to broadcast a real-time multi-layered pastel pink (`#FECDD3`) and sky-blue (`#BAE6FD`) ripple wave + toast *"Pasanganmu sedang memikirkanmu ☁️💖"* to both screens via Supabase Realtime (`channel: 'couple-room'`).
   - **Simultaneous Online Presence**: When both partners are active simultaneously, Cinnamoroll and My Melody appear side-by-side holding a glowing red heart.
   - **Time-Locked Daily Prompts**: Partner's card remains blurred (`backdrop-blur-md`) with a wiggling padlock until **both** partners submit answers in `daily_qna`, triggering a celebratory confetti unlock!

3. **Tab 2 — Co-op Canvas (`src/components/canvas/CoopCanvasTab.tsx`)**
   - Excalidraw-inspired dotted whiteboard with two-way real-time brush strokes, live partner cursor, eraser, PNG export, and animated Sanrio mini-stickers (Hearts, Stars, Cinnamoroll Clouds, My Melody Ribbons, Kuromi Sparkles).

4. **Tab 3 — AI Memory Journal (`src/components/journal/JournalArchiveTab.tsx` & `src/app/api/generate-journal/route.ts`)**
   - Obsidian-inspired clean Markdown archive with Kuromi & My Melody perched on top of the header swinging their legs reactively on scroll.
   - *"Rangkum Memori Minggu Ini ✨"* calls `/api/generate-journal`, querying unlocked `daily_qna` answers and generating a poetic Markdown summary with Sanrio section dividers via **Gemini (`gemini-3.8-flash`)**.

---

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

*(Note: Even before setting `.env.local`, the app includes a zero-config local `BroadcastChannel` + `localStorage` fallback so you can open two tabs side-by-side as Partner A & Partner B and test every real-time two-way feature immediately!)*

### 3. Initialize Supabase Database & Realtime
Open your **Supabase SQL Editor** and execute [`supabase/schema.sql`](./supabase/schema.sql) to create `daily_qna`, `weekly_journals`, RLS policies, and Realtime publication.

### 4. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in two browser windows (select **Awan** in Window 1 and **Melodi** in Window 2 in the top-right switcher) to experience live two-way sync!
