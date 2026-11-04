import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

interface PolishNoteRequestBody {
  title?: string;
  content?: string;
  userAName?: string;
  userBName?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PolishNoteRequestBody;
    const title = body.title || "Catatan Kita";
    const content = body.content || "";
    const userAName = body.userAName || "Partner A";
    const userBName = body.userBName || "Partner B";

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
