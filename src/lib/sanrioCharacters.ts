export type SanrioCharacterId =
  | "cinnamoroll"
  | "my-melody"
  | "kuromi"
  | "hello-kitty"
  | "pompompurin"
  | "pochacco"
  | "keroppi"
  | "little-twin-stars"
  | "badtz-maru"
  | "hangyodon"
  | "tuxedosam"
  | "chococat"
  | "cogimyun"
  | "wish-me-mell"
  | "marroncream"
  | "usahana"
  | "pekkle"
  | "my-sweet-piano"
  | "corocorokuririn";

export interface SanrioCharacterMeta {
  id: SanrioCharacterId;
  name: string;
  svgPath: string;
  accentHex: string;
  softBg: string;
  tagline: string;
}

export const SANRIO_CHARACTERS: SanrioCharacterMeta[] = [
  {
    id: "cinnamoroll",
    name: "Cinnamoroll",
    svgPath: "/characters/cinnamoroll.svg",
    accentHex: "#BAE6FD",
    softBg: "bg-sky-50 border-sky-200/80",
    tagline: "Anak anjing awan lembut",
  },
  {
    id: "my-melody",
    name: "My Melody",
    svgPath: "/characters/my-melody.svg",
    accentHex: "#FECDD3",
    softBg: "bg-rose-50 border-pink-200/80",
    tagline: "Manis, tulus & penuh cinta",
  },
  {
    id: "kuromi",
    name: "Kuromi",
    svgPath: "/characters/kuromi.svg",
    accentHex: "#E9D5FF",
    softBg: "bg-purple-50 border-purple-200/80",
    tagline: "Usil tapi diam-diam romantis",
  },
  {
    id: "hello-kitty",
    name: "Hello Kitty",
    svgPath: "/characters/hello-kitty.svg",
    accentHex: "#FDA4AF",
    softBg: "bg-red-50 border-red-200/80",
    tagline: "Ikon pita merah klasik",
  },
  {
    id: "pompompurin",
    name: "Pompompurin",
    svgPath: "/characters/pompompurin.svg",
    accentHex: "#FEF08A",
    softBg: "bg-amber-50 border-amber-200/80",
    tagline: "Hangat seperti puding karamel",
  },
  {
    id: "pochacco",
    name: "Pochacco",
    svgPath: "/characters/pochacco.svg",
    accentHex: "#BBF7D0",
    softBg: "bg-emerald-50 border-emerald-200/80",
    tagline: "Ceria & suka jalan berdua",
  },
  {
    id: "keroppi",
    name: "Keroppi",
    svgPath: "/characters/keroppi.svg",
    accentHex: "#D9F99D",
    softBg: "bg-lime-50 border-lime-200/80",
    tagline: "Semangat petualangan seru",
  },
  {
    id: "little-twin-stars",
    name: "Little Twin Stars",
    svgPath: "/characters/little-twin-stars.svg",
    accentHex: "#DDD6FE",
    softBg: "bg-violet-50 border-violet-200/80",
    tagline: "Kiki & Lala sepasang bintang",
  },
  {
    id: "badtz-maru",
    name: "Badtz-Maru",
    svgPath: "/characters/badtz-maru.svg",
    accentHex: "#CBD5E1",
    softBg: "bg-slate-100 border-slate-200/80",
    tagline: "Cool di luar, perhatian di dalam",
  },
  {
    id: "hangyodon",
    name: "Hangyodon",
    svgPath: "/characters/hangyodon.svg",
    accentHex: "#99F6E4",
    softBg: "bg-teal-50 border-teal-200/80",
    tagline: "Humoris & bikin ketawa terus",
  },
  {
    id: "tuxedosam",
    name: "Tuxedosam",
    svgPath: "/characters/tuxedosam.svg",
    accentHex: "#BFDBFE",
    softBg: "bg-blue-50 border-blue-200/80",
    tagline: "Penguin rapi berdasi kupu-kupu",
  },
  {
    id: "chococat",
    name: "Chococat",
    svgPath: "/characters/chococat.svg",
    accentHex: "#FDE68A",
    softBg: "bg-orange-50 border-orange-200/80",
    tagline: "Peka & selalu tahu duluan",
  },
  {
    id: "cogimyun",
    name: "Cogimyun",
    svgPath: "/characters/cogimyun.svg",
    accentHex: "#FCE7F3",
    softBg: "bg-pink-50 border-pink-200/80",
    tagline: "Selembut tepung gandum putih",
  },
  {
    id: "wish-me-mell",
    name: "Wish Me Mell",
    svgPath: "/characters/wish-me-mell.svg",
    accentHex: "#FBCFE8",
    softBg: "bg-rose-50 border-rose-200/80",
    tagline: "Pembawa surat penuh harapan",
  },
  {
    id: "marroncream",
    name: "Marroncream",
    svgPath: "/characters/marroncream.svg",
    accentHex: "#FED7AA",
    softBg: "bg-amber-50 border-orange-200/80",
    tagline: "Manis ala kafe Paris",
  },
  {
    id: "usahana",
    name: "Usahana",
    svgPath: "/characters/usahana.svg",
    accentHex: "#FEF08A",
    softBg: "bg-yellow-50 border-yellow-200/80",
    tagline: "Penuh warna musim panas",
  },
  {
    id: "pekkle",
    name: "Pekkle",
    svgPath: "/characters/pekkle.svg",
    accentHex: "#BAE6FD",
    softBg: "bg-sky-50 border-sky-200/80",
    tagline: "Bebek baik hati yang suka menari",
  },
  {
    id: "my-sweet-piano",
    name: "My Sweet Piano",
    svgPath: "/characters/my-sweet-piano.svg",
    accentHex: "#FBCFE8",
    softBg: "bg-pink-50 border-pink-200/80",
    tagline: "Domba pink lembut sahabat Melody",
  },
  {
    id: "corocorokuririn",
    name: "Corocorokuririn",
    svgPath: "/characters/corocorokuririn.svg",
    accentHex: "#FED7AA",
    softBg: "bg-amber-50 border-amber-200/80",
    tagline: "Hamster mungil penuh rasa ingin tahu",
  },
];

export const SANRIO_CHARACTER_MAP: Record<
  SanrioCharacterId,
  SanrioCharacterMeta
> = Object.fromEntries(
  SANRIO_CHARACTERS.map((c) => [c.id, c])
) as Record<SanrioCharacterId, SanrioCharacterMeta>;

export function getSanrioCharacter(
  id?: string | null,
  fallback: SanrioCharacterId = "cinnamoroll"
): SanrioCharacterMeta {
  if (id && id in SANRIO_CHARACTER_MAP) {
    return SANRIO_CHARACTER_MAP[id as SanrioCharacterId];
  }
  return SANRIO_CHARACTER_MAP[fallback];
}
