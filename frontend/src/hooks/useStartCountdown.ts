import { useCallback, useEffect, useRef, useState } from "react";

interface UseStartCountdownOptions {
  duration?: number;
  onComplete: () => void | Promise<void>;
}

export function useStartCountdown({
  duration = 3,
  onComplete,
}: UseStartCountdownOptions) {
  const [isCountdownVisible, setIsCountdownVisible] = useState(false);
  const [countdownValue, setCountdownValue] = useState(duration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearCountdownInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cancelCountdown = useCallback(() => {
    clearCountdownInterval();
    setIsCountdownVisible(false);
    setCountdownValue(duration);
  }, [clearCountdownInterval, duration]);

  const startCountdown = useCallback(() => {
    clearCountdownInterval();
    setCountdownValue(duration);
    setIsCountdownVisible(true);

    intervalRef.current = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          clearCountdownInterval();
          setIsCountdownVisible(false);
          void onCompleteRef.current();
          return duration;
        }

        return prev - 1;
      });
    }, 1000);
  }, [clearCountdownInterval, duration]);

  const skipCountdown = useCallback(() => {
    clearCountdownInterval();
    setIsCountdownVisible(false);
    setCountdownValue(duration);
    void onCompleteRef.current();
  }, [clearCountdownInterval, duration]);

  useEffect(() => {
    return () => {
      clearCountdownInterval();
    };
  }, [clearCountdownInterval]);

  return {
    isCountdownVisible,
    countdownValue,
    startCountdown,
    cancelCountdown,
    skipCountdown,
  };
}
