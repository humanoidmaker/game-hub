import { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Maximize, Minimize, Gamepad2 } from 'lucide-react';
import { GAME_MAP } from '@/components/games/registry';

const RECENT_KEY = 'gh_recent';
const MAX_RECENT = 20;

interface RecentEntry { slug: string; name: string; icon: string; ts: number; }

function saveRecentGame(slug: string, name: string, icon: string) {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list: RecentEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(e => e.slug !== slug);
    filtered.unshift({ slug, name, icon, ts: Date.now() });
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
  } catch {}
}

const CATEGORY_COLORS: Record<string, string> = {
  Board: 'bg-amber-500/20 text-amber-400',
  Card: 'bg-red-500/20 text-red-400',
  Puzzle: 'bg-blue-500/20 text-blue-400',
  Arcade: 'bg-green-500/20 text-green-400',
  Sports: 'bg-orange-500/20 text-orange-400',
  Party: 'bg-pink-500/20 text-pink-400',
  Strategy: 'bg-purple-500/20 text-purple-400',
  Music: 'bg-cyan-500/20 text-cyan-400',
  Idle: 'bg-yellow-500/20 text-yellow-400',
};

// Dynamic game component loader — maps file names to lazy imports
const gameModules = import.meta.glob('../components/games/*.tsx');

export default function GamePage() {
  const { slug } = useParams<{ slug: string }>();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const game = slug ? GAME_MAP.get(slug) : undefined;

  const GameComponent = useMemo(() => {
    if (!game) return null;
    const modulePath = `../components/games/${game.file}.tsx`;
    const loader = gameModules[modulePath];
    if (!loader) return null;
    return lazy(() => loader().then((m: any) => ({ default: m.default })));
  }, [game]);

  useEffect(() => {
    if (game) saveRecentGame(game.slug, game.name, game.icon);
  }, [game]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (!game) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Gamepad2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Game not found</h1>
        <p className="text-muted-foreground mb-6">The game "{slug}" doesn't exist.</p>
        <Link to="/" className="px-4 py-2 bg-primary text-white rounded-lg text-sm">Back to Games</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-2xl">{game.icon}</span>
          <div>
            <h1 className="text-lg font-bold">{game.name}</h1>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${CATEGORY_COLORS[game.category] || ''}`}>
                {game.category}
              </span>
              <span className="text-xs text-muted-foreground">{game.description}</span>
            </div>
          </div>
        </div>
        <button onClick={toggleFullscreen} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>
      </div>

      {/* Game */}
      <div className="rounded-xl border border-border bg-card p-1 min-h-[400px]">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          {GameComponent && <GameComponent />}
        </Suspense>
      </div>

      {/* Back link */}
      <div className="mt-4 text-center">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
          ← Back to all games
        </Link>
      </div>
    </div>
  );
}
