import { AnimatePresence } from 'framer-motion';
import { MatchCandidate } from '../../types/socket';
import SwipeCard from './SwipeCard';

interface CardStackProps {
  cards: MatchCandidate[];
  onSwipe: (direction: 'left' | 'right', candidate: MatchCandidate) => void;
}

export default function CardStack({ cards, onSwipe }: CardStackProps) {
  return (
    <div className="relative h-[340px] w-full md:h-[380px]">
      <AnimatePresence>
        {cards.slice(0, 3).map((candidate, index) => (
          <SwipeCard key={candidate.id} candidate={candidate} index={index} onSwipe={onSwipe} />
        ))}
      </AnimatePresence>
    </div>
  );
}
