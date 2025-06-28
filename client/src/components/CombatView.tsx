import React from 'react';
import MonsterCard from './MonsterCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { UserMonster, Monster, Ability } from '@/types/game';

interface CombatViewProps {
  playerMonster: UserMonster;
  opponentMonster: Monster;
  playerBench: UserMonster[];
  opponentBench: Monster[];
  isPlayerTurn: boolean;
  battleLog: string[];
  battleEnded: boolean;
  winner: 'player' | 'ai' | null;
  logRef: React.RefObject<HTMLDivElement>;
  onAbilityClick: (ability: Ability) => void;
  onSwapMonster: (monsterId: number) => void;
  onRetreat: () => void;
  onPlayAgain: () => void;
}

export const CombatView: React.FC<CombatViewProps> = ({
  playerMonster,
  opponentMonster,
  playerBench,
  opponentBench,
  isPlayerTurn,
  battleLog,
  battleEnded,
  winner,
  logRef,
  onAbilityClick,
  onSwapMonster,
  onRetreat,
  onPlayAgain,
}) => {
  return (
    <div className="w-screen h-screen p-2 flex flex-col lg:flex-row gap-2 bg-gray-900 text-white overflow-hidden">

      {/* Opponent's Field */}
      <div className="flex-1 flex flex-col items-center p-2 rounded-lg relative">
        <h2 className="absolute top-2 text-xl font-semibold text-red-400">Opponent</h2>
        <div className="flex-grow flex items-center justify-center w-full">
            <MonsterCard monster={opponentMonster} size="large" startExpanded={true} isToggleable={true} />
        </div>
        <div className="flex gap-2 items-end justify-center min-h-[120px]">
            {opponentBench.map(m => <MonsterCard key={m.id} monster={m} size="tiny" isToggleable={true} />)}
        </div>
      </div>

      {/* Player's Field */}
      <div className="flex-1 flex flex-col items-center p-2 rounded-lg relative">
        <h2 className="absolute top-2 text-xl font-semibold text-cyan-400">Your Monster</h2>
        <div className="flex-grow flex items-center justify-center w-full">
            <MonsterCard monster={playerMonster.monster} userMonster={playerMonster} onAbilityClick={onAbilityClick} isPlayerTurn={isPlayerTurn} size="large" startExpanded={true} isToggleable={false} />
        </div>
        <div className="flex gap-2 items-end justify-center min-h-[120px] invisible">
            {/* Placeholder for alignment */}
        </div>
      </div>

      {/* Fixed HUD at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-2 bg-gray-900/90 backdrop-blur-sm border-t-2 border-gray-700">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4 items-center h-[130px]">
             <div className="col-span-3 flex flex-col justify-center items-center text-white">
                <Button onClick={onRetreat} variant="outline" className="mb-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white" disabled={battleEnded}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Retreat
                </Button>
                <p className="text-xl font-bold uppercase tracking-widest">
                   {battleEnded ? "BATTLE OVER" : isPlayerTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
                </p>
             </div>
            <div className="col-span-5 bg-gray-800/60 p-2 rounded h-full overflow-y-auto font-mono text-sm" ref={logRef}>
                {battleLog.map((log, i) => <p key={i} className="mb-1">{`> ${log}`}</p>)}
                {battleEnded && (
                    <div className="text-center mt-2">
                        <h2 className="text-lg font-bold text-yellow-400">{winner === 'player' ? "VICTORY!" : "DEFEAT"}</h2>
                        <Button onClick={onPlayAgain} className="mt-1" size="sm">Play Again</Button>
                    </div>
                )}
            </div>
            <div className="col-span-4 flex gap-2 items-end justify-end h-full">
                {playerBench.map(monster => {
                     return (
                        <div key={monster.id} className="flex flex-col items-center gap-1">
                            <MonsterCard monster={monster.monster} userMonster={monster} size="tiny" isToggleable={true} />
                            <Button onClick={() => onSwapMonster(monster.id)} disabled={!isPlayerTurn || monster.hp <= 0 || battleEnded} size="xs" className="w-full text-xs h-6">Swap</Button>
                        </div>
                     )
                })}
            </div>
        </div>
      </div>
    </div>
  );
};