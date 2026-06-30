import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, Music2 } from "lucide-react";
import { useOS } from "@/os/store";
import { cn } from "@/lib/utils";

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  freq: number; // Hz for synthesized tone
  cover: string; // gradient classes
}

const TRACKS: Track[] = [
  { id: "t1", title: "Polar Drift", artist: "Nexus Ensemble", duration: 184, freq: 261.63, cover: "from-sky-400 to-indigo-600" },
  { id: "t2", title: "Quartz", artist: "Helix", duration: 212, freq: 329.63, cover: "from-fuchsia-400 to-purple-700" },
  { id: "t3", title: "Slow Light", artist: "Nova Ito", duration: 156, freq: 220, cover: "from-amber-300 to-rose-600" },
  { id: "t4", title: "Mainframe", artist: "Void Kit", duration: 240, freq: 196, cover: "from-emerald-400 to-cyan-700" },
  { id: "t5", title: "Glass Rain", artist: "Halo Field", duration: 198, freq: 392, cover: "from-pink-400 to-violet-700" },
];

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Media() {
  const masterVol = useOS((s) => s.quick.volume);
  const appVol = useOS((s) => s.appVolumes.media ?? 80);
  const setAppVolume = useOS((s) => s.setAppVolume);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const track = TRACKS[idx];
  const effectiveVol = (masterVol / 100) * (appVol / 100);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setPos((p) => {
        if (p + 1 >= track.duration) {
          if (repeat) return 0;
          return track.duration;
        }
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [playing, track.duration, repeat]);

  // Auto-advance
  useEffect(() => {
    if (pos >= track.duration && playing && !repeat) {
      next();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);

  // Audio synth
  useEffect(() => {
    if (!playing) {
      oscRef.current?.stop();
      oscRef.current?.disconnect();
      oscRef.current = null;
      return;
    }
    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = track.freq;
      gain.gain.value = effectiveVol * 0.04;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      oscRef.current = osc;
      gainRef.current = gain;
    } catch {
      // ignore
    }
    return () => {
      oscRef.current?.stop();
      oscRef.current?.disconnect();
      oscRef.current = null;
    };
  }, [playing, track.freq, effectiveVol]);

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = effectiveVol * 0.04;
  }, [effectiveVol]);

  const next = () => {
    setPos(0);
    setIdx((i) =>
      shuffle
        ? Math.floor(Math.random() * TRACKS.length)
        : (i + 1) % TRACKS.length
    );
  };
  const prev = () => {
    setPos(0);
    setIdx((i) => (i - 1 + TRACKS.length) % TRACKS.length);
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-background to-background/60 text-foreground">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className={cn("grid aspect-square w-56 place-items-center rounded-2xl bg-gradient-to-br shadow-xl", track.cover)}>
          <Music2 className="size-20 text-white/85" />
        </div>
      </div>

      <div className="px-6">
        <p className="truncate text-lg font-semibold">{track.title}</p>
        <p className="truncate text-sm text-muted-foreground">{track.artist}</p>

        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={track.duration}
            value={pos}
            onChange={(e) => setPos(+e.target.value)}
            className="w-full accent-[hsl(var(--primary))]"
          />
          <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>{fmt(pos)}</span>
            <span>{fmt(track.duration)}</span>
          </div>
        </div>

        <div className="my-3 flex items-center justify-center gap-3">
          <button
            onClick={() => setShuffle((v) => !v)}
            className={cn("grid size-9 place-items-center rounded-full hover:bg-white/10", shuffle && "text-primary")}
          >
            <Shuffle className="size-4" />
          </button>
          <button onClick={prev} className="grid size-10 place-items-center rounded-full hover:bg-white/10">
            <SkipBack className="size-5" />
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90"
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-0.5" />}
          </button>
          <button onClick={next} className="grid size-10 place-items-center rounded-full hover:bg-white/10">
            <SkipForward className="size-5" />
          </button>
          <button
            onClick={() => setRepeat((v) => !v)}
            className={cn("grid size-9 place-items-center rounded-full hover:bg-white/10", repeat && "text-primary")}
          >
            <Repeat className="size-4" />
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-xl border border-glass-border bg-white/5 px-3 py-2">
          <Volume2 className="size-4 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={100}
            value={appVol}
            onChange={(e) => setAppVolume("media", +e.target.value)}
            className="flex-1 accent-[hsl(var(--primary))]"
          />
          <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">{appVol}</span>
        </div>
      </div>

      <div className="border-t border-glass-border bg-black/20 p-2">
        <p className="px-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Library</p>
        <div className="max-h-32 overflow-y-auto os-scroll">
          {TRACKS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => {
                setIdx(i);
                setPos(0);
                setPlaying(true);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5",
                i === idx && "bg-primary/15 text-primary"
              )}
            >
              <span className={cn("grid size-7 shrink-0 place-items-center rounded bg-gradient-to-br", t.cover)}>
                <Music2 className="size-3.5 text-white" />
              </span>
              <span className="flex-1 truncate">{t.title}</span>
              <span className="text-xs text-muted-foreground">{t.artist}</span>
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{fmt(t.duration)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
