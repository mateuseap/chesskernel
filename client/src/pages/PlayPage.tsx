import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '@/services/socket';
import { api } from '@/services/api';
import { TIME_CONTROLS } from '@chesskernel/shared';
import type { TimeControlConfig } from '@chesskernel/shared';

const TIME_CONTROL_GROUPS = {
  Bullet: ['bullet_1_0', 'bullet_1_1', 'bullet_2_1'],
  Blitz: ['blitz_3_0', 'blitz_3_2', 'blitz_5_0', 'blitz_5_3'],
  Rapid: ['rapid_10_0', 'rapid_10_5', 'rapid_15_10'],
  Classical: ['classical_30_0', 'classical_30_20'],
};

const BOT_DIFFICULTIES = ['beginner', 'easy', 'medium', 'hard', 'expert', 'maximum'];

export function PlayPage() {
  const [selectedTc, setSelectedTc] = useState('blitz_3_0');
  const [inQueue, setInQueue] = useState(false);
  const [botMode, setBotMode] = useState(false);
  const [botDifficulty, setBotDifficulty] = useState('medium');
  const [botColor, setBotColor] = useState<'white' | 'black' | 'random'>('random');
  const navigate = useNavigate();

  const handleQueueJoin = () => {
    const socket = getSocket();

    socket.once('queue:matched', ({ gameId }) => {
      setInQueue(false);
      navigate(`/game/${gameId}`);
    });

    socket.emit('queue:join', { timeControlKey: selectedTc });
    setInQueue(true);
  };

  const handleQueueLeave = () => {
    const socket = getSocket();
    socket.emit('queue:leave');
    setInQueue(false);
  };

  const handleBotGame = async () => {
    try {
      const game = await api.post<{ id: string }>('/matchmaking/bot', {
        timeControlKey: selectedTc,
        difficulty: botDifficulty,
        colorPreference: botColor,
      });
      navigate(`/game/${game.id}`);
    } catch (err: any) {
      console.error('Failed to create bot game:', err.message);
    }
  };

  const tc = TIME_CONTROLS[selectedTc] as TimeControlConfig;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Play Chess</h1>

      <div className="flex gap-4 border-b pb-4">
        <button
          onClick={() => setBotMode(false)}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${!botMode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          Play Online
        </button>
        <button
          onClick={() => setBotMode(true)}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${botMode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          Play vs Bot
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Time Control</h2>
        {Object.entries(TIME_CONTROL_GROUPS).map(([group, keys]) => (
          <div key={group} className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{group}</p>
            <div className="flex gap-2 flex-wrap">
              {keys.map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedTc(key)}
                  className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                    selectedTc === key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted border-border'
                  }`}
                >
                  {TIME_CONTROLS[key].label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {botMode && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Bot Difficulty</h2>
          <div className="flex gap-2 flex-wrap">
            {BOT_DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setBotDifficulty(d)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize border transition-colors ${
                  botDifficulty === d
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted border-border'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-lg">Play as</h2>
            <div className="flex gap-2">
              {(['white', 'black', 'random'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setBotColor(c)}
                  className={`px-4 py-2 rounded-md text-sm font-medium capitalize border transition-colors ${
                    botColor === c
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted border-border'
                  }`}
                >
                  {c === 'white' ? '♔ White' : c === 'black' ? '♚ Black' : '🎲 Random'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="pt-4">
        {!botMode ? (
          inQueue ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                Searching for opponent ({tc.label})…
              </div>
              <button
                onClick={handleQueueLeave}
                className="text-sm text-destructive hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleQueueJoin}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Find Game ({tc.label})
            </button>
          )
        ) : (
          <button
            onClick={handleBotGame}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Play vs {botDifficulty} Bot ({tc.label})
          </button>
        )}
      </div>
    </div>
  );
}
