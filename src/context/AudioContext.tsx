"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  musicBoxEngine,
  playSynthesizedChime,
  playSynthesizedPop,
  playSynthesizedSuccess,
  setGlobalSfxVolume,
  startCallRingtone,
  stopCallRingtone,
} from "@/lib/audioSystem";

interface AudioContextValue {
  isBgmPlaying: boolean;
  bgmVolume: number;
  sfxVolume: number;
  currentSongTitle: string;
  isCustomSong: boolean;
  toggleBgm: () => void;
  setBgmVolume: (vol: number) => void;
  setSfxVolume: (vol: number) => void;
  uploadCustomBgmFile: (file: File) => Promise<void>;
  resetDefaultBgm: () => void;
  playPop: () => void;
  playChime: () => void;
  playSuccess: () => void;
  startCallRing: () => void;
  stopCallRing: () => void;
}

const AudioContext = createContext<AudioContextValue>({
  isBgmPlaying: false,
  bgmVolume: 0.35,
  sfxVolume: 0.55,
  currentSongTitle: "Romantic Music Box (Default)",
  isCustomSong: false,
  toggleBgm: () => {},
  setBgmVolume: () => {},
  setSfxVolume: () => {},
  uploadCustomBgmFile: async () => {},
  resetDefaultBgm: () => {},
  playPop: () => {},
  playChime: () => {},
  playSuccess: () => {},
  startCallRing: () => {},
  stopCallRing: () => {},
});

const BGM_STORAGE_KEY = "cinnamelo_bgm_volume_v1";
const SFX_STORAGE_KEY = "cinnamelo_sfx_volume_v1";
const CUSTOM_BGM_META_KEY = "cinnamelo_custom_bgm_meta_v1";
const DB_NAME = "cinnamelo_audio_db";
const STORE_NAME = "custom_bgm";

// IndexedDB Helper to persist custom audio blobs
function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported"));
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveCustomAudioBlob(blob: Blob): Promise<void> {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(blob, "current_bgm_blob");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getCustomAudioBlob(): Promise<Blob | null> {
  try {
    const db = await openAudioDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get("current_bgm_blob");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function clearCustomAudioBlob(): Promise<void> {
  try {
    const db = await openAudioDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete("current_bgm_blob");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [bgmVolume, setBgmVolumeState] = useState(0.35);
  const [sfxVolume, setSfxVolumeState] = useState(0.55);
  const [currentSongTitle, setCurrentSongTitle] = useState("Romantic Music Box (Default)");
  const [isCustomSong, setIsCustomSong] = useState(false);

  const audioElemRef = useRef<HTMLAudioElement | null>(null);
  const customBlobUrlRef = useRef<string | null>(null);

  // Initialize Audio & Check for Custom or Default Audio
  useEffect(() => {
    try {
      const savedVol = window.localStorage.getItem(BGM_STORAGE_KEY);
      if (savedVol) {
        const v = parseFloat(savedVol);
        if (!isNaN(v)) {
          setBgmVolumeState(v);
          musicBoxEngine.setVolume(v);
        }
      }

      const savedSfx = window.localStorage.getItem(SFX_STORAGE_KEY);
      if (savedSfx) {
        const s = parseFloat(savedSfx);
        if (!isNaN(s)) {
          setSfxVolumeState(s);
          setGlobalSfxVolume(s);
        }
      }
    } catch {
      // ignore
    }

    const initAudio = async () => {
      const customMeta = window.localStorage.getItem(CUSTOM_BGM_META_KEY);
      const customBlob = await getCustomAudioBlob();

      if (customBlob && customMeta) {
        const url = URL.createObjectURL(customBlob);
        customBlobUrlRef.current = url;
        const audio = new Audio(url);
        audio.loop = true;
        audio.volume = bgmVolume;
        audioElemRef.current = audio;
        setCurrentSongTitle(customMeta);
        setIsCustomSong(true);
      } else {
        // Use default music box audio
        const audio = new Audio("/sounds/bgm-musicbox.mp3");
        audio.loop = true;
        audio.volume = bgmVolume;
        audioElemRef.current = audio;
        setCurrentSongTitle("Romantic Music Box (Default)");
        setIsCustomSong(false);
      }
    };

    initAudio();

    return () => {
      musicBoxEngine.stop();
      if (audioElemRef.current) {
        audioElemRef.current.pause();
      }
      if (customBlobUrlRef.current) {
        URL.revokeObjectURL(customBlobUrlRef.current);
      }
      stopCallRingtone();
    };
  }, []);

  const toggleBgm = () => {
    if (isBgmPlaying) {
      if (audioElemRef.current) {
        audioElemRef.current.pause();
      }
      musicBoxEngine.stop();
      setIsBgmPlaying(false);
    } else {
      if (audioElemRef.current) {
        audioElemRef.current.volume = bgmVolume;
        audioElemRef.current
          .play()
          .then(() => {
            setIsBgmPlaying(true);
          })
          .catch(() => {
            // Fallback to procedural Web Audio
            musicBoxEngine.setVolume(bgmVolume);
            musicBoxEngine.play();
            setIsBgmPlaying(true);
          });
      } else {
        musicBoxEngine.setVolume(bgmVolume);
        musicBoxEngine.play();
        setIsBgmPlaying(true);
      }
    }
  };

  const setBgmVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setBgmVolumeState(clamped);
    musicBoxEngine.setVolume(clamped);
    if (audioElemRef.current) {
      audioElemRef.current.volume = clamped;
    }
    try {
      window.localStorage.setItem(BGM_STORAGE_KEY, clamped.toString());
    } catch {
      // ignore
    }
  };

  const setSfxVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setSfxVolumeState(clamped);
    setGlobalSfxVolume(clamped);
    try {
      window.localStorage.setItem(SFX_STORAGE_KEY, clamped.toString());
    } catch {
      // ignore
    }
  };

  const uploadCustomBgmFile = async (file: File) => {
    try {
      if (audioElemRef.current) {
        audioElemRef.current.pause();
      }
      musicBoxEngine.stop();
      setIsBgmPlaying(false);

      if (customBlobUrlRef.current) {
        URL.revokeObjectURL(customBlobUrlRef.current);
      }

      await saveCustomAudioBlob(file);
      window.localStorage.setItem(CUSTOM_BGM_META_KEY, file.name);

      const url = URL.createObjectURL(file);
      customBlobUrlRef.current = url;

      const newAudio = new Audio(url);
      newAudio.loop = true;
      newAudio.volume = bgmVolume;
      audioElemRef.current = newAudio;

      setCurrentSongTitle(file.name);
      setIsCustomSong(true);

      // Play immediately
      await newAudio.play();
      setIsBgmPlaying(true);
    } catch (err) {
      console.error("Gagal memuat file custom BGM:", err);
    }
  };

  const resetDefaultBgm = async () => {
    if (audioElemRef.current) {
      audioElemRef.current.pause();
    }
    musicBoxEngine.stop();
    setIsBgmPlaying(false);

    if (customBlobUrlRef.current) {
      URL.revokeObjectURL(customBlobUrlRef.current);
      customBlobUrlRef.current = null;
    }

    await clearCustomAudioBlob();
    window.localStorage.removeItem(CUSTOM_BGM_META_KEY);

    const defaultAudio = new Audio("/sounds/bgm-musicbox.mp3");
    defaultAudio.loop = true;
    defaultAudio.volume = bgmVolume;
    audioElemRef.current = defaultAudio;

    setCurrentSongTitle("Romantic Music Box (Default)");
    setIsCustomSong(false);

    await defaultAudio.play().catch(() => {});
    setIsBgmPlaying(true);
  };

  return (
    <AudioContext.Provider
      value={{
        isBgmPlaying,
        bgmVolume,
        sfxVolume,
        currentSongTitle,
        isCustomSong,
        toggleBgm,
        setBgmVolume,
        setSfxVolume,
        uploadCustomBgmFile,
        resetDefaultBgm,
        playPop: playSynthesizedPop,
        playChime: playSynthesizedChime,
        playSuccess: playSynthesizedSuccess,
        startCallRing: startCallRingtone,
        stopCallRing: stopCallRingtone,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}
