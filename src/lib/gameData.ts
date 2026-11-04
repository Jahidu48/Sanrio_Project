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
    optionA: "Iced Matcha Latte Creamy",
    emojiA: "🍵",
    optionB: "Coklat Dingin / Kopi Susu",
    emojiB: "🍫",
  },
  {
    prompt: "Liburan impian berdua yang paling bikin kangen?",
    optionA: "Villa dingin di pegunungan berkabut",
    emojiA: "🏔️",
    optionB: "Pantai tenang lihat sunset pink-biru",
    emojiB: "🏖️",
  },
  {
    prompt: "Bahasa cinta yang paling bikin hati meleleh hari ini?",
    optionA: "Pelukan lama tanpa banyak kata",
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
    optionA: "Ramen / Kuah pedas hangat",
    emojiA: "🍜",
    optionB: "BBQ / Grill bakar-bakaran berdua",
    emojiB: "🥩",
  },
  {
    prompt: "Waktu favorit buat ngabisin waktu berdua?",
    optionA: "Pagi cerah sambil sarapan santai",
    emojiA: "☀️",
    optionB: "Tengah malam tenang sebelum tidur",
    emojiB: "🌙",
  },
  {
    prompt: "Dessert penutup kencan kita?",
    optionA: "Es Krim Stroberi & Vanila",
    emojiA: "🍦",
    optionB: "Kue Manis / Pancakes Lembut",
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
  { word: "PAYUNG HUJAN", category: "Suasana Romantis" },
  { word: "BUNGA MAWAR", category: "Hadiah Manis" },
  { word: "CINNAMOROLL", category: "Karakter Sanrio" },
  { word: "NONTON FILM", category: "Aktivitas Kencan" },
  { word: "PIZZA HANGAT", category: "Makanan Favorit" },
  { word: "PANTAI SORE", category: "Tempat Liburan" },
  { word: "SURAT CINTA", category: "Benda Romantis" },
  { word: "BINTANG JATUH", category: "Langit Malam" },
  { word: "KOPI SUSU", category: "Minuman" },
  { word: "CINCIN", category: "Benda Spesial" },
];

export const TRUTH_PROMPTS: string[] = [
  "Apa kesan pertamamu waktu pertama kali kita dekat yang belum pernah kamu ceritakan detail?",
  "Momen sederhana apa bareng aku yang paling sering tiba-tiba terputar ulang di kepalamu?",
  "Hal konyol apa dariku yang sebenarnya diam-diam paling kamu sukai?",
  "Kapan terakhir kali kamu merasa sangat bangga atau bersyukur punya aku?",
  "Satu tempat kencan impian yang pengen banget kamu datangi bareng aku tahun ini?",
  "Kalau hari ini kamu boleh minta satu perhatian spesifik dariku, kamu pengen apa?",
  "Lagu apa yang setiap kali terdengar langsung mengingatkanmu sama aku?",
];

export const SWEET_DARE_PROMPTS: string[] = [
  "Kirim pesan suara (atau bilang langsung sekarang) 3 hal yang paling kamu suka dari senyum pasanganmu! 💖",
  "Gambarkan wajah pasanganmu versi paling imut di Tab Canvas dalam waktu 30 detik! 🎨",
  "Kasih nama panggilan baru yang super menggemaskan buat pasanganmu untuk dipakai seharian ini! 🎀",
  "Tatap mata pasanganmu (atau kirim selfie paling manis sekarang) sambil bilang 'Aku sayang kamu' tanpa ketawa! ✨",
  "Tulis satu janji kencan manis minggu ini langsung ke dalam Bucket List di Tab Journal! ☁️",
  "Ceritakan 1 kenangan favorit kita seolah-olah kamu sedang membacakan dongeng pengantar tidur! 💜",
];

export const MOOD_META: Record<
  NoteMood,
  { label: string; emoji: string; badgeClass: string; cardBorder: string }
> = {
  cloud: {
    label: "Tenang",
    emoji: "☁️",
    badgeClass: "bg-[#BAE6FD]/45 text-sky-700",
    cardBorder: "border-sky-100",
  },
  romance: {
    label: "Romantis",
    emoji: "🎀",
    badgeClass: "bg-[#FECDD3]/50 text-rose-600",
    cardBorder: "border-pink-100",
  },
  playful: {
    label: "Seru & Lucu",
    emoji: "💜",
    badgeClass: "bg-[#E9D5FF]/55 text-purple-700",
    cardBorder: "border-purple-100",
  },
  datenight: {
    label: "Date Night",
    emoji: "🍰",
    badgeClass: "bg-amber-100/70 text-amber-700",
    cardBorder: "border-amber-100",
  },
  dream: {
    label: "Rencana Kita",
    emoji: "✨",
    badgeClass: "bg-emerald-100/60 text-emerald-700",
    cardBorder: "border-emerald-100",
  },
};

export const BUCKET_CATEGORY_META: Record<
  BucketCategory,
  { label: string; emoji: string; pillClass: string }
> = {
  date: {
    label: "Date Idea",
    emoji: "🎀",
    pillClass: "bg-[#FECDD3]/45 text-rose-600",
  },
  food: {
    label: "Kuliner",
    emoji: "🍰",
    pillClass: "bg-amber-100/70 text-amber-700",
  },
  travel: {
    label: "Jalan-jalan",
    emoji: "☁️",
    pillClass: "bg-[#BAE6FD]/45 text-sky-700",
  },
  dream: {
    label: "Impian Berdua",
    emoji: "💜",
    pillClass: "bg-[#E9D5FF]/55 text-purple-700",
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
  roomId: string,
  userAName: string,
  userBName: string
): SharedNote[] {
  const now = new Date().toISOString();
  return [
    {
      id: "note-seed-1",
      room_id: roomId,
      title: "Tempat & Lagu Favorit Kita Berdua ☁️",
      content: `Catatan kecil yang bebas kita isi bareng kapan pun!\n\n- Lagu buat di perjalanan sore: playlist akustik tenang\n- Makanan penyelamat mood ${userBName}: es krim stroberi & matcha hangat\n- Hal yang pengen dilakukan akhir pekan ini bareng ${userAName}: jalan sore sambil cari jajanan kaki lima`,
      mood: "romance",
      is_pinned: true,
      last_edited_by: userAName,
      updated_at: now,
      created_at: now,
    },
    {
      id: "note-seed-2",
      room_id: roomId,
      title: "Cerita Kencan & Hal Lucu Minggu Ini 💜",
      content: `Tulis momen seru atau kalimat lucu yang kejadian minggu ini biar nggak lupa!\n\nKlik kartu ini untuk langsung mengetik bareng pasanganmu secara realtime.`,
      mood: "playful",
      is_pinned: false,
      last_edited_by: userBName,
      updated_at: now,
      created_at: now,
    },
  ];
}

export function getSeedBucketItems(
  roomId: string,
  userAName: string,
  userBName: string
): BucketItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: "bucket-seed-1",
      room_id: roomId,
      title: "Foto photobox berdua pakai pose lucu ala Sanrio 📸",
      category: "date",
      is_completed: true,
      completed_by: userBName,
      created_by: userAName,
      created_at: now,
    },
    {
      id: "bucket-seed-2",
      room_id: roomId,
      title: "Piknik sore di taman bawa kue & minuman favorit 🍰",
      category: "food",
      is_completed: false,
      completed_by: null,
      created_by: userBName,
      created_at: now,
    },
    {
      id: "bucket-seed-3",
      room_id: roomId,
      title: "Roadtrip lihat langit senja & bintang malam berdua ☁️",
      category: "travel",
      is_completed: false,
      completed_by: null,
      created_by: userAName,
      created_at: now,
    },
  ];
}

export function getSeedChatMessages(
  roomId: string,
  userAName: string,
  userBName: string
): ChatMessage[] {
  const t1 = new Date(Date.now() - 1000 * 60 * 25).toISOString();
  const t2 = new Date(Date.now() - 1000 * 60 * 12).toISOString();
  const t3 = new Date(Date.now() - 1000 * 60 * 4).toISOString();

  return [
    {
      id: "msg-seed-1",
      room_id: roomId,
      sender_role: "user_a",
      sender_name: userAName,
      sender_character: "cinnamoroll",
      type: "text",
      text: `Hai manis! ☁️ Selamat datang di ruang chat rahasia kita. Di sini kita bisa kirim foto, voice note, lokasi kencan, sampai video call berdua lho!`,
      is_read: true,
      reactions: { "💖": ["user_b"] },
      created_at: t1,
    },
    {
      id: "msg-seed-2",
      room_id: roomId,
      sender_role: "user_b",
      sender_name: userBName,
      sender_character: "my-melody",
      type: "text",
      text: `Yeay gemes banget! 🎀 Aku suka tema Sanrio-nya, suasananya tenang dan ada suara pop lucu setiap kali kita ketuk tombol ✨`,
      is_read: true,
      reactions: { "🥰": ["user_a"] },
      created_at: t2,
    },
    {
      id: "msg-seed-3",
      room_id: roomId,
      sender_role: "user_a",
      sender_name: userAName,
      sender_character: "cinnamoroll",
      type: "text",
      text: `Yuk coba fitur rekam suara 🎙️ atau tombol telepon/video di atas kalau lagi kangen yaa! 💕`,
      is_read: true,
      created_at: t3,
    },
  ];
}
