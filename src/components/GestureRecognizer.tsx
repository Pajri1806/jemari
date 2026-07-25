import { useEffect, useRef, useState } from "react";
import {
    FilesetResolver,
    GestureRecognizer as GestureRecognizerTask,
    DrawingUtils,
} from "@mediapipe/tasks-vision";

type Hand = { label: string; gesture: string };

export default function GestureRecognizer() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const recognizerRef = useRef<GestureRecognizerTask | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef(0);

    const [hands, setHands] = useState<Hand[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [overlayText, setOverlayText] = useState<string | null>(null);
    const [overlayStyle, setOverlayStyle] = useState<"blur" | "red" | null>(null);

    useEffect(() => {
        let active = true;
        const video = videoRef.current!;
        let draw: DrawingUtils | null = null;

        (async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
                );

                const recognizer = await GestureRecognizerTask.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numHands: 2,
                });

                if (!active) {
                    recognizer.close();
                    return;
                }
                recognizerRef.current = recognizer;

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
                });

                if (!active) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                video.srcObject = stream;
                await video.play();
                detect();
            } catch {
                setError("Failed to start gesture recognition.");
            }
        })();

        function detect() {
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

                const detected: Hand[] = result.landmarks.map((landmarks, i) => {
                    draw!.drawConnectors(landmarks, GestureRecognizerTask.HAND_CONNECTIONS, {
                        color: "#ffffff",
                        lineWidth: 4,
                    });
                    draw!.drawLandmarks(landmarks, { color: "#999999", lineWidth: 2 });

                    const label = result.handedness[i]?.[0]?.categoryName ?? "";
                    const gesture = result.gestures[i]?.[0]?.categoryName;
                    return { label, gesture: gesture && gesture !== "None" ? gesture : "" };
                });

                setHands(detected);

                // Efek berdasarkan gesture
                const hasVictory = detected.some((h) => h.gesture === "Victory");
                const hasPointingUp = detected.some(
                    (h) => h.gesture === "Pointing_Up" || h.gesture === "ILoveYou"
                );

                if (hasVictory) {
                    ctx.filter = "blur(8px)";
                    setOverlayText("Foto kita blur");
                    setOverlayStyle("blur");
                } else if (hasPointingUp) {
                    setOverlayText("Hidup Jokowi!!!");
                    setOverlayStyle("red");
                } else {
                    setOverlayText(null);
                    setOverlayStyle(null);
                }

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                ctx.filter = "none";

                if (hasPointingUp && !hasVictory) {
                    ctx.fillStyle = "rgba(220, 30, 30, 0.35)";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            }

            rafRef.current = requestAnimationFrame(detect);
        }

        return () => {
            active = false;
            cancelAnimationFrame(rafRef.current);
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            recognizerRef.current?.close();
            recognizerRef.current = null;
        };
    }, []);

    return (
        <div className="relative mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-lg bg-black">
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

            {/* Overlay teks efek */}
            {overlayText && (
                <div className="absolute inset-0 grid place-items-center pointer-events-none select-none z-10">
                    <span
                        className={
                            overlayStyle === "blur"
                                ? "text-4xl font-extrabold text-white bg-white/20 backdrop-blur-md px-6 py-4 rounded-xl"
                                : "text-4xl font-extrabold text-white bg-red-600/80 animate-pulse px-6 py-4 rounded-xl"
                        }
                    >
                        {overlayText}
                    </span>
                </div>
            )}

            <div className="absolute left-3 top-3 space-y-1 z-20">
                {error ? (
                    <p className="rounded bg-black/70 px-3 py-1 text-sm font-medium text-white">
                        {error}
                    </p>
                ) : hands.length === 0 ? (
                    <p className="rounded bg-black/70 px-3 py-1 text-sm font-medium text-white">
                        Show your hands
                    </p>
                ) : (
                    hands.map((hand, i) => (
                        <p
                            key={i}
                            className="rounded bg-black/70 px-3 py-1 text-sm font-medium text-white"
                        >
                            {hand.label || "Hand"}
                            {hand.gesture && `: ${hand.gesture}`}
                        </p>
                    ))
                )}
            </div>

            {/* Petunjuk gesture */}
            <div className="absolute right-3 top-3 rounded-lg bg-black/60 px-3 py-2 text-xs text-white backdrop-blur z-20 space-y-1">
                <div className="font-medium mb-1 text-[10px] text-neutral-400">GESTURES:</div>
                <div>✌️ Victory → blur</div>
                <div>👆 Point Up → merah</div>
            </div>
        </div>
    );
}
