const seenAlertIds = new Set();
let sharedAudioContext = null;
let unlockBound = false;
let alertBuffer = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;

  if (!sharedAudioContext) {
    sharedAudioContext = new Ctx();
  }

  return sharedAudioContext;
}

function unlockAudioContext() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {
      // Will retry on next user interaction.
    });
  }
}

function bindUnlockHandlers() {
  if (typeof window === "undefined" || unlockBound) return;

  const unlock = () => unlockAudioContext();

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
  unlockBound = true;
}

/**
 * Loads and decodes the alert sound file.
 */
async function loadAlertSound() {
  if (alertBuffer) return alertBuffer;

  const ctx = getAudioContext();
  if (!ctx) return null;

  try {
    const response = await fetch("/sounds/alert.wav");
    const arrayBuffer = await response.arrayBuffer();
    alertBuffer = await ctx.decodeAudioData(arrayBuffer);
    return alertBuffer;
  } catch (error) {
    console.error("Failed to load alert sound:", error);
    return null;
  }
}

/**
 * Plays the loaded alert sound.
 */
async function playAlert() {
  const ctx = getAudioContext();
  if (!ctx) return;

  bindUnlockHandlers();
  unlockAudioContext();

  const buffer = await loadAlertSound();
  if (!buffer || ctx.state !== "running") return;

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();

  source.buffer = buffer;
  gain.gain.setValueAtTime(0.25, ctx.currentTime); // Standardized volume

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(0);
}

export function playTestBeep() {
  playAlert();
}

export function playAlertBeep(alert) {
  if (!alert || !alert.id) return;
  if (seenAlertIds.has(alert.id)) return;

  seenAlertIds.add(alert.id);

  if (seenAlertIds.size > 500) {
    const oldest = seenAlertIds.values().next().value;
    seenAlertIds.delete(oldest);
  }

  playAlert();
}