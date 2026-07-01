import { useEffect, useState } from 'react';
import type { Color } from '@chesskernel/shared';

interface ChessClockProps {
  whiteMs: number;
  blackMs: number;
  activeColor: Color;
  isGameActive: boolean;
  orientation: Color;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function ChessClock({
  whiteMs,
  blackMs,
  activeColor,
  isGameActive,
  orientation,
}: ChessClockProps) {
  const [displayWhite, setDisplayWhite] = useState(whiteMs);
  const [displayBlack, setDisplayBlack] = useState(blackMs);

  useEffect(() => {
    setDisplayWhite(whiteMs);
    setDisplayBlack(blackMs);
  }, [whiteMs, blackMs]);

  useEffect(() => {
    if (!isGameActive) return;

    const interval = setInterval(() => {
      if (activeColor === 'white') {
        setDisplayWhite((prev) => Math.max(0, prev - 100));
      } else {
        setDisplayBlack((prev) => Math.max(0, prev - 100));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeColor, isGameActive]);

  const topColor = orientation === 'white' ? 'black' : 'white';
  const bottomColor = orientation;

  const topMs = topColor === 'white' ? displayWhite : displayBlack;
  const bottomMs = bottomColor === 'white' ? displayWhite : displayBlack;
  const isTopActive = activeColor === topColor;
  const isBottomActive = activeColor === bottomColor;

  return (
    <div className="flex flex-col gap-2">
      <ClockDisplay ms={topMs} isActive={isTopActive && isGameActive} />
      <ClockDisplay ms={bottomMs} isActive={isBottomActive && isGameActive} />
    </div>
  );
}

function ClockDisplay({ ms, isActive }: { ms: number; isActive: boolean }) {
  const isLow = ms < 10_000;
  const isEmpty = ms <= 0;

  return (
    <div
      className={`px-4 py-2 rounded-md font-mono text-2xl font-bold text-center min-w-[120px] transition-colors ${
        isEmpty
          ? 'bg-red-600 text-white'
          : isLow
            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
            : isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
      }`}
    >
      {formatTime(ms)}
    </div>
  );
}
