export const DAILY_ROMANTIC_PROMPTS: string[] = [
  "Hal kecil apa dari pasanganmu minggu ini yang diam-diam membuat hatimu terasa hangat? ☁️",
  "Jika kita bisa teleportasi sore ini ke satu tempat tenang hanya berdua, kamu ingin kita pergi ke mana dan melakukan apa? 🎀",
  "Lagu atau suasana apa yang paling menggambarkan perasaanmu setiap kali kita mengobrol larut malam? 💜",
  "Satu kebiasaan lucu pasanganmu yang tidak pernah gagal membuatmu tersenyum sendiri saat teringat?",
  "Mimpi sederhana apa untuk masa depan kita yang paling ingin kamu wujudkan bersama tahun ini? ✨",
  "Kapan momen terakhir kamu menatap pasanganmu lalu berpikir dalam hati: 'Aku beruntung banget punya dia'?",
  "Jika hubungan kita adalah kafe kecil bertema Sanrio, menu spesial apa yang paling cocok mewakili cerita kita? 🍰",
];

export function getTodayDateISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDailyPromptForDate(dateISO: string, offset = 0): string {
  let hash = 0;
  for (let i = 0; i < dateISO.length; i++) {
    hash = (hash * 31 + dateISO.charCodeAt(i)) >>> 0;
  }
  const index = (hash + offset) % DAILY_ROMANTIC_PROMPTS.length;
  return DAILY_ROMANTIC_PROMPTS[index];
}
