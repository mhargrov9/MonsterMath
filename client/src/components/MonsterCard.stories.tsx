import type { Meta, StoryObj } from '@storybook/react';
import MonsterCard from './MonsterCard';
import { Monster, UserMonster } from '@shared/types';

// Metadata for the story
const meta: Meta<typeof MonsterCard> = {
  title: 'Game/MonsterCard',
  component: MonsterCard,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock Data for our stories
const mockBaseMonster: Monster = {
  id: 6,
  name: 'Gigalith',
  type: 'earth',
  basePower: 120,
  baseSpeed: 20,
  baseDefense: 150,
  baseHp: 118,
  baseMp: 200,
  goldCost: 500,
  diamondCost: 0,
  description: 'Born in the planet\'s core, its fists can shatter mountains and its heart is a captive star.',
  iconClass: 'fas fa-mountain',
  gradient: 'linear-gradient(45deg, #8B4513, #FF4500)',
  abilities: [
    { 
      id: 1, 
      name: 'Basic Attack', 
      description: 'A basic physical attack', 
      ability_type: 'ACTIVE', 
      mp_cost: 0, 
      affinity: 'Earth',
      power_multiplier: '0.60',
      scaling_stat: 'POWER'
    },
    { 
      id: 11, 
      name: 'Magma Punch', 
      description: 'Physical attack that inflicts Burn status for 2 turns', 
      ability_type: 'ACTIVE', 
      mp_cost: 40, 
      affinity: 'Fire',
      power_multiplier: '0.80',
      scaling_stat: 'POWER'
    }
  ],
  resistances: ['Fire'],
  weaknesses: ['Water'],
  levelUpgrades: {}
};

const mockUserMonster: UserMonster = {
  id: 23,
  userId: 'storybook-user',
  monsterId: 6,
  level: 5,
  power: 180,
  speed: 30,
  defense: 220,
  experience: 100,
  evolutionStage: 1,
  upgradeChoices: {},
  hp: 850,
  maxHp: 1200,
  mp: 150,
  maxMp: 280,
  isShattered: false,
  acquiredAt: new Date().toISOString(),
  monster: mockBaseMonster
};

// --- STORIES ---

// Story 1: A standard, healthy monster
export const Default: Story = {
  args: {
    monster: mockBaseMonster,
    userMonster: mockUserMonster,
    size: 'medium',
    isPlayerTurn: true,
    startExpanded: true
  },
};

// Story 2: A fainted monster
export const Fainted: Story = {
  args: {
    monster: mockBaseMonster,
    userMonster: {
      ...mockUserMonster,
      hp: 0, // Set HP to 0 for this story
      isShattered: true
    },
    size: 'medium',
    isPlayerTurn: false,
    startExpanded: true
  },
};