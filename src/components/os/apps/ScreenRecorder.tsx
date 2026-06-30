import { useEffect, useRef, useState } from "react";
import { Video, Square, Download, Mic, MicOff, Circle } from "lucide-react";
import { useOS } from "@/os/store";

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}

export function ScreenRecorder() {
  const writeFile = useOS((s) => s.writeFile);
  const notify = useOS((s) => s.notify);
  const [recording, setRecording] = useState(false);
  const [withMic, setWithMic] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [last, setLast] = useState<{ url: string; name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => stop(true), []);

  async function start() {
    setError(null);
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 } as MediaTrackConstraints,
        audio: true,
      });
      const tracks = [...display.getVideoTracks(), ...display.getAudioTracks()];
      if (withMic) {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
          mic.getAudioTracks().forEach((t) => tracks.push(t));
        } catch {
          /* mic optional */
        }
      }
      const stream = new MediaStream(tracks);
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const name = `recording-${stamp}.webm`;
        try {
          const dataUri = await blobToDataURL(blob);
          writeFile(`/home/Videos/${name}`, dataUri);
          notify({ title: "Recording saved", message: `Videos/${name}`, appId: "media" });
        } catch {
          /* writeFile may reject large blobs; still expose download */
          notify({ title: "Recording ready", message: `${name} — download from this window` });
        }
        const url = URL.createObjectURL(blob);
        setLast({ url, name, size: blob.size });
      };
      stream.getVideoTracks()[0].addEventListener("ended", () => stop());
      rec.start(1000);
      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((Date.now() - startedAtRef.current) / 1000), 250);
      setRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start recording");
    }
  }

  function stop(silent = false) {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    if (!silent) startedAtRef.current = 0;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-background/40 p-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className={`grid size-20 place-items-center rounded-full border-2 ${recording ? "animate-pulse border-red-500 bg-red-500/20" : "border-glass-border bg-white/5"}`}>
          {recording ? <Circle className="size-8 fill-red-500 text-red-500" /> : <Video className="size-8 text-primary" />}
        </div>
        <div className="text-lg font-semibold">{recording ? `Recording · ${fmt(elapsed)}` : "Screen Recorder"}</div>
        <div className="text-xs text-muted-foreground">
          {recording ? "Click stop or close the share toolbar" : "Capture your screen as WebM video"}
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs">
        <button
          onClick={() => !recording && setWithMic((v) => !v)}
          disabled={recording}
          className={`flex items-center gap-1.5 rounded-md border border-glass-border px-2.5 py-1 ${withMic ? "bg-primary/15 text-primary" : "bg-white/5"}`}
        >
          {withMic ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
          Microphone {withMic ? "on" : "off"}
        </button>
      </label>

      {!recording ? (
        <button
          onClick={start}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Video className="size-4" /> Start recording
        </button>
      ) : (
        <button
          onClick={() => stop()}
          className="flex items-center gap-2 rounded-lg bg-red-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600"
        >
          <Square className="size-4 fill-current" /> Stop
        </button>
      )}

      {error && <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

      {last && (
        <div className="w-full max-w-sm rounded-lg border border-glass-border bg-white/5 p-3 text-left">
          <div className="mb-2 text-xs font-medium">{last.name}</div>
          <video src={last.url} controls className="mb-2 w-full rounded" />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{(last.size / 1024 / 1024).toFixed(2)} MB</span>
            <a
              href={last.url}
              download={last.name}
              className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs text-foreground hover:bg-white/20"
            >
              <Download className="size-3" /> Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
