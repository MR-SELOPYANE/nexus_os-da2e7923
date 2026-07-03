// Tiny synthesizer for NEXUS system sounds.
let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.08) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

export const sfx = {
  click: () => tone(880, 0.04, "square", 0.03),
  notify: () => { tone(660, 0.09, "sine", 0.06); setTimeout(() => tone(990, 0.14, "sine", 0.06), 90); },
  error: () => { tone(220, 0.15, "sawtooth", 0.08); setTimeout(() => tone(180, 0.2, "sawtooth", 0.08), 140); },
  startup: () => {
    [261.63, 329.63, 392, 523.25].forEach((f, i) => setTimeout(() => tone(f, 0.28, "triangle", 0.07), i * 130));
  },
  shutdown: () => {
    [523.25, 392, 329.63, 261.63].forEach((f, i) => setTimeout(() => tone(f, 0.24, "triangle", 0.07), i * 120));
  },
};
