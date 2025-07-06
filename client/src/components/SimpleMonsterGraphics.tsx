import React from 'react';

interface SimpleMonsterGraphicsProps {
  monsterId: number;
  evolutionStage: number;
  upgradeChoices: Record<string, any>;
  size?: 'small' | 'medium' | 'large';
}

const SimpleMonsterGraphics: React.FC<SimpleMonsterGraphicsProps> = ({
  monsterId,
  evolutionStage,
  upgradeChoices,
  size = 'medium',
}) => {
  const sizeMap = {
    small: { width: 80, height: 80 },
    medium: { width: 120, height: 120 },
    large: { width: 160, height: 160 },
  };

  const dimensions = sizeMap[size];

  // Get monster colors based on type
  const getMonsterColors = () => {
    switch (monsterId) {
      case 1: // Fire Salamander
        return { primary: '#ff6b6b', secondary: '#d63447', accent: '#ff7979' };
      case 2: // Thunder Drake
        return { primary: '#fdcb6e', secondary: '#e17055', accent: '#f1c40f' };
      case 3: // Crystal Guardian
        return { primary: '#a29bfe', secondary: '#6c5ce7', accent: '#fd79a8' };
      case 4: // Water Sprite
        return { primary: '#74b9ff', secondary: '#0984e3', accent: '#81ecec' };
      case 5: // Earth Golem
        return { primary: '#55a3ff', secondary: '#2d3436', accent: '#6c5ce7' };
      default:
        return { primary: '#ff6b6b', secondary: '#d63447', accent: '#ff7979' };
    }
  };

  const colors = getMonsterColors();
  const hasUpgrades = Object.keys(upgradeChoices).length > 0;
  const isEvolved = evolutionStage > 1;

  return (
    <div className="monster-graphics flex items-center justify-center bg-gray-100 rounded-lg p-2">
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 200 200"
      >
        <defs>
          <linearGradient
            id={`body-${monsterId}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
          <linearGradient
            id={`head-${monsterId}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={colors.accent} />
            <stop offset="100%" stopColor={colors.primary} />
          </linearGradient>
          {isEvolved && (
            <radialGradient id={`aura-${monsterId}`}>
              <stop offset="0%" stopColor={colors.accent} stopOpacity="0" />
              <stop offset="70%" stopColor={colors.primary} stopOpacity="0.3" />
              <stop
                offset="100%"
                stopColor={colors.secondary}
                stopOpacity="0.5"
              />
            </radialGradient>
          )}
        </defs>

        {/* Evolution aura */}
        {isEvolved && (
          <circle
            cx="100"
            cy="100"
            r="90"
            fill={`url(#aura-${monsterId})`}
            opacity="0.6"
          />
        )}

        {/* Body - larger if muscular upgrade */}
        <ellipse
          cx="100"
          cy="120"
          rx={hasUpgrades ? 50 : 40}
          ry={hasUpgrades ? 40 : 30}
          fill={`url(#body-${monsterId})`}
        />

        {/* Head */}
        <ellipse
          cx="100"
          cy="70"
          rx="35"
          ry="30"
          fill={`url(#head-${monsterId})`}
        />

        {/* Eyes */}
        <circle cx="90" cy="65" r="5" fill={colors.secondary} />
        <circle cx="110" cy="65" r="5" fill={colors.secondary} />
        <circle cx="90" cy="65" r="2" fill="#fff" />
        <circle cx="110" cy="65" r="2" fill="#fff" />

        {/* Mouth */}
        <path
          d="M85 80 Q100 85 115 80"
          stroke="#000"
          strokeWidth="2"
          fill="none"
        />

        {/* Sharp teeth upgrade */}
        {upgradeChoices.teeth && (
          <>
            <polygon points="90,82 88,88 92,88" fill="white" />
            <polygon points="100,82 98,88 102,88" fill="white" />
            <polygon points="110,82 108,88 112,88" fill="white" />
          </>
        )}

        {/* Tail upgrade */}
        {upgradeChoices.tail && (
          <path
            d="M140 130 Q160 140 170 120 Q175 125 180 115"
            stroke={colors.primary}
            strokeWidth="6"
            fill="none"
          />
        )}

        {/* Wings upgrade */}
        {upgradeChoices.wings && (
          <>
            <path
              d="M65 90 Q40 70 45 110 Q60 100 75 105"
              fill={colors.accent}
              opacity="0.8"
            />
            <path
              d="M135 90 Q160 70 155 110 Q140 100 125 105"
              fill={colors.accent}
              opacity="0.8"
            />
          </>
        )}

        {/* Spikes upgrade */}
        {upgradeChoices.spikes && (
          <>
            <polygon points="85,95 80,85 90,85" fill={colors.accent} />
            <polygon points="100,90 95,80 105,80" fill={colors.accent} />
            <polygon points="115,95 110,85 120,85" fill={colors.accent} />
          </>
        )}

        {/* Evolution indicator */}
        <text
          x="100"
          y="190"
          textAnchor="middle"
          fontSize="12"
          fill={colors.secondary}
        >
          Stage {evolutionStage}
        </text>
      </svg>
    </div>
  );
};

export default SimpleMonsterGraphics;
