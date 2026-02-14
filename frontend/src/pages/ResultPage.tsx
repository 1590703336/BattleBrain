import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import ResultCard from '../components/battle/ResultCard';
import Badge from '../components/common/Badge';
import Card from '../components/common/Card';
import { ApiService } from '../services/ApiService';
import { BattleHistoryItem, useBattleStore } from '../stores/battleStore';
import { useMatchStore } from '../stores/matchStore';
import { BattleHistoryResponse } from '../types/socket';

interface UnifiedRecord {
  id: string;
  topic: string;
  winner: 'me' | 'opponent' | 'draw';
  finishedAt: number;
  stats: {
    myDamage: number;
    opponentDamage: number;
    messageCount: number;
    goodStrikes: number;
    toxicStrikes: number;
  };
  opponentName: string;
  opponentLevel: number;
}

function toUnifiedFromStore(item: BattleHistoryItem): UnifiedRecord {
  return {
    id: item.id,
    topic: item.topic,
    winner: item.winner,
    finishedAt: item.finishedAt,
    stats: item.stats,
    opponentName: item.opponent.name,
    opponentLevel: item.opponent.level,
  };
}

function toUnifiedFromApi(item: BattleHistoryResponse): UnifiedRecord {
  return {
    id: item.id,
    topic: item.topic,
    winner: item.winner,
    finishedAt: new Date(item.finishedAt).getTime(),
    stats: item.stats,
    opponentName: item.opponent.name,
    opponentLevel: item.opponent.level,
  };
}

export default function ResultPage() {
  const navigate = useNavigate();
  const resetMatchQueue = useMatchStore((state) => state.reset);
  const { myHp, opponentHp, stats, history, resetCurrent } = useBattleStore(
    useShallow((state) => ({
      myHp: state.myHp,
      opponentHp: state.opponentHp,
      stats: state.stats,
      history: state.history,
      resetCurrent: state.resetCurrent,
    }))
  );

  const [apiHistory, setApiHistory] = useState<BattleHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    ApiService.getBattleHistory('me', 20)
      .then((res) => {
        if (active) {
          setApiHistory(res);
        }
      })
      .catch(() => {
        if (active) {
          setApiHistory([]);
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

  const mergedRecords = useMemo(() => {
    const local = history.map(toUnifiedFromStore);
    const remote = apiHistory.map(toUnifiedFromApi);
    const map = new Map<string, UnifiedRecord>();

    [...local, ...remote].forEach((record) => {
      if (!map.has(record.id)) {
        map.set(record.id, record);
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.finishedAt - a.finishedAt)
      .slice(0, 20);
  }, [history, apiHistory]);

  const winner = useMemo<'me' | 'opponent' | 'draw'>(() => {
    if (mergedRecords[0]) {
      return mergedRecords[0].winner;
    }
    if (myHp === opponentHp) {
      return 'draw';
    }
    return myHp > opponentHp ? 'me' : 'opponent';
  }, [mergedRecords, myHp, opponentHp]);

  const displayStats = mergedRecords[0]?.stats ?? stats;

  return (
    <section className="mx-auto max-w-4xl space-y-4 py-6 md:space-y-5 md:py-12">
      <ResultCard
        winner={winner}
        stats={displayStats}
        onReplay={() => {
          resetCurrent();
          resetMatchQueue();
          navigate('/match');
        }}
      />

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-[var(--font-display)] text-lg tracking-[0.08em]">Records</h3>
          <Badge text={`${mergedRecords.length} total`} tone="cyan" />
        </div>

        {loading ? (
          <p className="text-sm text-white/60">Syncing records...</p>
        ) : mergedRecords.length === 0 ? (
          <p className="text-sm text-white/60">No battle records yet.</p>
        ) : (
          <ul className="space-y-2">
            {mergedRecords.map((item) => (
              <li key={item.id} className="rounded-xl border border-white/12 bg-black/20 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                  <span>{new Date(item.finishedAt).toLocaleString()}</span>
                  <span>
                    {item.opponentName} · Lv.{item.opponentLevel}
                  </span>
                  <span className="uppercase tracking-[0.08em]">{item.winner}</span>
                </div>
                <p className="mt-1 text-sm text-white/90">{item.topic}</p>
                <p className="mt-1 text-xs text-white/65">
                  DMG {item.stats.myDamage}/{item.stats.opponentDamage} · Msg {item.stats.messageCount} · Good {item.stats.goodStrikes} · Toxic {item.stats.toxicStrikes}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
