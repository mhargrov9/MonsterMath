import React from 'react';
import { User } from '@/types/game';

interface CurrencyDisplayProps {
  user: User | undefined | null;
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ user }) => {
  return (
    <div className="flex items-center space-x-4">
      <div className="bg-yellow-400/20 text-yellow-300 font-bold px-4 py-2 rounded-lg">
        {user?.gold ?? 0} Gold
      </div>
      <div className="bg-blue-400/20 text-blue-300 font-bold px-4 py-2 rounded-lg">
        {user?.diamonds ?? 0} Diamonds
      </div>
    </div>
  );
};

export default CurrencyDisplay;