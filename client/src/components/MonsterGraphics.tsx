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

  // Flamewyrm graphics
  const renderFlamewyrm = () => {
    const hasSharpTeeth = upgradeChoices.teeth === 'sharp';
    const hasTail = upgradeChoices.tail === 'spiky';
    const isMuscular = upgradeChoices.body === 'muscular';
    const hasWings = upgradeChoices.wings === 'large';
    
    return (
      <svg width={dimensions.width} height={dimensions.height} viewBox="0 0 200 200">
        {/* Fire background aura for higher stages */}
        {evolutionStage >= 3 && (
          <circle cx="100" cy="100" r="95" fill="url(#fireAura)" opacity="0.3"/>
        )}
        
        {/* Body */}
        <ellipse 
          cx="100" 
          cy="120" 
          rx={isMuscular ? "45" : "35"} 
          ry={isMuscular ? "35" : "25"} 
          fill="url(#dragonBody)"
        />
        
        {/* Head */}
        <ellipse cx="100" cy="70" rx="30" ry="25" fill="url(#dragonHead)"/>
        
        {/* Wings */}
        <path 
          d={hasWings ? "M65 90 Q40 70 45 110 Q60 100 75 105" : "M70 90 Q55 80 60 105 Q70 100 75 100"}
          fill="url(#wingGradient)" 
          opacity="0.8"
        />
        <path 
          d={hasWings ? "M135 90 Q160 70 155 110 Q140 100 125 105" : "M130 90 Q145 80 140 105 Q130 100 125 100"}
          fill="url(#wingGradient)" 
          opacity="0.8"
        />
        
        {/* Eyes */}
        <circle cx="90" cy="65" r="4" fill="#ff4444"/>
        <circle cx="110" cy="65" r="4" fill="#ff4444"/>
        <circle cx="90" cy="65" r="2" fill="#ffaa00"/>
        <circle cx="110" cy="65" r="2" fill="#ffaa00"/>
        
        {/* Mouth and teeth */}
        <path d="M85 80 Q100 85 115 80" stroke="#000" strokeWidth="2" fill="none"/>
        {hasSharpTeeth && (
          <>
            <polygon points="90,82 88,88 92,88" fill="white"/>
            <polygon points="100,82 98,88 102,88" fill="white"/>
            <polygon points="110,82 108,88 112,88" fill="white"/>
          </>
        )}
        
        {/* Spiky tail */}
        {hasTail && (
          <path 
            d="M135 130 Q160 140 170 120 Q175 125 180 115 Q185 120 190 110" 
            stroke="url(#dragonBody)" 
            strokeWidth="8" 
            fill="none"
          />
        )}
        
        {/* Claws */}
        {evolutionStage >= 2 && (
          <>
            <path d="M75 140 L70 148 L72 150 L77 145" fill="#333"/>
            <path d="M125 140 L130 148 L128 150 L123 145" fill="#333"/>
          </>
        )}
        
        {/* Fire breath for highest stage */}
        {evolutionStage >= 4 && (
          <path 
            d="M115 75 Q130 70 140 75 Q145 80 150 75 Q155 70 160 80" 
            fill="url(#fireBreath)" 
            opacity="0.7"
          />
        )}

        {/* Gradients */}
        <defs>
          <linearGradient id="dragonBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b6b"/>
            <stop offset="100%" stopColor="#d63447"/>
          </linearGradient>
          <linearGradient id="dragonHead" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff7979"/>
            <stop offset="100%" stopColor="#e17055"/>
          </linearGradient>
          <linearGradient id="wingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fd79a8"/>
            <stop offset="100%" stopColor="#e84393"/>
          </linearGradient>
          <radialGradient id="fireAura">
            <stop offset="0%" stopColor="#ffaa00" stopOpacity="0"/>
            <stop offset="70%" stopColor="#ff6b6b" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#d63447" stopOpacity="0.4"/>
          </radialGradient>
          <linearGradient id="fireBreath" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffaa00"/>
            <stop offset="50%" stopColor="#ff6b6b"/>
            <stop offset="100%" stopColor="#d63447"/>
          </linearGradient>
        </defs>
      </svg>
    );
  };

  // Frostbite graphics
  const renderFrostbite = () => {
    const hasSharpTeeth = upgradeChoices.teeth === 'icy';
    const hasTail = upgradeChoices.tail === 'crystalline';
    const isMuscular = upgradeChoices.body === 'armored';
    const hasSpikes = upgradeChoices.spikes === 'ice';
    
    return (
      <svg width={dimensions.width} height={dimensions.height} viewBox="0 0 200 200">
        {/* Ice aura for higher stages */}
        {evolutionStage >= 3 && (
          <circle cx="100" cy="100" r="95" fill="url(#iceAura)" opacity="0.3"/>
        )}
        
        {/* Body */}
        <ellipse 
          cx="100" 
          cy="120" 
          rx={isMuscular ? "45" : "35"} 
          ry={isMuscular ? "35" : "25"} 
          fill="url(#iceBody)"
        />
        
        {/* Head */}
        <ellipse cx="100" cy="70" rx="30" ry="25" fill="url(#iceHead)"/>
        
        {/* Ice spikes on back */}
        {hasSpikes && (
          <>
            <polygon points="85,95 80,85 90,85" fill="#a8e6cf"/>
            <polygon points="100,90 95,80 105,80" fill="#a8e6cf"/>
            <polygon points="115,95 110,85 120,85" fill="#a8e6cf"/>
          </>
        )}
        
        {/* Eyes */}
        <circle cx="90" cy="65" r="4" fill="#00cec9"/>
        <circle cx="110" cy="65" r="4" fill="#00cec9"/>
        <circle cx="90" cy="65" r="2" fill="#81ecec"/>
        <circle cx="110" cy="65" r="2" fill="#81ecec"/>
        
        {/* Mouth and icy teeth */}
        <path d="M85 80 Q100 85 115 80" stroke="#000" strokeWidth="2" fill="none"/>
        {hasSharpTeeth && (
          <>
            <polygon points="90,82 88,88 92,88" fill="#e3f2fd"/>
            <polygon points="100,82 98,88 102,88" fill="#e3f2fd"/>
            <polygon points="110,82 108,88 112,88" fill="#e3f2fd"/>
          </>
        )}
        
        {/* Crystalline tail */}
        {hasTail && (
          <>
            <path 
              d="M135 130 Q160 140 170 120" 
              stroke="url(#iceBody)" 
              strokeWidth="8" 
              fill="none"
            />
            <polygon points="170,120 175,115 180,125 175,130" fill="#a8e6cf"/>
          </>
        )}
        
        {/* Armored plates */}
        {isMuscular && (
          <>
            <ellipse cx="90" cy="110" rx="8" ry="6" fill="#b2dfdb" opacity="0.8"/>
            <ellipse cx="110" cy="110" rx="8" ry="6" fill="#b2dfdb" opacity="0.8"/>
            <ellipse cx="100" cy="125" rx="10" ry="7" fill="#b2dfdb" opacity="0.8"/>
          </>
        )}
        
        {/* Frost breath for highest stage */}
        {evolutionStage >= 4 && (
          <circle cx="130" cy="75" r="8" fill="url(#frostBreath)" opacity="0.6"/>
        )}

        {/* Gradients */}
        <defs>
          <linearGradient id="iceBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#74b9ff"/>
            <stop offset="100%" stopColor="#0984e3"/>
          </linearGradient>
          <linearGradient id="iceHead" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#81ecec"/>
            <stop offset="100%" stopColor="#00cec9"/>
          </linearGradient>
          <radialGradient id="iceAura">
            <stop offset="0%" stopColor="#81ecec" stopOpacity="0"/>
            <stop offset="70%" stopColor="#74b9ff" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#0984e3" stopOpacity="0.4"/>
          </radialGradient>
          <radialGradient id="frostBreath">
            <stop offset="0%" stopColor="#e3f2fd"/>
            <stop offset="100%" stopColor="#81ecec"/>
          </radialGradient>
        </defs>
      </svg>
    );
  };

  // Thunderclaw graphics
  const renderThunderclaw = () => {
    const hasSharpTeeth = upgradeChoices.teeth === 'electric';
    const hasTail = upgradeChoices.tail === 'lightning';
    const isMuscular = upgradeChoices.body === 'charged';
    const hasSpikes = upgradeChoices.spikes === 'electric';
    
    return (
      <svg width={dimensions.width} height={dimensions.height} viewBox="0 0 200 200">
        {/* Electric aura for higher stages */}
        {evolutionStage >= 3 && (
          <circle cx="100" cy="100" r="95" fill="url(#electricAura)" opacity="0.3"/>
        )}
        
        {/* Body */}
        <ellipse 
          cx="100" 
          cy="120" 
          rx={isMuscular ? "45" : "35"} 
          ry={isMuscular ? "35" : "25"} 
          fill="url(#electricBody)"
        />
        
        {/* Head */}
        <ellipse cx="100" cy="70" rx="30" ry="25" fill="url(#electricHead)"/>
        
        {/* Electric spikes */}
        {hasSpikes && (
          <>
            <path d="M85 90 L80 85 L88 88 L83 80 L90 85" fill="#f1c40f"/>
            <path d="M115 90 L120 85 L112 88 L117 80 L110 85" fill="#f1c40f"/>
          </>
        )}
        
        {/* Eyes */}
        <circle cx="90" cy="65" r="4" fill="#f39c12"/>
        <circle cx="110" cy="65" r="4" fill="#f39c12"/>
        <circle cx="90" cy="65" r="2" fill="#f1c40f"/>
        <circle cx="110" cy="65" r="2" fill="#f1c40f"/>
        
        {/* Mouth and electric teeth */}
        <path d="M85 80 Q100 85 115 80" stroke="#000" strokeWidth="2" fill="none"/>
        {hasSharpTeeth && (
          <>
            <polygon points="90,82 88,88 92,88" fill="#f1c40f"/>
            <polygon points="100,82 98,88 102,88" fill="#f1c40f"/>
            <polygon points="110,82 108,88 112,88" fill="#f1c40f"/>
          </>
        )}
        
        {/* Lightning tail */}
        {hasTail && (
          <path 
            d="M135 130 L150 125 L145 135 L160 130 L155 140 L170 135" 
            stroke="#f1c40f" 
            strokeWidth="4" 
            fill="none"
          />
        )}
        
        {/* Electric charges on body */}
        {isMuscular && (
          <>
            <circle cx="85" cy="115" r="3" fill="#f1c40f" opacity="0.8"/>
            <circle cx="115" cy="115" r="3" fill="#f1c40f" opacity="0.8"/>
            <circle cx="100" cy="105" r="2" fill="#f39c12" opacity="0.8"/>
          </>
        )}
        
        {/* Lightning bolt for highest stage */}
        {evolutionStage >= 4 && (
          <path 
            d="M115 70 L125 65 L120 75 L130 70 L125 80" 
            fill="#f1c40f" 
          />
        )}

        {/* Gradients */}
        <defs>
          <linearGradient id="electricBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fdcb6e"/>
            <stop offset="100%" stopColor="#e17055"/>
          </linearGradient>
          <linearGradient id="electricHead" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1c40f"/>
            <stop offset="100%" stopColor="#f39c12"/>
          </linearGradient>
          <radialGradient id="electricAura">
            <stop offset="0%" stopColor="#f1c40f" stopOpacity="0"/>
            <stop offset="70%" stopColor="#fdcb6e" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#e17055" stopOpacity="0.4"/>
          </radialGradient>
        </defs>
      </svg>
    );
  };

  // Render the appropriate monster
  const renderMonster = () => {
    switch (monsterId) {
      case 1:
        return renderFlamewyrm();
      case 2:
        return renderFrostbite();
      case 3:
        return renderThunderclaw();
      default:
        return renderFlamewyrm();
    }
  };

  return (
    <div className="monster-graphics">
      {renderMonster()}
    </div>
  );
};

export default MonsterGraphics;