import React from 'react';
import MonsterCard from './MonsterCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Swords } from 'lucide-react';
import {
  UserMonster,
  Monster,
  Ability,
  FloatingText,
  BattleLog as BattleLogType,
} from '@/shared/types';

interface CombatViewProps {
  playerMonster: UserMonster;
  opponentMonster: Monster;
  playerBench: UserMonster[];
  opponentBench: Monster[];
  isPlayerTurn: boolean;
  canSwap: boolean;
  battleLog: BattleLogType[];
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
      case 'damage':
        return 'text-red-500';
      case 'crit':
        return 'text-red-400 font-black';
      case 'heal':
        return 'text-green-400';
      case 'stat':
        return 'text-blue-400';
      case 'status':
        return 'text-purple-400';
      case 'miss':
        return 'text-gray-400';
      default:
        return 'text-yellow-400';
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
  monster: UserMonster | Monster;
  isPlayer: boolean;
  onSwap?: (id: number) => void;
  disabled: boolean;
  isTargeting?: boolean;
  onTargetSelected?: (id: number) => void;
  floatingTexts: FloatingText[]; // <-- ADDED: Receive floating texts
}> = ({
  monster,
  isPlayer,
  onSwap,
  disabled,
  isTargeting = false,
  onTargetSelected,
  floatingTexts,
}) => {
  const userMonster = isPlayer ? (monster as UserMonster) : undefined;
  const baseMonster = isPlayer
    ? (monster as UserMonster).monster
    : (monster as Monster);
  const isFainted = 'hp' in monster && monster.hp <= 0;
  const canBeTargeted = isTargeting && isPlayer && !isFainted;

  return (
    <div className="relative flex flex-col items-center gap-1">
      {' '}
      {/* <-- ADDED: position: relative */}
      <MonsterCard
        monster={baseMonster}
        userMonster={userMonster}
        size="tiny"
        isToggleable={true}
        isTargeting={isTargeting}
        isValidTarget={canBeTargeted}
        onTargetClick={
          canBeTargeted && onTargetSelected ? onTargetSelected : undefined
        }
      />
      {isPlayer && onSwap && !isTargeting && (
        <Button
          onClick={() => onSwap(userMonster!.id)}
          disabled={disabled || isFainted}
          size="sm"
          className="w-full text-xs h-6"
        >
          {isFainted ? 'Fainted' : 'Swap'}
        </Button>
      )}
      {/* Map and render floating texts specific to this benched monster */}
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
  const getLogColor = (turn: 'player' | 'ai' | 'system') => {
    switch (turn) {
      case 'player':
        return 'text-cyan-300';
      case 'ai':
        return 'text-red-300';
      case 'system':
      default:
        return 'text-gray-400';
    }
  };

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
          <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg relative">
            <div className="relative flex-grow flex items-center justify-center w-full">
              <MonsterCard
                monster={opponentMonster}
                size="large"
                startExpanded={true}
                isToggleable={true}
              />
              {floatingTexts
                .filter(
                  (ft) =>
                    !ft.isPlayerTarget && ft.targetId === opponentMonster.id,
                )
                .map((ft) => (
                  <FloatingTextComponent key={ft.id} text={ft} />
                ))}
            </div>
          </div>

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
                .filter(
                  (ft) => ft.isPlayerTarget && ft.targetId === playerMonster.id,
                )
                .map((ft) => (
                  <FloatingTextComponent key={ft.id} text={ft} />
                ))}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 p-2 bg-gray-900/90 backdrop-blur-sm border-t-2 border-gray-700 h-[170px] rounded-lg">
          <div className="w-full h-full grid grid-cols-12 gap-4 items-center">
            <div className="col-span-4 flex flex-col justify-between h-full">
              <h3 className="text-xl font-semibold text-red-400 text-center">
                Opponent's Bench
              </h3>
              <div className="flex gap-2 items-end justify-center h-full">
                {opponentBench.map((monster) => (
                  <BenchCard
                    key={monster.id}
                    monster={monster}
                    isPlayer={false}
                    disabled={true}
                    floatingTexts={floatingTexts.filter(
                      (ft) => !ft.isPlayerTarget,
                    )} // Pass relevant texts
                  />
                ))}
              </div>
            </div>

            <div className="col-span-4 flex flex-col justify-between h-full bg-gray-800/60 p-2 rounded">
              <div className="flex items-center justify-center gap-2">
                <Swords className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-bold text-center">Battle Log</h3>
              </div>
              <div
                className="overflow-y-auto h-full mt-1 font-mono text-sm"
                ref={logRef}
              >
                {battleLog.map((log, i) => (
                  <p key={i} className={`mb-1 ${getLogColor(log.turn)}`}>
                    {`> ${log.message}`}
                  </p>
                ))}
                {battleEnded && (
                  <div className="text-center mt-2">
                    <h2 className="text-lg font-bold text-yellow-400">
                      {winner === 'player' ? 'VICTORY!' : 'DEFEAT'}
                    </h2>
                    <Button onClick={onPlayAgain} className="mt-1" size="sm">
                      Play Again
                    </Button>
                  </div>
                )}
              </div>
              <div
                className={`mt-1 p-1 rounded-lg text-center w-full ${
                  battleEnded
                    ? 'bg-yellow-600/50'
                    : isPlayerTurn
                      ? 'bg-cyan-600/50 animate-pulse'
                      : 'bg-red-800/50'
                }`}
              >
                <p className="text-md font-bold uppercase tracking-widest">
                  {battleEnded
                    ? 'BATTLE OVER'
                    : isPlayerTurn
                      ? 'YOUR TURN'
                      : "OPPONENT'S TURN"}
                </p>
              </div>
            </div>

            <div className="col-span-4 flex flex-col justify-between h-full">
              <h3 className="text-xl font-semibold text-cyan-400 text-center">
                Your Bench
              </h3>
              <div className="flex gap-2 items-end justify-center h-full">
                {playerBench.map((monster) => (
                  <BenchCard
                    key={monster.id}
                    monster={monster}
                    isPlayer={true}
                    onSwap={onSwapMonster}
                    disabled={!canSwap || battleEnded}
                    isTargeting={isTargeting}
                    onTargetSelected={onTargetSelected}
                    floatingTexts={floatingTexts.filter(
                      (ft) => ft.isPlayerTarget,
                    )} // Pass relevant texts
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