import React from 'react';
import MonsterCard from './MonsterCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Swords } from 'lucide-react';
import { UserMonster, Monster, Ability, FloatingText } from '@/shared/types';

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
  floatingTexts: FloatingText[];
}

const FloatingTextComponent: React.FC<{ text: FloatingText }> = ({ text }) => {
    const colorClass = text.type === 'damage' ? 'text-red-500' 
                     : text.type === 'heal'   ? 'text-green-400'
                     : 'text-yellow-400';
    return (
        <div 
            key={text.id} 
            className={`absolute inset-0 flex items-center justify-center pointer-events-none floating-text-anim font-bold text-4xl stroke-black ${colorClass}`}
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}
        >
            {text.text}
        </div>
    );
};

const BenchCard: React.FC<{ monster: UserMonster | Monster, isPlayer: boolean, onSwap?: (id: number) => void, disabled: boolean }> = ({ monster, isPlayer, onSwap, disabled }) => {
    const userMonster = isPlayer ? (monster as UserMonster) : undefined;
    const baseMonster = isPlayer ? (monster as UserMonster).monster : (monster as Monster);
    const isFainted = ('hp' in monster && monster.hp <= 0);

    return (
        <div className="flex flex-col items-center gap-1">
            <MonsterCard 
                monster={baseMonster} 
                userMonster={userMonster} 
                size="tiny" 
                isToggleable={true} 
            />
            {isPlayer && onSwap && (
                <Button onClick={() => onSwap(userMonster!.id)} disabled={disabled || isFainted} size="xs" className="w-full text-xs h-6">
                    {isFainted ? 'Fainted' : 'Swap'}
                </Button>
            )}
        </div>
    );
};

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
  floatingTexts,
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

      {/* Main container: A robust flex column layout that prevents clipping */}
      <div className="w-screen h-screen flex flex-col p-2 gap-2 bg-gray-800 text-white">

        {/* Top Section: Battlefields (this part will grow and shrink) */}
        <div className="flex-1 flex flex-col lg:flex-row gap-2 min-h-0">
            {/* Opponent's Field */}
            <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg relative">
              <div className="relative flex-grow flex items-center justify-center w-full">
                <MonsterCard monster={opponentMonster} size="large" startExpanded={true} isToggleable={true} />
                {floatingTexts.filter(ft => !ft.isPlayerTarget && ft.targetId === opponentMonster.id).map(ft => (
                    <FloatingTextComponent key={ft.id} text={ft} />
                ))}
              </div>
            </div>

            {/* Player's Field */}
            <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg relative">
               <div className="relative flex-grow flex items-center justify-center w-full">
                  <MonsterCard 
                      monster={playerMonster.monster} 
                      userMonster={playerMonster} 
                      onAbilityClick={onAbilityClick}
                      isPlayerTurn={isPlayerTurn} 
                      size="large" 
                      startExpanded={true} 
                      isToggleable={false} 
                  />
                  {floatingTexts.filter(ft => ft.isPlayerTarget && ft.targetId === playerMonster.id).map(ft => (
                      <FloatingTextComponent key={ft.id} text={ft} />
                  ))}
              </div>
            </div>
        </div>

        {/* Fixed HUD at the bottom (this part has a fixed height) */}
        <div className="flex-shrink-0 p-2 bg-gray-900/90 backdrop-blur-sm border-t-2 border-gray-700 h-[170px] rounded-lg">
          <div className="w-full h-full grid grid-cols-12 gap-4 items-center">
               <div className="col-span-4 flex flex-col justify-between h-full">
                  <h3 className="text-xl font-semibold text-red-400 text-center">Opponent's Bench</h3>
                  <div className="flex gap-2 items-end justify-center h-full">
                      {opponentBench.map(monster => (
                          <BenchCard key={monster.id} monster={monster} isPlayer={false} disabled={true} />
                      ))}
                  </div>
               </div>

              <div className="col-span-4 flex flex-col justify-between h-full bg-gray-800/60 p-2 rounded">
                  <div className="flex items-center justify-center gap-2">
                     <Swords className="w-5 h-5 text-yellow-400" />
                     <h3 className="text-lg font-bold text-center">Battle Log</h3>
                  </div>
                  <div className="overflow-y-auto h-full mt-1 font-mono text-sm" ref={logRef}>
                      {battleLog.map((log, i) => <p key={i} className={`mb-1 ${log.startsWith("Your") ? "text-cyan-300" : log.startsWith("Opponent") ? "text-red-300" : ""}`}>{`> ${log}`}</p>)}
                      {battleEnded && (
                          <div className="text-center mt-2">
                              <h2 className="text-lg font-bold text-yellow-400">{winner === 'player' ? "VICTORY!" : "DEFEAT"}</h2>
                              <Button onClick={onPlayAgain} className="mt-1" size="sm">Play Again</Button>
                          </div>
                      )}
                  </div>
                   <div className={`mt-1 p-1 rounded-lg text-center w-full ${battleEnded ? 'bg-yellow-600/50' : isPlayerTurn ? 'bg-cyan-600/50 animate-pulse' : 'bg-red-800/50'}`}>
                     <p className="text-md font-bold uppercase tracking-widest">
                        {battleEnded ? "BATTLE OVER" : isPlayerTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
                     </p>
                  </div>
               </div>

               <div className="col-span-4 flex flex-col justify-between h-full">
                  <h3 className="text-xl font-semibold text-cyan-400 text-center">Your Bench</h3>
                  <div className="flex gap-2 items-end justify-center h-full">
                      {playerBench.map(monster => (
                          <BenchCard key={monster.id} monster={monster} isPlayer={true} onSwap={onSwapMonster} disabled={!isPlayerTurn || battleEnded} />
                      ))}
                  </div>
               </div>
          </div>
        </div>
      </div>
    </>
  );
};