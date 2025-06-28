import React from 'react';
import MonsterCard from './MonsterCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { UserMonster, Monster, Ability, FloatingText } from '@/types/game';

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

      {/* Main container: The `overflow-hidden` class has been removed to fix the clipping bug. */}
      <div className="w-screen h-screen p-2 pb-[150px] flex flex-col lg:flex-row gap-2 bg-gray-800 text-white">

        {/* Opponent's Field */}
        <div className="flex-1 flex flex-col items-center justify-between p-2 rounded-lg relative">
          <h2 className="text-xl font-semibold text-red-400">Opponent</h2>
          <div className="relative flex-grow flex items-center justify-center w-full">
            <MonsterCard monster={opponentMonster} size="large" startExpanded={true} isToggleable={true} />
            {floatingTexts.filter(ft => !ft.isPlayerTarget && ft.targetId === opponentMonster.id).map(ft => (
                <FloatingTextComponent key={ft.id} text={ft} />
            ))}
          </div>
          <div className="flex gap-2 items-end justify-center min-h-[120px] mt-2">
              {opponentBench.map(m => <MonsterCard key={m.id} monster={m} size="tiny" isToggleable={true} />)}
          </div>
        </div>

        {/* Player's Field */}
        <div className="flex-1 flex flex-col items-center justify-between p-2 rounded-lg relative">
          <h2 className="text-xl font-semibold text-cyan-400">Your Monster</h2>
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
          {/* This placeholder is required to vertically align the player's active monster with the opponent's, as per the layout requirements. */}
          <div className="flex gap-2 items-end justify-center min-h-[120px] mt-2 invisible"></div>
        </div>

        {/* Fixed HUD at the bottom - Adheres to the "docked bench" rule from the Onboarding Brief */}
        <div className="fixed bottom-0 left-0 right-0 p-2 bg-gray-900/90 backdrop-blur-sm border-t-2 border-gray-700 h-[150px]">
          <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4 items-center h-full">
               <div className="col-span-3 flex flex-col justify-center items-center text-white">
                  <Button onClick={onRetreat} variant="outline" className="mb-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white" disabled={battleEnded}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Retreat
                  </Button>
                  <div className={`p-2 rounded-lg text-center w-full ${battleEnded ? 'bg-yellow-600/50' : isPlayerTurn ? 'bg-cyan-600/50 animate-pulse' : 'bg-red-800/50'}`}>
                     <p className="text-xl font-bold uppercase tracking-widest">
                        {battleEnded ? "BATTLE OVER" : isPlayerTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
                     </p>
                  </div>
               </div>
              <div className="col-span-5 bg-gray-800/60 p-2 rounded h-full overflow-y-auto font-mono text-sm" ref={logRef}>
                  {battleLog.map((log, i) => <p key={i} className={`mb-1 ${log.startsWith("Your") ? "text-cyan-300" : log.startsWith("Opponent") ? "text-red-300" : ""}`}>{`> ${log}`}</p>)}
                  {battleEnded && (
                      <div className="text-center mt-2">
                          <h2 className="text-lg font-bold text-yellow-400">{winner === 'player' ? "VICTORY!" : "DEFEAT"}</h2>
                          <Button onClick={onPlayAgain} className="mt-1" size="sm">Play Again</Button>
                      </div>
                  )}
              </div>
              <div className="col-span-4 flex gap-2 items-end justify-end h-full">
                  {playerBench.map(monster => {
                       const isFainted = monster.hp <= 0;
                       return (
                          <div key={monster.id} className="flex flex-col items-center gap-1">
                              <MonsterCard monster={monster.monster} userMonster={monster} size="tiny" isToggleable={true} />
                              <Button onClick={() => onSwapMonster(monster.id)} disabled={!isPlayerTurn || isFainted || battleEnded} size="xs" className="w-full text-xs h-6">
                                  {isFainted ? 'Fainted' : 'Swap'}
                              </Button>
                          </div>
                       )
                  })}
              </div>
          </div>
        </div>
      </div>
    </>
  );
};