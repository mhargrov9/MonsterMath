import React from 'react';
import MonsterCard from './MonsterCard';
import { Button } from '@/components/ui/button';
import { Swords } from 'lucide-react';
import { PlayerCombatMonster, AiCombatMonster, Ability, FloatingText } from '@/types/game';

interface CombatViewProps {
  playerMonster: PlayerCombatMonster;
  opponentMonster: AiCombatMonster;
  playerTeam: PlayerCombatMonster[]; // Changed from playerBench
  opponentBench: AiCombatMonster[];
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
  targetingMode: { ability: Ability } | null;
  onTargetSelect: (targetId: number) => void;
}

const BenchCard: React.FC<{ 
    monster: PlayerCombatMonster | AiCombatMonster, 
    onSwap?: (id: number) => void, 
    disabled: boolean, 
    isTargetable: boolean, 
    onTargetSelect?: (targetId: number) => void 
}> = ({ monster, onSwap, disabled, isTargetable, onTargetSelect }) => {

    const isPlayer = 'monster' in monster;
    const baseMonster = isPlayer ? monster.monster : monster;
    const isFainted = (monster.hp ?? 0) <= 0;

    return (
        <div className="flex flex-col items-center gap-1">
            <MonsterCard 
                monster={baseMonster} 
                userMonster={isPlayer ? monster : undefined} 
                size="tiny" 
                isToggleable={!onTargetSelect}
                isTargetable={isTargetable}
                onCardClick={isTargetable && onTargetSelect ? () => onTargetSelect(monster.id as number) : undefined}
            />
            {isPlayer && onSwap && (
                <Button onClick={() => onSwap(monster.id)} disabled={disabled || isFainted} size="sm" className="w-full text-xs h-6">
                    {isFainted ? 'Fainted' : 'Swap'}
                </Button>
            )}
        </div>
    );
};

export const CombatView: React.FC<CombatViewProps> = (props) => {
  const {
    playerMonster, opponentMonster, playerTeam, opponentBench, isPlayerTurn,
    battleLog, battleEnded, winner, logRef, onAbilityClick, onSwapMonster,
    onPlayAgain, targetingMode, onTargetSelect
  } = props;

  const isTargetingAlly = targetingMode?.ability.target_scope === 'ANY_ALLY';
  const playerBench = playerTeam.filter(p => p.id !== playerMonster.id);

  return (
    <>
      <div className="w-screen h-screen flex flex-col p-2 gap-2 bg-gray-800 text-white">
        <div className="flex-1 flex flex-col lg:flex-row gap-2 min-h-0">
            <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg relative">
              <div className="relative flex-grow flex items-center justify-center w-full">
                <MonsterCard monster={opponentMonster} size="large" isToggleable={true} />
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg relative">
               <div className="relative flex-grow flex items-center justify-center w-full">
                  <MonsterCard 
                      monster={playerMonster.monster} 
                      userMonster={playerMonster} 
                      onAbilityClick={onAbilityClick}
                      isPlayerTurn={isPlayerTurn} 
                      size="large" 
                      isToggleable={!targetingMode}
                      isTargetable={!!isTargetingAlly}
                      onCardClick={isTargetingAlly ? () => onTargetSelect(playerMonster.id) : undefined}
                  />
              </div>
            </div>
        </div>
        <div className="flex-shrink-0 p-2 bg-gray-900/90 backdrop-blur-sm border-t-2 border-gray-700 h-[170px] rounded-lg">
          <div className="w-full h-full grid grid-cols-12 gap-4 items-center">
               <div className="col-span-4 flex flex-col justify-between h-full">
                  <h3 className="text-xl font-semibold text-red-400 text-center">Opponent's Bench</h3>
                  <div className="flex gap-2 items-end justify-center h-full">
                      {opponentBench.map(monster => (
                          <BenchCard key={monster.id} monster={monster} disabled={true} isTargetable={false} />
                      ))}
                  </div>
               </div>
              <div className="col-span-4 flex flex-col justify-between h-full bg-gray-800/60 p-2 rounded">
                  <div className="flex items-center justify-center gap-2">
                     <Swords className="w-5 h-5 text-yellow-400" />
                     <h3 className="text-lg font-bold text-center">Battle Log</h3>
                  </div>
                  <div className="flex-grow overflow-y-auto mt-1 font-mono text-sm max-h-[7.5rem]" ref={logRef}>
                      {battleLog.map((log, i) => <p key={i}>{`> ${log}`}</p>)}
                      {battleEnded && (
                          <div className="text-center mt-2">
                              <h2 className="text-lg font-bold text-yellow-400">{winner === 'player' ? "VICTORY!" : "DEFEAT"}</h2>
                              <Button onClick={onPlayAgain} className="mt-1" size="sm">Play Again</Button>
                          </div>
                      )}
                  </div>
                   <div className={`mt-1 p-1 rounded-lg text-center w-full ${battleEnded ? 'bg-yellow-600/50' : targetingMode ? 'bg-green-600/50 animate-pulse' : isPlayerTurn ? 'bg-cyan-600/50 animate-pulse' : 'bg-red-800/50'}`}>
                     <p className="text-md font-bold uppercase tracking-widest">
                        {targetingMode ? 'SELECT A TARGET' : battleEnded ? "BATTLE OVER" : isPlayerTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
                     </p>
                  </div>
               </div>
               <div className="col-span-4 flex flex-col justify-between h-full">
                  <h3 className="text-xl font-semibold text-cyan-400 text-center">Your Bench</h3>
                  <div className="flex gap-2 items-end justify-center h-full">
                      {playerBench.map(monster => (
                          <BenchCard key={monster.id} monster={monster} onSwap={onSwapMonster} disabled={!isPlayerTurn || battleEnded || !!targetingMode} isTargetable={!!isTargetingAlly} onTargetSelect={onTargetSelect} />
                      ))}
                  </div>
               </div>
          </div>
        </div>
      </div>
    </>
  );
};