import { useEffect, useState } from "react";

function formatSecondsRemaining(secondsRemaining: number) {
  const totalSeconds = Math.max(0, Math.floor(secondsRemaining));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function useOtpCountdown() {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsRemaining]);

  return {
    secondsRemaining,
    formattedTime: formatSecondsRemaining(secondsRemaining),
    isActive: secondsRemaining > 0,
    start: (nextSeconds: number) => setSecondsRemaining(Math.max(0, Math.floor(nextSeconds))),
    reset: () => setSecondsRemaining(0),
  };
}
