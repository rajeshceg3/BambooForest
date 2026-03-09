import { useState, useEffect } from 'react';

export function useIdle(timeout = 4000) {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      setIsIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIsIdle(true), timeout);
    };

    window.addEventListener('mousemove', reset);
    window.addEventListener('mousedown', reset);
    window.addEventListener('keydown', reset);
    window.addEventListener('touchstart', reset);
    window.addEventListener('wheel', reset);

    reset();

    return () => {
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('mousedown', reset);
      window.removeEventListener('keydown', reset);
      window.removeEventListener('touchstart', reset);
      window.removeEventListener('wheel', reset);
      clearTimeout(timer);
    };
  }, [timeout]);

  return isIdle;
}
