import React, { useState, useEffect, useRef } from 'react';
import MonsterCard from './MonsterCard';
import { BattleTeamSelector } from './BattleTeamSelector';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Swords } from 'lucide-react';
import { UserMonster, Monster, Ability, StatModifier, ActiveEffect, DamageResult } from '@/types/game';

interface BattleArenaProps {
  onRetreat: () => void;
}

const useUser = () => {
    return useQuery<{ id: string, rank_xp: number }>({ queryKey: ['user'] }).data;
};

const BattleArena: React.FC<BattleArenaProps> = ({ onRetreat }) => {
  const queryClient = useQueryClient();
  const user = useUser();

  const [battleMode, setBattleMode] = useState<'team-select' | 'lead-select' | 'combat'>('team-select');
  const [isLoading, setIsLoading] = useState(false);
  const [playerTeam, setPlayerTeam] = useState<UserMonster[]>([]);
  const [aiTeam, setAiTeam] = useState<Monster[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [activeAiIndex, setActiveAiIndex] = useState(0);
  const [turn, setTurn] = useState<'player' | 'ai' | 'pre-battle'>('pre-battle');
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [battleEnded, setBattleEnded] = useState(false);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);

  const getModifiedStat = (monster: UserMonster | Monster, statName: 'power' | 'defense' | 'speed'): number => { /* ... */ return 0;};
  const calculateDamage = (attacker: UserMonster | Monster, defender: UserMonster | Monster, ability: Ability): DamageResult => { /* ... */ return { damage: 10, isCritical: false, affinityMultiplier: 1 }; };

  const endTurn = (currentTurn: 'player' | 'ai', pTeam: UserMonster[], aTeam: Monster[]) => {
    setPlayerTeam(pTeam);
    setAiTeam(aTeam);
    setTurn(currentTurn === 'player' ? 'ai' : 'player');
  };

  const handlePlayerAbility = (ability: Ability) => {
    if (turn !== 'player' || battleEnded) return;
    const attacker = playerTeam[activePlayerIndex];
    if (attacker.mp < ability.mp_cost) { setBattleLog(prev => [...prev, "Not enough MP!"]); return; }
    const defender = aiTeam[activeAiIndex];
    const damageResult = calculateDamage(attacker, defender, ability);
    const newLog = [`Your ${attacker.monster.name} used ${ability.name}, dealing ${damageResult.damage} damage!`];
    const nextAiTeam = aiTeam.map((m, i) => i === activeAiIndex ? { ...m, hp: Math.max(0, m.hp - damageResult.damage) } : m);
    const nextPlayerTeam = playerTeam.map((m, i) => i === activePlayerIndex ? { ...m, mp: m.mp - ability.mp_cost } : m);
    setBattleLog(prev => [...prev, ...newLog]);
    endTurn('player', nextPlayerTeam, nextAiTeam);
  };

  const handleSwapMonster = (newIndex: number) => {
    if (turn !== 'player' || battleEnded) return;
    const currentMonster = playerTeam[activePlayerIndex];
    const newMonster = playerTeam[newIndex];
    if (newMonster.hp <= 0) {
        setBattleLog(prev => [...prev, `${newMonster.monster.name} is too weak to battle!`]);
        return;
    }
    setBattleLog(prev => [...prev, `You withdrew ${currentMonster.monster.name} and sent out ${newMonster.monster.name}!`]);
    setActivePlayerIndex(newIndex);
    // Swapping consumes the turn
    endTurn('player', playerTeam, aiTeam);
  };

  const handleAiAbility = () => { /* ... AI Logic ... */ };
  useEffect(() => { if (turn === 'ai' && !battleEnded) { const timer = setTimeout(handleAiAbility, 1500); return () => clearTimeout(timer); } }, [turn, battleEnded]);

  const handleBattleStart = async (selectedTeam: UserMonster[], generatedOpponent: any) => {
    setIsLoading(true);
    setPlayerTeam(selectedTeam); // Uses the already-fetched team with abilities from selector
    const aiMonsterIds = generatedOpponent.scaledMonsters.map((m: Monster) => m.id);
    const abilitiesMap: Record<number, Ability[]> = {};
    await Promise.all(aiMonsterIds.map(async (id) => {
        const res = await fetch(`/api/monster-abilities/${id}`);
        if (res.ok) abilitiesMap[id] = await res.json();
    }));
    const aiTeamWithAbilities = generatedOpponent.scaledMonsters.map((m: Monster) => ({ ...m, abilities: abilitiesMap[m.id] || [] }));
    setAiTeam(aiTeamWithAbilities);
    setBattleLog([`Battle is about to begin! Select your starting monster.`]);
    setBattleMode('lead-select');
    setIsLoading(false);
  };

  const selectLeadMonster = (index: number) => {
    const playerMonster = playerTeam[index];
    const aiMonster = aiTeam[Math.floor(Math.random() * aiTeam.length)];
    setActivePlayerIndex(index);
    setActiveAiIndex(aiTeam.indexOf(aiMonster));
    setBattleLog(prev => [...prev, `You send out ${playerMonster.monster.name}!`, `Opponent sends out ${aiMonster.name}!`]);
    setTurn(getModifiedStat(playerMonster, 'speed') >= getModifiedStat(aiMonster, 'speed') ? 'player' : 'ai');
    setBattleMode('combat');
  };

  const battleLogRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (battleLogRef.current) { battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight; } }, [battleLog]);

  if (battleMode === 'team-select') return <BattleTeamSelector onBattleStart={handleBattleStart} />;
  if (battleMode === 'lead-select') { /* ... lead-select JSX ... */ }
  if (battleMode === 'combat') {
    if (isLoading || !playerTeam[activePlayerIndex] || !aiTeam[activeAiIndex]) return <div className="text-center p-8">Loading battle...</div>;
    const activePlayerMonster = playerTeam[activePlayerIndex];
    const activeAiMonster = aiTeam[activeAiIndex];
    const benchedPlayerMonsters = playerTeam.filter((_, index) => index !== activePlayerIndex);
    const benchedAiMonsters = aiTeam.filter((_, index) => index !== activeAiIndex);

    return (
      <div className="w-screen h-screen p-2 flex flex-col lg:flex-row gap-2 bg-gray-900 text-white overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-between p-2 rounded-lg bg-red-900/10">
            <h2 className="text-xl font-semibold text-red-400">Opponent</h2>
            <MonsterCard monster={activeAiMonster} size="large" startExpanded={true} />
            <div className="flex gap-2 items-end justify-center min-h-[100px] mt-2">
                {benchedAiMonsters.map(monster => <MonsterCard key={monster.id} monster={monster} size="tiny" isToggleable={true} />)}
            </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-between p-2 rounded-lg bg-cyan-900/10">
            <h2 className="text-xl font-semibold text-cyan-400">Your Monster</h2>
            <MonsterCard monster={activePlayerMonster.monster} userMonster={activePlayerMonster} onAbilityClick={handlePlayerAbility} isPlayerTurn={turn === 'player' && !battleEnded} size="large" startExpanded={true} isToggleable={false} />
             <div className="flex gap-2 items-end justify-center min-h-[100px] mt-2 invisible">
                {/* Placeholder for alignment */}
            </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-2 bg-gray-900/90 backdrop-blur-sm border-t-2 border-gray-700">
            <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4 items-end">
                 <div className="col-span-3 flex flex-col justify-center items-center text-white h-full">
                    <Button onClick={onRetreat} variant="destructive" className="mb-2">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Retreat
                    </Button>
                    <p className="text-xl font-bold uppercase tracking-widest">
                       {battleEnded ? "BATTLE OVER" : `${turn.toUpperCase()}'S TURN`}
                    </p>
                 </div>
                <div className="col-span-6 bg-gray-800/60 p-2 rounded h-28 overflow-y-auto">{/* Battle Log */}</div>
                <div className="col-span-3 flex gap-2 items-end justify-end min-h-[120px]">
                    {benchedPlayerMonsters.map(monster => {
                         const originalIndex = playerTeam.findIndex(p => p.id === monster.id);
                         return (
                            <div key={monster.id} className="flex flex-col items-center gap-1">
                                <MonsterCard monster={monster.monster} userMonster={monster} size="tiny" />
                                <Button onClick={() => handleSwapMonster(originalIndex)} disabled={turn !== 'player' || monster.hp <= 0 || battleEnded} size="xs" className="w-full text-xs h-6">Swap</Button>
                            </div>
                         )
                    })}
                </div>
            </div>
        </div>
      </div>
    );
  }
  return null;
};

export default BattleArena;