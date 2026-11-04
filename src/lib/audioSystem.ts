// Web Audio API zero-dependency cute synthesized sound generator & BGM engine

let audioCtx: AudioContext | null = null;
let globalSfxVolume = 0.55;

export function setGlobalSfxVolume(vol: number) {
  globalSfxVolume = Math.max(0, Math.min(1, vol));
}

export function getGlobalSfxVolume() {
  return globalSfxVolume;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Soft bubble pop sound on button tap, tab switch, card open.
 */
export function playSynthesizedPop() {
  if (globalSfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Quick pitch glide up & pop
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

    gain.gain.setValueAtTime(0.22 * globalSfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  } catch {
    // Audio context may be restricted before user gesture
  }
}

/**
 * Magical wind-chime / harp sparkle sound when receiving a new chat message,
 * Heartbeat Ripple, or Truth/Dare spin.
 */
export function playSynthesizedChime() {
  if (globalSfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Harmonic bell chime arpeggio: A5, C#6, E6, A6
    const freqs = [880, 1108.73, 1318.51, 1760];

    freqs.forEach((freq, idx) => {
      const noteTime = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.14 * globalSfxVolume, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.5);
    });
  } catch {
    // ignore
  }
}

/**
 * Cheerful sparkle chord when completing "Misi Manis Hari Ini" or unlocking daily prompts.
 */
export function playSynthesizedSuccess() {
  if (globalSfxVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Major chord cascade C5, E5, G5, C6 with sparkling sparkle tone
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18 * globalSfxVolume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.7);
    });
  } catch {
    // ignore
  }
}

/**
 * Looping cute incoming call telephone chime for WebRTC
 */
let callRingTimer: number | null = null;

export function startCallRingtone() {
  stopCallRingtone();
  const ringCycle = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // 2 quick cute high chimes (like an anime soft phone bell)
      [0, 0.16].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1046.5, now + offset); // C6
        osc.frequency.exponentialRampToValueAtTime(1318.5, now + offset + 0.08); // E6
        gain.gain.setValueAtTime(0.15, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    } catch {
      // ignore
    }
  };

  ringCycle();
  callRingTimer = window.setInterval(ringCycle, 1800);
}

export function stopCallRingtone() {
  if (callRingTimer !== null) {
    window.clearInterval(callRingTimer);
    callRingTimer = null;
  }
}

/**
 * Procedural romantic music box synthesizer loop (zero asset dependency)
 */
class ProceduralMusicBox {
  private timer: number | null = null;
  private volume: number = 0.35;
  private isRunning: boolean = false;
  private step: number = 0;

  // Romantic gentle music box melody (Satie / Ghibli inspired pentatonic loop)
  private melody = [
    523.25, 659.25, 783.99, 1046.5, 880.0, 783.99, 659.25, 587.33,
    523.25, 659.25, 880.0, 1046.5, 1174.66, 1046.5, 880.0, 783.99,
  ];

  public setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
  }

  public getVolume() {
    return this.volume;
  }

  public play() {
    if (this.isRunning) return;
    this.isRunning = true;
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const tick = () => {
      if (!this.isRunning) return;
      const ctx = getAudioContext();
      if (ctx) {
        try {
          const now = ctx.currentTime;
          const freq = this.melody[this.step % this.melody.length];
          this.step++;

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now);

          // Authentic gentle music box tine bell envelope
          const effectiveVol = this.volume * 0.12;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(effectiveVol, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.75);
        } catch {
          // ignore
        }
      }
    };

    tick();
    this.timer = window.setInterval(tick, 450);
  }

  public stop() {
    this.isRunning = false;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  public getStatus() {
    return this.isRunning;
  }
}

export const musicBoxEngine = new ProceduralMusicBox();
