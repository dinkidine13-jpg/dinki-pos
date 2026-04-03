import { useCallback, useEffect, useRef } from "react";

const MUTE_KEY = "dinki_dine_muted";

export function useSound(unacknowledgedCount: number, isMuted: boolean) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(false);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  // Unlock AudioContext on every user interaction (browsers block audio until then)
  useEffect(() => {
    const unlock = () => {
      const ctx = getAudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
    };
    document.addEventListener("click", unlock);
    document.addEventListener("touchstart", unlock);
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, [getAudioCtx]);

  const playBeep = useCallback(async () => {
    try {
      const ctx = getAudioCtx();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      const now = ctx.currentTime;

      // Tone 1
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.connect(g1);
      g1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(880, now);
      g1.gain.setValueAtTime(0.4, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Tone 2
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.connect(g2);
      g2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(1100, now + 0.25);
      g2.gain.setValueAtTime(0.4, now + 0.25);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.start(now + 0.25);
      osc2.stop(now + 0.45);

      // Tone 3
      const osc3 = ctx.createOscillator();
      const g3 = ctx.createGain();
      osc3.connect(g3);
      g3.connect(ctx.destination);
      osc3.frequency.setValueAtTime(880, now + 0.5);
      g3.gain.setValueAtTime(0.4, now + 0.5);
      g3.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc3.start(now + 0.5);
      osc3.stop(now + 0.7);
    } catch (_e) {
      // Audio unavailable
    }
  }, [getAudioCtx]);

  const stopRingtone = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isPlayingRef.current = false;
  }, []);

  const startRingtone = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    playBeep();
    intervalRef.current = setInterval(playBeep, 2000);
  }, [playBeep]);

  useEffect(() => {
    if (unacknowledgedCount > 0 && !isMuted) {
      startRingtone();
    } else {
      stopRingtone();
    }
  }, [unacknowledgedCount, isMuted, startRingtone, stopRingtone]);

  useEffect(() => {
    return () => {
      stopRingtone();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [stopRingtone]);

  return { playBeep };
}

export function loadMutePref(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveMutePref(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "true" : "false");
  } catch {
    // ignore
  }
}
