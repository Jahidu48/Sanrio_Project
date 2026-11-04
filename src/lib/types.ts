import type { SanrioCharacterId } from "./sanrioCharacters";

export type PartnerRole = "user_a" | "user_b";

export type AppTab = "home" | "chat" | "playground" | "canvas" | "play" | "journal";

export interface CoupleProfile {
  role: PartnerRole;
  userAName: string;
  userBName: string;
  roomId: string;
  userACharacter?: SanrioCharacterId;
  userBCharacter?: SanrioCharacterId;
}

export interface DailyQnA {
  id: string;
  room_id: string;
  prompt_date: string;
  question: string;
  user_a_name: string;
  user_b_name: string;
  user_a_answer: string | null;
  user_b_answer: string | null;
  user_a_answered_at: string | null;
  user_b_answered_at: string | null;
  is_unlocked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HeartbeatEvent {
  id: string;
  senderRole: PartnerRole;
  senderName: string;
  timestamp: number;
}

export interface StrokeSegment {
  id: string;
  strokeId: string;
  /** Normalized 0..1 coordinates so mobile & desktop screens align accurately */
  prevX: number;
  prevY: number;
  x: number;
  y: number;
  color: string;
  strokeWidth: number;
  isEraser: boolean;
  senderRole: PartnerRole;
}

export type StampKind =
  | "heart"
  | "star"
  | "cloud"
  | "ribbon"
  | "kuromi"
  | SanrioCharacterId;

export interface CanvasStamp {
  id: string;
  kind: StampKind;
  /** Normalized 0..1 coordinates */
  x: number;
  y: number;
  rotation: number;
  senderRole: PartnerRole;
  createdAt: number;
}

export interface PartnerCursor {
  role: PartnerRole;
  name: string;
  x: number;
  y: number;
  color: string;
  updatedAt: number;
}

// ============================================================================
// FULL-FEATURED COUPLE MESSENGER & WEBRTC CALL TYPES
// ============================================================================

export type ChatMessageType =
  | "text"
  | "image"
  | "audio"
  | "file"
  | "location"
  | "call_event"
  | "dare_proof";

export interface ChatMessageLocation {
  lat: number;
  lng: number;
  label?: string;
}

export interface ChatMessageReplyTo {
  id: string;
  sender_name: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_role: PartnerRole;
  sender_name: string;
  sender_character?: SanrioCharacterId;
  type: ChatMessageType;
  text?: string;
  media_url?: string;
  file_name?: string;
  file_size?: number;
  audio_duration?: number;
  location?: ChatMessageLocation;
  reply_to?: ChatMessageReplyTo;
  reactions?: Record<string, PartnerRole[]>; // emoji -> array of roles
  is_read: boolean;
  is_scratch_card?: boolean;
  created_at: string;
}

export interface ChatTypingStatus {
  role: PartnerRole;
  name: string;
  timestamp: number;
}

export type WebRTCCallType = "audio" | "video";

export interface WebRTCSignalMessage {
  id: string;
  room_id: string;
  type: "call-offer" | "call-answer" | "call-ice" | "call-reject" | "call-end";
  caller_role: PartnerRole;
  caller_name: string;
  call_type: WebRTCCallType;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  timestamp: number;
}

// ============================================================================
// SHARED 2-WAY SYNCHRONIZED MUSIC PLAYER TYPES
// ============================================================================

export type MusicSourceType = "file" | "youtube" | "spotify" | "soundcloud" | "custom_url";

export interface SharedPlaylistItem {
  id: string;
  room_id: string;
  title: string;
  artist?: string;
  source: MusicSourceType;
  url: string;
  cover_url?: string;
  added_by: string;
  created_at: string;
}

export interface MusicSyncEvent {
  type: "music-sync";
  action: "play" | "pause" | "seek" | "switch" | "heartbeat";
  trackIndex: number;
  currentTime: number;
  senderRole: PartnerRole;
  senderName: string;
  timestamp: number;
}

export interface MusicRoomState {
  videoId: string;
  url: string;
  title: string;
  isPlaying: boolean;
  startedAtServerTime: number;
  pausedAtSeconds: number;
  updatedBy: string;
}

// ============================================================================
// REALTIME SANRIO MOOD & PRESENCE STATUS
// ============================================================================

export interface PartnerMoodStatus {
  role: PartnerRole;
  characterId: SanrioCharacterId;
  statusText: string;
  emoji: string;
  updatedAt: number;
}

// ============================================================================
// SHARED COLLABORATIVE JOURNAL & BUCKET LIST TYPES
// ============================================================================

export type NoteMood = "cloud" | "romance" | "playful" | "datenight" | "dream";

export interface SharedNote {
  id: string;
  room_id: string;
  title: string;
  content: string;
  mood: NoteMood;
  is_pinned: boolean;
  last_edited_by: string;
  updated_at: string;
  created_at: string;
}

export type BucketCategory = "date" | "food" | "travel" | "dream";

export interface BucketItem {
  id: string;
  room_id: string;
  title: string;
  category: BucketCategory;
  is_completed: boolean;
  completed_by: string | null;
  created_by: string;
  created_at: string;
}

export interface NoteTypingStatus {
  noteId: string;
  role: PartnerRole;
  name: string;
  timestamp: number;
}

// ============================================================================
// 2-PLAYER REALTIME COUPLE GAMES TYPES
// ============================================================================

export type ActiveGameId = "telepathy" | "tictac" | "doodle" | "truthdare";

export interface TelepathyState {
  round: number;
  questionIndex: number;
  choiceA: "A" | "B" | null;
  choiceB: "A" | "B" | null;
  matchedCount: number;
  totalCompleted: number;
}

export interface TicTacState {
  board: Array<PartnerRole | null>;
  currentTurn: PartnerRole;
  rewardText: string;
  winner: PartnerRole | "draw" | null;
  winningLine: number[] | null;
  scoreA: number;
  scoreB: number;
}

export interface DoodleGuessEntry {
  id: string;
  senderRole: PartnerRole;
  senderName: string;
  text: string;
  isCorrect: boolean;
}

export interface DoodleGameState {
  round: number;
  drawer: PartnerRole;
  wordIndex: number;
  guesses: DoodleGuessEntry[];
  isSolved: boolean;
  teamScore: number;
}

export interface CustomDareChallenge {
  id: string;
  creatorRole: PartnerRole;
  creatorName: string;
  type: "truth" | "dare";
  text: string;
  createdAt: number;
}

export interface DirectDareChallenge {
  id: string;
  senderRole: PartnerRole;
  senderName: string;
  type: "truth" | "dare";
  text: string;
  receivedAt: number;
}

export interface TruthDareState {
  mode: "auto" | "custom";
  filter: "mix" | "truth" | "dare";
  currentTurn: PartnerRole;
  cardType: "truth" | "dare";
  promptText: string;
  isFlipped: boolean;
  reaction: string | null;
  cardCount: number;
  customPool: CustomDareChallenge[];
  directChallenge: DirectDareChallenge | null;
}

export interface CoupleGamesState {
  activeGame: ActiveGameId;
  telepathy: TelepathyState;
  tictac: TicTacState;
  doodle: DoodleGameState;
  truthdare: TruthDareState;
}

// ============================================================================
// SANRIO AI MASCOT COMPANION TYPES
// ============================================================================

export type SanrioMascotId = "cinnamoroll" | "kuromi" | "my-melody";

export interface AiChatMessage {
  id: string;
  sender: "user" | "mascot";
  mascotId: SanrioMascotId;
  text: string;
  timestamp: number;
}
