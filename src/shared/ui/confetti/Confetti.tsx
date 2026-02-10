import { useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import styles from "./Confetti.module.css";

interface ConfettiProps {
  /** Auto fire confetti on mount */
  autoFire?: boolean;
  /** Amount of confetti particles to fire */
  particleCount?: number;
  /** Spread of confetti in degrees (0-360) */
  spread?: number;
  /** Initial velocity of confetti particles */
  startVelocity?: number;
  /** Gravity affecting confetti particles */
  gravity?: number;
  /** Decay rate of confetti particles (0-1, where 1 means no decay) */
  decay?: number;
  /** Scale factor for confetti size (default is 1) */
  scalar?: number;
}

function Confetti({
  autoFire = true,
  particleCount = 100,
  spread = 160,
  startVelocity = 30,
  gravity = 0.8,
  decay = 0.94,
  scalar = 1,
}: ConfettiProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiInstance = useRef<confetti.CreateTypes | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      confettiInstance.current = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      });
    }

    return () => {
      confettiInstance.current?.reset();
    };
  }, []);

  const fire = useCallback(() => {
    if (!confettiInstance.current) return;

    const defaults = {
      particleCount,
      spread,
      startVelocity,
      gravity,
      decay,
      scalar,
      ticks: 200,
      origin: { y: 0.6 },
    };

    // Salvo from the left
    confettiInstance.current({
      ...defaults,
      angle: 60,
      origin: { x: 0, y: 0.65 },
    });

    // Salvo from the right
    confettiInstance.current({
      ...defaults,
      angle: 120,
      origin: { x: 1, y: 0.65 },
    });

    // Salvo from the top center
    confettiInstance.current({
      ...defaults,
      angle: 90,
      origin: { x: 0.5, y: 0 },
      startVelocity: startVelocity * 1.5,
    });
  }, [particleCount, spread, startVelocity, gravity, decay, scalar]);

  useEffect(() => {
    if (autoFire) {
      // Small delay for better visual effect
      const timer = setTimeout(() => {
        fire();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [autoFire, fire]);

  return <canvas ref={canvasRef} className={styles.confettiCanvas} aria-hidden="true" />;
}

export default Confetti;
