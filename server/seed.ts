import { db } from './db';
import { ranks, monsters, abilities, monsterAbilities } from '@shared/schema';
import { eq } from 'drizzle-orm';

const rankData = [
  { tier_name: 'Bronze', sub_tier: 3, xp_required: 0 },
  { tier_name: 'Bronze', sub_tier: 2, xp_required: 100 },
  { tier_name: 'Bronze', sub_tier: 1, xp_required: 250 },
  { tier_name: 'Silver', sub_tier: 3, xp_required: 500 },
  { tier_name: 'Silver', sub_tier: 2, xp_required: 800 },
  { tier_name: 'Silver', sub_tier: 1, xp_required: 1200 },
  { tier_name: 'Gold', sub_tier: 3, xp_required: 1700 },
  { tier_name: 'Gold', sub_tier: 2, xp_required: 2300 },
  { tier_name: 'Gold', sub_tier: 1, xp_required: 3000 },
  { tier_name: 'Platinum', sub_tier: 3, xp_required: 4000 },
  { tier_name: 'Platinum', sub_tier: 2, xp_required: 5200 },
  { tier_name: 'Platinum', sub_tier: 1, xp_required: 6500 },
  { tier_name: 'Diamond', sub_tier: 3, xp_required: 8000 },
  { tier_name: 'Diamond', sub_tier: 2, xp_required: 10000 },
  { tier_name: 'Diamond', sub_tier: 1, xp_required: 12500 },
  { tier_name: 'Master', sub_tier: 1, xp_required: 15000 },
  { tier_name: 'Grandmaster', sub_tier: 1, xp_required: 20000 },
];

const monsterData = [
  {
    id: 6,
    name: 'Gigalith',
    type: 'earth',
    basePower: 120,
    baseSpeed: 20,
    baseDefense: 150,
    baseHp: 118,
    baseMp: 200,
    hpPerLevel: 6,
    mpPerLevel: 20,
    goldCost: 500,
    diamondCost: 0,
    description: "Born in the planet's core, its fists can shatter mountains and its heart is a captive star.",
    iconClass: 'fas fa-mountain',
    gradient: 'linear-gradient(45deg, #8B4513, #FF4500)',
    resistances: ["Fire"],
    weaknesses: ["Water"],
    levelUpgrades: {
      "2": {"visual": "magma in fists glows brighter", "physical_attack": 20},
      "3": {"hp": 100, "visual": "thicker obsidian plates on torso"},
      "4": {"visual": "crystalline obsidian formations on shoulders and knuckles", "defense": 30},
      "5": {"visual": "thick molten rock tail forms", "ability": {"name": "Tail Swipe", "type": "physical", "mp_cost": 50}, "new_ability": "Molten Tail"},
      "6": {"hp": 150, "visual": "glowing rock shards embedded in tail"},
      "7": {"visual": "large glowing volcanic glass heart visible in chest", "passive_upgrade": "volcanic_heart_25"},
      "8": {"visual": "arms and fists become larger with raw magma energy", "physical_attack": 50},
      "9": {"visual": "three orbiting obsidian rocks around shoulders", "defense": 50},
      "10": {"visual": "volcanic horn grows, white-hot magma, intense heat radiation", "ability": {"name": "Eruption", "type": "ultimate", "damage": "massive", "mp_cost": 200}, "ultimate_ability": "Eruption"}
    },
    starterSet: false,
    monster_tier: 3
  },
  {
    id: 7,
    name: 'Aetherion',
    type: 'psychic',
    basePower: 20,
    baseSpeed: 130,
    baseDefense: 40,
    baseHp: 50,
    baseMp: 800,
    hpPerLevel: 6,
    mpPerLevel: 20,
    goldCost: 600,
    diamondCost: 0,
    description: "It is a living star-chart, gazing into all possible futures at once. Its silence is not empty, but full of thoughts that could shatter reality.",
    iconClass: 'fas fa-gem',
    gradient: 'linear-gradient(45deg, #9932CC, #00BFFF)',
    resistances: ["Psychic"],
    weaknesses: ["Physical"],
    levelUpgrades: {
      "2": {"visual": "inner psychic nebula glows more intensely", "special_attack": 25},
      "3": {"mp": 150, "visual": "crystalline lattice becomes more complex with additional crystals"},
      "4": {"speed": 20, "visual": "wing-like structures of larger crystals develop on back"},
      "5": {"visual": "three pointed crystals orbit main body", "ability": {"hits": 3, "name": "Shard Barrage", "type": "psychic", "mp_cost": 80}, "new_ability": "Shatter Shards"},
      "6": {"visual": "orbiting shards crackle with visible psychic energy", "special_attack": 40},
      "7": {"visual": "entire form becomes more translucent and ethereal", "passive_upgrade": "phase_shift_30"},
      "8": {"mp": 200, "visual": "psychic energy leaks out forming constant glowing aura"},
      "9": {"speed": 30, "visual": "wing structures larger with faint light trails when moving"},
      "10": {"visual": "perfect crystalline core in chest, form destabilizes showing glimpse of another dimension", "ability": {"name": "Reality Break", "type": "ultimate", "chance": 50, "debuff": "defense_special_down", "mp_cost": 250, "duration": 3}, "ultimate_ability": "Reality Break"}
    },
    starterSet: false,
    monster_tier: 3
  },
  {
    id: 8,
    name: 'Geode Tortoise',
    type: 'earth',
    basePower: 60,
    baseSpeed: 30,
    baseDefense: 180,
    baseHp: 106,
    baseMp: 150,
    hpPerLevel: 6,
    mpPerLevel: 20,
    goldCost: 400,
    diamondCost: 0,
    description: "Its shell, grown over a thousand years, is harder than any mountain stone and hums with telluric power.",
    iconClass: 'fas fa-mountain',
    gradient: 'from-stone-600 to-emerald-500',
    resistances: ["Electric"],
    weaknesses: ["Water"],
    levelUpgrades: {
      "1": {"image": "Geode Tortoise_Level_1.png", "abilities": {"active1": "Shell Slam (35 MP). Melee. Deals damage based on 75% of its Defense stat.", "passive": "Crystalize. When HP drops below 50%, Defense doubles, but Speed is halved."}},
      "2": {"hp": 50, "image": "Geode Tortoise_Level_2.png", "power": 5, "defense": 15, "abilities": {"active1": "Shell Slam (35 MP). Melee. Deals damage based on 75% of its Defense stat.", "passive": "Crystalize. When HP drops below 50%, Defense doubles, but Speed is halved."}},
      "3": {"hp": 100, "image": "Geode Tortoise_Level_3.png", "power": 8, "defense": 25, "abilities": {"active1": "Shell Slam (35 MP). Melee. Deals damage based on 75% of its Defense stat.", "passive": "Crystalize. When HP drops below 50%, Defense doubles and grants a 50-point Shield."}}
    },
    starterSet: true,
    monster_tier: 1
  },
  {
    id: 9,
    name: 'Gale-Feather Griffin',
    type: 'air',
    basePower: 90,
    baseSpeed: 170,
    baseDefense: 35,
    baseHp: 37,
    baseMp: 140,
    hpPerLevel: 6,
    mpPerLevel: 20,
    goldCost: 450,
    diamondCost: 0,
    description: "It is said to ride the jet stream, its form a mere blur of wind and light against the sky.",
    iconClass: 'fas fa-feather-alt',
    gradient: 'from-sky-400 to-blue-300',
    resistances: ["Earth"],
    weaknesses: ["Electric"],
    levelUpgrades: {
      "1": {"image": "Gale-Feather Griffin_Level_1.png", "abilities": {"active1": "Peck Flurry (40 MP). Melee. Hits the active opponent 3 times for 0.5x Power per hit (each hit has a separate accuracy check).", "passive": "Tailwind. All monsters on its team get a permanent +5% Speed boost."}},
      "2": {"image": "Gale-Feather Griffin_Level_2.png", "power": 8, "speed": 12, "abilities": {"active1": "Peck Flurry (40 MP). Melee. Hits the active opponent 3 times for 0.5x Power per hit (each hit has a separate accuracy check).", "passive": "Tailwind. All monsters on its team get a permanent +5% Speed boost."}},
      "3": {"image": "Gale-Feather Griffin_Level_3.png", "power": 15, "speed": 25, "abilities": {"active1": "Peck Flurry (40 MP). Melee. Each hit has a 10% chance to grant Hasted and hits 3 times for 0.5x Power per hit.", "passive": "Tailwind. All monsters on its team get a permanent +5% Speed boost."}}
    },
    starterSet: true,
    monster_tier: 1
  },
  {
    id: 10,
    name: 'Cinder-Tail Salamander',
    type: 'fire',
    basePower: 100,
    baseSpeed: 110,
    baseDefense: 70,
    baseHp: 75,
    baseMp: 160,
    hpPerLevel: 6,
    mpPerLevel: 20,
    goldCost: 350,
    diamondCost: 0,
    description: "It thrives in volcanic vents, its smoky breath carrying a toxin born from superheated minerals.",
    iconClass: 'fas fa-fire',
    gradient: 'from-red-500 to-orange-400',
    resistances: ["Fire"],
    weaknesses: ["Water"],
    levelUpgrades: {
      "1": {"image": "Cinder-Tail Salamander_Level_1.png", "abilities": {"active1": "Ember Spit (30 MP). Ranged. Deals modest Fire damage and triggers a Soot Cloud check.", "passive": "Soot Cloud. Its Fire abilities have a 25% chance to inflict Poisoned for 2 turns."}},
      "2": {"hp": 25, "image": "Cinder-Tail Salamander_Level_2.png", "power": 10, "speed": 8, "abilities": {"active1": "Ember Spit (30 MP). Ranged. Deals modest Fire damage and triggers a Soot Cloud check.", "passive": "Soot Cloud. Its Fire abilities have a 25% chance to inflict Poisoned for 2 turns."}},
      "3": {"hp": 55, "image": "Cinder-Tail Salamander_Level_3.png", "power": 25, "speed": 18, "abilities": {"active1": "Ember Spit (30 MP). Ranged. Deals modest Fire damage and triggers enhanced Soot Cloud check.", "passive": "Soot Cloud. Its Fire abilities have a 25% chance to inflict Poisoned for 2 turns and reduce enemy Defense."}}
    },
    starterSet: true,
    monster_tier: 1
  },
  {
    id: 11,
    name: 'River-Spirit Axolotl',
    type: 'water',
    basePower: 50,
    baseSpeed: 90,
    baseDefense: 60,
    baseHp: 93,
    baseMp: 220,
    hpPerLevel: 6,
    mpPerLevel: 20,
    goldCost: 420,
    diamondCost: 0,
    description: "A gentle soul from the world's purest riverbeds, its very presence seems to mend wounds and calm troubled hearts.",
    iconClass: 'fas fa-tint',
    gradient: 'from-blue-400 to-teal-300',
    resistances: ["Water"],
    weaknesses: ["Poison"],
    levelUpgrades: {
      "1": {"image": "River-Spirit Axolotl_Level_1.png", "abilities": {"active1": "Restoring Geyser (40 MP). Ranged. Heals a significant amount of HP on a single friendly target (can target benched allies).", "passive": "Soothing Aura. At the end of its turn, the player's active monster heals for 3% of its Max HP."}},
      "2": {"hp": 40, "mp": 30, "image": "River-Spirit Axolotl_Level_2.png", "abilities": {"active1": "Restoring Geyser (40 MP). Ranged. Heals a significant amount of HP on a single friendly target (can target benched allies).", "passive": "Soothing Aura. At the end of its turn, the player's active monster heals for 3% of its Max HP."}},
      "3": {"hp": 90, "mp": 30, "image": "River-Spirit Axolotl_Level_3.png", "defense": 10, "abilities": {"active1": "Restoring Geyser (40 MP). Ranged. Heals HP and grants +20 Defense boost for 1 turn to friendly target.", "passive": "Soothing Aura. At the end of its turn, the player's active monster heals for 3% of its Max HP."}}
    },
    starterSet: true,
    monster_tier: 1
  },
  {
    id: 12,
    name: 'Spark-Tail Squirrel',
    type: 'electric',
    basePower: 40,
    baseSpeed: 140,
    baseDefense: 50,
    baseHp: 43,
    baseMp: 200,
    hpPerLevel: 6,
    mpPerLevel: 20,
    goldCost: 380,
    diamondCost: 0,
    description: "A mischievous bundle of chaotic energy, its tail crackles with the untamed power of a summer thunderstorm.",
    iconClass: 'fas fa-bolt',
    gradient: 'from-yellow-400 to-amber-300',
    resistances: ["Air"],
    weaknesses: ["Earth"],
    levelUpgrades: {
      "1": {"image": "Spark-Tail Squirrel_Level_1.png", "abilities": {"active1": "Jolt (35 MP). Ranged. Deals very low Electric damage, with a 25% chance to Stun the target.", "passive": "Static Charge. After using 3 Electric abilities, the next Jolt is a guaranteed Stun."}},
      "2": {"mp": 40, "image": "Spark-Tail Squirrel_Level_2.png", "speed": 15, "abilities": {"active1": "Jolt (35 MP). Ranged. Deals very low Electric damage, with a 25% chance to Stun the target.", "passive": "Static Charge. After using 3 Electric abilities, the next Jolt is a guaranteed Stun."}},
      "3": {"mp": 40, "image": "Spark-Tail Squirrel_Level_3.png", "power": 10, "speed": 35, "abilities": {"active1": "Jolt (35 MP). Ranged. Deals enhanced Electric damage, with a 25% chance to Stun the target.", "passive": "Static Charge. After using 3 Electric abilities or being hit by Melee attacks, the next Jolt is a guaranteed Stun."}}
    },
    starterSet: true,
    monster_tier: 1
  }
];

const abilityData = [
  {
    id: 1,
    name: 'Basic Attack',
    description: 'A basic physical attack',
    ability_type: 'ACTIVE',
    mp_cost: 0,
    affinity: 'Physical',
    power_multiplier: '0.60',
    scaling_stat: 'POWER',
    healing_power: 0,
    target_scope: 'ACTIVE_OPPONENT',
    min_hits: 1,
    max_hits: 1,
    activation_scope: null,
    activation_trigger: null,
    max_targets: 1
  },
  {
    id: 2,
    name: 'Ember Spit',
    description: 'Ranged. Deals modest Fire damage and triggers a Soot Cloud check.',
    ability_type: 'ACTIVE',
    mp_cost: 30,
    affinity: 'Fire',
    power_multiplier: '1.00',
    scaling_stat: 'POWER',
    healing_power: 0,
    target_scope: 'ACTIVE_OPPONENT',
    min_hits: 1,
    max_hits: 1,
    activation_scope: null,
    activation_trigger: null,
    max_targets: 1
  },
  {
    id: 3,
    name: 'Soot Cloud',
    description: 'Its Fire abilities have a 25% chance to inflict Poisoned for 2 turns.',
    ability_type: 'PASSIVE',
    mp_cost: null,
    affinity: null,
    power_multiplier: null,
    scaling_stat: null,
    healing_power: 0,
    target_scope: null,
    status_effect_trigger_affinity: 'Fire',
    min_hits: 1,
    max_hits: 1,
    activation_scope: 'ACTIVE',
    activation_trigger: 'ON_ABILITY_USE',
    max_targets: 1,
    status_effect_id: 3,
    override_duration: 2,
    override_chance: 0.25
  },
  {
    id: 4,
    name: 'Restoring Geyser',
    description: 'Ranged. Heals a significant amount of HP on a single friendly target (can target benched allies).',
    ability_type: 'ACTIVE',
    mp_cost: 40,
    affinity: 'Water',
    power_multiplier: '0.00',
    scaling_stat: 'POWER',
    healing_power: 150,
    target_scope: 'ANY_ALLY',
    min_hits: 1,
    max_hits: 1,
    activation_scope: null,
    activation_trigger: null,
    max_targets: 1
  },
  {
    id: 5,
    name: 'Soothing Aura',
    description: 'At the end of its turn, the player active monster heals for 3% of its Max HP.',
    ability_type: 'PASSIVE',
    mp_cost: null,
    affinity: null,
    power_multiplier: null,
    scaling_stat: null,
    healing_power: 0,
    target_scope: null,
    min_hits: 1,
    max_hits: 1,
    activation_scope: 'ANY_POSITION',
    activation_trigger: 'END_OF_TURN',
    max_targets: 1,
    status_effect_id: 5,
    override_value: 3.00
  },
  {
    id: 6,
    name: 'Shell Slam',
    description: 'Melee. Deals damage based on 75% of its Defense stat.',
    ability_type: 'ACTIVE',
    mp_cost: 35,
    affinity: 'Earth',
    power_multiplier: '0.75',
    scaling_stat: 'DEFENSE',
    healing_power: 0,
    target_scope: 'ACTIVE_OPPONENT',
    min_hits: 1,
    max_hits: 1,
    activation_scope: null,
    activation_trigger: null,
    max_targets: 1
  },
  {
    id: 7,
    name: 'Crystalize',
    description: 'When HP drops below 50%, Defense doubles, but Speed is halved.',
    ability_type: 'PASSIVE',
    mp_cost: null,
    affinity: null,
    power_multiplier: null,
    scaling_stat: null,
    healing_power: 0,
    target_scope: null,
    min_hits: 1,
    max_hits: 1,
    activation_scope: 'ACTIVE',
    activation_trigger: 'ON_HP_THRESHOLD',
    max_targets: 1,
    trigger_condition_type: 'HP_PERCENT',
    trigger_condition_operator: 'LESS_THAN_OR_EQUAL',
    trigger_condition_value: 50,
    stat_modifiers: [
      {"stat": "defense", "type": "PERCENTAGE", "value": 100},
      {"stat": "speed", "type": "PERCENTAGE", "value": -50}
    ],
    status_effect_id: 6
  },
  {
    id: 8,
    name: 'Peck Flurry',
    description: 'Melee. Hits the active opponent 3 times for 0.5x Power per hit (each hit has a separate accuracy check).',
    ability_type: 'ACTIVE',
    mp_cost: 40,
    affinity: 'Air',
    power_multiplier: '0.50',
    scaling_stat: 'POWER',
    healing_power: 0,
    target_scope: 'ACTIVE_OPPONENT',
    min_hits: 3,
    max_hits: 3,
    activation_scope: null,
    activation_trigger: null,
    max_targets: 1
  },
  {
    id: 9,
    name: 'Tailwind',
    description: 'All monsters on its team get a permanent +5% Speed boost.',
    ability_type: 'PASSIVE',
    mp_cost: null,
    affinity: null,
    power_multiplier: null,
    scaling_stat: null,
    healing_power: 0,
    target_scope: null,
    min_hits: 1,
    max_hits: 1,
    activation_scope: 'BENCH',
    activation_trigger: 'ON_BATTLE_START',
    max_targets: 1,
    stat_modifiers: [
      {"stat": "speed", "type": "PERCENTAGE", "value": 5}
    ]
  },
  {
    id: 10,
    name: 'Jolt',
    description: 'Ranged. Deals very low Electric damage, with a 25% chance to inflict Paralyzed for 2 turns.',
    ability_type: 'ACTIVE',
    mp_cost: 35,
    affinity: 'Electric',
    power_multiplier: '0.20',
    scaling_stat: 'POWER',
    healing_power: 0,
    target_scope: 'ACTIVE_OPPONENT',
    min_hits: 1,
    max_hits: 1,
    activation_scope: null,
    activation_trigger: null,
    max_targets: 1,
    status_effect_id: 1
  },
  {
    id: 11,
    name: 'Magma Punch',
    description: 'Physical attack that inflicts Burn status for 2 turns',
    ability_type: 'ACTIVE',
    mp_cost: 40,
    affinity: 'Fire',
    power_multiplier: '0.80',
    scaling_stat: 'POWER',
    healing_power: 0,
    target_scope: 'ACTIVE_OPPONENT',
    min_hits: 1,
    max_hits: 1,
    activation_scope: null,
    activation_trigger: null,
    max_targets: 1,
    status_effect_id: 2
  },
  {
    id: 12,
    name: 'Tremor Stomp',
    description: 'AoE damage with 25% chance to reduce enemy Speed',
    ability_type: 'ACTIVE',
    mp_cost: 50,
    affinity: 'Earth',
    power_multiplier: '0.60',
    scaling_stat: 'POWER',
    healing_power: 0,
    target_scope: 'ALL_OPPONENTS',
    min_hits: 1,
    max_hits: 1,
    activation_scope: null,
    activation_trigger: null,
    max_targets: 1,
    stat_modifiers: [
      {"stat": "speed", "type": "PERCENTAGE", "value": -10, "duration": 3}
    ]
  },
  {
    id: 13,
    name: 'Volcanic Heart',
    description: '15% chance to heal 5% max HP each turn',
    ability_type: 'PASSIVE',
    mp_cost: null,
    affinity: null,
    power_multiplier: null,
    scaling_stat: null,
    healing_power: 0,
    target_scope: null,
    min_hits: 1,
    max_hits: 1,
    activation_scope: 'ACTIVE',
    activation_trigger: 'END_OF_TURN',
    max_targets: 1,
    status_effect_id: 5,
    override_value: 5.00,
    override_chance: 0.15
  },
  {
    id: 14,
    name: 'Mind Strike',
    description: 'Fast-moving psychic energy strike at single target',
    ability_type: 'ACTIVE',
    mp_cost: 40,
    affinity: 'Psychic',
    power_multiplier: '0.70',
    scaling_stat: 'POWER',
    healing_power: 0,
    target_scope: 'ACTIVE_OPPONENT',
    min_hits: 1,
    max_hits: 1,
    activation_scope: null,
    activation_trigger: null,
    max_targets: 1
  },
  {
    id: 15,
    name: 'Psy-Beam',
    description: 'Powerful beam attack with 40% chance to confuse opponent for 1 turn',
    ability_type: 'ACTIVE',
    mp_cost: 90,
    affinity: 'Psychic',
    power_multiplier: '1.20',
    scaling_stat: 'POWER',
    healing_power: 0,
    target_scope: 'ACTIVE_OPPONENT',
    min_hits: 1,
    max_hits: 1,
    activation_scope: null,
    activation_trigger: null,
    max_targets: 1,
    status_effect_id: 4,
    override_chance: 0.40
  },
  {
    id: 16,
    name: 'Phase Shift',
    description: '20% chance to become incorporeal and avoid Physical attacks',
    ability_type: 'PASSIVE',
    mp_cost: null,
    affinity: null,
    power_multiplier: null,
    scaling_stat: null,
    healing_power: 0,
    target_scope: null,
    min_hits: 1,
    max_hits: 1,
    activation_scope: 'ACTIVE',
    activation_trigger: 'ON_BEING_HIT',
    max_targets: 1,
    status_effect_id: 7,
    override_chance: 0.20
  }
];

const monsterAbilityLinks = [
  // Gigalith (ID: 6)
  { monster_id: 6, ability_id: 1, is_basic_attack: true, override_affinity: 'Earth' },
  { monster_id: 6, ability_id: 11, is_basic_attack: false, override_affinity: null },
  { monster_id: 6, ability_id: 12, is_basic_attack: false, override_affinity: null },
  { monster_id: 6, ability_id: 13, is_basic_attack: false, override_affinity: null },
  
  // Aetherion (ID: 7)
  { monster_id: 7, ability_id: 1, is_basic_attack: true, override_affinity: 'Psychic' },
  { monster_id: 7, ability_id: 14, is_basic_attack: false, override_affinity: null },
  { monster_id: 7, ability_id: 15, is_basic_attack: false, override_affinity: null },
  { monster_id: 7, ability_id: 16, is_basic_attack: false, override_affinity: null },
  
  // Geode Tortoise (ID: 8)
  { monster_id: 8, ability_id: 1, is_basic_attack: true, override_affinity: 'Earth' },
  { monster_id: 8, ability_id: 6, is_basic_attack: false, override_affinity: null },
  { monster_id: 8, ability_id: 7, is_basic_attack: false, override_affinity: null },
  
  // Gale-Feather Griffin (ID: 9)
  { monster_id: 9, ability_id: 1, is_basic_attack: true, override_affinity: 'Air' },
  { monster_id: 9, ability_id: 8, is_basic_attack: false, override_affinity: null },
  { monster_id: 9, ability_id: 9, is_basic_attack: false, override_affinity: null },
  
  // Cinder-Tail Salamander (ID: 10)
  { monster_id: 10, ability_id: 1, is_basic_attack: true, override_affinity: 'Fire' },
  { monster_id: 10, ability_id: 2, is_basic_attack: false, override_affinity: null },
  { monster_id: 10, ability_id: 3, is_basic_attack: false, override_affinity: null },
  
  // River-Spirit Axolotl (ID: 11)
  { monster_id: 11, ability_id: 1, is_basic_attack: true, override_affinity: 'Water' },
  { monster_id: 11, ability_id: 4, is_basic_attack: false, override_affinity: null },
  { monster_id: 11, ability_id: 5, is_basic_attack: false, override_affinity: null },
  
  // Spark-Tail Squirrel (ID: 12)
  { monster_id: 12, ability_id: 1, is_basic_attack: true, override_affinity: 'Electric' },
  { monster_id: 12, ability_id: 10, is_basic_attack: false, override_affinity: null }
];

async function seedRanks() {
  console.log('Seeding ranks...');
  
  // Check if ranks already exist
  const existingRanks = await db.select().from(ranks);
  
  if (existingRanks.length === 0) {
    // Insert all ranks if table is empty
    await db.insert(ranks).values(rankData);
    console.log(`Inserted ${rankData.length} ranks into database.`);
  } else {
    console.log(`Found ${existingRanks.length} existing ranks. Skipping insertion.`);
  }
  
  console.log('Finished seeding ranks.');
}

async function seedMonsters() {
  console.log('Seeding monsters...');
  
  // Check if monsters already exist
  const existingMonsters = await db.select().from(monsters);
  
  if (existingMonsters.length === 0) {
    // Insert all monsters if table is empty
    await db.insert(monsters).values(monsterData);
    console.log(`Inserted ${monsterData.length} monsters into database.`);
  } else {
    console.log(`Found ${existingMonsters.length} existing monsters. Skipping insertion.`);
  }
  
  console.log('Finished seeding monsters.');
}

async function seedAbilities() {
  console.log('Seeding abilities...');
  
  // Check if abilities already exist
  const existingAbilities = await db.select().from(abilities);
  
  if (existingAbilities.length === 0) {
    // Insert all abilities if table is empty
    await db.insert(abilities).values(abilityData);
    console.log(`Inserted ${abilityData.length} abilities into database.`);
  } else {
    console.log(`Found ${existingAbilities.length} existing abilities. Skipping insertion.`);
  }
  
  console.log('Finished seeding abilities.');
}

async function linkAbilitiesToMonsters() {
  console.log('Linking abilities to monsters...');
  
  // Check if monster-ability links already exist
  const existingLinks = await db.select().from(monsterAbilities);
  
  if (existingLinks.length === 0) {
    // Insert all links if table is empty
    await db.insert(monsterAbilities).values(monsterAbilityLinks);
    console.log(`Inserted ${monsterAbilityLinks.length} monster-ability links into database.`);
  } else {
    console.log(`Found ${existingLinks.length} existing monster-ability links. Skipping insertion.`);
  }
  
  console.log('Finished linking abilities to monsters.');
}

async function seedAll() {
  await seedRanks();
  await seedMonsters();
  await seedAbilities();
  await linkAbilitiesToMonsters();
}

seedAll().catch((e) => {
  console.error('Error during database seeding:', e);
  process.exit(1);
});