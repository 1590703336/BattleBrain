import { useEffect, useState } from 'react';
import Badge from '../components/common/Badge';
import Card from '../components/common/Card';
import { ApiService } from '../services/ApiService';

interface LeaderRow {
  rank: number;
  id: string;
  name: string;
  level: number;
  xp: number;
  winRate: number;
  isAi: boolean;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    ApiService.getLeaderboard()
      .then((data) => {
        if (active) {
          setRows(data as LeaderRow[]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-5xl">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-[var(--font-display)] text-3xl tracking-[0.08em]">Leaderboard</h1>
          <Badge text="Season Alpha" tone="cyan" />
        </div>

        {loading ? (
          <p className="text-sm text-white/60">Syncing top players...</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/12">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.1em] text-white/60">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">XP</th>
                  <th className="px-4 py-3">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/10 odd:bg-black/20">
                    <td className="px-4 py-3 font-semibold">#{row.rank}</td>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] ${
                          row.isAi
                            ? 'border border-lime-300/30 bg-lime-300/12 text-lime-100'
                            : 'border border-cyan-300/30 bg-cyan-300/12 text-cyan-100'
                        }`}
                      >
                        {row.isAi ? 'AI' : 'Human'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.level}</td>
                    <td className="px-4 py-3">{row.xp}</td>
                    <td className="px-4 py-3">{row.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}
