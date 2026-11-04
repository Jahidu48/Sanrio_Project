import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

interface MascotRequestBody {
  prompt?: string;
  mascotId?: "cinnamoroll" | "kuromi" | "my-melody";
  userAName?: string;
  userBName?: string;
  history?: Array<{ sender: "user" | "mascot"; text: string }>;
}

const PERSONA_INSTRUCTIONS = {
  cinnamoroll: (userA: string, userB: string) => `
Kamu adalah Cinnamoroll, anak anjing awan putih lembut dari langit yang hangat, penuh kasih, dan sangat manis!
Kamu adalah sahabat terbaik bagi pasangan ${userA} dan ${userB}.
Gaya bicaramu:
- Sangat manis, suportif, lembut, penuh empati dan kasih sayang.
- Sering menggunakan emoji awan, hati pastel, cinnamon roll, dan bintang: ☁️💖🍰✨🐶.
- Selalu menyemangati hubungan mereka, memberi saran kencan santai, kata-kata penenang jika lelah, atau ide kencan hangat.
- Jawab dalam Bahasa Indonesia yang santai, imut, dan bersahabat.
`,
  kuromi: (userA: string, userB: string) => `
Kamu adalah Kuromi! Tomboy yang keren, sassy, berenergi, sedikit jahil tapi diam-diam romantis dan sangat peduli ("tsundere bestie").
Kamu adalah sahabat dekat bagi pasangan ${userA} dan ${userB}.
Gaya bicaramu:
- Playful, ceplas-ceplos, suka menggoda dengan nada humoris tapi tetap sayang ("Hmph! Kalian berdua ini memang bikin gemas deh!").
- Menggunakan emoji tengkorak lucu, hati ungu/hitam, bintang nakal: 😈🖤✨💜🔥.
- Jago memberi ide tantangan berani, lelucon seru, game seru berdua, atau menengahi debat lucu mereka.
- Jawab dalam Bahasa Indonesia yang gaul, ekspresif, dan asyik!
`,
  "my-melody": (userA: string, userB: string) => `
Kamu adalah My Melody, kelinci manis bertudung merah muda yang lembut, sopan, puitis, dan penuh ketulusan hati.
Kamu adalah sahabat setia bagi pasangan ${userA} dan ${userB}.
Gaya bicaramu:
- Lembut, santun, hangat, seperti putri dongeng yang ramah.
- Menggunakan emoji pita, bunga mekar, stroberi, dan pelukan: 🎀🌸🍓💕🍰.
- Sangat pandai membantu merangkai kata cinta, puisi romantis, surat manis, atau menyejukkan hati yang sedang rindu.
- Jawab dalam Bahasa Indonesia yang anggun, manis, dan menyentuh hati.
`,
};

function getFallbackResponse(
  mascot: "cinnamoroll" | "kuromi" | "my-melody",
  prompt: string,
  userA: string,
  userB: string
): string {
  const p = prompt.toLowerCase();

  if (mascot === "cinnamoroll") {
    if (p.includes("kencan") || p.includes("date")) {
      return `Wah, ide kencan manis dari Cinnamoroll! ☁️✨ Bagaimana kalau ${userA} dan ${userB} piknik sore di taman dekat rumah sambil membawa roti kayu manis dan teh hangat? Nanti pas matahari terbenam, kalian bisa saling memotret foto lucu ala Sanrio berdua! 💖🐶`;
    }
    if (p.includes("puisi") || p.includes("surat")) {
      return `*Di antara langit biru dan awan bergulung, ada rasa rindu yang selalu pulang padamu. Bersamamu, hari sesederhana apa pun terasa seperti sepiring kue manis yang hangat.* ☁️🎀 Semoga ${userB} suka yaa!`;
    }
    return `Halo manis! ☁️ Cinnamoroll di sini selalu siap menemani ${userA} dan ${userB}. Apapun yang kalian tanyakan atau ceritakan hari ini, aku yakin cinta dan perhatian kecil kalian akan membuat hari ini terasa lebih hangat! 💖✨`;
  }

  if (mascot === "kuromi") {
    if (p.includes("kencan") || p.includes("date")) {
      return `Hmph, kalian mau kencan yang nggak ngebosenin kan? 😈🖤 Dengerin Kuromi: coba pergi ke arcade/timezone, lalu buat taruhan! Siapa yang kalah main air hockey atau capit boneka harus traktir es krim dan bilang 'kamu paling lucu sedunia' 3 kali! Gass kan?! 🔥✨`;
    }
    if (p.includes("debat") || p.includes("lucu")) {
      return `Hahaha! Kenapa sih kalian berdua hobi banget debat hal gemes? 😈 Menurut analisis Kuromi yang tak terkalahkan: ${userA} itu emang manja, tapi ${userB} juga diam-diam paling nggak bisa jauh-jauh! Jadi hasilnya seri, sekarang saling peluk cepetan! 🖤✨`;
    }
    return `Yoo! Kuromi is in the house! 😈 Ada yang butuh ide tantangan gila, lelucon baru, atau mau curhat? Jangan malu-malu, sahabat paling keren kalian ini siap jawab apapun! 🖤✨`;
  }

  // my-melody
  if (p.includes("puisi") || p.includes("surat") || p.includes("cinta")) {
    return `*Seperti melodi lagu kesukaan yang berbisik di angin pagi, namamu adalah hal paling indah yang selalu kuingat. Terima kasih telah hadir dan membuat duniaku berhias bunga mekar.* 🎀🌸 Semoga untaian kata ini bisa membuat hati pasanganmu berbunga-bunga yaa! 💕`;
  }
  return `Halo sahabat baikku! 🎀 My Melody ada di sini untuk mendengarkan ${userA} dan ${userB}. Semoga hari kalian selalu dilingkupi kehangatan, kebaikan, dan senyuman yang manis yaa 🌸🍓`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MascotRequestBody;
    const prompt = body.prompt?.trim() || "Halo!";
    const mascotId = body.mascotId || "cinnamoroll";
    const userA = body.userAName || "Partner A";
    const userB = body.userBName || "Partner B";

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey && !apiKey.includes("your-gemini-api-key")) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const personaFn =
          PERSONA_INSTRUCTIONS[mascotId] || PERSONA_INSTRUCTIONS.cinnamoroll;
        const systemInstruction = personaFn(userA, userB);

        const interaction = await ai.interactions.create({
          model: "gemini-3.8-flash",
          system_instruction: systemInstruction,
          input: prompt,
        });

        const replyText = interaction.output_text?.trim();
        if (replyText) {
          return NextResponse.json({ reply: replyText });
        }
      } catch {
        // Fallback to intelligent mascot generator
      }
    }

    const fallback = getFallbackResponse(mascotId, prompt, userA, userB);
    return NextResponse.json({ reply: fallback });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal memproses mascot AI.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
