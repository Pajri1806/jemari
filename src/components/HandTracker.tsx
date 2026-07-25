import { useEffect, useRef, useState } from "react";
import {
    DrawingUtils,
    FilesetResolver,
    GestureRecognizer,
} from "@mediapipe/tasks-vision";
import { Card, Switch } from "@heroui/react";
import { cnm } from "@/utils/style";

type HandGesture = {
    handedness: string;
    gesture: string;
    score: number;
};

export default function HandTracker() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const recognizerRef = useRef<GestureRecognizer | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef(0);
    const skeletonRef = useRef(true);
    const effectRef = useRef(true);
    const mosaicRef = useRef<HTMLCanvasElement | null>(null);
    const audioJokowiRef = useRef<HTMLAudioElement | null>(null);
    const audioBlurRef = useRef<HTMLAudioElement | null>(null);
    const fistWasActive = useRef(false);
    const victoryWasActive = useRef(false);

    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cameraOn, setCameraOn] = useState(true);
    const [skeletonOn, setSkeletonOn] = useState(true);
    const [effectOn, setEffectOn] = useState(true);
    const [effectMode, setEffectMode] = useState<"blur" | "mosaic" | "flip" | null>(null);
    const [numHands, setNumHands] = useState(2);
    const [handsText, setHandsText] = useState("2");
    const [handsDetected, setHandsDetected] = useState(0);
    const [gestures, setGestures] = useState<HandGesture[]>([]);
    const [playingAudio, setPlayingAudio] = useState<"jokowi" | "blur" | null>(null);

    useEffect(() => {
        skeletonRef.current = skeletonOn;
    }, [skeletonOn]);

    useEffect(() => {
        effectRef.current = effectOn;
    }, [effectOn]);

    // Load the model once
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
                );
                const recognizer = await GestureRecognizer.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numHands: 2,
                });

                if (cancelled) {
                    recognizer.close();
                    return;
                }
                recognizerRef.current = recognizer;
                setReady(true);
            } catch {
                setError("Failed to load the hand tracking model.");
            }
        })();

        return () => {
            cancelled = true;
            recognizerRef.current?.close();
            recognizerRef.current = null;
        };
    }, []);

    // Apply hand count changes live
    useEffect(() => {
        if (ready) recognizerRef.current?.setOptions({ numHands });
    }, [ready, numHands]);

    // Camera stream + detection loop
    useEffect(() => {
        if (!ready || !cameraOn) return;

        let active = true;
        let draw: DrawingUtils | null = null;
        const video = videoRef.current!;

        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "user",
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                });
                if (!active) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                video.srcObject = stream;
                await video.play();
                loop();
            } catch {
                setError("Camera access was denied.");
            }
        })();

        function loop() {
            if (!active) return;

            const recognizer = recognizerRef.current;
            const canvas = canvasRef.current;

            if (recognizer && canvas && video.readyState >= 2) {
                const ctx = canvas.getContext("2d")!;
                if (!draw) draw = new DrawingUtils(ctx);

                if (canvas.width !== video.videoWidth) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }

                const result = recognizer.recognizeForVideo(video, performance.now());
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                setHandsDetected(result.landmarks.length);

                const w = canvas.width;
                const h = canvas.height;

                // Pair up gestures
                const detectedGestures: HandGesture[] = result.gestures.map((g, i) => ({
                    handedness: result.handedness[i]?.[0]?.categoryName ?? "",
                    gesture: g[0]?.categoryName ?? "None",
                    score: g[0]?.score ?? 0,
                }));
                setGestures(detectedGestures);

                // ─── 1. GESTURE: Victory → blur frame + play audio "Foto Kita Blur" ───
                const hasVictory = detectedGestures.some((g) => g.gesture === "Victory");
                let isFrameBlur = false;

                if (hasVictory) {
                    isFrameBlur = true;

                    if (!victoryWasActive.current) {
                        victoryWasActive.current = true;
                        const audio = audioBlurRef.current;
                        if (audio) {
                            audio.currentTime = 0;
                            audio.play().catch(() => {});
                            setPlayingAudio("blur");
                            audio.onended = () => setPlayingAudio(null);
                        }
                    }
                } else {
                    victoryWasActive.current = false;
                }

                // ─── 2. GESTURE: Closed_Fist (kepal) → play audio "Hidup Jokowi" ───
                const hasFist = detectedGestures.some((g) => g.gesture === "Closed_Fist");

                if (hasFist && !fistWasActive.current) {
                    fistWasActive.current = true;
                    const audio = audioJokowiRef.current;
                    if (audio) {
                        audio.currentTime = 0;
                        audio.play().catch(() => {});
                        setPlayingAudio("jokowi");
                        audio.onended = () => setPlayingAudio(null);
                    }
                } else if (!hasFist) {
                    fistWasActive.current = false;
                }

                // ─── 3. PINCH EFFECT: blur/mosaic/flip area ───
                let pinchActive = false;
                let pinchMode: "blur" | "mosaic" | "flip" | null = null;

                if (effectRef.current && result.landmarks.length > 0 && !hasVictory && !hasFist) {
                    const hands = result.landmarks.slice(0, 2).map((lm) => ({
                        thumb: { x: lm[4].x * w, y: lm[4].y * h },
                        index: { x: lm[8].x * w, y: lm[8].y * h },
                        thumbAbove: lm[4].y < lm[8].y,
                    }));

                    const bothUpwards =
                        hands.length >= 2
                            ? hands.every((hh) => hh.thumbAbove)
                            : hands[0]?.thumbAbove ?? false;
                    const bothDownwards =
                        hands.length >= 2
                            ? hands.every((hh) => !hh.thumbAbove)
                            : hands.length === 1 && !hands[0].thumbAbove;

                    pinchMode = bothUpwards ? "flip" : bothDownwards ? "blur" : "mosaic";
                    pinchActive = true;
                    setEffectMode(pinchMode);
                } else if (!hasVictory && !hasFist) {
                    setEffectMode(null);
                }

                // ─── Draw pinch area ───
                if (pinchActive && pinchMode) {
                    const hands = result.landmarks.slice(0, 2).map((lm) => ({
                        thumb: { x: lm[4].x * w, y: lm[4].y * h },
                        index: { x: lm[8].x * w, y: lm[8].y * h },
                    }));

                    const fill = (pts: { x: number; y: number }[]) => {
                        const xs = pts.map((p) => p.x);
                        const ys = pts.map((p) => p.y);
                        const minX = Math.min(...xs);
                        const minY = Math.min(...ys);
                        const fw = Math.max(...xs) - minX;
                        const fh = Math.max(...ys) - minY;
                        if (fw < 2 || fh < 2) return;

                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(pts[0].x, pts[0].y);
                        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
                        ctx.closePath();
                        ctx.clip();
                        ctx.filter = pinchMode === "blur" ? "blur(12px)" : "none";

                        if (pinchMode === "mosaic") {
                            const blockPx = 16;
                            const sw = Math.max(1, Math.round(fw / blockPx));
                            const sh = Math.max(1, Math.round(fh / blockPx));
                            const tmp = (mosaicRef.current ??= document.createElement("canvas"));
                            tmp.width = sw;
                            tmp.height = sh;
                            const tctx = tmp.getContext("2d")!;
                            tctx.drawImage(video, minX, minY, fw, fh, 0, 0, sw, sh);
                            ctx.imageSmoothingEnabled = false;
                            ctx.drawImage(tmp, 0, 0, sw, sh, minX, minY, fw, fh);
                            ctx.imageSmoothingEnabled = true;
                        } else {
                            if (pinchMode === "flip") {
                                ctx.translate(minX + fw / 2, minY + fh / 2);
                                ctx.rotate(Math.PI);
                                ctx.translate(-(minX + fw / 2), -(minY + fh / 2));
                            }
                            ctx.drawImage(video, minX, minY, fw, fh, minX, minY, fw, fh);
                        }
                        ctx.restore();
                    };

                    const [a, b] = hands;
                    if (b) {
                        if (pinchMode === "mosaic") fill([a.index, b.thumb, b.index, a.thumb]);
                        else fill([a.index, b.index, b.thumb, a.thumb]);
                    } else {
                        fill([
                            a.thumb,
                            { x: a.index.x, y: a.thumb.y },
                            a.index,
                            { x: a.thumb.x, y: a.index.y },
                        ]);
                    }
                    ctx.filter = "none";
                }

                // ─── Draw final frame ───
                if (isFrameBlur) {
                    ctx.filter = "blur(8px)";
                    ctx.drawImage(video, 0, 0, w, h);
                    ctx.filter = "none";
                } else if (!pinchActive) {
                    ctx.drawImage(video, 0, 0, w, h);
                }

                // Tint indikator untuk Closed_Fist
                if (hasFist && !hasVictory) {
                    ctx.fillStyle = "rgba(220, 30, 30, 0.25)";
                    ctx.fillRect(0, 0, w, h);
                }

                // Skeleton
                if (skeletonRef.current) {
                    for (const landmarks of result.landmarks) {
                        draw.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
                            color: "#d73ba0",
                            lineWidth: 8,
                        });
                        draw.drawLandmarks(landmarks, {
                            color: "#19c7e2",
                            lineWidth: 5,
                        });
                    }
                }
            }

            rafRef.current = requestAnimationFrame(loop);
        }

        return () => {
            active = false;
            cancelAnimationFrame(rafRef.current);
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            video.srcObject = null;

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHandsDetected(0);
            setGestures([]);
            setEffectMode(null);
            setPlayingAudio(null);
        };
    }, [ready, cameraOn]);

    return (
        <div
            className="light min-h-screen bg-[#f4ecdd] text-[#2e2a20]"
            data-theme="light"
        >
            {/* Audio elements */}
            <audio ref={audioJokowiRef} src="/assets/audio/hidup-jokowi.mp3" preload="auto" />
            <audio ref={audioBlurRef} src="/assets/audio/foto-kita-blur-cut.mp3" preload="auto" />

            <div className="mx-auto max-w-6xl px-6 py-10">
                <header className="mb-8">
                    <h1 className="text-2xl font-semibold tracking-tight">Hand Tracker</h1>
                    <p className="mt-1 text-sm text-[#8f8474]">
                        Pinch effects + gesture-triggered audio with MediaPipe.
                    </p>
                </header>

                <div className="flex flex-col gap-6 lg:flex-row">
                    {/* Main video area */}
                    <div className="relative aspect-video flex-1 overflow-hidden rounded-2xl border border-[#e4dac6] bg-[#efe7d6] shadow-sm">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full -scale-x-100 object-cover"
                        />
                        <canvas
                            ref={canvasRef}
                            className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover"
                        />

                        {/* Audio playing indicator */}
                        {playingAudio && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none">
                                <span className={cnm(
                                    "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white animate-pulse",
                                    playingAudio === "jokowi" ? "bg-red-600/90" : "bg-blue-600/90"
                                )}>
                                    🔊 {playingAudio === "jokowi" ? "Hidup Jokowi!!!" : "Foto Kita Blur"}
                                </span>
                            </div>
                        )}

                        {!cameraOn && (
                            <div className="absolute inset-0 grid place-items-center bg-[#efe7d6] text-sm text-[#9c9284]">
                                Camera is off
                            </div>
                        )}
                        {cameraOn && !ready && !error && (
                            <div className="absolute inset-0 grid place-items-center text-sm text-[#9c9284]">
                                Loading model…
                            </div>
                        )}
                        {error && (
                            <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        {cameraOn && ready && !error && (
                            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs backdrop-blur z-10">
                                <span className={cnm(
                                    "size-2 rounded-full",
                                    handsDetected > 0 ? "bg-green-500" : "bg-neutral-500"
                                )} />
                                {handsDetected > 0
                                    ? `${handsDetected} hand${handsDetected > 1 ? "s" : ""} tracked`
                                    : "No hands"}
                            </div>
                        )}

                        {cameraOn && ready && !error && effectMode && (
                            <div className="absolute right-3 top-3 rounded-full bg-white/80 px-3 py-1 text-xs font-medium capitalize backdrop-blur z-10">
                                {effectMode}
                            </div>
                        )}

                        {cameraOn && ready && !error && gestures.length > 0 && (
                            <div className="absolute left-3 top-12 flex flex-col gap-1.5 z-10">
                                {gestures.map((g, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-1.5 text-xs backdrop-blur"
                                    >
                                        <span className="font-medium">
                                            Hand {i + 1}
                                            {g.handedness && (
                                                <span className="text-[#9c9284]"> ({g.handedness})</span>
                                            )}
                                            :
                                        </span>
                                        <span className="text-[#d73ba0]">{g.gesture}</span>
                                        {g.score > 0 && (
                                            <span className="text-[#9c9284]">{Math.round(g.score * 100)}%</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Petunjuk gesture */}
                        {cameraOn && ready && !error && (
                            <div className="absolute right-3 top-12 rounded-lg bg-white/80 px-3 py-2 text-xs backdrop-blur z-10 space-y-0.5">
                                <div className="font-medium mb-1 text-[10px] text-[#9c9284]">EFFECTS:</div>
                                <div>✌️ Victory → 🔊 blur audio</div>
                                <div>✊ Closed Fist → 🔊 jokowi</div>
                                <div>🤏 Pinch → flip/blur/mos</div>
                            </div>
                        )}
                    </div>

                    {/* Settings panel */}
                    <Card className="w-full shrink-0 border-[#e4dac6] bg-[#fbf7ec] lg:w-80">
                        <Card.Header>
                            <Card.Title>Settings</Card.Title>
                            <Card.Description>Tune tracking and display.</Card.Description>
                        </Card.Header>
                        <Card.Content className="flex flex-col gap-6">
                            <label className="flex items-center justify-between gap-2">
                                <span className="text-sm">Number of hands</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={4}
                                    value={handsText}
                                    onChange={(e) => {
                                        const t = e.target.value;
                                        if (t === "" || /^[1-4]$/.test(t)) {
                                            setHandsText(t);
                                            if (t !== "") setNumHands(Number(t));
                                        }
                                    }}
                                    onBlur={() => setHandsText(String(numHands))}
                                    className="w-16 rounded-lg border border-[#e4dac6] bg-white px-3 py-1.5 text-center text-sm outline-none focus:border-[#d6c9ad]"
                                />
                            </label>

                            <div className="flex flex-col gap-4 border-t border-[#e8e0cf] pt-6">
                                <Switch className="w-full" isSelected={cameraOn} onChange={setCameraOn}>
                                    <Switch.Content className="w-full justify-between">
                                        Camera
                                        <Switch.Control><Switch.Thumb /></Switch.Control>
                                    </Switch.Content>
                                </Switch>

                                <Switch className="w-full" isSelected={skeletonOn} onChange={setSkeletonOn}>
                                    <Switch.Content className="w-full justify-between">
                                        Skeleton overlay
                                        <Switch.Control><Switch.Thumb /></Switch.Control>
                                    </Switch.Content>
                                </Switch>

                                <Switch className="w-full" isSelected={effectOn} onChange={setEffectOn}>
                                    <Switch.Content className="w-full justify-between">
                                        Pinch effect
                                        <Switch.Control><Switch.Thumb /></Switch.Control>
                                    </Switch.Content>
                                </Switch>

                                <div className="mt-4 text-xs text-[#9c9284] space-y-1.5">
                                    <p className="font-medium">Gesture Effects:</p>
                                    <p>✌️ <strong>Victory</strong> → blur + 🔊 "Foto Kita Blur"</p>
                                    <p>✊ <strong>Closed Fist</strong> → 🔊 "Hidup Jokowi!!!"</p>
                                </div>

                                <div className="text-xs text-[#9c9284] space-y-1.5">
                                    <p className="font-medium">Pinch Effects:</p>
                                    <p>👍👇→ <strong>Flip</strong> area</p>
                                    <p>👇👍→ <strong>Blur</strong> area</p>
                                    <p>✂️ Dua tangan → <strong>Mosaic</strong></p>
                                </div>
                            </div>
                        </Card.Content>
                    </Card>
                </div>
            </div>
        </div>
    );
}
