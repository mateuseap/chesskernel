import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Color } from '@chesskernel/shared';

interface ChessClockProps {
  whiteMs: number;
  blackMs: number;
  activeColor: Color;
  isGameActive: boolean;
  orientation: Color;
  playerName?: { top: string; bottom: string };
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface ClockDisplayProps {
  ms: number;
  isActive: boolean;
  name?: string;
  color: Color;
}

function ClockDisplay({ ms, isActive, name, color }: ClockDisplayProps) {
  const isLow = ms < 10_000 && ms > 0;
  const isDead = ms <= 0;

  return (
    <div className={cn(
      'flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-200',
      isActive
        ? 'bg-card border-primary shadow-md shadow-primary/20'
        : 'bg-muted/40 border-transparent opacity-70',
    )}>
      <div className="flex items-center gap-2">
        <div className={cn(
          'w-3 h-3 rounded-full',
          color === 'white' ? 'bg-white border border-gray-300' : 'bg-gray-900 dark:bg-gray-100 border border-gray-600',
        )} />
        {name && <span className="text-xs text-muted-foreground truncate max-w-[80px]">{name}</span>}
      </div>
      <span className={cn(
        'font-mono text-xl font-bold tabular-nums tracking-tight',
        isDead && 'text-destructive',
        isLow && !isDead && 'text-orange-500 dark:text-orange-400',
        isActive && !isLow && !isDead && 'text-foreground',
        !isActive && 'text-muted-foreground',
      )}>
        {formatTime(ms)}
      </span>
    </div>
  );
}

export function ChessClock({
  whiteMs,
  blackMs,
  activeColor,
  isGameActive,
  orientation,
  playerName,
}: ChessClockProps) {
  const [displayWhite, setDisplayWhite] = useState(whiteMs);
  const [displayBlack, setDisplayBlack] = useState(blackMs);
  // Track the running clocks in refs so the 100ms tick only re-renders when
  // the visible second actually changes (1 render/s instead of 10).
  const whiteRef = useRef(whiteMs);
  const blackRef = useRef(blackMs);

  useEffect(() => { whiteRef.current = whiteMs; setDisplayWhite(whiteMs); }, [whiteMs]);
  useEffect(() => { blackRef.current = blackMs; setDisplayBlack(blackMs); }, [blackMs]);

  useEffect(() => {
    if (!isGameActive) return;
    const ref = activeColor === 'white' ? whiteRef : blackRef;
    const setDisplay = activeColor === 'white' ? setDisplayWhite : setDisplayBlack;
    const iv = setInterval(() => {
      ref.current = Math.max(0, ref.current - 100);
      const next = ref.current;
      setDisplay((prev) =>
        Math.ceil(next / 1000) === Math.ceil(prev / 1000) && (next < 10_000) === (prev < 10_000)
          ? prev
          : next,
      );
    }, 100);
    return () => clearInterval(iv);
  }, [activeColor, isGameActive]);

  const topColor: Color = orientation === 'white' ? 'black' : 'white';
  const bottomColor = orientation;

  return (
    <div className="flex flex-col gap-1.5">
      <ClockDisplay
        ms={topColor === 'white' ? displayWhite : displayBlack}
        isActive={isGameActive && activeColor === topColor}
        name={playerName?.top}
        color={topColor}
      />
      <ClockDisplay
        ms={bottomColor === 'white' ? displayWhite : displayBlack}
        isActive={isGameActive && activeColor === bottomColor}
        name={playerName?.bottom}
        color={bottomColor}
      />
    </div>
  );
}
