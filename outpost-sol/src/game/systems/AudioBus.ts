import { gameState } from "./GameState.ts";

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (context) return context;
  const Ctx = window.AudioContext;
  if (!Ctx) return null;
  context = new Ctx();
  return context;
}

export function motionMs(ms: number): number {
  const settings = gameState.get().settings;
  if (settings.reducedMotion || !settings.animations) return 0;
  return ms;
}

export function playBlip(kind: "click" | "open" | "alert" = "click"): void {
  const volume = gameState.get().settings.soundVolume;
  if (volume <= 0.01) return;
  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const freq = kind === "alert" ? 220 : kind === "open" ? 520 : 660;
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(kind === "alert" ? 160 : freq * 1.4, now + 0.08);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08 * volume, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.16);
}

export function speak(text: string): void {
  if (!gameState.get().settings.voiceInstructions) return;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.96;
  utterance.pitch = 1.18;
  utterance.volume = Math.max(0.2, gameState.get().settings.soundVolume);
  window.speechSynthesis.speak(utterance);
}

export function stopSpeech(): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

export function announce(message: string): void {
  const live = document.getElementById("outpost-live");
  if (live) live.textContent = message;
}
