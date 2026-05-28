import { loadSettings } from '../settings/storage';

/** Оптимизированный файл: frontend/public/sounds/notification-alert.mp3 */
const NOTIFICATION_SOUND_URL = '/sounds/notification-alert.mp3';

let notificationAudio: HTMLAudioElement | null = null;
let fileMissing = false;
let audioUnlocked = false;
let pendingPlay = false;

function getNotificationAudio(): HTMLAudioElement {
  if (!notificationAudio) {
    notificationAudio = new Audio(NOTIFICATION_SOUND_URL);
    notificationAudio.preload = 'auto';
    notificationAudio.addEventListener(
      'error',
      () => {
        fileMissing = true;
      },
      { once: true },
    );
  }
  return notificationAudio;
}

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

async function playSynthetic(): Promise<boolean> {
  const ctx = getCtx();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') await ctx.resume();
  } catch {
    return false;
  }

  const chime = (frequency: number, startAt: number, durationSec: number, peakGain: number) => {
    const osc = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    harmonic.type = 'triangle';
    osc.frequency.value = frequency;
    harmonic.frequency.value = frequency * 2.02;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
    osc.connect(gain);
    harmonic.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    harmonic.start(startAt);
    osc.stop(startAt + durationSec + 0.05);
    harmonic.stop(startAt + durationSec + 0.05);
  };

  const t = ctx.currentTime;
  const vol = 0.48;
  chime(880, t, 0.55, vol);
  chime(659.25, t + 0.58, 0.75, vol * 0.92);
  chime(880, t + 1.45, 0.55, vol * 0.88);
  chime(659.25, t + 2.03, 0.85, vol * 0.85);
  return true;
}

async function playMp3(): Promise<boolean> {
  if (fileMissing) return false;
  const audio = getNotificationAudio();
  audio.volume = 1;
  audio.currentTime = 0;
  try {
    await audio.play();
    return true;
  } catch {
    if (audio.error) fileMissing = true;
    return false;
  }
}

async function playSoundNow(): Promise<void> {
  if (loadSettings().notificationEnabled === false) return;

  const mp3Ok = await playMp3();
  if (mp3Ok) return;

  await playSynthetic();
}

/** Разблокировка звука после клика (требование браузера). */
export function unlockNotificationAudio(): void {
  if (audioUnlocked) return;

  void (async () => {
    if (!fileMissing) {
      const audio = getNotificationAudio();
      try {
        audio.volume = 0.001;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1;
      } catch {
        if (audio.error) fileMissing = true;
      }
    }

    const ctx = getCtx();
    if (ctx?.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return;
      }
    }

    audioUnlocked = true;

    if (pendingPlay) {
      pendingPlay = false;
      await playSoundNow();
    }
  })();
}

/** @deprecated используйте unlockNotificationAudio */
export function preloadNotificationSound(): void {
  unlockNotificationAudio();
}

export async function playNotificationBellSound(): Promise<void> {
  if (loadSettings().notificationEnabled === false) return;

  if (!audioUnlocked) {
    pendingPlay = true;
    return;
  }

  await playSoundNow();
}
