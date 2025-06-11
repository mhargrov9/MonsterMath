import React from 'react';

interface DetailedMonsterGraphicsProps {
  monsterId: number;
  evolutionStage: number;
  upgradeChoices: Record<string, any>;
  size?: 'small' | 'medium' | 'large';
}

export default function DetailedMonsterGraphics({ 
  monsterId, 
  evolutionStage, 
  upgradeChoices, 
  size = 'medium' 
}: DetailedMonsterGraphicsProps) {
  const sizeMap = {
    small: { width: 80, height: 80, svg: 60 },
    medium: { width: 100, height: 100, svg: 80 },
    large: { width: 140, height: 140, svg: 120 }
  };
  
  const { width, height, svg } = sizeMap[size];

  const getMonsterColors = (id: number) => {
    const colorSets = {
      1: { primary: '#ff6b6b', secondary: '#d63447', accent: '#ff9f43' }, // Fire Salamander
      2: { primary: '#fdcb6e', secondary: '#e17055', accent: '#f39c12' }, // Thunder Drake  
      3: { primary: '#a29bfe', secondary: '#6c5ce7', accent: '#fd79a8' }, // Crystal Guardian
      4: { primary: '#74b9ff', secondary: '#0984e3', accent: '#00cec9' }, // Water Sprite
      5: { primary: '#55a3ff', secondary: '#2d3436', accent: '#636e72' }  // Earth Golem
    };
    return colorSets[id] || colorSets[1];
  };

  const colors = getMonsterColors(monsterId);

  const renderFireSalamander = () => (
    <svg width={svg} height={svg} viewBox="0 0 200 200" className="drop-shadow-lg">
      <defs>
        <linearGradient id={`fire-body-${monsterId}-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="50%" stopColor={colors.accent} />
          <stop offset="100%" stopColor={colors.secondary} />
        </linearGradient>
        <radialGradient id={`fire-glow-${monsterId}-${size}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.accent} stopOpacity="0.8" />
          <stop offset="100%" stopColor={colors.primary} stopOpacity="0.3" />
        </radialGradient>
      </defs>
      
      {/* Flame aura for evolved stages */}
      {evolutionStage >= 3 && (
        <circle cx="100" cy="100" r="90" fill={`url(#fire-glow-${monsterId}-${size})`} opacity="0.6" />
      )}
      
      {/* Body - salamander shape */}
      <ellipse cx="100" cy="130" 
        rx={upgradeChoices?.body ? "45" : "35"} 
        ry={upgradeChoices?.body ? "35" : "25"} 
        fill={`url(#fire-body-${monsterId}-${size})`} 
      />
      
      {/* Head - elongated reptilian */}
      <ellipse cx="100" cy="80" rx="30" ry="25" fill={colors.primary} />
      <ellipse cx="100" cy="75" rx="25" ry="20" fill={colors.accent} />
      
      {/* Snout */}
      <ellipse cx="100" cy="65" rx="15" ry="8" fill={colors.secondary} />
      
      {/* Eyes - reptilian slits */}
      <ellipse cx="90" cy="75" rx="6" ry="3" fill="#000" />
      <ellipse cx="110" cy="75" rx="6" ry="3" fill="#000" />
      <ellipse cx="90" cy="75" rx="2" ry="1" fill={colors.accent} />
      <ellipse cx="110" cy="75" rx="2" ry="1" fill={colors.accent} />
      
      {/* Nostrils */}
      <circle cx="95" cy="65" r="1.5" fill="#000" />
      <circle cx="105" cy="65" r="1.5" fill="#000" />
      
      {/* Fire breath effect for evolved monsters */}
      {evolutionStage >= 2 && (
        <>
          <path d="M115 65 Q125 60 130 55 Q135 50 140 55" stroke={colors.accent} strokeWidth="3" fill="none" opacity="0.8" />
          <path d="M115 67 Q125 62 130 57 Q135 52 140 57" stroke={colors.primary} strokeWidth="2" fill="none" opacity="0.6" />
        </>
      )}
      
      {/* Tail - long and flexible */}
      {upgradeChoices?.tail ? (
        <path d="M135 130 Q160 140 180 120 Q200 100 185 85" stroke={colors.primary} strokeWidth="8" fill="none" />
      ) : (
        <path d="M135 130 Q155 135 170 125" stroke={colors.primary} strokeWidth="6" fill="none" />
      )}
      
      {/* Legs */}
      <ellipse cx="80" cy="145" rx="8" ry="15" fill={colors.secondary} />
      <ellipse cx="120" cy="145" rx="8" ry="15" fill={colors.secondary} />
      <ellipse cx="85" cy="115" rx="6" ry="12" fill={colors.secondary} />
      <ellipse cx="115" cy="115" rx="6" ry="12" fill={colors.secondary} />
      
      {/* Claws */}
      <polygon points="75,155 73,160 77,160" fill="#000" />
      <polygon points="85,155 83,160 87,160" fill="#000" />
      <polygon points="115,155 113,160 117,160" fill="#000" />
      <polygon points="125,155 123,160 127,160" fill="#000" />
      
      {/* Spikes upgrade */}
      {upgradeChoices?.spikes && (
        <>
          <polygon points="85,95 80,85 90,85" fill={colors.accent} />
          <polygon points="100,90 95,80 105,80" fill={colors.accent} />
          <polygon points="115,95 110,85 120,85" fill={colors.accent} />
        </>
      )}
      
      {/* Fire patterns on body */}
      <path d="M75 120 Q85 115 95 120 Q105 125 115 120" stroke={colors.accent} strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M80 135 Q90 130 100 135 Q110 140 120 135" stroke={colors.accent} strokeWidth="2" fill="none" opacity="0.7" />
    </svg>
  );

  const renderThunderDrake = () => (
    <svg width={svg} height={svg} viewBox="0 0 200 200" className="drop-shadow-lg">
      <defs>
        <linearGradient id={`thunder-body-${monsterId}-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="50%" stopColor={colors.accent} />
          <stop offset="100%" stopColor={colors.secondary} />
        </linearGradient>
      </defs>
      
      {/* Lightning aura for evolved stages */}
      {evolutionStage >= 3 && (
        <>
          <path d="M50 50 L60 70 L45 85 L55 105" stroke={colors.accent} strokeWidth="3" fill="none" opacity="0.6" />
          <path d="M150 50 L140 70 L155 85 L145 105" stroke={colors.accent} strokeWidth="3" fill="none" opacity="0.6" />
        </>
      )}
      
      {/* Wings - large and prominent */}
      {upgradeChoices?.wings ? (
        <>
          <path d="M70 100 Q30 70 20 110 Q35 130 60 120 Q70 110 70 100" fill={colors.primary} opacity="0.8" />
          <path d="M130 100 Q170 70 180 110 Q165 130 140 120 Q130 110 130 100" fill={colors.primary} opacity="0.8" />
          {/* Wing details */}
          <path d="M40 90 Q30 100 40 110" stroke={colors.secondary} strokeWidth="2" fill="none" />
          <path d="M160 90 Q170 100 160 110" stroke={colors.secondary} strokeWidth="2" fill="none" />
        </>
      ) : (
        <>
          <path d="M75 105 Q50 90 45 115 Q55 125 70 120" fill={colors.primary} opacity="0.7" />
          <path d="M125 105 Q150 90 155 115 Q145 125 130 120" fill={colors.primary} opacity="0.7" />
        </>
      )}
      
      {/* Body - dragon-like */}
      <ellipse cx="100" cy="130" 
        rx={upgradeChoices?.body ? "40" : "32"} 
        ry={upgradeChoices?.body ? "30" : "22"} 
        fill={`url(#thunder-body-${monsterId}-${size})`} 
      />
      
      {/* Neck */}
      <ellipse cx="100" cy="100" rx="20" ry="15" fill={colors.primary} />
      
      {/* Head - draconic */}
      <ellipse cx="100" cy="75" rx="25" ry="20" fill={colors.primary} />
      
      {/* Snout */}
      <ellipse cx="100" cy="68" rx="12" ry="6" fill={colors.secondary} />
      
      {/* Eyes - fierce dragon eyes */}
      <ellipse cx="92" cy="75" rx="5" ry="7" fill="#FFD700" />
      <ellipse cx="108" cy="75" rx="5" ry="7" fill="#FFD700" />
      <ellipse cx="92" cy="75" rx="2" ry="4" fill="#000" />
      <ellipse cx="108" cy="75" rx="2" ry="4" fill="#000" />
      
      {/* Nostrils with steam */}
      <circle cx="96" cy="68" r="1.5" fill="#000" />
      <circle cx="104" cy="68" r="1.5" fill="#000" />
      
      {/* Lightning breath */}
      {evolutionStage >= 2 && (
        <path d="M112 68 L120 60 L115 55 L125 50 L120 45" stroke={colors.accent} strokeWidth="2" fill="none" />
      )}
      
      {/* Sharp teeth upgrade */}
      {upgradeChoices?.teeth && (
        <>
          <polygon points="92,72 90,78 94,78" fill="white" />
          <polygon points="100,70 98,76 102,76" fill="white" />
          <polygon points="108,72 106,78 110,78" fill="white" />
        </>
      )}
      
      {/* Horns */}
      <polygon points="85,60 83,45 87,45" fill={colors.secondary} />
      <polygon points="115,60 113,45 117,45" fill={colors.secondary} />
      
      {/* Tail with lightning pattern */}
      {upgradeChoices?.tail ? (
        <path d="M135 130 Q160 120 175 140 Q185 160 170 175" stroke={colors.primary} strokeWidth="10" fill="none" />
      ) : (
        <path d="M130 130 Q150 125 160 140" stroke={colors.primary} strokeWidth="8" fill="none" />
      )}
      
      {/* Lightning patterns on body */}
      <path d="M80 120 L90 130 L85 140 L95 150" stroke={colors.accent} strokeWidth="2" fill="none" />
      <path d="M120 120 L110 130 L115 140 L105 150" stroke={colors.accent} strokeWidth="2" fill="none" />
      
      {/* Spikes upgrade */}
      {upgradeChoices?.spikes && (
        <>
          <polygon points="90,110 85,100 95,100" fill={colors.accent} />
          <polygon points="100,108 95,98 105,98" fill={colors.accent} />
          <polygon points="110,110 105,100 115,100" fill={colors.accent} />
        </>
      )}
    </svg>
  );

  const renderCrystalGuardian = () => (
    <svg width={svg} height={svg} viewBox="0 0 200 200" className="drop-shadow-lg">
      <defs>
        <linearGradient id={`crystal-body-${monsterId}-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="50%" stopColor={colors.accent} />
          <stop offset="100%" stopColor={colors.secondary} />
        </linearGradient>
        <filter id="crystal-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Crystal aura */}
      {evolutionStage >= 3 && (
        <circle cx="100" cy="100" r="85" fill={colors.primary} opacity="0.2" filter="url(#crystal-glow)" />
      )}
      
      {/* Body - crystalline structure */}
      <polygon points="100,85 140,115 130,155 70,155 60,115" 
        fill={`url(#crystal-body-${monsterId}-${size})`} 
        stroke={colors.accent} 
        strokeWidth="2" 
      />
      
      {/* Crystal facets on body */}
      <polygon points="100,95 120,110 110,140 90,140 80,110" fill={colors.accent} opacity="0.6" />
      <polygon points="100,105 115,115 108,135 92,135 85,115" fill="white" opacity="0.4" />
      
      {/* Head - crystal formation */}
      <polygon points="100,60 120,75 115,95 85,95 80,75" fill={colors.primary} />
      <polygon points="100,65 110,75 108,85 92,85 90,75" fill={colors.accent} />
      
      {/* Eyes - glowing crystals */}
      <polygon points="92,75 96,78 94,82 88,82 86,78" fill="#FFF" />
      <polygon points="108,75 112,78 110,82 104,82 102,78" fill="#FFF" />
      <circle cx="90" cy="79" r="2" fill={colors.accent} />
      <circle cx="110" cy="79" r="2" fill={colors.accent} />
      
      {/* Crystal horn/crown */}
      <polygon points="100,45 105,60 95,60" fill={colors.secondary} />
      {evolutionStage >= 2 && (
        <>
          <polygon points="90,50 95,65 85,65" fill={colors.secondary} />
          <polygon points="110,50 115,65 105,65" fill={colors.secondary} />
        </>
      )}
      
      {/* Arms - crystalline */}
      <polygon points="60,115 75,120 70,140 55,135" fill={colors.primary} />
      <polygon points="140,115 125,120 130,140 145,135" fill={colors.primary} />
      
      {/* Crystal spikes upgrade */}
      {upgradeChoices?.spikes && (
        <>
          <polygon points="75,105 70,95 80,95" fill={colors.accent} />
          <polygon points="100,100 95,90 105,90" fill={colors.accent} />
          <polygon points="125,105 120,95 130,95" fill={colors.accent} />
          <polygon points="85,130 80,120 90,120" fill={colors.accent} />
          <polygon points="115,130 110,120 120,120" fill={colors.accent} />
        </>
      )}
      
      {/* Legs - crystal pillars */}
      <polygon points="75,155 80,170 70,170 65,155" fill={colors.secondary} />
      <polygon points="125,155 130,170 120,170 115,155" fill={colors.secondary} />
      
      {/* Crystal energy patterns */}
      <circle cx="100" cy="125" r="8" fill={colors.accent} opacity="0.6" />
      <circle cx="100" cy="125" r="4" fill="white" opacity="0.8" />
      
      {/* Magical runes */}
      {evolutionStage >= 4 && (
        <>
          <circle cx="85" cy="110" r="3" fill={colors.accent} opacity="0.7" />
          <circle cx="115" cy="110" r="3" fill={colors.accent} opacity="0.7" />
          <circle cx="100" cy="145" r="3" fill={colors.accent} opacity="0.7" />
        </>
      )}
    </svg>
  );

  const renderWaterSprite = () => (
    <svg width={svg} height={svg} viewBox="0 0 200 200" className="drop-shadow-lg">
      <defs>
        <radialGradient id={`water-body-${monsterId}-${size}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.accent} />
          <stop offset="70%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.secondary} />
        </radialGradient>
        <filter id="water-ripple">
          <feTurbulence baseFrequency="0.04" numOctaves="3" />
          <feDisplacementMap in="SourceGraphic" scale="3"/>
        </filter>
      </defs>
      
      {/* Water aura */}
      {evolutionStage >= 3 && (
        <circle cx="100" cy="100" r="90" fill={colors.primary} opacity="0.3" filter="url(#water-ripple)" />
      )}
      
      {/* Body - flowing water form */}
      <ellipse cx="100" cy="130" 
        rx={upgradeChoices?.body ? "45" : "35"} 
        ry={upgradeChoices?.body ? "35" : "25"} 
        fill={`url(#water-body-${monsterId}-${size})`} 
        opacity="0.8"
      />
      
      {/* Water droplets around body */}
      <circle cx="75" cy="115" r="4" fill={colors.accent} opacity="0.6" />
      <circle cx="125" cy="125" r="3" fill={colors.accent} opacity="0.6" />
      <circle cx="85" cy="145" r="2" fill={colors.accent} opacity="0.6" />
      <circle cx="115" cy="140" r="3" fill={colors.accent} opacity="0.6" />
      
      {/* Head - aquatic */}
      <ellipse cx="100" cy="80" rx="28" ry="25" fill={colors.primary} opacity="0.9" />
      <ellipse cx="100" cy="78" rx="23" ry="20" fill={colors.accent} opacity="0.7" />
      
      {/* Eyes - large and expressive */}
      <circle cx="90" cy="78" r="8" fill="white" />
      <circle cx="110" cy="78" r="8" fill="white" />
      <circle cx="90" cy="78" r="5" fill={colors.secondary} />
      <circle cx="110" cy="78" r="5" fill={colors.secondary} />
      <circle cx="90" cy="76" r="2" fill="white" />
      <circle cx="110" cy="76" r="2" fill="white" />
      
      {/* Gills */}
      <path d="M70 75 Q75 80 70 85" stroke={colors.secondary} strokeWidth="2" fill="none" />
      <path d="M130 75 Q125 80 130 85" stroke={colors.secondary} strokeWidth="2" fill="none" />
      
      {/* Fins */}
      <path d="M70 90 Q50 95 55 110 Q65 105 70 100" fill={colors.primary} opacity="0.7" />
      <path d="M130 90 Q150 95 145 110 Q135 105 130 100" fill={colors.primary} opacity="0.7" />
      
      {/* Tail - flowing */}
      {upgradeChoices?.tail ? (
        <path d="M135 130 Q160 120 175 140 Q190 160 175 175 Q160 185 150 170" 
          stroke={colors.primary} strokeWidth="12" fill="none" opacity="0.8" />
      ) : (
        <path d="M130 130 Q150 125 160 140 Q170 155 160 165" 
          stroke={colors.primary} strokeWidth="8" fill="none" opacity="0.8" />
      )}
      
      {/* Water jets for evolved forms */}
      {evolutionStage >= 2 && (
        <>
          <path d="M115 85 Q125 80 135 85" stroke={colors.accent} strokeWidth="3" fill="none" opacity="0.7" />
          <path d="M118 88 Q128 83 138 88" stroke={colors.primary} strokeWidth="2" fill="none" opacity="0.5" />
        </>
      )}
      
      {/* Bubbles */}
      <circle cx="60" cy="100" r="2" fill={colors.accent} opacity="0.5" />
      <circle cx="140" cy="110" r="3" fill={colors.accent} opacity="0.5" />
      <circle cx="95" cy="50" r="2" fill={colors.accent} opacity="0.5" />
      <circle cx="105" cy="45" r="1" fill={colors.accent} opacity="0.5" />
      
      {/* Spikes upgrade - water spears */}
      {upgradeChoices?.spikes && (
        <>
          <polygon points="85,100 80,90 90,90" fill={colors.accent} opacity="0.8" />
          <polygon points="100,98 95,88 105,88" fill={colors.accent} opacity="0.8" />
          <polygon points="115,100 110,90 120,90" fill={colors.accent} opacity="0.8" />
        </>
      )}
      
      {/* Water swirls */}
      <path d="M75 125 Q85 120 95 125 Q105 130 115 125" stroke={colors.accent} strokeWidth="2" fill="none" opacity="0.6" />
    </svg>
  );

  const renderEarthGolem = () => (
    <svg width={svg} height={svg} viewBox="0 0 200 200" className="drop-shadow-lg">
      <defs>
        <linearGradient id={`earth-body-${monsterId}-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.secondary} />
          <stop offset="50%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.accent} />
        </linearGradient>
        <pattern id="rock-texture" patternUnits="userSpaceOnUse" width="10" height="10">
          <rect width="10" height="10" fill={colors.primary} />
          <circle cx="3" cy="3" r="1" fill={colors.secondary} />
          <circle cx="7" cy="7" r="1" fill={colors.accent} />
        </pattern>
      </defs>
      
      {/* Rock aura for evolved stages */}
      {evolutionStage >= 3 && (
        <>
          <circle cx="80" cy="80" r="8" fill={colors.accent} opacity="0.4" />
          <circle cx="120" cy="90" r="6" fill={colors.accent} opacity="0.4" />
          <circle cx="90" cy="160" r="7" fill={colors.accent} opacity="0.4" />
          <circle cx="110" cy="170" r="5" fill={colors.accent} opacity="0.4" />
        </>
      )}
      
      {/* Body - massive and rocky */}
      <rect x="70" y="110" 
        width={upgradeChoices?.body ? "70" : "60"} 
        height={upgradeChoices?.body ? "60" : "50"} 
        fill={`url(#earth-body-${monsterId}-${size})`} 
        rx="8"
      />
      
      {/* Rock texture overlay */}
      <rect x="75" y="115" width="50" height="40" fill="url(#rock-texture)" opacity="0.3" />
      
      {/* Head - boulder-like */}
      <ellipse cx="100" cy="75" rx="35" ry="30" fill={colors.primary} />
      <ellipse cx="100" cy="73" rx="30" ry="25" fill={colors.secondary} />
      
      {/* Face carved into rock */}
      <rect x="90" y="70" width="6" height="8" fill="#000" rx="1" />
      <rect x="104" y="70" width="6" height="8" fill="#000" rx="1" />
      
      {/* Glowing eyes for evolved forms */}
      {evolutionStage >= 2 && (
        <>
          <circle cx="93" cy="74" r="2" fill={colors.accent} />
          <circle cx="107" cy="74" r="2" fill={colors.accent} />
        </>
      )}
      
      {/* Mouth - crack in rock */}
      <path d="M88 85 Q100 90 112 85" stroke="#000" strokeWidth="3" fill="none" />
      
      {/* Arms - massive stone limbs */}
      <rect x="45" y="115" width="20" height="35" fill={colors.primary} rx="4" />
      <rect x="135" y="115" width="20" height="35" fill={colors.primary} rx="4" />
      
      {/* Hands - stone fists */}
      <circle cx="55" cy="155" r="8" fill={colors.secondary} />
      <circle cx="145" cy="155" r="8" fill={colors.secondary} />
      
      {/* Legs - stone pillars */}
      <rect x="80" y="160" width="15" height="25" fill={colors.primary} rx="3" />
      <rect x="105" y="160" width="15" height="25" fill={colors.primary} rx="3" />
      
      {/* Feet */}
      <ellipse cx="87" cy="188" rx="12" ry="6" fill={colors.secondary} />
      <ellipse cx="113" cy="188" rx="12" ry="6" fill={colors.secondary} />
      
      {/* Rock spikes upgrade */}
      {upgradeChoices?.spikes && (
        <>
          <polygon points="85,105 80,95 90,95" fill={colors.accent} />
          <polygon points="100,103 95,93 105,93" fill={colors.accent} />
          <polygon points="115,105 110,95 120,95" fill={colors.accent} />
          <polygon points="75,125 70,115 80,115" fill={colors.accent} />
          <polygon points="125,125 120,115 130,115" fill={colors.accent} />
        </>
      )}
      
      {/* Rock formations on body */}
      <circle cx="85" cy="125" r="4" fill={colors.accent} />
      <circle cx="115" cy="135" r="3" fill={colors.accent} />
      <circle cx="95" cy="145" r="2" fill={colors.accent} />
      
      {/* Cracks in the rock */}
      <path d="M75 120 L85 130 L80 140" stroke={colors.secondary} strokeWidth="1" fill="none" />
      <path d="M120 125 L110 135 L115 145" stroke={colors.secondary} strokeWidth="1" fill="none" />
      
      {/* Mossy growth for high evolution */}
      {evolutionStage >= 4 && (
        <>
          <circle cx="90" cy="115" r="2" fill="#4CAF50" opacity="0.7" />
          <circle cx="110" cy="128" r="1.5" fill="#4CAF50" opacity="0.7" />
        </>
      )}
    </svg>
  );

  const renderMonster = () => {
    switch (monsterId) {
      case 1: return renderFireSalamander();
      case 2: return renderThunderDrake();
      case 3: return renderCrystalGuardian();
      case 4: return renderWaterSprite();
      case 5: return renderEarthGolem();
      default: return renderFireSalamander();
    }
  };

  return (
    <div 
      className={`bg-gradient-to-br rounded-lg flex items-center justify-center relative shadow-lg`}
      style={{ 
        width, 
        height,
        background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}40)`
      }}
    >
      {renderMonster()}
      
      {/* Evolution stage indicator */}
      {evolutionStage > 1 && (
        <div className={`absolute -top-1 -right-1 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-black border-2 border-white ${
          size === 'small' ? 'w-4 h-4 text-xs' : 
          size === 'medium' ? 'w-5 h-5 text-xs' : 
          'w-6 h-6 text-sm'
        }`}>
          {evolutionStage}
        </div>
      )}
    </div>
  );
}