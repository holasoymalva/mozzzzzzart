import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";

export type HandPinchState = {
    isPinching: boolean;
    x: number;
    y: number;
    handType: 'Left' | 'Right';
    isOpen: boolean; // For 🖐️
};

export class HandTrackerService {
    private handLandmarker: HandLandmarker | null = null;
    private videoElement: HTMLVideoElement | null = null;
    public isRunning = false;
    private lastVideoTime = -1;

    async initialize() {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2,
        });
    }

    async startCamera(videoElement: HTMLVideoElement) {
        this.videoElement = videoElement;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: false
            });
            videoElement.srcObject = stream;
            videoElement.addEventListener("loadeddata", () => {
                videoElement.play();
                this.isRunning = true;
            });
        } catch (err) {
            console.error("Camera access failed", err);
        }
    }

    detectHands(): HandPinchState[] {
        if (!this.handLandmarker || !this.videoElement || !this.isRunning) return [];

        let results: HandLandmarkerResult | null = null;
        let startTimeMs = performance.now();
        if (this.lastVideoTime !== this.videoElement.currentTime) {
            this.lastVideoTime = this.videoElement.currentTime;
            results = this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);
        }

        if (!results || !results.landmarks) return [];

        const states: HandPinchState[] = [];
        for (let i = 0; i < results.landmarks.length; i++) {
            const landmarks = results.landmarks[i];
            const handedness = results.handednesses[i][0].categoryName; // 'Left' or 'Right'

            // Index 8 is index finger tip, index 4 is thumb tip
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];

            const dx = thumbTip.x - indexTip.x;
            const dy = thumbTip.y - indexTip.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const isPinching = distance < 0.05;

            // Check if open by measuring distance from wrist (0) to middle finger tip (12)
            const wrist = landmarks[0];
            const middleTip = landmarks[12];
            const openDistance = Math.hypot(wrist.x - middleTip.x, wrist.y - middleTip.y);
            const isOpen = openDistance > 0.4; // rough heuristic

            states.push({
                // Mirrors coordinates because webcam is flipped visually
                x: 1 - indexTip.x,
                y: indexTip.y,
                isPinching,
                isOpen,
                handType: handedness as 'Left' | 'Right'
            });
        }

        return states;
    }
}

export const handTracker = new HandTrackerService();
