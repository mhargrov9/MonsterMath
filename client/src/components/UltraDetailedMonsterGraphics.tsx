import React from 'react';

interface UltraDetailedMonsterGraphicsProps {
  monsterId: number;
  evolutionStage: number;
  upgradeChoices: Record<string, any>;
  size?: 'small' | 'medium' | 'large';
}

export default function UltraDetailedMonsterGraphics({ 
  monsterId, 
  evolutionStage, 
  upgradeChoices, 
  size = 'medium' 
}: UltraDetailedMonsterGraphicsProps) {
  const dimensions = {
    small: { width: 200, height: 200 },
    medium: { width: 320, height: 320 },
    large: { width: 450, height: 450 }
  };

  const { width, height } = dimensions[size];

  const renderFlamePhoenix = () => {
    const hasSharpTeeth = upgradeChoices?.teeth === 'razor';
    const hasSpikes = upgradeChoices?.spikes === 'metallic';
    const hasMuscles = upgradeChoices?.muscles === 'enhanced';
    const hasWings = upgradeChoices?.wings === 'flame';
    const tailType = upgradeChoices?.tail || 'normal';

    return (
      <svg width={width} height={height} viewBox="0 0 400 400" className="drop-shadow-lg">
        <defs>
          <radialGradient id="fireGlow" cx="50%" cy="50%" r="80%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.4"/>
            <stop offset="30%" stopColor="#FF8C00" stopOpacity="0.3"/>
            <stop offset="60%" stopColor="#FF4500" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#DC143C" stopOpacity="0.1"/>
          </radialGradient>
          
          <linearGradient id="phoenixBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700"/>
            <stop offset="25%" stopColor="#FF8C00"/>
            <stop offset="50%" stopColor="#FF4500"/>
            <stop offset="75%" stopColor="#DC143C"/>
            <stop offset="100%" stopColor="#8B0000"/>
          </linearGradient>

          <linearGradient id="wingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.9"/>
            <stop offset="30%" stopColor="#FF8C00" stopOpacity="0.8"/>
            <stop offset="60%" stopColor="#FF4500" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#DC143C" stopOpacity="0.9"/>
          </linearGradient>

          <pattern id="featherPattern" patternUnits="userSpaceOnUse" width="10" height="10">
            <path d="M5 0 Q8 3 5 6 Q2 3 5 0" fill="#FF6347" stroke="#8B0000" strokeWidth="0.3"/>
            <path d="M5 2 Q7 4 5 6" fill="#FFD700" opacity="0.6"/>
          </pattern>

          <radialGradient id="beakGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD700"/>
            <stop offset="100%" stopColor="#FF8C00"/>
          </radialGradient>
        </defs>

        {/* Background fire glow */}
        <circle cx="200" cy="200" r="190" fill="url(#fireGlow)"/>

        {/* Magnificent fire wings */}
        <g>
          {/* Left wing */}
          <path d="M80 150 Q30 100 20 160 Q25 220 70 200 Q100 180 120 150 Q110 140 100 130 Q90 140 80 150" 
                fill="url(#wingGradient)" stroke="#8B0000" strokeWidth="2"/>
          
          {/* Wing feather details */}
          {Array.from({ length: 8 }).map((_, i) => (
            <path key={i} 
                  d={`M${50 + i * 8} ${130 + i * 4} Q${55 + i * 8} ${125 + i * 4} ${60 + i * 8} ${130 + i * 4} Q${55 + i * 8} ${135 + i * 4} ${50 + i * 8} ${130 + i * 4}`}
                  fill="#FF6347" 
                  stroke="#8B0000" 
                  strokeWidth="0.5"/>
          ))}
          
          {/* Fire emanating from wing tips */}
          <ellipse cx="35" cy="140" rx="15" ry="8" fill="#FFD700" opacity="0.8" transform="rotate(-30 35 140)"/>
          <ellipse cx="25" cy="135" rx="12" ry="6" fill="#FF8C00" opacity="0.8" transform="rotate(-25 25 135)"/>

          {/* Right wing */}
          <path d="M320 150 Q370 100 380 160 Q375 220 330 200 Q300 180 280 150 Q290 140 300 130 Q310 140 320 150" 
                fill="url(#wingGradient)" stroke="#8B0000" strokeWidth="2"/>
          
          {/* Right wing feathers */}
          {Array.from({ length: 8 }).map((_, i) => (
            <path key={i} 
                  d={`M${350 - i * 8} ${130 + i * 4} Q${345 - i * 8} ${125 + i * 4} ${340 - i * 8} ${130 + i * 4} Q${345 - i * 8} ${135 + i * 4} ${350 - i * 8} ${130 + i * 4}`}
                  fill="#FF6347" 
                  stroke="#8B0000" 
                  strokeWidth="0.5"/>
          ))}
          
          <ellipse cx="365" cy="140" rx="15" ry="8" fill="#FFD700" opacity="0.8" transform="rotate(30 365 140)"/>
          <ellipse cx="375" cy="135" rx="12" ry="6" fill="#FF8C00" opacity="0.8" transform="rotate(25 375 135)"/>
        </g>

        {/* Phoenix body - sleek and bird-like */}
        <ellipse cx="200" cy="220" rx="60" ry="90" fill="url(#phoenixBody)"/>
        <ellipse cx="200" cy="220" rx="60" ry="90" fill="url(#featherPattern)" opacity="0.7"/>

        {/* Phoenix chest with distinctive plumage */}
        <ellipse cx="200" cy="190" rx="45" ry="35" fill="#FFD700"/>
        <ellipse cx="200" cy="190" rx="35" ry="25" fill="#FF8C00"/>
        <ellipse cx="200" cy="190" rx="25" ry="15" fill="#FF4500"/>

        {/* Phoenix head - bird-like with crest */}
        <ellipse cx="200" cy="120" rx="35" ry="30" fill="url(#phoenixBody)"/>
        
        {/* Feather crest */}
        <path d="M185 95 Q190 85 195 95" fill="#FFD700" stroke="#8B0000" strokeWidth="0.5"/>
        <path d="M195 95 Q200 80 205 95" fill="#FF8C00" stroke="#8B0000" strokeWidth="0.5"/>
        <path d="M205 95 Q210 85 215 95" fill="#FFD700" stroke="#8B0000" strokeWidth="0.5"/>

        {/* Phoenix beak */}
        <path d="M200 135 L185 145 Q190 150 200 145 Q210 150 215 145 L200 135" 
              fill="url(#beakGradient)" stroke="#8B4513" strokeWidth="1"/>
        <path d="M200 137 L195 142" stroke="#FFFFFF" strokeWidth="1"/>

        {/* Phoenix eyes */}
        <ellipse cx="185" cy="115" rx="8" ry="6" fill="#000000"/>
        <ellipse cx="215" cy="115" rx="8" ry="6" fill="#000000"/>
        <ellipse cx="185" cy="115" rx="6" ry="4" fill="#FFD700"/>
        <ellipse cx="215" cy="115" rx="6" ry="4" fill="#FFD700"/>
        <circle cx="185" cy="115" r="2" fill="#000000"/>
        <circle cx="215" cy="115" r="2" fill="#000000"/>
        <circle cx="183" cy="113" r="1" fill="#FFFFFF"/>
        <circle cx="213" cy="113" r="1" fill="#FFFFFF"/>

        {/* Phoenix legs - bird talons */}
        <ellipse cx="180" cy="310" rx="8" ry="25" fill="url(#beakGradient)"/>
        <ellipse cx="220" cy="310" rx="8" ry="25" fill="url(#beakGradient)"/>
        
        {/* Talons */}
        <path d="M175 330 Q170 335 175 340" stroke="#8B4513" strokeWidth="2" fill="#FFD700"/>
        <path d="M180 335 Q175 340 180 345" stroke="#8B4513" strokeWidth="2" fill="#FFD700"/>
        <path d="M185 330 Q180 335 185 340" stroke="#8B4513" strokeWidth="2" fill="#FFD700"/>
        
        <path d="M225 330 Q230 335 225 340" stroke="#8B4513" strokeWidth="2" fill="#FFD700"/>
        <path d="M220 335 Q225 340 220 345" stroke="#8B4513" strokeWidth="2" fill="#FFD700"/>
        <path d="M215 330 Q220 335 215 340" stroke="#8B4513" strokeWidth="2" fill="#FFD700"/>

        {/* Phoenix tail feathers */}
        {tailType === 'flame' ? (
          <g>
            <path d="M200 310 Q180 340 160 370 Q170 380 190 350 Q200 330 200 310" 
                  fill="#FFD700" opacity="0.8"/>
            <path d="M200 310 Q220 340 240 370 Q230 380 210 350 Q200 330 200 310" 
                  fill="#FF8C00" opacity="0.8"/>
            <path d="M200 310 Q200 350 200 390" 
                  fill="#FF4500" opacity="0.7"/>
          </g>
        ) : (
          <g>
            <path d="M200 310 Q185 350 170 380" stroke="#8B0000" strokeWidth="3" fill="#FF6347"/>
            <path d="M200 310 Q200 350 200 380" stroke="#8B0000" strokeWidth="3" fill="#FFD700"/>
            <path d="M200 310 Q215 350 230 380" stroke="#8B0000" strokeWidth="3" fill="#FF6347"/>
          </g>
        )}

        {/* Fire aura */}
        <g opacity="0.6">
          <circle cx="150" cy="150" r="12" fill="#FFD700"/>
          <circle cx="250" cy="180" r="10" fill="#FF8C00"/>
          <circle cx="300" cy="250" r="8" fill="#FF4500"/>
          <circle cx="100" cy="280" r="6" fill="#FFD700"/>
        </g>
      </svg>
    );
  };

  const renderAquaLeviathan = () => {
    const hasSharpTeeth = upgradeChoices?.teeth === 'razor';
    const hasSpikes = upgradeChoices?.spikes === 'metallic';
    const hasMuscles = upgradeChoices?.muscles === 'enhanced';
    const hasWings = upgradeChoices?.wings === 'water';
    const tailType = upgradeChoices?.tail || 'normal';

    return (
      <svg width={width} height={height} viewBox="0 0 400 400" className="drop-shadow-lg">
        <defs>
          <radialGradient id="oceanGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#00CED1" stopOpacity="0.3"/>
            <stop offset="50%" stopColor="#20B2AA" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#008B8B" stopOpacity="0.1"/>
          </radialGradient>
          
          <linearGradient id="leviathanBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4682B4"/>
            <stop offset="25%" stopColor="#5F9EA0"/>
            <stop offset="50%" stopColor="#008B8B"/>
            <stop offset="75%" stopColor="#006400"/>
            <stop offset="100%" stopColor="#2F4F4F"/>
          </linearGradient>

          <pattern id="scaleTexture" patternUnits="userSpaceOnUse" width="12" height="12">
            <circle cx="6" cy="6" r="4" fill="#20B2AA" stroke="#008B8B" strokeWidth="0.5"/>
            <circle cx="6" cy="6" r="2" fill="#87CEEB" opacity="0.8"/>
          </pattern>

          <radialGradient id="waterBubble" cx="30%" cy="30%" r="40%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#87CEEB" stopOpacity="0.3"/>
          </radialGradient>

          <linearGradient id="finGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#87CEEB" stopOpacity="0.9"/>
            <stop offset="50%" stopColor="#4682B4" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#2F4F4F" stopOpacity="0.9"/>
          </linearGradient>
        </defs>

        {/* Background ocean glow */}
        <circle cx="200" cy="200" r="180" fill="url(#oceanGlow)"/>

        {/* Serpentine body segments */}
        <g>
          <ellipse cx="200" cy="100" rx="30" ry="20" fill="url(#leviathanBody)" transform="rotate(10 200 100)"/>
          <ellipse cx="200" cy="130" rx="40" ry="25" fill="url(#leviathanBody)" transform="rotate(-5 200 130)"/>
          <ellipse cx="200" cy="170" rx="50" ry="30" fill="url(#leviathanBody)" transform="rotate(8 200 170)"/>
          <ellipse cx="200" cy="220" rx="60" ry="35" fill="url(#leviathanBody)" transform="rotate(-3 200 220)"/>
          <ellipse cx="200" cy="270" rx="50" ry="30" fill="url(#leviathanBody)" transform="rotate(12 200 270)"/>
          <ellipse cx="200" cy="310" rx="40" ry="25" fill="url(#leviathanBody)" transform="rotate(-8 200 310)"/>
          <ellipse cx="200" cy="340" rx="30" ry="20" fill="url(#leviathanBody)" transform="rotate(15 200 340)"/>
        </g>

        {/* Scale overlay on body */}
        <ellipse cx="200" cy="220" rx="60" ry="120" fill="url(#scaleTexture)" opacity="0.6"/>

        {/* Leviathan head - serpentine */}
        <ellipse cx="200" cy="80" rx="45" ry="35" fill="url(#leviathanBody)"/>
        
        {/* Head spines */}
        <g>
          <polygon points="175,60 180,45 185,60" fill="#2F4F4F"/>
          <polygon points="190,55 195,40 200,55" fill="#2F4F4F"/>
          <polygon points="200,55 205,40 210,55" fill="#2F4F4F"/>
          <polygon points="215,60 220,45 225,60" fill="#2F4F4F"/>
        </g>

        {/* Serpentine eyes */}
        <ellipse cx="185" cy="75" rx="12" ry="8" fill="#FFD700"/>
        <ellipse cx="215" cy="75" rx="12" ry="8" fill="#FFD700"/>
        <ellipse cx="185" cy="75" rx="4" ry="6" fill="#000000"/>
        <ellipse cx="215" cy="75" rx="4" ry="6" fill="#000000"/>
        <ellipse cx="183" cy="72" rx="2" ry="2" fill="#FFFFFF"/>
        <ellipse cx="213" cy="72" rx="2" ry="2" fill="#FFFFFF"/>

        {/* Elongated jaw with fangs */}
        <ellipse cx="200" cy="95" rx="35" ry="15" fill="url(#leviathanBody)"/>
        
        <g>
          <polygon points="180,100 185,115 190,100" fill="#FFFFFF"/>
          <polygon points="190,100 195,118 200,100" fill="#FFFFFF"/>
          <polygon points="200,100 205,118 210,100" fill="#FFFFFF"/>
          <polygon points="210,100 215,115 220,100" fill="#FFFFFF"/>
        </g>

        {/* Dorsal fins */}
        <g>
          {Array.from({ length: 8 }).map((_, i) => (
            <polygon key={i} 
                    points={`${190 + i * 5},${120 + i * 25} ${195 + i * 5},${105 + i * 25} ${200 + i * 5},${120 + i * 25}`} 
                    fill="url(#finGradient)" 
                    stroke="#2F4F4F" 
                    strokeWidth="0.5"/>
          ))}
        </g>

        {/* Side fins */}
        <g>
          <path d="M120 180 Q70 160 60 200 Q70 240 110 220 Q115 200 120 180" 
                fill="url(#finGradient)" stroke="#2F4F4F" strokeWidth="2"/>
          <path d="M280 180 Q330 160 340 200 Q330 240 290 220 Q285 200 280 180" 
                fill="url(#finGradient)" stroke="#2F4F4F" strokeWidth="2"/>
        </g>

        {/* Powerful tail */}
        <path d="M200 350 Q170 380 150 400 Q200 410 250 400 Q230 380 200 350" 
              fill="url(#finGradient)"/>

        {/* Water bubbles */}
        <g opacity="0.6">
          <circle cx="120" cy="100" r="8" fill="url(#waterBubble)"/>
          <circle cx="300" cy="120" r="6" fill="url(#waterBubble)"/>
          <circle cx="350" cy="250" r="10" fill="url(#waterBubble)"/>
          <circle cx="80" cy="280" r="5" fill="url(#waterBubble)"/>
          <circle cx="150" cy="350" r="7" fill="url(#waterBubble)"/>
        </g>

        {/* Bioluminescent spots */}
        <g opacity="0.8">
          <circle cx="170" cy="150" r="3" fill="#00FFFF"/>
          <circle cx="230" cy="180" r="4" fill="#00FFFF"/>
          <circle cx="180" cy="240" r="2" fill="#00FFFF"/>
          <circle cx="220" cy="280" r="3" fill="#00FFFF"/>
        </g>
      </svg>
    );
  };

  const renderStormDragon = () => {
    const hasSharpTeeth = upgradeChoices?.teeth === 'razor';
    const hasSpikes = upgradeChoices?.spikes === 'metallic';
    const hasMuscles = upgradeChoices?.muscles === 'enhanced';
    const hasWings = upgradeChoices?.wings === 'storm';
    const tailType = upgradeChoices?.tail || 'normal';

    return (
      <svg width={width} height={height} viewBox="0 0 400 400" className="drop-shadow-lg">
        <defs>
          <radialGradient id="stormGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#9370DB" stopOpacity="0.3"/>
            <stop offset="50%" stopColor="#4B0082" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#191970" stopOpacity="0.1"/>
          </radialGradient>
          
          <linearGradient id="dragonBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4169E1"/>
            <stop offset="25%" stopColor="#6495ED"/>
            <stop offset="50%" stopColor="#9370DB"/>
            <stop offset="75%" stopColor="#4B0082"/>
            <stop offset="100%" stopColor="#191970"/>
          </linearGradient>

          <pattern id="dragonScales" patternUnits="userSpaceOnUse" width="15" height="15">
            <path d="M7.5 0 L15 7.5 L7.5 15 L0 7.5 Z" fill="#6495ED" stroke="#191970" strokeWidth="0.8"/>
            <circle cx="7.5" cy="7.5" r="3" fill="#9370DB" opacity="0.6"/>
          </pattern>

          <radialGradient id="lightningGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFF00"/>
            <stop offset="50%" stopColor="#FFD700"/>
            <stop offset="100%" stopColor="#FFA500" stopOpacity="0"/>
          </radialGradient>

          <linearGradient id="hornGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5F5DC"/>
            <stop offset="50%" stopColor="#DEB887"/>
            <stop offset="100%" stopColor="#8B7355"/>
          </linearGradient>

          <linearGradient id="stormWing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E6E6FA" stopOpacity="0.9"/>
            <stop offset="30%" stopColor="#DDA0DD" stopOpacity="0.8"/>
            <stop offset="60%" stopColor="#9370DB" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#4B0082" stopOpacity="0.8"/>
          </linearGradient>
        </defs>

        {/* Background storm glow */}
        <circle cx="200" cy="200" r="180" fill="url(#stormGlow)"/>

        {/* Storm wings */}
        {hasWings && (
          <g>
            <path d="M120 120 Q60 80 40 140 Q50 200 100 180 Q110 150 120 120" 
                  fill="url(#stormWing)" stroke="#4B0082" strokeWidth="3"/>
            <path d="M120 120 Q80 110 60 130 Q70 150 90 140 Q105 130 120 120" 
                  fill="url(#stormWing)" opacity="0.8"/>
            
            <path d="M280 120 Q340 80 360 140 Q350 200 300 180 Q290 150 280 120" 
                  fill="url(#stormWing)" stroke="#4B0082" strokeWidth="3"/>
            <path d="M280 120 Q320 110 340 130 Q330 150 310 140 Q295 130 280 120" 
                  fill="url(#stormWing)" opacity="0.8"/>
          </g>
        )}

        {/* Dragon body */}
        <ellipse cx="200" cy="220" rx="70" ry="110" fill="url(#dragonBody)"/>
        <ellipse cx="200" cy="220" rx="70" ry="110" fill="url(#dragonScales)" opacity="0.7"/>

        {/* Dragon head with horns */}
        <ellipse cx="200" cy="130" rx="50" ry="40" fill="url(#dragonBody)"/>
        
        {/* Complex horn array */}
        <polygon points="200,90 210,110 190,110" fill="url(#hornGradient)" stroke="#654321" strokeWidth="1"/>
        <polygon points="175,95 185,115 165,115" fill="url(#hornGradient)" stroke="#654321" strokeWidth="1"/>
        <polygon points="225,95 235,115 215,115" fill="url(#hornGradient)" stroke="#654321" strokeWidth="1"/>

        {/* Dragon snout */}
        <ellipse cx="200" cy="155" rx="30" ry="20" fill="url(#dragonBody)"/>
        
        {/* Nostrils with steam */}
        <ellipse cx="190" cy="150" rx="4" ry="6" fill="#000000"/>
        <ellipse cx="210" cy="150" rx="4" ry="6" fill="#000000"/>
        <ellipse cx="180" cy="140" rx="8" ry="3" fill="#E6E6FA" opacity="0.6"/>
        <ellipse cx="220" cy="140" rx="8" ry="3" fill="#E6E6FA" opacity="0.6"/>

        {/* Dragon eyes */}
        <ellipse cx="180" cy="125" rx="15" ry="12" fill="#000000"/>
        <ellipse cx="220" cy="125" rx="15" ry="12" fill="#000000"/>
        <ellipse cx="180" cy="125" rx="12" ry="10" fill="#FFD700"/>
        <ellipse cx="220" cy="125" rx="12" ry="10" fill="#FFD700"/>
        <ellipse cx="180" cy="125" rx="2" ry="8" fill="#000000"/>
        <ellipse cx="220" cy="125" rx="2" ry="8" fill="#000000"/>
        <ellipse cx="177" cy="120" rx="2" ry="3" fill="#FFFFFF"/>
        <ellipse cx="217" cy="120" rx="2" ry="3" fill="#FFFFFF"/>

        {/* Dragon teeth */}
        {hasSharpTeeth ? (
          <g>
            <polygon points="180,165 185,180 190,165" fill="#FFFFFF" stroke="#C0C0C0" strokeWidth="0.5"/>
            <polygon points="190,165 195,185 200,165" fill="#FFFFFF" stroke="#C0C0C0" strokeWidth="0.5"/>
            <polygon points="200,165 205,185 210,165" fill="#FFFFFF" stroke="#C0C0C0" strokeWidth="0.5"/>
            <polygon points="210,165 215,180 220,165" fill="#FFFFFF" stroke="#C0C0C0" strokeWidth="0.5"/>
          </g>
        ) : (
          <g>
            <polygon points="185,165 190,175 195,165" fill="#FFFFFF"/>
            <polygon points="200,165 205,178 210,165" fill="#FFFFFF"/>
            <polygon points="215,165 220,175 225,165" fill="#FFFFFF"/>
          </g>
        )}

        {/* Dragon claws */}
        <ellipse cx="150" cy="200" rx="20" ry="50" fill="url(#dragonBody)" transform="rotate(-15 150 200)"/>
        <ellipse cx="250" cy="200" rx="20" ry="50" fill="url(#dragonBody)" transform="rotate(15 250 200)"/>
        <ellipse cx="135" cy="250" rx="12" ry="10" fill="url(#dragonBody)"/>
        <ellipse cx="265" cy="250" rx="12" ry="10" fill="url(#dragonBody)"/>

        {/* Individual claws */}
        <path d="M125 245 Q120 235 128 232" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
        <path d="M130 242 Q125 232 133 229" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
        <path d="M135 245 Q130 235 138 232" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
        
        <path d="M275 245 Q280 235 272 232" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
        <path d="M270 242 Q275 232 267 229" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
        <path d="M265 245 Q270 235 262 232" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>

        {/* Dragon legs */}
        <ellipse cx="175" cy="310" rx="18" ry="40" fill="url(#dragonBody)"/>
        <ellipse cx="225" cy="310" rx="18" ry="40" fill="url(#dragonBody)"/>
        <ellipse cx="175" cy="360" rx="15" ry="12" fill="url(#dragonBody)"/>
        <ellipse cx="225" cy="360" rx="15" ry="12" fill="url(#dragonBody)"/>

        {/* Tail */}
        {tailType === 'spiked' ? (
          <g>
            <ellipse cx="190" cy="340" rx="18" ry="35" fill="url(#dragonBody)" transform="rotate(-20 190 340)"/>
            <ellipse cx="180" cy="370" rx="15" ry="30" fill="url(#dragonBody)" transform="rotate(-35 180 370)"/>
            <polygon points="185,325 192,315 199,325" fill="#C0C0C0" stroke="#808080"/>
            <polygon points="175,355 182,345 189,355" fill="#C0C0C0" stroke="#808080"/>
          </g>
        ) : (
          <g>
            <ellipse cx="190" cy="340" rx="15" ry="30" fill="url(#dragonBody)" transform="rotate(-20 190 340)"/>
            <ellipse cx="180" cy="365" rx="12" ry="25" fill="url(#dragonBody)" transform="rotate(-35 180 365)"/>
          </g>
        )}

        {/* Lightning breath */}
        <g opacity="0.8">
          <path d="M230 155 L250 150 L245 160 L265 155 L260 165 L280 160" 
                stroke="#FFFF00" strokeWidth="3" fill="none"/>
          <circle cx="255" cy="157" r="8" fill="url(#lightningGlow)" opacity="0.6"/>
        </g>

        {/* Storm clouds around dragon */}
        <g opacity="0.4">
          <ellipse cx="120" cy="100" rx="20" ry="10" fill="#696969"/>
          <ellipse cx="300" cy="120" rx="25" ry="12" fill="#696969"/>
          <ellipse cx="350" cy="250" rx="18" ry="8" fill="#696969"/>
        </g>
      </svg>
    );
  };

  const renderCrystalTitan = () => {
    const hasSharpTeeth = upgradeChoices?.teeth === 'razor';
    const hasSpikes = upgradeChoices?.spikes === 'metallic';
    const hasMuscles = upgradeChoices?.muscles === 'enhanced';
    const hasWings = upgradeChoices?.wings === 'crystal';
    const tailType = upgradeChoices?.tail || 'normal';

    return (
      <svg width={width} height={height} viewBox="0 0 400 400" className="drop-shadow-lg">
        <defs>
          <radialGradient id="crystalGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#E6E6FA" stopOpacity="0.3"/>
            <stop offset="50%" stopColor="#DDA0DD" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#9370DB" stopOpacity="0.1"/>
          </radialGradient>
          
          <linearGradient id="titanBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C0C0C0"/>
            <stop offset="25%" stopColor="#A9A9A9"/>
            <stop offset="50%" stopColor="#808080"/>
            <stop offset="75%" stopColor="#696969"/>
            <stop offset="100%" stopColor="#2F4F4F"/>
          </linearGradient>

          <linearGradient id="crystalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E6E6FA"/>
            <stop offset="50%" stopColor="#DDA0DD"/>
            <stop offset="100%" stopColor="#9370DB"/>
          </linearGradient>

          <pattern id="metalTexture" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill="#A9A9A9"/>
            <circle cx="10" cy="10" r="6" fill="#C0C0C0" stroke="#808080" strokeWidth="1"/>
            <circle cx="10" cy="10" r="3" fill="#E6E6E6"/>
          </pattern>

          <radialGradient id="gemGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF"/>
            <stop offset="50%" stopColor="#DDA0DD"/>
            <stop offset="100%" stopColor="#9370DB" stopOpacity="0"/>
          </radialGradient>
        </defs>

        {/* Background crystal glow */}
        <circle cx="200" cy="200" r="180" fill="url(#crystalGlow)"/>

        {/* Crystal wings */}
        {hasWings && (
          <g>
            <path d="M120 140 Q70 120 50 170 Q60 220 100 200 Q110 170 120 140" 
                  fill="url(#crystalGradient)" stroke="#9370DB" strokeWidth="3" opacity="0.8"/>
            <polygon points="90,150 100,145 105,155 95,160" fill="#E6E6FA"/>
            <polygon points="75,170 85,165 90,175 80,180" fill="#E6E6FA"/>
            
            <path d="M280 140 Q330 120 350 170 Q340 220 300 200 Q290 170 280 140" 
                  fill="url(#crystalGradient)" stroke="#9370DB" strokeWidth="3" opacity="0.8"/>
            <polygon points="310,150 320,145 325,155 315,160" fill="#E6E6FA"/>
            <polygon points="325,170 335,165 340,175 330,180" fill="#E6E6FA"/>
          </g>
        )}

        {/* Titan body - massive and metallic */}
        <ellipse cx="200" cy="220" rx="90" ry="120" fill="url(#titanBody)"/>
        <ellipse cx="200" cy="220" rx="90" ry="120" fill="url(#metalTexture)" opacity="0.6"/>

        {/* Central crystal core */}
        <polygon points="200,180 230,200 200,240 170,200" fill="url(#crystalGradient)" stroke="#9370DB" strokeWidth="3"/>
        <polygon points="200,190 220,205 200,230 180,205" fill="#E6E6FA"/>
        <polygon points="200,200 210,210 200,220 190,210" fill="#FFFFFF"/>
        <circle cx="200" cy="210" r="20" fill="url(#gemGlow)" opacity="0.6"/>

        {/* Massive titan head */}
        <ellipse cx="200" cy="130" rx="70" ry="55" fill="url(#titanBody)"/>
        <ellipse cx="200" cy="130" rx="70" ry="55" fill="url(#metalTexture)" opacity="0.7"/>

        {/* Crystal formations on head */}
        <polygon points="170,100 175,85 180,100" fill="url(#crystalGradient)" stroke="#9370DB"/>
        <polygon points="195,95 200,80 205,95" fill="url(#crystalGradient)" stroke="#9370DB"/>
        <polygon points="220,100 225,85 230,100" fill="url(#crystalGradient)" stroke="#9370DB"/>

        {/* Glowing crystal eyes */}
        <ellipse cx="180" cy="125" rx="18" ry="15" fill="#000000"/>
        <ellipse cx="220" cy="125" rx="18" ry="15" fill="#000000"/>
        <polygon points="180,118 186,125 180,132 174,125" fill="url(#crystalGradient)"/>
        <polygon points="220,118 226,125 220,132 214,125" fill="url(#crystalGradient)"/>
        <circle cx="180" cy="125" r="8" fill="url(#gemGlow)" opacity="0.8"/>
        <circle cx="220" cy="125" r="8" fill="url(#gemGlow)" opacity="0.8"/>

        {/* Metallic jaw */}
        <ellipse cx="200" cy="155" rx="40" ry="25" fill="url(#titanBody)"/>
        
        {hasSharpTeeth ? (
          <g>
            <polygon points="175,165 180,180 185,165" fill="url(#crystalGradient)" stroke="#9370DB"/>
            <polygon points="185,165 190,185 195,165" fill="url(#crystalGradient)" stroke="#9370DB"/>
            <polygon points="195,165 200,185 205,165" fill="url(#crystalGradient)" stroke="#9370DB"/>
            <polygon points="205,165 210,185 215,165" fill="url(#crystalGradient)" stroke="#9370DB"/>
            <polygon points="215,165 220,180 225,165" fill="url(#crystalGradient)" stroke="#9370DB"/>
          </g>
        ) : (
          <g>
            <rect x="180" y="165" width="8" height="12" fill="#A9A9A9"/>
            <rect x="190" y="165" width="8" height="15" fill="#A9A9A9"/>
            <rect x="200" y="165" width="8" height="15" fill="#A9A9A9"/>
            <rect x="210" y="165" width="8" height="12" fill="#A9A9A9"/>
          </g>
        )}

        {/* Massive metallic arms */}
        <ellipse cx="110" cy="200" rx="35" ry="80" fill="url(#titanBody)" transform="rotate(-20 110 200)"/>
        <ellipse cx="290" cy="200" rx="35" ry="80" fill="url(#titanBody)" transform="rotate(20 290 200)"/>
        
        {/* Crystal gauntlets */}
        <ellipse cx="85" cy="285" rx="30" ry="25" fill="url(#crystalGradient)"/>
        <ellipse cx="315" cy="285" rx="30" ry="25" fill="url(#crystalGradient)"/>
        
        {/* Crystal spikes on fists */}
        <polygon points="75,275 80,265 85,275" fill="#E6E6FA"/>
        <polygon points="85,270 90,260 95,270" fill="#E6E6FA"/>
        <polygon points="305,270 310,260 315,270" fill="#E6E6FA"/>
        <polygon points="315,275 320,265 325,275" fill="#E6E6FA"/>

        {/* Titan legs */}
        <ellipse cx="170" cy="320" rx="30" ry="60" fill="url(#titanBody)"/>
        <ellipse cx="230" cy="320" rx="30" ry="60" fill="url(#titanBody)"/>
        <ellipse cx="170" cy="320" rx="30" ry="60" fill="url(#metalTexture)" opacity="0.6"/>
        <ellipse cx="230" cy="320" rx="30" ry="60" fill="url(#metalTexture)" opacity="0.6"/>

        {/* Crystal feet */}
        <ellipse cx="170" cy="385" rx="25" ry="20" fill="url(#crystalGradient)"/>
        <ellipse cx="230" cy="385" rx="25" ry="20" fill="url(#crystalGradient)"/>

        {/* Tail */}
        {tailType === 'crystal' ? (
          <g>
            <ellipse cx="200" cy="350" rx="25" ry="40" fill="url(#titanBody)"/>
            <polygon points="190,370 200,350 210,370" fill="url(#crystalGradient)" stroke="#9370DB"/>
            <polygon points="185,385 200,365 215,385" fill="url(#crystalGradient)" stroke="#9370DB"/>
          </g>
        ) : (
          <ellipse cx="200" cy="350" rx="20" ry="35" fill="url(#titanBody)"/>
        )}

        {/* Crystal formations on back */}
        {hasSpikes && (
          <g>
            {Array.from({ length: 5 }).map((_, i) => (
              <polygon key={i} 
                      points={`${160 + i * 20},135 ${168 + i * 20},115 ${176 + i * 20},135`} 
                      fill="url(#crystalGradient)" 
                      stroke="#9370DB"/>
            ))}
          </g>
        )}

        {/* Crystal energy particles */}
        <g opacity="0.7">
          <circle cx="120" cy="120" r="4" fill="#E6E6FA"/>
          <circle cx="300" cy="140" r="3" fill="#DDA0DD"/>
          <circle cx="350" cy="250" r="5" fill="#9370DB"/>
          <circle cx="80" cy="280" r="3" fill="#E6E6FA"/>
          <circle cx="150" cy="350" r="4" fill="#DDA0DD"/>
        </g>

        {/* Metallic highlights */}
        <ellipse cx="180" cy="115" rx="20" ry="10" fill="#FFFFFF" opacity="0.4"/>
        <ellipse cx="160" cy="170" rx="25" ry="15" fill="#FFFFFF" opacity="0.3"/>
      </svg>
    );
  };

  // Render based on monster ID
  switch(monsterId) {
    case 1:
      return renderFlamePhoenix();
    case 2:
      return renderAquaLeviathan();
    case 3:
      return renderStormDragon();
    case 4:
      return renderCrystalTitan();
    default:
      return renderFlamePhoenix();
  }
}