import React from 'react';
import MonsterCard from './MonsterCard';
import { Button } from '@/components/ui/button';
import { Swords } from 'lucide-react';
import {
  BattleMonster,
  Ability,
  FloatingText,
  BattleLog,
} from '@shared/types';

interface CombatViewProps {
  playerMonster: BattleMonster;
  opponentMonster: BattleMonster;
  playerBench: BattleMonster[];
  opponentBench: BattleMonster[];
  isPlayerTurn: boolean;
  canSwap: boolean;
  battleLog: BattleLog[];
  battleEnded: boolean;
  winner: 'player' | 'ai' | null;
  logRef: React.RefObject<HTMLDivElement>;
  onAbilityClick: (ability: Ability) => void;
  onSwapMonster: (monsterId: number) => void;
  onForfeitTurn?: () => void;
  onRetreat: () => void;
  onPlayAgain: () => void;
  floatingTexts: FloatingText[];
  isTargeting: boolean;
  onTargetSelected: (targetId: number) => void;
}

const FloatingTextComponent: React.FC<{ text: FloatingText }> = ({ text }) => {
  const getColor = () => {
    switch (text.type) {
      case 'DAMAGE': return 'text-red-500';
      case 'HEAL': return 'text-green-400';
      case 'EVADE': return 'text-gray-400';
      case 'STATUS_APPLIED': return 'text-purple-400';
      case 'PASSIVE_ACTIVATE': return 'text-yellow-400';
      default: return 'text-white';
    }
  };

  return (
    <div
      key={text.id}
      className={`absolute inset-0 flex items-center justify-center pointer-events-none floating-text-anim font-bold text-4xl stroke-black ${getColor()}`}
      style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}
    >
      {text.text}
    </div>
  );
};

const BenchCard: React.FC<{
  monster: BattleMonster;
  onSwap?: (id: number) => void;
  disabled: boolean;
  isTargeting?: boolean;
  onTargetSelected?: (id: number) => void;
  floatingTexts: FloatingText[];
}> = ({
  monster,
  onSwap,
  disabled,
  isTargeting = false,
  onTargetSelected,
  floatingTexts,
}) => {
  const canBeTargeted = isTargeting && !monster.isFainted;

  return (
    <div className="relative flex flex-col items-center gap-1">
      <MonsterCard
        monster={monster.monster}
        userMonster={monster}
        size="tiny"
        isToggleable={true}
        isTargeting={isTargeting}
        isValidTarget={canBeTargeted}
        onTargetClick={canBeTargeted && onTargetSelected ? onTargetSelected : undefined}
        isBenchedFainted={monster.isFainted}
      />
      {onSwap && !isTargeting && (
        <Button
          onClick={() => onSwap(monster!.id)}
          disabled={disabled || monster.isFainted}
          size="sm"
          className="w-full text-xs h-6"
        >
          {monster.isFainted ? 'Fainted' : 'Swap'}
        </Button>
      )}
      {floatingTexts
        .filter((ft) => ft.targetId === monster.id)
        .map((ft) => (
          <FloatingTextComponent key={ft.id} text={ft} />
        ))}
    </div>
  );
};

export const CombatView: React.FC<CombatViewProps> = ({
  playerMonster,
  opponentMonster,
  playerBench,
  opponentBench,
  isPlayerTurn,
  canSwap,
  battleLog,
  battleEnded,
  winner,
  logRef,
  onAbilityClick,
  onSwapMonster,
  onForfeitTurn,
  onRetreat,
  onPlayAgain,
  floatingTexts,
  isTargeting,
  onTargetSelected,
}) => {
  return (
    <>
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-80px); opacity: 0; }
        }
        .floating-text-anim {
          animation: float-up 1.5s ease-out forwards;
        }
      `}</style>

      <div className="w-screen h-screen flex flex-col p-2 gap-2 bg-gray-800 text-white">
        <div className="flex-1 flex flex-col lg:flex-row gap-2 min-h-0">
          {/* Opponent Active Monster */}
          <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg relative">
            <div className="relative flex-grow flex items-center justify-center w-full">
              <MonsterCard
                monster={opponentMonster.monster}
                userMonster={opponentMonster}
                size="large"
                startExpanded={true}
                isToggleable={true}
              />
              {floatingTexts
                .filter((ft) => ft.targetId === opponentMonster.id)
                .map((ft) => (
                  <FloatingTextComponent key={ft.id} text={ft} />
                ))}
            </div>
          </div>
          {/* Player Active Monster */}
          <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg relative">
            <div className="relative flex-grow flex items-center justify-center w-full">
              <MonsterCard
                monster={playerMonster.monster}
                userMonster={playerMonster}
                onAbilityClick={onAbilityClick}
                onForfeitTurn={onForfeitTurn}
                isPlayerTurn={isPlayerTurn}
                size="large"
                startExpanded={true}
                isToggleable={false}
                isTargeting={isTargeting}
                isValidTarget={isTargeting}
                onTargetClick={onTargetSelected}
              />
              {floatingTexts
                .filter((ft) => ft.targetId === playerMonster.id)
                .map((ft) => (
                  <FloatingTextComponent key={ft.id} text={ft} />
                ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex-shrink-0 p-2 bg-gray-900/90 backdrop-blur-sm border-t-2 border-gray-700 h-[170px] rounded-lg">
          <div className="w-full h-full grid grid-cols-12 gap-4 items-center">
            {/* Opponent Bench */}
            <div className="col-span-4 flex flex-col justify-between h-full">
              <h3 className="text-xl font-semibold text-red-400 text-center">Opponent's Bench</h3>
              <div className="flex gap-2 items-end justify-center h-full">
                {opponentBench.map((monster) => (
                  <BenchCard
                    key={monster.id}
                    monster={monster}
                    disabled={true}
                    floatingTexts={floatingTexts}
                  />
                ))}
              </div>
            </div>
            {/* Battle Log */}
            <div className="col-span-4 flex flex-col justify-between h-full bg-gray-800/60 p-2 rounded">
              <div className="flex items-center justify-center gap-2">
                <Swords className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-bold text-center">Battle Log</h3>
              </div>
              <div className="overflow-y-auto h-full mt-1 font-mono text-sm" ref={logRef}>
                {battleLog.map((log, i) => (
                  <p key={i} className="mb-1 text-gray-300">
                    <span className="text-gray-500 mr-2">[{log.turn}]</span>{log.message}
                  </p>
                ))}
                {battleEnded && (
                  <div className="text-center mt-2">
                    <h2 className="text-lg font-bold text-yellow-400">
                      {winner === 'player' ? 'VICTORY!' : 'DEFEAT'}
                    </h2>
                    <Button onClick={onPlayAgain} className="mt-1" size="sm">Play Again</Button>
                  </div>
                )}
              </div>
              <div className={`mt-1 p-1 rounded-lg text-center w-full ${ battleEnded ? 'bg-yellow-600/50' : isPlayerTurn ? 'bg-cyan-600/50 animate-pulse' : 'bg-red-800/50'}`}>
                <p className="text-md font-bold uppercase tracking-widest">
                  {battleEnded ? 'BATTLE OVER' : isPlayerTurn ? 'YOUR TURN' : "OPPONENT'S TURN"}
                </p>
              </div>
            </div>
            {/* Player Bench */}
            <div className="col-span-4 flex flex-col justify-between h-full">
              <h3 className="text-xl font-semibold text-cyan-400 text-center">Your Bench</h3>
              <div className="flex gap-2 items-end justify-center h-full">
                {playerBench.map((monster) => (
                  <BenchCard
                    key={monster.id}
                    monster={monster}
                    onSwap={onSwapMonster}
                    disabled={!canSwap || battleEnded || monster.isFainted}
                    isTargeting={isTargeting}
                    onTargetSelected={onTargetSelected}
                    floatingTexts={floatingTexts}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};