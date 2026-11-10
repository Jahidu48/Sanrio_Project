import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

interface PolishNoteRequestBody {
  title?: string;
  content?: string;
  userAName?: string;
  userBName?: string;
}

const JOURNAL_RATE_WINDOW_MS = 60_000;
const MAX_JOURNAL_REQ_PER_MIN = 10;

const journalRateMap: Map<string, { count: number; resetAt: number }> =
  (globalThis as any).__cinnamelo_journal_rate_map ||
  ((globalThis as any).__cinnamelo_journal_rate_map = new Map());

function checkJournalRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = journalRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    journalRateMap.set(ip, { count: 1, resetAt: now + JOURNAL_RATE_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_JOURNAL_REQ_PER_MIN;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "local-ip";
    if (!checkJournalRateLimit(ip)) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi sebentar lagi ya!" },
        { status: 429 }
      );
    }

    const body = (await request.json()) as PolishNoteRequestBody;
    const title = (body.title || "Catatan Kita").slice(0, 120);
    const content = (body.content || "").slice(0, 4000);
    const userAName = (body.userAName || "Partner A").slice(0, 40);
    const userBName = (body.userBName || "Partner B").slice(0, 40);

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey && !apiKey.includes("your-gemini-api-key") && content.trim()) {
      const ai = new GoogleGenAI({ apiKey });
      const interaction = await ai.interactions.create({
        model: "gemini-3.8-flash",
        system_instruction:
          "Kamu membantu pasangan merapikan catatan jurnal bersama mereka dalam Bahasa Indonesia yang hangat, manis, dan rapi tanpa mengubah makna aslinya.",
        input: `Judul: ${title}\nPasangan: ${userAName} & ${userBName}\nIsi catatan:\n${content}`,
      });

      return NextResponse.json({
        polishedContent: interaction.output_text?.trim() || content,
      });
    }

    return NextResponse.json({ polishedContent: content });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal memproses catatan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
