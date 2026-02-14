import gsap from 'gsap';
import { useRef } from 'react';
import { RefObject } from 'react';
import Button from '../common/Button';

interface PowerState {
  meme: number;
  pun: number;
  dodge: number;
}

interface PowerUpPanelProps {
  cooldowns: PowerState;
  onActivate: (name: keyof PowerState) => void;
}

export default function PowerUpPanel({ cooldowns, onActivate }: PowerUpPanelProps) {
  const refs = {
    meme: useRef<HTMLDivElement>(null),
    pun: useRef<HTMLDivElement>(null),
    dodge: useRef<HTMLDivElement>(null),
  };

  const trigger = (name: keyof PowerState) => {
    if (cooldowns[name] > 0) {
      return;
    }

    const node = refs[name].current;
    if (node) {
      gsap.fromTo(node, { scale: 0.95 }, { scale: 1.04, yoyo: true, repeat: 1, duration: 0.12 });
    }

    onActivate(name);
  };

  return (
    <div className="grid gap-2 md:grid-cols-3">
      <PowerCell
        refEl={refs.meme}
        title="Meme Attack"
        subtitle="Boost wit impact"
        cooldown={cooldowns.meme}
        onClick={() => trigger('meme')}
      />
      <PowerCell
        refEl={refs.pun}
        title="Pun Attack"
        subtitle="Raise good strike odds"
        cooldown={cooldowns.pun}
        onClick={() => trigger('pun')}
      />
      <PowerCell
        refEl={refs.dodge}
        title="Dodge"
        subtitle="Reduce next incoming dmg"
        cooldown={cooldowns.dodge}
        onClick={() => trigger('dodge')}
      />
    </div>
  );
}

function PowerCell({
  refEl,
  title,
  subtitle,
  cooldown,
  onClick,
}: {
  refEl: RefObject<HTMLDivElement | null>;
  title: string;
  subtitle: string;
  cooldown: number;
  onClick: () => void;
}) {
  return (
    <div ref={refEl} className="rounded-2xl border border-white/12 bg-black/25 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <span className="text-xs text-white/65">{cooldown > 0 ? `${cooldown} msg` : 'Ready'}</span>
      </div>
      <p className="mt-1 text-xs text-white/60">{subtitle}</p>
      <Button variant={cooldown > 0 ? 'ghost' : 'primary'} onClick={onClick} disabled={cooldown > 0} className="mt-3 w-full">
        {cooldown > 0 ? 'Cooling' : 'Activate'}
      </Button>
    </div>
  );
}
