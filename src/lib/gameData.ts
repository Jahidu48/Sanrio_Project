import type {
  BucketCategory,
  BucketItem,
  ChatMessage,
  CoupleGamesState,
  NoteMood,
  SharedNote,
} from "./types";

export interface TelepathyQuestion {
  prompt: string;
  optionA: string;
  emojiA: string;
  optionB: string;
  emojiB: string;
}

export const TELEPATHY_QUESTIONS: TelepathyQuestion[] = [
  {
    prompt: "Kalau malam ini kita bebas pergi berdua, pilih suasana mana?",
    optionA: "Nonton film sambil selimutan",
    emojiA: "🍿",
    optionB: "Jalan malam cari jajanan hangat",
    emojiB: "🍢",
  },
  {
    prompt: "Minuman manis buat nemenin ngobrol sore kita?",
    optionA: "Matcha dingin",
    emojiA: "🍵",
    optionB: "Cokelat dingin / kopi susu",
    emojiB: "🍫",
  },
  {
    prompt: "Liburan berdua yang paling bikin kangen?",
    optionA: "Penginapan sejuk di pegunungan",
    emojiA: "🏔️",
    optionB: "Pantai tenang lihat matahari terbenam",
    emojiB: "🏖️",
  },
  {
    prompt: "Perhatian yang paling bikin tenang hari ini?",
    optionA: "Pelukan hangat tanpa banyak kata",
    emojiA: "🫂",
    optionB: "Ngobrol panjang cerita semua hal",
    emojiB: "💬",
  },
  {
    prompt: "Kalau kita pelihara hewan lucu bareng, pilih apa?",
    optionA: "Kucing gembul manja",
    emojiA: "🐱",
    optionB: "Anjing putih mirip Cinnamoroll",
    emojiB: "🐶",
  },
  {
    prompt: "Menu makan malam favorit kalau lagi lapar bareng?",
    optionA: "Mie kuah hangat",
    emojiA: "🍜",
    optionB: "Bakar-bakaran berdua",
    emojiB: "🥩",
  },
  {
    prompt: "Waktu favorit buat ngabisin waktu berdua?",
    optionA: "Pagi cerah sambil sarapan santai",
    emojiA: "☀️",
    optionB: "Malam tenang sebelum tidur",
    emojiB: "🌙",
  },
  {
    prompt: "Makanan penutup kencan kita?",
    optionA: "Es krim stroberi & vanila",
    emojiA: "🍦",
    optionB: "Kue manis / panekuk lembut",
    emojiB: "🥞",
  },
];

export interface DoodleWordItem {
  word: string;
  category: string;
}

export const DOODLE_WORDS: DoodleWordItem[] = [
  { word: "ES KRIM", category: "Makanan Manis" },
  { word: "KUCING TIDUR", category: "Hewan Lucu" },
  { word: "PAYUNG HUJAN", category: "Suasana" },
  { word: "BUNGA MAWAR", category: "Hadiah" },
  { word: "CINNAMOROLL", category: "Karakter Sanrio" },
  { word: "NONTON FILM", category: "Kencan" },
  { word: "PIZZA HANGAT", category: "Makanan" },
  { word: "PANTAI SORE", category: "Liburan" },
  { word: "SURAT CINTA", category: "Romantis" },
  { word: "BINTANG JATUH", category: "Langit Malam" },
  { word: "KOPI SUSU", category: "Minuman" },
  { word: "CINCIN", category: "Benda Spesial" },
];

export const TRUTH_PROMPTS: string[] = [
  "Apa kesan pertamamu waktu pertama kali kita dekat yang belum pernah kamu ceritakan detail?",
  "Momen sederhana apa bareng aku yang paling sering tiba-tiba terputar ulang di kepalamu?",
  "Hal konyol apa dariku yang sebenarnya diam-diam paling kamu sukai?",
  "Kapan terakhir kali kamu merasa sangat bersyukur punya aku?",
  "Satu tempat yang pengen banget kamu datangi bareng aku tahun ini?",
  "Kalau hari ini kamu boleh minta satu perhatian kecil dariku, kamu pengen apa?",
  "Lagu apa yang setiap kali terdengar langsung mengingatkanmu sama aku?",
];

export const SWEET_DARE_PROMPTS: string[] = [
  "Kirim pesan suara (atau bilang langsung sekarang) 3 hal yang paling kamu suka dari senyum pasanganmu!",
  "Gambarkan wajah pasanganmu versi paling lucu di Papan Gambar dalam waktu 30 detik!",
  "Kasih nama panggilan baru yang menggemaskan buat pasanganmu untuk dipakai seharian ini!",
  "Kirim foto senyum terbaikmu sekarang di Obrolan sambil tulis satu kalimat sayang!",
  "Tulis satu rencana kencan minggu ini ke dalam Daftar Impian di Jurnal Kita!",
  "Ceritakan 1 kenangan favorit kita dengan gaya mendongeng sebelum tidur!",
];

export const MOOD_META: Record<
  NoteMood,
  { label: string; emoji: string; badgeClass: string; cardBorder: string }
> = {
  cloud: {
    label: "Tenang",
    emoji: "☁️",
    badgeClass: "bg-[#BAE6FD]/50 text-sky-800 dark:bg-sky-950/70 dark:text-sky-200",
    cardBorder: "border-sky-200 dark:border-sky-900",
  },
  romance: {
    label: "Sayang",
    emoji: "🎀",
    badgeClass: "bg-[#FECDD3]/55 text-rose-700 dark:bg-rose-950/70 dark:text-pink-200",
    cardBorder: "border-[#F3D8DF] dark:border-rose-900",
  },
  playful: {
    label: "Seru & Lucu",
    emoji: "🌸",
    badgeClass: "bg-pink-100 text-pink-800 dark:bg-[#3B2E40] dark:text-pink-200",
    cardBorder: "border-pink-200 dark:border-[#4E3B4D]",
  },
  datenight: {
    label: "Kencan",
    emoji: "🍰",
    badgeClass: "bg-amber-100/80 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200",
    cardBorder: "border-amber-200 dark:border-amber-900",
  },
  dream: {
    label: "Rencana Kita",
    emoji: "🌱",
    badgeClass: "bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200",
    cardBorder: "border-emerald-200 dark:border-emerald-900",
  },
};

export const BUCKET_CATEGORY_META: Record<
  BucketCategory,
  { label: string; emoji: string; pillClass: string }
> = {
  date: {
    label: "Ide Kencan",
    emoji: "🎀",
    pillClass: "bg-[#FECDD3]/55 text-rose-700 dark:bg-rose-950/70 dark:text-pink-200",
  },
  food: {
    label: "Kuliner",
    emoji: "🍰",
    pillClass: "bg-amber-100/80 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200",
  },
  travel: {
    label: "Jalan-jalan",
    emoji: "☁️",
    pillClass: "bg-[#BAE6FD]/50 text-sky-800 dark:bg-sky-950/70 dark:text-sky-200",
  },
  dream: {
    label: "Impian Berdua",
    emoji: "🌸",
    pillClass: "bg-pink-100 text-pink-800 dark:bg-[#3B2E40] dark:text-pink-200",
  },
};

export function createInitialGamesState(): CoupleGamesState {
  return {
    activeGame: "telepathy",
    telepathy: {
      round: 1,
      questionIndex: 0,
      choiceA: null,
      choiceB: null,
      matchedCount: 0,
      totalCompleted: 0,
    },
    tictac: {
      board: Array(9).fill(null),
      currentTurn: "user_a",
      rewardText: "Yang menang ditraktir es krim / matcha!",
      winner: null,
      winningLine: null,
      scoreA: 0,
      scoreB: 0,
    },
    doodle: {
      round: 1,
      drawer: "user_a",
      wordIndex: 0,
      guesses: [],
      isSolved: false,
      teamScore: 0,
    },
    truthdare: {
      mode: "auto",
      filter: "mix",
      currentTurn: "user_a",
      cardType: "truth",
      promptText: TRUTH_PROMPTS[0],
      isFlipped: false,
      reaction: null,
      cardCount: 1,
      customPool: [],
      directChallenge: null,
    },
  };
}

export function getSeedSharedNotes(
  _roomId: string,
  _userAName: string,
  _userBName: string
): SharedNote[] {
  return [];
}

export function getSeedBucketItems(
  _roomId: string,
  _userAName: string,
  _userBName: string
): BucketItem[] {
  return [];
}

export function getSeedChatMessages(
  _roomId: string,
  _userAName: string,
  _userBName: string
): ChatMessage[] {
  return [];
}
