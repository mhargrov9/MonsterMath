import React, { useState, useEffect, useRef } from 'react';
import { BattleTeamSelector } from './BattleTeamSelector';
import { CombatView } from './CombatView';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { UserMonster, Monster, Ability, ActiveEffect, DamageResult, FloatingText } from '@/types/game';
import MonsterCard from './MonsterCard';
import { Button } from '@/components/ui/button';

interface BattleArenaProps {
  onRetreat: () => void;
}

const useUser = () => {
    return useQuery<{ id: string; rank_xp: number }>({ queryKey: ['/api/auth/user'] }).data;
};

export default function BattleArena({ onRetreat }: BattleArenaProps) {
  const queryClient = useQueryClient();
  const user = useUser();

  const [battleMode, setBattleMode] = useState<'team-select' | 'lead-select' | 'combat'>('team-select');
  const [targetingMode, setTargetingMode] = useState<{ ability: Ability; validTargets: (number | string)[] } | null>(null);
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
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const addFloatingText = (text: string, type: 'damage' | 'heal' | 'crit' | 'info', targetId: number | string, isPlayerTarget: boolean) => {
    const newText: FloatingText = { id: Date.now() + Math.random(), text, type, targetId, isPlayerTarget };
    setFloatingTexts(prev => [...prev, newText]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== newText.id));
    }, 1500);
  };

  const getModifiedStat = (monster: UserMonster | Monster, statName: 'power' | 'defense' | 'speed'): number => {
    let baseStat: number;
    if ('monster' in monster) { // UserMonster
        baseStat = monster[statName];
    } else { // AI Monster
        const key = `base${statName.charAt(0).toUpperCase() + statName.slice(1)}` as keyof Monster;
        baseStat = (monster as any)[key] || 0;
    }
    // Future logic for activeEffects will go here
    return Math.round(baseStat);
  };

  const getAffinityMultiplier = (attackAffinity: string | undefined, defender: UserMonster | Monster): number => {
    if (!attackAffinity) return 1.0;
    const lower = attackAffinity.toLowerCase();
    const weaknesses = 'monster' in defender ? defender.monster.weaknesses : defender.weaknesses;
    const resistances = 'monster' in defender ? defender.monster.resistances : defender.resistances;
    if (weaknesses?.map((w: string) => w.toLowerCase()).includes(lower)) return 2.0;
    if (resistances?.map((r: string) => r.toLowerCase()).includes(lower)) return 0.5;
    return 1.0;
  };

  const calculateDamage = (attacker: UserMonster | Monster, defender: UserMonster | Monster, ability: Ability): DamageResult => {
    const scalingStatName = (ability.scaling_stat?.toLowerCase() || 'power') as 'power' | 'defense' | 'speed';
    const attackingPower = getModifiedStat(attacker, scalingStatName);
    const defendingDefense = getModifiedStat(defender, 'defense');
    const attackPower = attackingPower * (parseFloat(ability.power_multiplier as any) || 0.5);
    const damageMultiplier = 100 / (100 + defendingDefense);
    let rawDamage = attackPower * damageMultiplier;
    const affinityMultiplier = getAffinityMultiplier(ability.affinity, defender);
    rawDamage *= affinityMultiplier;
    const isCritical = Math.random() < 0.05;
    if (isCritical) rawDamage *= 1.5;
    const variance = 0.9 + Math.random() * 0.2;
    rawDamage *= variance;
    const finalDamage = Math.round(Math.max(1, rawDamage));
    return { damage: finalDamage, isCritical, affinityMultiplier };
  };

  const getEffectivenessMessage = (multiplier: number): string => {
    if (multiplier > 1.0) return "It's super effective!";
    if (multiplier < 1.0) return "It's not very effective...";
    return "";
  };

  const handleBattleCompletion = async (winnerVal: 'player' | 'ai') => {
    if (battleEnded) return;
    setBattleLog(prev => [...prev, `--- BATTLE OVER ---`]);
    setBattleEnded(true);
    setWinner(winnerVal);
    if (winnerVal === 'player' && user?.id) {
        const xpGained = 50; // Simplified XP gain
        setBattleLog(prev => [...prev, `You are victorious! Gained ${xpGained} XP!`]);
        await apiRequest('/api/battle/complete', { method: 'POST', data: { winnerId: user.id } });
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    }
  };

  const useAbility = (ability: Ability, targetId: number | string) => {
    setTargetingMode(null);
    let attacker = playerTeam[activePlayerIndex];

    // --- Player Turn Action ---
    // Update Player MP
    setPlayerTeam(team => team.map((m, i) => i === activePlayerIndex ? { ...m, mp: m.mp - (ability.mp_cost || 0) } : m));

    // Apply Healing or Damage
    if (ability.healing_power && ability.healing_power > 0) {
        const healAmount = ability.healing_power;
        setPlayerTeam(team => team.map(p => p.id === targetId ? {...p, hp: Math.min(p.maxHp, p.hp + healAmount)} : p));
        setBattleLog(prev => [...prev, `Your ${attacker.monster.name} used ${ability.name}, healing for ${healAmount} HP!`]);
        addFloatingText(`+${healAmount}`, 'heal', targetId, true);
    } else {
        setAiTeam(team => {
            const defender = team.find(m => m.id === targetId);
            if (!defender) return team;
            const damageResult = calculateDamage(attacker, defender, ability);
            addFloatingText(`-${damageResult.damage}`, 'damage', defender.id, false);
            if (damageResult.isCritical) addFloatingText('CRIT!', 'crit', defender.id, false);

            setBattleLog(prev => [...prev, `Your ${attacker.monster.name} used ${ability.name}, dealing ${damageResult.damage} damage!`, getEffectivenessMessage(damageResult.affinityMultiplier)].filter(Boolean));

            const nextTeam = team.map(m => m.id === targetId ? { ...m, hp: Math.max(0, m.hp - damageResult.damage) } : m);
            if (nextTeam.find(m => m.id === targetId)!.hp <= 0) {
                setBattleLog(prev => [...prev, `Opponent's ${defender.name} has been defeated!`]);
                if (nextTeam.every(m => m.hp <= 0)) { handleBattleCompletion('player'); }
            }
            return nextTeam;
        });
    }
    setTurn('ai');
  };

  const handlePlayerAbility = (ability: Ability) => {
    if (turn !== 'player' || battleEnded || targetingMode) return;
    const attacker = playerTeam[activePlayerIndex];
    if (attacker.mp < (ability.mp_cost || 0)) {
        setBattleLog(prev => [...prev, "Not enough MP!"]); return;
    }
    const scope = ability.target_scope || 'ACTIVE_OPPONENT';
    if(scope === 'ACTIVE_OPPONENT') {
        useAbility(ability, aiTeam[activeAiIndex].id);
    } else if (scope === 'ANY_ALLY') {
        setTargetingMode({ ability, validTargets: playerTeam.map(p => p.id) });
        setBattleLog(prev => [...prev, `Select a target for ${ability.name}.`]);
    }
  };

  const handleAiAbility = () => {
    if (battleEnded) return;
    let activeAi = aiTeam[activeAiIndex];

    const usableAbilities = activeAi.abilities?.filter(a => a.ability_type === 'ACTIVE' && (a.mp_cost || 0) <= activeAi.mp) || [];
    if (usableAbilities.length === 0) {
        setTurn('player'); return;
    }

    const ability = usableAbilities[Math.floor(Math.random() * usableAbilities.length)];
    const defender = playerTeam[activePlayerIndex];
    const damageResult = calculateDamage(activeAi, defender, ability);

    // --- AI Turn Action ---
    setAiTeam(team => team.map((m, i) => i === activeAiIndex ? { ...m, mp: m.mp - (ability.mp_cost || 0) } : m));
    setPlayerTeam(team => {
        const nextTeam = team.map((m, i) => i === activePlayerIndex ? { ...m, hp: Math.max(0, m.hp - damageResult.damage) } : m);
        if (nextTeam[activePlayerIndex].hp <= 0) {
            setBattleLog(prev => [...prev, `Your ${defender.monster.name} has been defeated!`]);
            if (nextTeam.every(m => m.hp <= 0)) { handleBattleCompletion('ai'); }
        }
        return nextTeam;
    });

    addFloatingText(`-${damageResult.damage}`, 'damage', defender.id, true);
    if(damageResult.isCritical) addFloatingText('CRIT!', 'crit', defender.id, true);
    setBattleLog(prev => [...prev, `Opponent's ${activeAi.name} used ${ability.name}, dealing ${damageResult.damage} damage!`, getEffectivenessMessage(damageResult.affinityMultiplier)].filter(Boolean));

    setTurn('player');
  };

  const handleSwapMonster = (monsterId: number) => {
    if (turn !== 'player' || battleEnded) return;
    const newIndex = playerTeam.findIndex(p => p.id === monsterId);
    if (newIndex === -1 || newIndex === activePlayerIndex) return;
    const newMonster = playerTeam[newIndex];
    if (newMonster.hp <= 0) {
        setBattleLog(prev => [...prev, `${newMonster.monster.name} is too weak to battle!`]); return;
    }
    setBattleLog(prev => [...prev, `You withdrew ${playerTeam[activePlayerIndex].monster.name} and sent out ${newMonster.monster.name}!`]);
    setActivePlayerIndex(newIndex);
    setTurn('ai');
  };

  const handleTargetSelect = (targetId: number | string) => {
      if(!targetingMode) return;
      if(targetingMode.validTargets.includes(targetId as number)) {
          useAbility(targetingMode.ability, targetId as number);
      } else {
          setBattleLog(prev => [...prev, 'Invalid target selected.']);
          setTargetingMode(null);
      }
  };

  useEffect(() => {
    if (turn === 'ai' && !battleEnded) {
      let activeAi = aiTeam[activeAiIndex];
      if (activeAi.hp <= 0) {
        const nextIndex = aiTeam.findIndex(m => m.hp > 0);
        if (nextIndex !== -1) {
            setBattleLog(prev => [...prev, `Opponent's ${activeAi.name} has fainted!`]);
            setActiveAiIndex(nextIndex);
        } else {
            handleBattleCompletion('player');
        }
      } else {
        const timer = setTimeout(handleAiAbility, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [turn, battleEnded, aiTeam]);

  const handleBattleStart = (selectedTeam: UserMonster[], generatedOpponent: any) => {
    setBattleLog([]); setIsLoading(true); setBattleEnded(false); setWinner(null); setActiveEffects([]); setFloatingTexts([]);
    const playerTeamWithFullHealth = selectedTeam.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp }));
    setPlayerTeam(playerTeamWithFullHealth);
    setAiTeam(generatedOpponent.scaledMonsters);
    setBattleLog([`Battle is about to begin! Select your starting monster.`]);
    setBattleMode('lead-select');
    setIsLoading(false);
  };

  const selectLeadMonster = (index: number) => {
    setActivePlayerIndex(index);
    setActiveAiIndex(0);
    setBattleLog(prev => [...prev, `You send out ${playerTeam[index].monster.name}!`, `Opponent sends out ${aiTeam[0].name}!`]);
    setTurn(getModifiedStat(playerTeam[index], 'speed') >= getModifiedStat(aiTeam[0], 'speed') ? 'player' : 'ai');
    setBattleMode('combat');
  };

  const battleLogRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (battleLogRef.current) { battleLogRef.current.scrollTop = battleLogRef.current.scrollHeight; } }, [battleLog]);

  if (battleMode === 'team-select') return <BattleTeamSelector onBattleStart={handleBattleStart} />;

  if (battleMode === 'lead-select') {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-900">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">Choose Your Lead Monster</h1>
        <div className="flex flex-wrap justify-center gap-6">
            {playerTeam.map((userMonster, index) => (
                <div key={userMonster.id}>
                    <MonsterCard monster={userMonster.monster} userMonster={userMonster} size="medium" startExpanded={true} />
                    <Button onClick={() => selectLeadMonster(index)} className="w-full mt-4" disabled={userMonster.hp <= 0}>{userMonster.hp <= 0 ? 'Fainted' : 'Choose as Lead'}</Button>
                </div>
            ))}
        </div>
      </div>
    );
  }

  if (battleMode === 'combat') {
    if (isLoading || playerTeam.length === 0 || aiTeam.length === 0 || !playerTeam[activePlayerIndex] || !aiTeam[activeAiIndex]) {
      return <div className="text-center p-8">Loading Battle...</div>;
    }
    return <CombatView 
        playerMonster={playerTeam[activePlayerIndex]}
        opponentMonster={aiTeam[activeAiIndex]}
        playerBench={playerTeam.filter((_, i) => i !== activePlayerIndex)}
        opponentBench={aiTeam.filter((_, i) => i !== activeAiIndex)}
        isPlayerTurn={turn === 'player' && !battleEnded}
        battleLog={battleLog}
        battleEnded={battleEnded}
        winner={winner}
        logRef={battleLogRef}
        onAbilityClick={handlePlayerAbility}
        onSwapMonster={handleSwapMonster}
        onRetreat={() => { setTargetingMode(null); onRetreat(); }}
        onPlayAgain={() => setBattleMode('team-select')}
        floatingTexts={floatingTexts}
        targetingMode={targetingMode}
        onTargetSelect={handleTargetSelect}
    />;
  }
  return null;
}