import { Howl, Howler } from "howler";

export type EvalScore =
  | { type: "cp"; value: number }
  | { type: "mate"; value: number };

export type TrackKey = "base" | "advantage" | "tension";

const TRACK_VOLUME = 0.4;
const FADE_MS = 800;

let initialized = false;
const tracks: Partial<Record<TrackKey, Howl>> = {};
let stinger: Howl | null = null;
let currentTrack: TrackKey | null = null;

export function initAudio() {
  if (initialized) return;
  initialized = true;

  for (const key of ["base", "advantage", "tension"] as TrackKey[]) {
    tracks[key] = new Howl({
      src: [`/audio/${key}.mp3`],
      loop: true,
      volume: 0,
    });
  }
  stinger = new Howl({ src: ["/audio/checkmate.mp3"], volume: 0.85 });
}

export function playTrack(bucket: TrackKey) {
  if (!initialized) return;
  const next = tracks[bucket];
  if (!next) return;

  if (currentTrack === bucket) {
    if (!next.playing()) next.play();
    return;
  }

  if (!next.playing()) next.play();
  next.fade(next.volume(), TRACK_VOLUME, FADE_MS);

  if (currentTrack && currentTrack !== bucket) {
    const prev = tracks[currentTrack];
    if (prev) {
      prev.fade(prev.volume(), 0, FADE_MS);
      const fadingPrev = prev;
      setTimeout(() => fadingPrev.stop(), FADE_MS);
    }
  }
  currentTrack = bucket;
}

export function stopMusic() {
  if (!initialized) return;
  if (currentTrack) {
    const prev = tracks[currentTrack];
    if (prev) {
      prev.fade(prev.volume(), 0, 400);
      const fadingPrev = prev;
      setTimeout(() => fadingPrev.stop(), 400);
    }
    currentTrack = null;
  }
  stinger?.stop();
}

export function playCheckmate() {
  if (!initialized) return;
  if (currentTrack) {
    const prev = tracks[currentTrack];
    if (prev) {
      prev.fade(prev.volume(), 0, 400);
      const fadingPrev = prev;
      setTimeout(() => fadingPrev.stop(), 400);
    }
    currentTrack = null;
  }
  stinger?.play();
}

export function setMuted(v: boolean) {
  Howler.volume(v ? 0 : 1);
}

// --- procedural SFX via Web Audio API (shared Howler AudioContext) ---

function getCtx(): AudioContext | null {
  if (!initialized) return null;
  const ctx = (Howler as unknown as { ctx?: AudioContext }).ctx;
  return ctx ?? null;
}

export function playClick() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 440;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

export function playCapture() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.16);
}

export function playCheck() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const tremolo = ctx.createOscillator();
  const tremoloGain = ctx.createGain();

  osc.type = "square";
  osc.frequency.value = 880;
  tremolo.frequency.value = 10;
  tremoloGain.gain.value = 0.05;

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
  gain.gain.setValueAtTime(0.18, now + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  tremolo.connect(tremoloGain).connect(gain.gain);
  osc.connect(gain).connect(ctx.destination);

  osc.start(now);
  tremolo.start(now);
  osc.stop(now + 0.21);
  tremolo.stop(now + 0.21);
}

// --- bucket logic ---

export function bucketFromEval(
  score: EvalScore,
  anchorMatchesSideToMove: boolean,
): TrackKey {
  const fromAnchor = anchorMatchesSideToMove ? score.value : -score.value;
  if (score.type === "mate") {
    return fromAnchor > 0 ? "advantage" : "tension";
  }
  if (fromAnchor > 100) return "advantage";
  if (fromAnchor < -100) return "tension";
  return "base";
}
