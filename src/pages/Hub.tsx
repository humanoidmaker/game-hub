import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Gamepad2 } from 'lucide-react';
import { GAMES, GAME_CATEGORIES, type GameInfo } from '@/components/games/registry';

const RECENT_KEY = 'gh_recent';
const MAX_RECENT = 6;

const CATEGORY_COLORS: Record<string, string> = {
  Board: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Card: 'bg-red-500/20 text-red-400 border-red-500/30',
  Puzzle: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Arcade: 'bg-green-500/20 text-green-400 border-green-500/30',
  Sports: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Party: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  Strategy: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Music: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Idle: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

export default function Hub() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecentSlugs(JSON.parse(raw).map((e: any) => e.slug || e).slice(0, MAX_RECENT));
    } catch {}
  }, []);

  const filtered = useMemo(() => {
    let list = GAMES;
    if (category !== 'All') list = list.filter(g => g.category === category);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(g => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q));
    }
    return list;
  }, [search, category]);

  const recentGames = recentSlugs.map(s => GAMES.find(g => g.slug === s)).filter(Boolean) as GameInfo[];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Gamepad2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">GameHub</h1>
          <p className="text-sm text-muted-foreground">{GAMES.length} free browser games — no download required</p>
        </div>
      </div>

      {/* Search + Categories */}
      <div className="flex flex-col gap-3 mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search games..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted border border-border text-sm outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="flex flex-wrap gap-2">
          {['All', ...GAME_CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                category === cat ? 'bg-primary text-white border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
              }`}>
              {cat} {cat !== 'All' && <span className="ml-1 opacity-60">({GAMES.filter(g => g.category === cat).length})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Recent */}
      {recentGames.length > 0 && category === 'All' && !search && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recently Played</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {recentGames.map(g => (
              <Link key={g.slug} to={`/play/${g.slug}`}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors">
                <span className="text-xl">{g.icon}</span>
                <span className="text-xs font-medium truncate">{g.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Games Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filtered.map(g => (
          <Link key={g.slug} to={`/play/${g.slug}`}
            className="group p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-card/80 transition-all hover:scale-[1.02]">
            <div className="text-3xl mb-2">{g.icon}</div>
            <h3 className="text-sm font-semibold mb-0.5 group-hover:text-primary transition-colors">{g.name}</h3>
            <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{g.description}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[g.category] || 'bg-muted text-muted-foreground border-border'}`}>
              {g.category}
            </span>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Gamepad2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No games found</p>
          <p className="text-sm mt-1">Try a different search or category</p>
        </div>
      )}
    </div>
  );
}
