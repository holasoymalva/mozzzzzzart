import { useRef, useState, useCallback } from 'react';
import './index.css';
import { handTracker } from './handTracker';
import { audioEngine } from './audio';

const QUADRANTS = [
  { id: 0, title: 'Beat', emoji: '🥁' },
  { id: 1, title: 'Bass', emoji: '🎸' },
  { id: 2, title: 'Lead', emoji: '🎹' },
  { id: 3, title: 'Pad', emoji: '🎻' },
];

function getQuadrantIndex(x: number, y: number): number {
  if (x < 0.5 && y < 0.5) return 0;
  if (x >= 0.5 && y < 0.5) return 1;
  if (x < 0.5 && y >= 0.5) return 2;
  return 3;
}

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [loops, setLoops] = useState<boolean[]>([false, false, false, false]);

  // Refs for performance, avoid 60FPS re-renders
  const lastToggleTimeRef = useRef<number>(0);
  const activeQuadsRef = useRef<boolean[]>([false, false, false, false]);
  const leftPointerRef = useRef<HTMLDivElement>(null);
  const rightPointerRef = useRef<HTMLDivElement>(null);

  const renderLoop = useCallback(() => {
    if (!handTracker.isRunning) {
      requestAnimationFrame(renderLoop);
      return;
    }

    const hands = handTracker.detectHands();

    let leftHand = hands.find(h => h.handType === 'Left');
    let rightHand = hands.find(h => h.handType === 'Right');

    const now = Date.now();

    // Handle Left Hand selection
    if (leftHand && leftHand.isPinching) {
      if (now - lastToggleTimeRef.current > 1000) {
        const qIdx = getQuadrantIndex(leftHand.x, leftHand.y);
        activeQuadsRef.current[qIdx] = !activeQuadsRef.current[qIdx];
        audioEngine.setLoop(qIdx, activeQuadsRef.current[qIdx]);

        // Update state to re-render UI selectively (max once per second roughly)
        setLoops([...activeQuadsRef.current]);
        lastToggleTimeRef.current = now;
      }
    }

    // Handle Right Hand modulation
    if (rightHand && rightHand.isOpen) {
      const qIdx = getQuadrantIndex(rightHand.x, rightHand.y);
      audioEngine.modulate(rightHand.x, rightHand.y, qIdx);
    }

    // Update DOM directly for pointers to avoid 60FPS re-renders
    if (leftPointerRef.current) {
      if (leftHand) {
        leftPointerRef.current.style.display = 'flex';
        leftPointerRef.current.style.left = `${leftHand.x * 100}vw`;
        leftPointerRef.current.style.top = `${leftHand.y * 100}vh`;
        leftPointerRef.current.innerText = leftHand.isPinching ? '👌' : '👈';
      } else {
        leftPointerRef.current.style.display = 'none';
      }
    }

    if (rightPointerRef.current) {
      if (rightHand) {
        rightPointerRef.current.style.display = 'flex';
        rightPointerRef.current.style.left = `${rightHand.x * 100}vw`;
        rightPointerRef.current.style.top = `${rightHand.y * 100}vh`;
        rightPointerRef.current.innerText = rightHand.isOpen ? '🖐️' : '✊';
      } else {
        rightPointerRef.current.style.display = 'none';
      }
    }

    requestAnimationFrame(renderLoop);
  }, []);

  const handlePlay = async () => {
    setIsPlaying(true);
    await audioEngine.start();
    if (videoRef.current) {
      await handTracker.initialize();
      await handTracker.startCamera(videoRef.current);
      requestAnimationFrame(renderLoop);
    }
  };

  return (
    <div className="app-container">
      <div className="texture-overlay"></div>
      <video ref={videoRef} className="webcam-bg" playsInline muted></video>

      {!isPlaying && (
        <div className="play-overlay">
          <button className="play-btn" onClick={handlePlay}>
            Start Playing 🧸
          </button>
        </div>
      )}

      {isPlaying && (
        <div className="status-bar">
          <div className="instruction">👌 Mano Izquierda: Activar/Desactivar sonido</div>
          <div className="instruction">|</div>
          <div className="instruction">🖐️ Mano Derecha: Modular sonido</div>
        </div>
      )}

      <div className="grid-container">
        {QUADRANTS.map((quad) => (
          <div
            key={quad.id}
            className={`quadrant ${loops[quad.id] ? 'selected' : ''}`}
          >
            <div className="emoji-icon">{quad.emoji}</div>
          </div>
        ))}
      </div>

      <div ref={leftPointerRef} className="hand-pointer left" style={{ display: 'none' }}></div>
      <div ref={rightPointerRef} className="hand-pointer right" style={{ display: 'none' }}></div>
    </div>
  );
}
