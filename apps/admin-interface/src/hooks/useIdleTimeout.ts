/**
 * @file useIdleTimeout.ts
 * @description 30 Dakikalık Boşta Kalma (Idle Session) ve Güvenlik Zamanlayıcısı Kancası.
 * Kullanıcı hareketsiz kaldığında 2 dakika kala geri sayım uyarısı verir ve süresi dolunca otomatik oturumu kapatır.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseIdleTimeoutOptions {
  timeoutMs?: number;       // Varsayılan: 30 dakika (1.800.000 ms)
  promptBeforeMs?: number;  // Uyarı süresi: 2 dakika (120.000 ms)
  onTimeout: () => void;
  enabled?: boolean;
}

export function useIdleTimeout({
  timeoutMs = 30 * 60 * 1000,
  promptBeforeMs = 2 * 60 * 1000,
  onTimeout,
  enabled = true,
}: UseIdleTimeoutOptions) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.round(promptBeforeMs / 1000));

  const lastActivityRef = useRef<number>(Date.now());
  const promptTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowPrompt(false);
    setRemainingSeconds(Math.round(promptBeforeMs / 1000));

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, [promptBeforeMs]);

  useEffect(() => {
    if (!enabled) return;

    const promptThresholdMs = timeoutMs - promptBeforeMs;

    const checkInterval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;

      if (idleTime >= timeoutMs) {
        clearInterval(checkInterval);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setShowPrompt(false);
        onTimeout();
      } else if (idleTime >= promptThresholdMs && !showPrompt) {
        setShowPrompt(true);
        const secondsLeft = Math.max(0, Math.round((timeoutMs - idleTime) / 1000));
        setRemainingSeconds(secondsLeft);

        if (!countdownIntervalRef.current) {
          countdownIntervalRef.current = setInterval(() => {
            const currentIdle = Date.now() - lastActivityRef.current;
            const left = Math.max(0, Math.round((timeoutMs - currentIdle) / 1000));
            setRemainingSeconds(left);
            if (left <= 0) {
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
              setShowPrompt(false);
              onTimeout();
            }
          }, 1000);
        }
      }
    }, 5000);

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    const handleActivity = () => {
      // Eğer geri sayım uyarısı görünmüyorsa etkinliği güncelle
      if (!showPrompt) {
        lastActivityRef.current = Date.now();
      }
    };

    for (const event of activityEvents) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearInterval(checkInterval);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
      for (const event of activityEvents) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled, timeoutMs, promptBeforeMs, onTimeout, showPrompt]);

  return {
    showPrompt,
    remainingSeconds,
    stayLoggedIn: resetTimer,
  };
}
