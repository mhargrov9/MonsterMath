import React from 'react';

interface MonsterGraphicsProps {
  monsterId: number;
  evolutionStage: number;
  upgradeChoices: Record<string, any>;
  size?: 'small' | 'medium' | 'large';
}

const MonsterGraphics: React.FC<MonsterGraphicsProps> = ({ 
  monsterId, 
  evolutionStage, 
  upgradeChoices, 
  size = 'medium' 
}) => {
  const sizeMap = {
    small: { width: 80, height: 80 },
    medium: { width: 120, height: 120 },
    large: { width: 160, height: 160 }
  };

  const dimensions = sizeMap[size];



  // Get monster colors based on type
  const getMonsterColors = () => {
    switch (monsterId) {
      case 1: // Fire Salamander
        return { primary: "#ff6b6b", secondary: "#d63447", accent: "#ff7979" };
      case 2: // Thunder Drake  
        return { primary: "#fdcb6e", secondary: "#e17055", accent: "#f1c40f" };
      case 3: // Crystal Guardian
        return { primary: "#a29bfe", secondary: "#6c5ce7", accent: "#fd79a8" };
      case 4: // Water Sprite
        return { primary: "#74b9ff", secondary: "#0984e3", accent: "#81ecec" };
      case 5: // Earth Golem
        return { primary: "#55a3ff", secondary: "#2d3436", accent: "#6c5ce7" };
      default:
        return { primary: "#ff6b6b", secondary: "#d63447", accent: "#ff7979" };
    }
  };

  // Render the appropriate monster content
  const renderMonsterContent = () => {
    const hasSharpTeeth = upgradeChoices.teeth === 'sharp' || upgradeChoices.teeth === 'icy' || upgradeChoices.teeth === 'electric';
    const hasTail = upgradeChoices.tail === 'spiky' || upgradeChoices.tail === 'crystalline' || upgradeChoices.tail === 'lightning';
    const isMuscular = upgradeChoices.body === 'muscular' || upgradeChoices.body === 'armored' || upgradeChoices.body === 'charged';
    const hasWings = upgradeChoices.wings === 'large';
    const hasSpikes = upgradeChoices.spikes === 'ice' || upgradeChoices.spikes === 'electric';
    const colors = getMonsterColors();

    return (
      <g>
        {/* Aura for higher stages */}
        {evolutionStage >= 3 && (
          <circle cx="100" cy="100" r="95" fill={`url(#aura-${monsterId})`} opacity="0.3"/>
        )}
        
        {/* Body */}
        <ellipse 
          cx="100" 
          cy="120" 
          rx={isMuscular ? "45" : "35"} 
          ry={isMuscular ? "35" : "25"} 
          fill={`url(#dragonBody-${monsterId})`}
        />
        
        {/* Head */}
        <ellipse cx="100" cy="70" rx="30" ry="25" fill={`url(#dragonHead-${monsterId})`}/>
        
        {/* Wings */}
        {(monsterId === 1 || evolutionStage >= 2) && (
          <>
            <path 
              d={hasWings ? "M65 90 Q40 70 45 110 Q60 100 75 105" : "M70 90 Q55 80 60 105 Q70 100 75 100"}
              fill={`url(#wingGradient-${monsterId})`} 
              opacity="0.8"
            />
            <path 
              d={hasWings ? "M135 90 Q160 70 155 110 Q140 100 125 105" : "M130 90 Q145 80 140 105 Q130 100 125 100"}
              fill={`url(#wingGradient-${monsterId})`} 
              opacity="0.8"
            />
          </>
        )}
        
        {/* Eyes */}
        <circle cx="90" cy="65" r="4" fill={colors.secondary}/>
        <circle cx="110" cy="65" r="4" fill={colors.secondary}/>
        <circle cx="90" cy="65" r="2" fill={colors.accent}/>
        <circle cx="110" cy="65" r="2" fill={colors.accent}/>
        
        {/* Mouth and teeth */}
        <path d="M85 80 Q100 85 115 80" stroke="#000" strokeWidth="2" fill="none"/>
        {hasSharpTeeth && (
          <>
            <polygon points="90,82 88,88 92,88" fill="white"/>
            <polygon points="100,82 98,88 102,88" fill="white"/>
            <polygon points="110,82 108,88 112,88" fill="white"/>
          </>
        )}
        
        {/* Tail variations */}
        {hasTail && (
          <>
            {monsterId === 1 && (
              <path 
                d="M135 130 Q160 140 170 120 Q175 125 180 115 Q185 120 190 110" 
                stroke={`url(#dragonBody-${monsterId})`} 
                strokeWidth="8" 
                fill="none"
              />
            )}
            {monsterId === 2 && (
              <>
                <path 
                  d="M135 130 Q160 140 170 120" 
                  stroke={`url(#dragonBody-${monsterId})`} 
                  strokeWidth="8" 
                  fill="none"
                />
                <polygon points="170,120 175,115 180,125 175,130" fill="#a8e6cf"/>
              </>
            )}
            {monsterId === 3 && (
              <path 
                d="M135 130 L150 125 L145 135 L160 130 L155 140 L170 135" 
                stroke="#f1c40f" 
                strokeWidth="4" 
                fill="none"
              />
            )}
          </>
        )}
        
        {/* Spikes */}
        {hasSpikes && (
          <>
            {monsterId === 2 && (
              <>
                <polygon points="85,95 80,85 90,85" fill="#a8e6cf"/>
                <polygon points="100,90 95,80 105,80" fill="#a8e6cf"/>
                <polygon points="115,95 110,85 120,85" fill="#a8e6cf"/>
              </>
            )}
            {monsterId === 3 && (
              <>
                <path d="M85 90 L80 85 L88 88 L83 80 L90 85" fill="#f1c40f"/>
                <path d="M115 90 L120 85 L112 88 L117 80 L110 85" fill="#f1c40f"/>
              </>
            )}
          </>
        )}
        
        {/* Armored plates for Frostbite */}
        {isMuscular && monsterId === 2 && (
          <>
            <ellipse cx="90" cy="110" rx="8" ry="6" fill="#b2dfdb" opacity="0.8"/>
            <ellipse cx="110" cy="110" rx="8" ry="6" fill="#b2dfdb" opacity="0.8"/>
            <ellipse cx="100" cy="125" rx="10" ry="7" fill="#b2dfdb" opacity="0.8"/>
          </>
        )}
        
        {/* Electric charges for Thunderclaw */}
        {isMuscular && monsterId === 3 && (
          <>
            <circle cx="85" cy="115" r="3" fill="#f1c40f" opacity="0.8"/>
            <circle cx="115" cy="115" r="3" fill="#f1c40f" opacity="0.8"/>
            <circle cx="100" cy="105" r="2" fill="#f39c12" opacity="0.8"/>
          </>
        )}
        
        {/* Claws for evolved monsters */}
        {evolutionStage >= 2 && (
          <>
            <path d="M75 140 L70 148 L72 150 L77 145" fill="#333"/>
            <path d="M125 140 L130 148 L128 150 L123 145" fill="#333"/>
          </>
        )}
        
        {/* Special effects for highest stage */}
        {evolutionStage >= 4 && (
          <>
            {monsterId === 1 && (
              <path 
                d="M115 75 Q130 70 140 75 Q145 80 150 75 Q155 70 160 80" 
                fill={`url(#specialEffect-${monsterId})`} 
                opacity="0.7"
              />
            )}
            {monsterId === 2 && (
              <circle cx="130" cy="75" r="8" fill={`url(#specialEffect-${monsterId})`} opacity="0.6"/>
            )}
            {monsterId === 3 && (
              <path 
                d="M115 70 L125 65 L120 75 L130 70 L125 80" 
                fill="#f1c40f" 
              />
            )}
          </>
        )}
      </g>
    );
  };

  return (
    <div className="monster-graphics flex items-center justify-center">
      <svg width={dimensions.width} height={dimensions.height} viewBox="0 0 200 200">
        <defs>
          {/* Common gradients */}
          <linearGradient id={`dragonBody-${monsterId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={monsterId === 1 ? "#ff6b6b" : monsterId === 2 ? "#74b9ff" : "#fdcb6e"}/>
            <stop offset="100%" stopColor={monsterId === 1 ? "#d63447" : monsterId === 2 ? "#0984e3" : "#e17055"}/>
          </linearGradient>
          <linearGradient id={`dragonHead-${monsterId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={monsterId === 1 ? "#ff7979" : monsterId === 2 ? "#81ecec" : "#f1c40f"}/>
            <stop offset="100%" stopColor={monsterId === 1 ? "#e17055" : monsterId === 2 ? "#00cec9" : "#f39c12"}/>
          </linearGradient>
          <linearGradient id={`wingGradient-${monsterId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fd79a8"/>
            <stop offset="100%" stopColor="#e84393"/>
          </linearGradient>
          <radialGradient id={`aura-${monsterId}`}>
            <stop offset="0%" stopColor={monsterId === 1 ? "#ffaa00" : monsterId === 2 ? "#81ecec" : "#f1c40f"} stopOpacity="0"/>
            <stop offset="70%" stopColor={monsterId === 1 ? "#ff6b6b" : monsterId === 2 ? "#74b9ff" : "#fdcb6e"} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={monsterId === 1 ? "#d63447" : monsterId === 2 ? "#0984e3" : "#e17055"} stopOpacity="0.4"/>
          </radialGradient>
          <linearGradient id={`specialEffect-${monsterId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={monsterId === 1 ? "#ffaa00" : monsterId === 2 ? "#e3f2fd" : "#f1c40f"}/>
            <stop offset="50%" stopColor={monsterId === 1 ? "#ff6b6b" : monsterId === 2 ? "#81ecec" : "#fdcb6e"}/>
            <stop offset="100%" stopColor={monsterId === 1 ? "#d63447" : monsterId === 2 ? "#b2dfdb" : "#e17055"}/>
          </linearGradient>
        </defs>
        
        {renderMonsterContent()}
      </svg>
    </div>
  );
};

export default MonsterGraphics;