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

  const renderFireSalamander = () => {
    const hasSharpTeeth = upgradeChoices.teeth === 'razor';
    const hasSpikes = upgradeChoices.spikes === 'metallic';
    const hasMuscles = upgradeChoices.muscles === 'enhanced';
    const hasWings = upgradeChoices.wings === 'flame';
    const tailType = upgradeChoices.tail || 'normal';

    return (
      <svg width={width} height={height} viewBox="0 0 400 400" className="drop-shadow-lg">
        {/* Background glow effect */}
        <defs>
          <radialGradient id="backgroundGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.3"/>
            <stop offset="50%" stopColor="#FF8E3C" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#D9376E" stopOpacity="0.1"/>
          </radialGradient>
          
          {/* Complex body gradient with multiple color stops */}
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4500"/>
            <stop offset="15%" stopColor="#FF6347"/>
            <stop offset="30%" stopColor="#FF7F50"/>
            <stop offset="45%" stopColor="#FF6B35"/>
            <stop offset="60%" stopColor="#E55D75"/>
            <stop offset="75%" stopColor="#D63384"/>
            <stop offset="90%" stopColor="#FF4500"/>
            <stop offset="100%" stopColor="#DC143C"/>
          </linearGradient>

          {/* Belly scales gradient */}
          <linearGradient id="bellyScales" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFE4B5"/>
            <stop offset="30%" stopColor="#FFDAB9"/>
            <stop offset="70%" stopColor="#F4A460"/>
            <stop offset="100%" stopColor="#DEB887"/>
          </linearGradient>

          {/* Individual scale patterns */}
          <pattern id="scalePattern" patternUnits="userSpaceOnUse" width="12" height="12">
            <circle cx="6" cy="6" r="4" fill="#FF6347" stroke="#B22222" strokeWidth="0.5"/>
            <circle cx="6" cy="6" r="2" fill="#FF7F50" opacity="0.8"/>
          </pattern>

          {/* Fine scale texture */}
          <pattern id="fineScales" patternUnits="userSpaceOnUse" width="8" height="8">
            <ellipse cx="4" cy="4" rx="3" ry="2" fill="#FF4500" opacity="0.6"/>
            <ellipse cx="4" cy="4" rx="1.5" ry="1" fill="#FF6347" opacity="0.8"/>
          </pattern>

          {/* Muscle definition shadows */}
          <linearGradient id="muscleShadow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.4"/>
            <stop offset="50%" stopColor="#000000" stopOpacity="0.1"/>
            <stop offset="100%" stopColor="#000000" stopOpacity="0.3"/>
          </linearGradient>

          {/* Eye shine effect */}
          <radialGradient id="eyeShine" cx="30%" cy="30%" r="40%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9"/>
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"/>
          </radialGradient>

          {/* Fire breath gradient */}
          <radialGradient id="fireBreath" cx="0%" cy="50%" r="100%">
            <stop offset="0%" stopColor="#FFD700"/>
            <stop offset="30%" stopColor="#FF8C00"/>
            <stop offset="60%" stopColor="#FF4500"/>
            <stop offset="100%" stopColor="#DC143C"/>
          </radialGradient>

          {/* Wing membrane gradient */}
          <linearGradient id="wingMembrane" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.8"/>
            <stop offset="50%" stopColor="#FF8E3C" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#D9376E" stopOpacity="0.7"/>
          </linearGradient>
        </defs>

        {/* Background glow */}
        <circle cx="200" cy="200" r="180" fill="url(#backgroundGlow)"/>

        {/* Wings (if upgraded) */}
        {hasWings && (
          <g>
            {/* Left wing */}
            <path d="M120 140 Q80 120 60 160 Q70 200 100 180 Q110 160 120 140" 
                  fill="url(#wingMembrane)" stroke="#8B0000" strokeWidth="2"/>
            {/* Wing bone structure */}
            <path d="M120 140 L85 145 M120 140 L90 165 M120 140 L95 180" 
                  stroke="#654321" strokeWidth="1.5" fill="none"/>
            
            {/* Right wing */}
            <path d="M280 140 Q320 120 340 160 Q330 200 300 180 Q290 160 280 140" 
                  fill="url(#wingMembrane)" stroke="#8B0000" strokeWidth="2"/>
            {/* Wing bone structure */}
            <path d="M280 140 L315 145 M280 140 L310 165 M280 140 L305 180" 
                  stroke="#654321" strokeWidth="1.5" fill="none"/>
          </g>
        )}

        {/* Main body with complex shading */}
        <ellipse cx="200" cy="220" rx="85" ry="120" fill="url(#bodyGradient)"/>
        
        {/* Body scale texture overlay */}
        <ellipse cx="200" cy="220" rx="85" ry="120" fill="url(#scalePattern)" opacity="0.6"/>
        
        {/* Muscle definition (if upgraded) */}
        {hasMuscles && (
          <g>
            {/* Chest muscles */}
            <ellipse cx="180" cy="180" rx="25" ry="15" fill="url(#muscleShadow)"/>
            <ellipse cx="220" cy="180" rx="25" ry="15" fill="url(#muscleShadow)"/>
            {/* Abs definition */}
            <rect x="185" y="200" width="30" height="8" rx="4" fill="url(#muscleShadow)"/>
            <rect x="185" y="215" width="30" height="8" rx="4" fill="url(#muscleShadow)"/>
            <rect x="185" y="230" width="30" height="8" rx="4" fill="url(#muscleShadow)"/>
          </g>
        )}

        {/* Belly with individual scale details */}
        <ellipse cx="200" cy="240" rx="45" ry="80" fill="url(#bellyScales)"/>
        
        {/* Individual belly scales */}
        {Array.from({ length: 12 }).map((_, i) => (
          <ellipse key={i} 
                   cx={200 + (i % 3 - 1) * 15} 
                   cy={180 + Math.floor(i / 3) * 20} 
                   rx="8" ry="6" 
                   fill="#FFDAB9" 
                   stroke="#DEB887" 
                   strokeWidth="0.5"/>
        ))}

        {/* Head with detailed features */}
        <ellipse cx="200" cy="130" rx="55" ry="45" fill="url(#bodyGradient)"/>
        
        {/* Head scale overlay */}
        <ellipse cx="200" cy="130" rx="55" ry="45" fill="url(#fineScales)" opacity="0.5"/>

        {/* Detailed snout */}
        <ellipse cx="200" cy="150" rx="35" ry="25" fill="#FF6347"/>
        <ellipse cx="200" cy="155" rx="25" ry="15" fill="#FF7F50"/>

        {/* Nostril details */}
        <ellipse cx="190" cy="150" rx="3" ry="5" fill="#8B0000"/>
        <ellipse cx="210" cy="150" rx="3" ry="5" fill="#8B0000"/>
        {/* Nostril highlights */}
        <ellipse cx="189" cy="148" rx="1" ry="2" fill="#FF4500"/>
        <ellipse cx="209" cy="148" rx="1" ry="2" fill="#FF4500"/>

        {/* Complex eye structure */}
        <g>
          {/* Eye sockets */}
          <ellipse cx="175" cy="120" rx="18" ry="15" fill="#000000"/>
          <ellipse cx="225" cy="120" rx="18" ry="15" fill="#000000"/>
          
          {/* Eyeballs */}
          <ellipse cx="175" cy="120" rx="15" ry="12" fill="#FFD700"/>
          <ellipse cx="225" cy="120" rx="15" ry="12" fill="#FFD700"/>
          
          {/* Pupils with complex shapes */}
          <ellipse cx="175" cy="120" rx="8" ry="10" fill="#000000"/>
          <ellipse cx="225" cy="120" rx="8" ry="10" fill="#000000"/>
          
          {/* Eye shine and reflection */}
          <ellipse cx="170" cy="115" rx="4" ry="3" fill="url(#eyeShine)"/>
          <ellipse cx="220" cy="115" rx="4" ry="3" fill="url(#eyeShine)"/>
          
          {/* Eyelid details */}
          <path d="M160 108 Q175 105 190 108" stroke="#B22222" strokeWidth="2" fill="none"/>
          <path d="M210 108 Q225 105 240 108" stroke="#B22222" strokeWidth="2" fill="none"/>
        </g>

        {/* Detailed eyebrow ridges */}
        <path d="M155 100 Q175 95 195 100" stroke="#8B0000" strokeWidth="3" fill="none"/>
        <path d="M205 100 Q225 95 245 100" stroke="#8B0000" strokeWidth="3" fill="none"/>

        {/* Enhanced teeth system */}
        <g>
          {hasSharpTeeth ? (
            <g>
              {/* Razor-sharp teeth */}
              <polygon points="185,165 190,175 195,165" fill="#FFFFFF" stroke="#C0C0C0"/>
              <polygon points="195,165 200,178 205,165" fill="#FFFFFF" stroke="#C0C0C0"/>
              <polygon points="205,165 210,175 215,165" fill="#FFFFFF" stroke="#C0C0C0"/>
              {/* Serrated edges */}
              <path d="M187 167 L188 170 L189 167 L190 170 L191 167" stroke="#B0B0B0" fill="none"/>
              <path d="M197 167 L198 170 L199 167 L200 170 L201 167" stroke="#B0B0B0" fill="none"/>
              <path d="M207 167 L208 170 L209 167 L210 170 L211 167" stroke="#B0B0B0" fill="none"/>
            </g>
          ) : (
            <g>
              {/* Normal teeth */}
              <rect x="185" y="165" width="6" height="10" rx="3" fill="#FFFFFF"/>
              <rect x="195" y="165" width="6" height="12" rx="3" fill="#FFFFFF"/>
              <rect x="205" y="165" width="6" height="10" rx="3" fill="#FFFFFF"/>
            </g>
          )}
        </g>

        {/* Detailed limbs with individual claws */}
        <g>
          {/* Left arm with muscle definition */}
          <ellipse cx="140" cy="200" rx="25" ry="60" fill="url(#bodyGradient)" transform="rotate(-20 140 200)"/>
          {hasMuscles && <ellipse cx="140" cy="190" rx="15" ry="20" fill="url(#muscleShadow)" transform="rotate(-20 140 190)"/>}
          
          {/* Left hand with detailed claws */}
          <ellipse cx="120" cy="250" rx="15" ry="12" fill="url(#bodyGradient)"/>
          {/* Individual claw details */}
          <path d="M110 245 Q108 240 112 238" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M115 242 Q113 237 117 235" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M120 245 Q118 240 122 238" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M125 248 Q123 243 127 241" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M130 252 Q128 247 132 245" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>

          {/* Right arm */}
          <ellipse cx="260" cy="200" rx="25" ry="60" fill="url(#bodyGradient)" transform="rotate(20 260 200)"/>
          {hasMuscles && <ellipse cx="260" cy="190" rx="15" ry="20" fill="url(#muscleShadow)" transform="rotate(20 260 190)"/>}
          
          {/* Right hand with claws */}
          <ellipse cx="280" cy="250" rx="15" ry="12" fill="url(#bodyGradient)"/>
          <path d="M290 245 Q292 240 288 238" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M285 242 Q287 237 283 235" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M280 245 Q282 240 278 238" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M275 248 Q277 243 273 241" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M270 252 Q272 247 268 245" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
        </g>

        {/* Enhanced tail system */}
        <g>
          {tailType === 'spiked' ? (
            <g>
              {/* Spiked tail with segments */}
              <ellipse cx="180" cy="340" rx="20" ry="40" fill="url(#bodyGradient)" transform="rotate(-30 180 340)"/>
              <ellipse cx="160" cy="370" rx="18" ry="35" fill="url(#bodyGradient)" transform="rotate(-45 160 370)"/>
              <ellipse cx="140" cy="395" rx="15" ry="25" fill="url(#bodyGradient)" transform="rotate(-60 140 395)"/>
              {/* Tail spikes */}
              <polygon points="175,325 180,315 185,325" fill="#2F4F4F"/>
              <polygon points="155,355 160,345 165,355" fill="#2F4F4F"/>
              <polygon points="135,380 140,370 145,380" fill="#2F4F4F"/>
              <polygon points="115,400 120,390 125,400" fill="#2F4F4F"/>
            </g>
          ) : (
            <g>
              {/* Normal segmented tail */}
              <ellipse cx="180" cy="340" rx="18" ry="35" fill="url(#bodyGradient)" transform="rotate(-30 180 340)"/>
              <ellipse cx="165" cy="370" rx="15" ry="30" fill="url(#bodyGradient)" transform="rotate(-45 165 370)"/>
              <ellipse cx="150" cy="395" rx="12" ry="25" fill="url(#bodyGradient)" transform="rotate(-60 150 395)"/>
              <ellipse cx="138" cy="415" rx="8" ry="15" fill="url(#bodyGradient)" transform="rotate(-75 138 415)"/>
            </g>
          )}
        </g>

        {/* Legs with detailed feet */}
        <g>
          {/* Left leg */}
          <ellipse cx="170" cy="310" rx="20" ry="45" fill="url(#bodyGradient)"/>
          {hasMuscles && <ellipse cx="170" cy="300" rx="12" ry="25" fill="url(#muscleShadow)"/>}
          
          {/* Left foot with toe details */}
          <ellipse cx="170" cy="365" rx="18" ry="15" fill="url(#bodyGradient)"/>
          {/* Individual toe claws */}
          <path d="M155 370 Q153 365 157 363" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M162 372 Q160 367 164 365" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M170 372 Q168 367 172 365" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M178 372 Q176 367 180 365" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M185 370 Q183 365 187 363" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>

          {/* Right leg */}
          <ellipse cx="230" cy="310" rx="20" ry="45" fill="url(#bodyGradient)"/>
          {hasMuscles && <ellipse cx="230" cy="300" rx="12" ry="25" fill="url(#muscleShadow)"/>}
          
          {/* Right foot */}
          <ellipse cx="230" cy="365" rx="18" ry="15" fill="url(#bodyGradient)"/>
          <path d="M215 370 Q213 365 217 363" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M222 372 Q220 367 224 365" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M230 372 Q228 367 232 365" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M238 372 Q236 367 240 365" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M245 370 Q243 365 247 363" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
        </g>

        {/* Back spikes (if upgraded) */}
        {hasSpikes && (
          <g>
            <polygon points="180,120 185,105 190,120" fill="#C0C0C0" stroke="#808080"/>
            <polygon points="195,115 200,100 205,115" fill="#C0C0C0" stroke="#808080"/>
            <polygon points="210,120 215,105 220,120" fill="#C0C0C0" stroke="#808080"/>
            {/* Metallic shine on spikes */}
            <path d="M182 110 L183 107" stroke="#FFFFFF" strokeWidth="1"/>
            <path d="M197 107 L198 104" stroke="#FFFFFF" strokeWidth="1"/>
            <path d="M212 110 L213 107" stroke="#FFFFFF" strokeWidth="1"/>
          </g>
        )}

        {/* Fire breath effect */}
        <g opacity="0.8">
          <ellipse cx="240" cy="155" rx="25" ry="8" fill="url(#fireBreath)" transform="rotate(10 240 155)"/>
          <ellipse cx="260" cy="150" rx="20" ry="6" fill="url(#fireBreath)" transform="rotate(15 260 150)"/>
          <ellipse cx="275" cy="145" rx="15" ry="4" fill="url(#fireBreath)" transform="rotate(20 275 145)"/>
          {/* Fire particles */}
          <circle cx="250" cy="148" r="2" fill="#FFD700"/>
          <circle cx="265" cy="143" r="1.5" fill="#FF8C00"/>
          <circle cx="280" cy="140" r="1" fill="#FF4500"/>
        </g>

        {/* Fine detail overlays */}
        {/* Highlight on head */}
        <ellipse cx="190" cy="115" rx="15" ry="8" fill="#FFFFFF" opacity="0.3"/>
        
        {/* Body highlights */}
        <ellipse cx="180" cy="170" rx="20" ry="30" fill="#FFFFFF" opacity="0.2"/>
        
        {/* Scale edge highlights */}
        <path d="M130 180 Q200 170 270 180" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" fill="none"/>
        <path d="M140 220 Q200 210 260 220" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" fill="none"/>
        <path d="M150 260 Q200 250 250 260" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" fill="none"/>
      </svg>
    );
  };

  const renderOceanTurtle = () => {
    const hasSharpTeeth = upgradeChoices.teeth === 'razor';
    const hasSpikes = upgradeChoices.spikes === 'metallic';
    const hasMuscles = upgradeChoices.muscles === 'enhanced';
    const hasWings = upgradeChoices.wings === 'water';
    const tailType = upgradeChoices.tail || 'normal';

    return (
      <svg width={width} height={height} viewBox="0 0 400 400" className="drop-shadow-lg">
        <defs>
          {/* Ocean-themed gradients */}
          <radialGradient id="oceanGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#00CED1" stopOpacity="0.3"/>
            <stop offset="50%" stopColor="#20B2AA" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#008B8B" stopOpacity="0.1"/>
          </radialGradient>
          
          <linearGradient id="shellGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2E8B57"/>
            <stop offset="20%" stopColor="#3CB371"/>
            <stop offset="40%" stopColor="#20B2AA"/>
            <stop offset="60%" stopColor="#008B8B"/>
            <stop offset="80%" stopColor="#006400"/>
            <stop offset="100%" stopColor="#2F4F4F"/>
          </linearGradient>

          <pattern id="shellPattern" patternUnits="userSpaceOnUse" width="20" height="20">
            <polygon points="10,2 18,8 18,16 10,22 2,16 2,8" fill="#228B22" stroke="#006400" strokeWidth="1"/>
            <polygon points="10,6 14,10 14,14 10,18 6,14 6,10" fill="#32CD32" opacity="0.7"/>
          </pattern>

          <linearGradient id="underShell" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F0E68C"/>
            <stop offset="50%" stopColor="#DDD26A"/>
            <stop offset="100%" stopColor="#BDB76B"/>
          </linearGradient>

          <radialGradient id="waterBubble" cx="30%" cy="30%" r="40%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#87CEEB" stopOpacity="0.3"/>
          </radialGradient>
        </defs>

        {/* Background ocean glow */}
        <circle cx="200" cy="200" r="180" fill="url(#oceanGlow)"/>

        {/* Water fins (if upgraded) */}
        {hasWings && (
          <g>
            {/* Left water fin */}
            <path d="M100 180 Q60 160 50 200 Q60 240 90 220 Q95 200 100 180" 
                  fill="url(#shellGradient)" stroke="#006400" strokeWidth="2" opacity="0.8"/>
            {/* Fin membrane details */}
            <path d="M100 180 L70 185 M100 190 L65 195 M100 200 L70 205 M100 210 L75 215" 
                  stroke="#20B2AA" strokeWidth="1" fill="none"/>
            
            {/* Right water fin */}
            <path d="M300 180 Q340 160 350 200 Q340 240 310 220 Q305 200 300 180" 
                  fill="url(#shellGradient)" stroke="#006400" strokeWidth="2" opacity="0.8"/>
            <path d="M300 180 L330 185 M300 190 L335 195 M300 200 L330 205 M300 210 L325 215" 
                  stroke="#20B2AA" strokeWidth="1" fill="none"/>
          </g>
        )}

        {/* Main shell with intricate hexagonal pattern */}
        <ellipse cx="200" cy="200" rx="120" ry="100" fill="url(#shellGradient)"/>
        <ellipse cx="200" cy="200" rx="120" ry="100" fill="url(#shellPattern)" opacity="0.6"/>
        
        {/* Shell ridges and growth lines */}
        <ellipse cx="200" cy="200" rx="110" ry="90" fill="none" stroke="#006400" strokeWidth="2"/>
        <ellipse cx="200" cy="200" rx="90" ry="75" fill="none" stroke="#228B22" strokeWidth="1.5"/>
        <ellipse cx="200" cy="200" rx="70" ry="60" fill="none" stroke="#32CD32" strokeWidth="1"/>
        <ellipse cx="200" cy="200" rx="50" ry="45" fill="none" stroke="#90EE90" strokeWidth="0.5"/>

        {/* Central shell medallion */}
        <circle cx="200" cy="200" r="25" fill="#4169E1" stroke="#191970" strokeWidth="2"/>
        <circle cx="200" cy="200" r="18" fill="#1E90FF"/>
        <circle cx="200" cy="200" r="12" fill="#87CEEB"/>
        
        {/* Detailed head emerging from shell */}
        <ellipse cx="200" cy="120" rx="40" ry="35" fill="url(#shellGradient)"/>
        
        {/* Head texture with individual scales */}
        {Array.from({ length: 20 }).map((_, i) => (
          <circle key={i} 
                  cx={185 + (i % 5) * 7} 
                  cy={110 + Math.floor(i / 5) * 7} 
                  r="2" 
                  fill="#3CB371" 
                  stroke="#2E8B57" 
                  strokeWidth="0.3"/>
        ))}

        {/* Complex eye structure */}
        <g>
          {/* Eye sockets with depth */}
          <ellipse cx="180" cy="115" rx="12" ry="10" fill="#000000"/>
          <ellipse cx="220" cy="115" rx="12" ry="10" fill="#000000"/>
          
          {/* Eyeballs with ocean colors */}
          <ellipse cx="180" cy="115" rx="10" ry="8" fill="#40E0D0"/>
          <ellipse cx="220" cy="115" rx="10" ry="8" fill="#40E0D0"/>
          
          {/* Pupils */}
          <ellipse cx="180" cy="115" rx="5" ry="6" fill="#000000"/>
          <ellipse cx="220" cy="115" rx="5" ry="6" fill="#000000"/>
          
          {/* Multiple eye highlights */}
          <ellipse cx="177" cy="112" rx="2" ry="1.5" fill="#FFFFFF"/>
          <ellipse cx="217" cy="112" rx="2" ry="1.5" fill="#FFFFFF"/>
          <circle cx="182" cy="118" r="1" fill="#FFFFFF" opacity="0.7"/>
          <circle cx="222" cy="118" r="1" fill="#FFFFFF" opacity="0.7"/>
        </g>

        {/* Beak with serrated edges */}
        <path d="M190 130 Q200 140 210 130 Q205 135 200 138 Q195 135 190 130" 
              fill="#8B4513" stroke="#654321" strokeWidth="1"/>
        
        {/* Beak serrations */}
        {hasSharpTeeth ? (
          <g>
            <path d="M195 133 L196 135 L197 133 L198 135 L199 133 L200 135 L201 133 L202 135 L203 133 L204 135 L205 133" 
                  stroke="#654321" strokeWidth="0.8" fill="none"/>
          </g>
        ) : (
          <path d="M195 133 Q200 135 205 133" stroke="#654321" strokeWidth="1" fill="none"/>
        )}

        {/* Four flippers with detailed anatomy */}
        <g>
          {/* Front left flipper */}
          <ellipse cx="120" cy="160" rx="35" ry="15" fill="url(#shellGradient)" transform="rotate(-30 120 160)"/>
          {/* Flipper segments */}
          <ellipse cx="110" cy="165" rx="20" ry="8" fill="#2E8B57" transform="rotate(-30 110 165)"/>
          <ellipse cx="100" cy="170" rx="12" ry="5" fill="#228B22" transform="rotate(-30 100 170)"/>
          {/* Flipper claws */}
          <path d="M90 175 Q88 170 92 168" stroke="#2F4F4F" strokeWidth="1" fill="#708090"/>
          <path d="M95 177 Q93 172 97 170" stroke="#2F4F4F" strokeWidth="1" fill="#708090"/>
          <path d="M100 179 Q98 174 102 172" stroke="#2F4F4F" strokeWidth="1" fill="#708090"/>

          {/* Front right flipper */}
          <ellipse cx="280" cy="160" rx="35" ry="15" fill="url(#shellGradient)" transform="rotate(30 280 160)"/>
          <ellipse cx="290" cy="165" rx="20" ry="8" fill="#2E8B57" transform="rotate(30 290 165)"/>
          <ellipse cx="300" cy="170" rx="12" ry="5" fill="#228B22" transform="rotate(30 300 170)"/>
          <path d="M310 175 Q312 170 308 168" stroke="#2F4F4F" strokeWidth="1" fill="#708090"/>
          <path d="M305 177 Q307 172 303 170" stroke="#2F4F4F" strokeWidth="1" fill="#708090"/>
          <path d="M300 179 Q302 174 298 172" stroke="#2F4F4F" strokeWidth="1" fill="#708090"/>

          {/* Back left flipper */}
          <ellipse cx="130" cy="260" rx="30" ry="12" fill="url(#shellGradient)" transform="rotate(-45 130 260)"/>
          <ellipse cx="115" cy="270" rx="18" ry="7" fill="#2E8B57" transform="rotate(-45 115 270)"/>
          <ellipse cx="105" cy="275" rx="10" ry="4" fill="#228B22" transform="rotate(-45 105 275)"/>

          {/* Back right flipper */}
          <ellipse cx="270" cy="260" rx="30" ry="12" fill="url(#shellGradient)" transform="rotate(45 270 260)"/>
          <ellipse cx="285" cy="270" rx="18" ry="7" fill="#2E8B57" transform="rotate(45 285 270)"/>
          <ellipse cx="295" cy="275" rx="10" ry="4" fill="#228B22" transform="rotate(45 295 275)"/>
        </g>

        {/* Enhanced tail */}
        <g>
          {tailType === 'spiked' ? (
            <g>
              {/* Spiked tail */}
              <ellipse cx="200" cy="320" rx="25" ry="40" fill="url(#shellGradient)"/>
              <ellipse cx="200" cy="350" rx="20" ry="30" fill="url(#shellGradient)"/>
              {/* Tail spikes */}
              <polygon points="190,335 195,325 200,335" fill="#2F4F4F"/>
              <polygon points="200,335 205,325 210,335" fill="#2F4F4F"/>
              <polygon points="195,365 200,355 205,365" fill="#2F4F4F"/>
            </g>
          ) : (
            <g>
              {/* Normal tail with fin */}
              <ellipse cx="200" cy="320" rx="20" ry="35" fill="url(#shellGradient)"/>
              <path d="M185 340 Q200 360 215 340 Q200 350 185 340" fill="url(#shellGradient)" opacity="0.8"/>
            </g>
          )}
        </g>

        {/* Plastron (belly shell) */}
        <ellipse cx="200" cy="220" rx="80" ry="70" fill="url(#underShell)"/>
        
        {/* Plastron segments */}
        <line x1="200" y1="160" x2="200" y2="280" stroke="#B8860B" strokeWidth="2"/>
        <line x1="140" y1="200" x2="260" y2="200" stroke="#B8860B" strokeWidth="2"/>
        <line x1="150" y1="170" x2="250" y2="170" stroke="#B8860B" strokeWidth="1"/>
        <line x1="150" y1="250" x2="250" y2="250" stroke="#B8860B" strokeWidth="1"/>

        {/* Shell spikes (if upgraded) */}
        {hasSpikes && (
          <g>
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i * 45) * Math.PI / 180;
              const x = 200 + Math.cos(angle) * 110;
              const y = 200 + Math.sin(angle) * 90;
              return (
                <polygon key={i} 
                        points={`${x-5},${y} ${x},${y-8} ${x+5},${y}`} 
                        fill="#C0C0C0" 
                        stroke="#808080"/>
              );
            })}
          </g>
        )}

        {/* Water bubbles around turtle */}
        <g opacity="0.6">
          <circle cx="120" cy="100" r="8" fill="url(#waterBubble)"/>
          <circle cx="300" cy="120" r="6" fill="url(#waterBubble)"/>
          <circle cx="350" cy="250" r="10" fill="url(#waterBubble)"/>
          <circle cx="80" cy="280" r="5" fill="url(#waterBubble)"/>
          <circle cx="150" cy="350" r="7" fill="url(#waterBubble)"/>
          <circle cx="280" cy="340" r="4" fill="url(#waterBubble)"/>
        </g>

        {/* Shell highlights and shadows */}
        <ellipse cx="180" cy="170" rx="30" ry="25" fill="#FFFFFF" opacity="0.3"/>
        <ellipse cx="220" cy="230" rx="25" ry="20" fill="#FFFFFF" opacity="0.2"/>
        
        {/* Growth line details */}
        <path d="M90 180 Q200 160 310 180" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" fill="none"/>
        <path d="M100 220 Q200 200 300 220" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" fill="none"/>
      </svg>
    );
  };

  const renderSkyDragon = () => {
    const hasSharpTeeth = upgradeChoices.teeth === 'razor';
    const hasSpikes = upgradeChoices.spikes === 'metallic';
    const hasMuscles = upgradeChoices.muscles === 'enhanced';
    const hasWings = upgradeChoices.wings === 'storm';
    const tailType = upgradeChoices.tail || 'normal';

    return (
      <svg width={width} height={height} viewBox="0 0 400 400" className="drop-shadow-lg">
        <defs>
          {/* Sky-themed gradients */}
          <radialGradient id="skyGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#87CEEB" stopOpacity="0.3"/>
            <stop offset="50%" stopColor="#4169E1" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#191970" stopOpacity="0.1"/>
          </radialGradient>
          
          <linearGradient id="dragonBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4169E1"/>
            <stop offset="15%" stopColor="#6495ED"/>
            <stop offset="30%" stopColor="#87CEEB"/>
            <stop offset="45%" stopColor="#4682B4"/>
            <stop offset="60%" stopColor="#5F9EA0"/>
            <stop offset="75%" stopColor="#191970"/>
            <stop offset="90%" stopColor="#000080"/>
            <stop offset="100%" stopColor="#1E90FF"/>
          </linearGradient>

          <linearGradient id="wingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E6E6FA" stopOpacity="0.9"/>
            <stop offset="30%" stopColor="#DDA0DD" stopOpacity="0.8"/>
            <stop offset="60%" stopColor="#9370DB" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#4B0082" stopOpacity="0.8"/>
          </linearGradient>

          <pattern id="dragonScales" patternUnits="userSpaceOnUse" width="15" height="15">
            <path d="M7.5 0 L15 7.5 L7.5 15 L0 7.5 Z" fill="#4682B4" stroke="#191970" strokeWidth="0.8"/>
            <circle cx="7.5" cy="7.5" r="3" fill="#87CEEB" opacity="0.6"/>
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
        </defs>

        {/* Background sky glow */}
        <circle cx="200" cy="200" r="180" fill="url(#skyGlow)"/>

        {/* Storm wings (if upgraded) */}
        {hasWings && (
          <g>
            {/* Left wing with detailed bone structure */}
            <path d="M120 120 Q60 80 40 140 Q50 200 100 180 Q110 150 120 120" 
                  fill="url(#wingGradient)" stroke="#4B0082" strokeWidth="3"/>
            {/* Wing membrane sections */}
            <path d="M120 120 Q80 110 60 130 Q70 150 90 140 Q105 130 120 120" 
                  fill="url(#wingGradient)" opacity="0.8"/>
            <path d="M120 140 Q85 135 65 155 Q75 175 95 165 Q107 152 120 140" 
                  fill="url(#wingGradient)" opacity="0.7"/>
            {/* Wing bone framework */}
            <path d="M120 120 L70 125 M120 130 L75 140 M120 140 L80 155 M120 150 L85 170" 
                  stroke="#2F4F4F" strokeWidth="2" fill="none"/>
            {/* Wing claws */}
            <circle cx="65" cy="125" r="3" fill="#2F4F4F"/>
            <circle cx="70" cy="145" r="3" fill="#2F4F4F"/>
            <circle cx="75" cy="165" r="3" fill="#2F4F4F"/>
            
            {/* Right wing */}
            <path d="M280 120 Q340 80 360 140 Q350 200 300 180 Q290 150 280 120" 
                  fill="url(#wingGradient)" stroke="#4B0082" strokeWidth="3"/>
            <path d="M280 120 Q320 110 340 130 Q330 150 310 140 Q295 130 280 120" 
                  fill="url(#wingGradient)" opacity="0.8"/>
            <path d="M280 140 Q315 135 335 155 Q325 175 305 165 Q293 152 280 140" 
                  fill="url(#wingGradient)" opacity="0.7"/>
            <path d="M280 120 L330 125 M280 130 L325 140 M280 140 L320 155 M280 150 L315 170" 
                  stroke="#2F4F4F" strokeWidth="2" fill="none"/>
            <circle cx="335" cy="125" r="3" fill="#2F4F4F"/>
            <circle cx="330" cy="145" r="3" fill="#2F4F4F"/>
            <circle cx="325" cy="165" r="3" fill="#2F4F4F"/>
          </g>
        )}

        {/* Serpentine body with detailed segments */}
        <ellipse cx="200" cy="220" rx="70" ry="110" fill="url(#dragonBody)"/>
        <ellipse cx="200" cy="220" rx="70" ry="110" fill="url(#dragonScales)" opacity="0.7"/>
        
        {/* Body segments with individual scale detail */}
        {Array.from({ length: 15 }).map((_, i) => (
          <ellipse key={i} 
                   cx={200 + Math.sin(i * 0.5) * 10} 
                   cy={160 + i * 8} 
                   rx="60" ry="8" 
                   fill="#4682B4" 
                   stroke="#191970" 
                   strokeWidth="0.5"
                   opacity="0.8"/>
        ))}

        {/* Enhanced muscle definition */}
        {hasMuscles && (
          <g>
            {/* Chest definition */}
            <ellipse cx="175" cy="180" rx="20" ry="12" fill="#191970" opacity="0.4"/>
            <ellipse cx="225" cy="180" rx="20" ry="12" fill="#191970" opacity="0.4"/>
            {/* Abdominal segments */}
            {Array.from({ length: 6 }).map((_, i) => (
              <rect key={i} x="185" y={195 + i * 12} width="30" height="6" rx="3" 
                    fill="#191970" opacity="0.3"/>
            ))}
          </g>
        )}

        {/* Dragon head with intricate horn structure */}
        <ellipse cx="200" cy="130" rx="50" ry="40" fill="url(#dragonBody)"/>
        <ellipse cx="200" cy="130" rx="50" ry="40" fill="url(#dragonScales)" opacity="0.5"/>

        {/* Complex horn array */}
        <g>
          {/* Main central horn */}
          <polygon points="200,90 210,110 190,110" fill="url(#hornGradient)" stroke="#654321" strokeWidth="1"/>
          <polygon points="200,85 205,95 195,95" fill="#F5F5DC"/>
          
          {/* Side horns */}
          <polygon points="175,95 185,115 165,115" fill="url(#hornGradient)" stroke="#654321" strokeWidth="1"/>
          <polygon points="225,95 235,115 215,115" fill="url(#hornGradient)" stroke="#654321" strokeWidth="1"/>
          
          {/* Smaller horns */}
          <polygon points="160,105 165,120 155,120" fill="url(#hornGradient)" stroke="#654321" strokeWidth="0.8"/>
          <polygon points="240,105 245,120 235,120" fill="url(#hornGradient)" stroke="#654321" strokeWidth="0.8"/>
          
          {/* Horn ridges and details */}
          <path d="M200 92 L200 108" stroke="#8B7355" strokeWidth="1"/>
          <path d="M175 97 L175 113" stroke="#8B7355" strokeWidth="0.8"/>
          <path d="M225 97 L225 113" stroke="#8B7355" strokeWidth="0.8"/>
        </g>

        {/* Elongated snout with nostril detail */}
        <ellipse cx="200" cy="155" rx="30" ry="20" fill="url(#dragonBody)"/>
        
        {/* Complex nostril system */}
        <ellipse cx="190" cy="150" rx="4" ry="6" fill="#000000"/>
        <ellipse cx="210" cy="150" rx="4" ry="6" fill="#000000"/>
        {/* Nostril flares */}
        <path d="M186 150 Q185 145 188 144" stroke="#4682B4" strokeWidth="1" fill="none"/>
        <path d="M214 150 Q215 145 212 144" stroke="#4682B4" strokeWidth="1" fill="none"/>
        
        {/* Steam/breath effect */}
        <g opacity="0.6">
          <ellipse cx="180" cy="140" rx="8" ry="3" fill="#E6E6FA"/>
          <ellipse cx="220" cy="140" rx="8" ry="3" fill="#E6E6FA"/>
        </g>

        {/* Highly detailed eyes with reptilian features */}
        <g>
          {/* Eye sockets with ridges */}
          <ellipse cx="180" cy="125" rx="15" ry="12" fill="#000000"/>
          <ellipse cx="220" cy="125" rx="15" ry="12" fill="#000000"/>
          
          {/* Eyeballs with dragon coloring */}
          <ellipse cx="180" cy="125" rx="12" ry="10" fill="#FFD700"/>
          <ellipse cx="220" cy="125" rx="12" ry="10" fill="#FFD700"/>
          
          {/* Vertical slit pupils */}
          <ellipse cx="180" cy="125" rx="2" ry="8" fill="#000000"/>
          <ellipse cx="220" cy="125" rx="2" ry="8" fill="#000000"/>
          
          {/* Multiple eye reflections */}
          <ellipse cx="177" cy="120" rx="2" ry="3" fill="#FFFFFF"/>
          <ellipse cx="217" cy="120" rx="2" ry="3" fill="#FFFFFF"/>
          <circle cx="182" cy="130" r="1" fill="#FFFFFF" opacity="0.8"/>
          <circle cx="222" cy="130" r="1" fill="#FFFFFF" opacity="0.8"/>
          
          {/* Eye ridges and brow details */}
          <path d="M165 115 Q180 110 195 115" stroke="#191970" strokeWidth="2" fill="none"/>
          <path d="M205 115 Q220 110 235 115" stroke="#191970" strokeWidth="2" fill="none"/>
        </g>

        {/* Enhanced jaw and teeth system */}
        <g>
          {hasSharpTeeth ? (
            <g>
              {/* Razor-sharp dragon fangs */}
              <polygon points="180,165 185,180 190,165" fill="#FFFFFF" stroke="#C0C0C0" strokeWidth="0.5"/>
              <polygon points="190,165 195,185 200,165" fill="#FFFFFF" stroke="#C0C0C0" strokeWidth="0.5"/>
              <polygon points="200,165 205,185 210,165" fill="#FFFFFF" stroke="#C0C0C0" strokeWidth="0.5"/>
              <polygon points="210,165 215,180 220,165" fill="#FFFFFF" stroke="#C0C0C0" strokeWidth="0.5"/>
              {/* Serrated fang edges */}
              <path d="M182 170 L183 173 L184 170 L185 173 L186 170" stroke="#B0B0B0" strokeWidth="0.3" fill="none"/>
              <path d="M192 170 L193 175 L194 170 L195 175 L196 170" stroke="#B0B0B0" strokeWidth="0.3" fill="none"/>
              <path d="M202 170 L203 175 L204 170 L205 175 L206 170" stroke="#B0B0B0" strokeWidth="0.3" fill="none"/>
              <path d="M212 170 L213 173 L214 170 L215 173 L216 170" stroke="#B0B0B0" strokeWidth="0.3" fill="none"/>
            </g>
          ) : (
            <g>
              {/* Normal dragon teeth */}
              <polygon points="185,165 190,175 195,165" fill="#FFFFFF"/>
              <polygon points="200,165 205,178 210,165" fill="#FFFFFF"/>
              <polygon points="215,165 220,175 225,165" fill="#FFFFFF"/>
            </g>
          )}
        </g>

        {/* Powerful front claws with detailed anatomy */}
        <g>
          {/* Left arm with draconic musculature */}
          <ellipse cx="150" cy="200" rx="20" ry="50" fill="url(#dragonBody)" transform="rotate(-15 150 200)"/>
          {hasMuscles && <ellipse cx="150" cy="190" rx="12" ry="25" fill="#191970" opacity="0.3" transform="rotate(-15 150 190)"/>}
          
          {/* Left hand with individual dragon claws */}
          <ellipse cx="135" cy="250" rx="12" ry="10" fill="url(#dragonBody)"/>
          {/* Five detailed claws */}
          <path d="M125 245 Q120 235 128 232" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M130 242 Q125 232 133 229" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M135 245 Q130 235 138 232" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M140 248 Q135 238 143 235" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M145 252 Q140 242 148 239" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          {/* Claw highlights */}
          <path d="M127 238 L128 235" stroke="#FFFFFF" strokeWidth="0.8"/>
          <path d="M132 235 L133 232" stroke="#FFFFFF" strokeWidth="0.8"/>
          <path d="M137 238 L138 235" stroke="#FFFFFF" strokeWidth="0.8"/>

          {/* Right arm */}
          <ellipse cx="250" cy="200" rx="20" ry="50" fill="url(#dragonBody)" transform="rotate(15 250 200)"/>
          {hasMuscles && <ellipse cx="250" cy="190" rx="12" ry="25" fill="#191970" opacity="0.3" transform="rotate(15 250 190)"/>}
          
          {/* Right hand with claws */}
          <ellipse cx="265" cy="250" rx="12" ry="10" fill="url(#dragonBody)"/>
          <path d="M275 245 Q280 235 272 232" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M270 242 Q275 232 267 229" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M265 245 Q270 235 262 232" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M260 248 Q265 238 257 235" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M255 252 Q260 242 252 239" stroke="#2F4F4F" strokeWidth="2" fill="#708090"/>
          <path d="M273 238 L272 235" stroke="#FFFFFF" strokeWidth="0.8"/>
          <path d="M268 235 L267 232" stroke="#FFFFFF" strokeWidth="0.8"/>
          <path d="M263 238 L262 235" stroke="#FFFFFF" strokeWidth="0.8"/>
        </g>

        {/* Enhanced tail system */}
        <g>
          {tailType === 'spiked' ? (
            <g>
              {/* Spiked dragon tail with segments */}
              <ellipse cx="190" cy="340" rx="18" ry="35" fill="url(#dragonBody)" transform="rotate(-20 190 340)"/>
              <ellipse cx="180" cy="370" rx="15" ry="30" fill="url(#dragonBody)" transform="rotate(-35 180 370)"/>
              <ellipse cx="170" cy="395" rx="12" ry="25" fill="url(#dragonBody)" transform="rotate(-50 170 395)"/>
              <ellipse cx="160" cy="415" rx="8" ry="18" fill="url(#dragonBody)" transform="rotate(-65 160 415)"/>
              {/* Metallic tail spikes */}
              <polygon points="185,325 192,315 199,325" fill="#C0C0C0" stroke="#808080"/>
              <polygon points="175,355 182,345 189,355" fill="#C0C0C0" stroke="#808080"/>
              <polygon points="165,380 172,370 179,380" fill="#C0C0C0" stroke="#808080"/>
              <polygon points="155,400 162,390 169,400" fill="#C0C0C0" stroke="#808080"/>
              {/* Spike highlights */}
              <path d="M189 318 L190 315" stroke="#FFFFFF" strokeWidth="1"/>
              <path d="M179 348 L180 345" stroke="#FFFFFF" strokeWidth="1"/>
              <path d="M169 373 L170 370" stroke="#FFFFFF" strokeWidth="1"/>
            </g>
          ) : (
            <g>
              {/* Normal segmented tail */}
              <ellipse cx="190" cy="340" rx="15" ry="30" fill="url(#dragonBody)" transform="rotate(-20 190 340)"/>
              <ellipse cx="180" cy="365" rx="12" ry="25" fill="url(#dragonBody)" transform="rotate(-35 180 365)"/>
              <ellipse cx="170" cy="385" rx="10" ry="20" fill="url(#dragonBody)" transform="rotate(-50 170 385)"/>
              <ellipse cx="160" cy="400" rx="7" ry="15" fill="url(#dragonBody)" transform="rotate(-65 160 400)"/>
              <ellipse cx="152" cy="410" rx="4" ry="8" fill="url(#dragonBody)" transform="rotate(-80 152 410)"/>
            </g>
          )}
        </g>

        {/* Powerful hind legs */}
        <g>
          {/* Left leg with draconic structure */}
          <ellipse cx="175" cy="310" rx="18" ry="40" fill="url(#dragonBody)"/>
          {hasMuscles && <ellipse cx="175" cy="295" rx="10" ry="20" fill="#191970" opacity="0.3"/>}
          
          {/* Left foot with talons */}
          <ellipse cx="175" cy="360" rx="15" ry="12" fill="url(#dragonBody)"/>
          {/* Dragon talons */}
          <path d="M162 365 Q158 360 165 357" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M168 367 Q164 362 171 359" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M175 367 Q171 362 178 359" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M182 367 Q178 362 185 359" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M188 365 Q184 360 191 357" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>

          {/* Right leg */}
          <ellipse cx="225" cy="310" rx="18" ry="40" fill="url(#dragonBody)"/>
          {hasMuscles && <ellipse cx="225" cy="295" rx="10" ry="20" fill="#191970" opacity="0.3"/>}
          
          {/* Right foot with talons */}
          <ellipse cx="225" cy="360" rx="15" ry="12" fill="url(#dragonBody)"/>
          <path d="M212 365 Q208 360 215 357" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M218 367 Q214 362 221 359" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M225 367 Q221 362 228 359" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M232 367 Q228 362 235 359" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
          <path d="M238 365 Q234 360 241 357" stroke="#2F4F4F" strokeWidth="1.5" fill="#708090"/>
        </g>

        {/* Back spikes (if upgraded) */}
        {hasSpikes && (
          <g>
            {Array.from({ length: 6 }).map((_, i) => (
              <polygon key={i} 
                      points={`${175 + i * 10},140 ${180 + i * 10},125 ${185 + i * 10},140`} 
                      fill="#C0C0C0" 
                      stroke="#808080"/>
            ))}
            {/* Metallic highlights on spikes */}
            {Array.from({ length: 6 }).map((_, i) => (
              <path key={i} 
                    d={`M${177 + i * 10} 132 L${178 + i * 10} 128`} 
                    stroke="#FFFFFF" 
                    strokeWidth="1"/>
            ))}
          </g>
        )}

        {/* Lightning breath effect */}
        <g opacity="0.8">
          <path d="M230 155 L250 150 L245 160 L265 155 L260 165 L280 160" 
                stroke="#FFFF00" strokeWidth="3" fill="none"/>
          <path d="M230 155 L250 150 L245 160 L265 155 L260 165 L280 160" 
                stroke="#FFD700" strokeWidth="1.5" fill="none"/>
          {/* Lightning glow */}
          <circle cx="255" cy="157" r="8" fill="url(#lightningGlow)" opacity="0.6"/>
          <circle cx="270" cy="162" r="6" fill="url(#lightningGlow)" opacity="0.4"/>
        </g>

        {/* Fine detail highlights */}
        <ellipse cx="185" cy="115" rx="12" ry="6" fill="#FFFFFF" opacity="0.3"/>
        <ellipse cx="170" cy="165" rx="15" ry="20" fill="#FFFFFF" opacity="0.2"/>
        
        {/* Scale edge highlights */}
        <path d="M140 180 Q200 170 260 180" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" fill="none"/>
        <path d="M150 220 Q200 210 250 220" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" fill="none"/>
        <path d="M160 260 Q200 250 240 260" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" fill="none"/>
      </svg>
    );
  };

  const renderEarthGolem = () => {
    const hasSharpTeeth = upgradeChoices.teeth === 'razor';
    const hasSpikes = upgradeChoices.spikes === 'metallic';
    const hasMuscles = upgradeChoices.muscles === 'enhanced';
    const hasWings = upgradeChoices.wings === 'stone';
    const tailType = upgradeChoices.tail || 'normal';

    return (
      <svg width={width} height={height} viewBox="0 0 400 400" className="drop-shadow-lg">
        <defs>
          {/* Earth-themed gradients */}
          <radialGradient id="earthGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#8B4513" stopOpacity="0.3"/>
            <stop offset="50%" stopColor="#A0522D" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#654321" stopOpacity="0.1"/>
          </radialGradient>
          
          <linearGradient id="stoneBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#696969"/>
            <stop offset="15%" stopColor="#808080"/>
            <stop offset="30%" stopColor="#A9A9A9"/>
            <stop offset="45%" stopColor="#778899"/>
            <stop offset="60%" stopColor="#2F4F4F"/>
            <stop offset="75%" stopColor="#708090"/>
            <stop offset="90%" stopColor="#696969"/>
            <stop offset="100%" stopColor="#2F4F4F"/>
          </linearGradient>

          <pattern id="rockTexture" patternUnits="userSpaceOnUse" width="25" height="25">
            <polygon points="12.5,2 23,9 23,18 12.5,25 2,18 2,9" fill="#708090" stroke="#2F4F4F" strokeWidth="1"/>
            <polygon points="12.5,7 18,11 18,16 12.5,20 7,16 7,11" fill="#A9A9A9" opacity="0.8"/>
            <circle cx="12.5" cy="12.5" r="3" fill="#D3D3D3" opacity="0.6"/>
          </pattern>

          <linearGradient id="crystalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E6E6FA"/>
            <stop offset="50%" stopColor="#DDA0DD"/>
            <stop offset="100%" stopColor="#9370DB"/>
          </linearGradient>

          <radialGradient id="gemGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF"/>
            <stop offset="50%" stopColor="#DDA0DD"/>
            <stop offset="100%" stopColor="#9370DB" stopOpacity="0"/>
          </radialGradient>

          <pattern id="mossTexture" patternUnits="userSpaceOnUse" width="8" height="8">
            <circle cx="4" cy="4" r="2" fill="#228B22" opacity="0.7"/>
            <circle cx="4" cy="4" r="1" fill="#32CD32" opacity="0.8"/>
          </pattern>
        </defs>

        {/* Background earth glow */}
        <circle cx="200" cy="200" r="180" fill="url(#earthGlow)"/>

        {/* Stone wings (if upgraded) */}
        {hasWings && (
          <g>
            {/* Left stone wing */}
            <path d="M120 140 Q70 120 50 170 Q60 220 100 200 Q110 170 120 140" 
                  fill="url(#stoneBody)" stroke="#2F4F4F" strokeWidth="4"/>
            {/* Wing rock formations */}
            <polygon points="90,150 100,145 105,155 95,160" fill="#A9A9A9"/>
            <polygon points="75,170 85,165 90,175 80,180" fill="#A9A9A9"/>
            <polygon points="85,190 95,185 100,195 90,200" fill="#A9A9A9"/>
            {/* Crystal formations on wings */}
            <polygon points="98,148 102,145 106,148 102,152" fill="url(#crystalGradient)"/>
            <polygon points="83,168 87,165 91,168 87,172" fill="url(#crystalGradient)"/>
            
            {/* Right stone wing */}
            <path d="M280 140 Q330 120 350 170 Q340 220 300 200 Q290 170 280 140" 
                  fill="url(#stoneBody)" stroke="#2F4F4F" strokeWidth="4"/>
            <polygon points="310,150 320,145 325,155 315,160" fill="#A9A9A9"/>
            <polygon points="325,170 335,165 340,175 330,180" fill="#A9A9A9"/>
            <polygon points="315,190 325,185 330,195 320,200" fill="#A9A9A9"/>
            <polygon points="318,148 322,145 326,148 322,152" fill="url(#crystalGradient)"/>
            <polygon points="333,168 337,165 341,168 337,172" fill="url(#crystalGradient)"/>
          </g>
        )}

        {/* Massive golem body with rock formations */}
        <ellipse cx="200" cy="220" rx="90" ry="120" fill="url(#stoneBody)"/>
        <ellipse cx="200" cy="220" rx="90" ry="120" fill="url(#rockTexture)" opacity="0.8"/>
        
        {/* Boulder segments across body */}
        <ellipse cx="170" cy="180" rx="25" ry="20" fill="#A9A9A9" stroke="#2F4F4F" strokeWidth="2"/>
        <ellipse cx="230" cy="190" rx="30" ry="25" fill="#A9A9A9" stroke="#2F4F4F" strokeWidth="2"/>
        <ellipse cx="180" cy="240" rx="35" ry="30" fill="#A9A9A9" stroke="#2F4F4F" strokeWidth="2"/>
        <ellipse cx="220" cy="250" rx="28" ry="22" fill="#A9A9A9" stroke="#2F4F4F" strokeWidth="2"/>
        <ellipse cx="200" cy="290" rx="40" ry="35" fill="#A9A9A9" stroke="#2F4F4F" strokeWidth="2"/>

        {/* Crystal embedded in chest */}
        <polygon points="200,210 220,220 200,240 180,220" fill="url(#crystalGradient)" stroke="#9370DB" strokeWidth="2"/>
        <polygon points="200,215 215,222 200,235 185,222" fill="#E6E6FA"/>
        <polygon points="200,220 210,225 200,230 190,225" fill="#FFFFFF"/>
        <circle cx="200" cy="225" r="15" fill="url(#gemGlow)" opacity="0.6"/>

        {/* Enhanced muscle definition */}
        {hasMuscles && (
          <g>
            {/* Boulder muscle masses */}
            <ellipse cx="160" cy="170" rx="15" ry="10" fill="#2F4F4F" opacity="0.6"/>
            <ellipse cx="240" cy="170" rx="15" ry="10" fill="#2F4F4F" opacity="0.6"/>
            <ellipse cx="150" cy="200" rx="20" ry="15" fill="#2F4F4F" opacity="0.5"/>
            <ellipse cx="250" cy="200" rx="20" ry="15" fill="#2F4F4F" opacity="0.5"/>
          </g>
        )}

        {/* Moss growing on body */}
        <ellipse cx="180" cy="190" rx="12" ry="8" fill="url(#mossTexture)" opacity="0.8"/>
        <ellipse cx="225" cy="270" rx="15" ry="10" fill="url(#mossTexture)" opacity="0.8"/>
        <ellipse cx="165" cy="310" rx="10" ry="6" fill="url(#mossTexture)" opacity="0.8"/>

        {/* Massive golem head */}
        <ellipse cx="200" cy="130" rx="65" ry="50" fill="url(#stoneBody)"/>
        <ellipse cx="200" cy="130" rx="65" ry="50" fill="url(#rockTexture)" opacity="0.7"/>

        {/* Head rock formations */}
        <ellipse cx="170" cy="120" rx="20" ry="15" fill="#A9A9A9" stroke="#2F4F4F" strokeWidth="1.5"/>
        <ellipse cx="230" cy="115" rx="18" ry="12" fill="#A9A9A9" stroke="#2F4F4F" strokeWidth="1.5"/>
        <ellipse cx="200" cy="105" rx="15" ry="10" fill="#A9A9A9" stroke="#2F4F4F" strokeWidth="1.5"/>

        {/* Crystal horns */}
        <polygon points="175,85 180,105 170,105" fill="url(#crystalGradient)" stroke="#9370DB" strokeWidth="1"/>
        <polygon points="200,80 205,100 195,100" fill="url(#crystalGradient)" stroke="#9370DB" strokeWidth="1"/>
        <polygon points="225,85 230,105 220,105" fill="url(#crystalGradient)" stroke="#9370DB" strokeWidth="1"/>

        {/* Glowing crystal eyes */}
        <g>
          {/* Eye sockets carved in stone */}
          <ellipse cx="180" cy="125" rx="18" ry="15" fill="#000000"/>
          <ellipse cx="220" cy="125" rx="18" ry="15" fill="#000000"/>
          
          {/* Crystal eyeballs */}
          <ellipse cx="180" cy="125" rx="15" ry="12" fill="url(#crystalGradient)"/>
          <ellipse cx="220" cy="125" rx="15" ry="12" fill="url(#crystalGradient)"/>
          
          {/* Inner crystal structure */}
          <polygon points="180,118 186,125 180,132 174,125" fill="#E6E6FA"/>
          <polygon points="220,118 226,125 220,132 214,125" fill="#E6E6FA"/>
          
          {/* Crystal glow */}
          <circle cx="180" cy="125" r="8" fill="url(#gemGlow)" opacity="0.8"/>
          <circle cx="220" cy="125" r="8" fill="url(#gemGlow)" opacity="0.8"/>
          
          {/* Eye ridges */}
          <path d="M162 115 Q180 110 198 115" stroke="#2F4F4F" strokeWidth="3" fill="none"/>
          <path d="M202 115 Q220 110 238 115" stroke="#2F4F4F" strokeWidth="3" fill="none"/>
        </g>

        {/* Stone jaw and teeth */}
        <ellipse cx="200" cy="150" rx="35" ry="20" fill="url(#stoneBody)"/>
        <g>
          {hasSharpTeeth ? (
            <g>
              {/* Sharp crystal teeth */}
              <polygon points="180,160 185,175 190,160" fill="url(#crystalGradient)" stroke="#9370DB"/>
              <polygon points="190,160 195,180 200,160" fill="url(#crystalGradient)" stroke="#9370DB"/>
              <polygon points="200,160 205,180 210,160" fill="url(#crystalGradient)" stroke="#9370DB"/>
              <polygon points="210,160 215,175 220,160" fill="url(#crystalGradient)" stroke="#9370DB"/>
            </g>
          ) : (
            <g>
              {/* Normal stone teeth */}
              <rect x="185" y="160" width="8" height="12" fill="#A9A9A9"/>
              <rect x="195" y="160" width="8" height="15" fill="#A9A9A9"/>
              <rect x="205" y="160" width="8" height="12" fill="#A9A9A9"/>
            </g>
          )}
        </g>

        {/* Massive stone arms */}
        <g>
          {/* Left arm with boulder segments */}
          <ellipse cx="120" cy="200" rx="30" ry="70" fill="url(#stoneBody)" transform="rotate(-20 120 200)"/>
          {/* Arm boulder segments */}
          <ellipse cx="115" cy="170" rx="15" ry="20" fill="#A9A9A9" transform="rotate(-20 115 170)"/>
          <ellipse cx="110" cy="210" rx="18" ry="25" fill="#A9A9A9" transform="rotate(-20 110 210)"/>
          <ellipse cx="105" cy="250" rx="12" ry="15" fill="#A9A9A9" transform="rotate(-20 105 250)"/>
          
          {/* Left hand - massive stone fist */}
          <ellipse cx="90" cy="280" rx="25" ry="20" fill="url(#stoneBody)"/>
          <ellipse cx="90" cy="280" rx="25" ry="20" fill="url(#rockTexture)" opacity="0.6"/>
          {/* Knuckle details */}
          <ellipse cx="80" cy="275" rx="6" ry="4" fill="#A9A9A9"/>
          <ellipse cx="90" cy="270" rx="7" ry="5" fill="#A9A9A9"/>
          <ellipse cx="100" cy="275" rx="6" ry="4" fill="#A9A9A9"/>
          <ellipse cx="95" cy="285" rx="5" ry="3" fill="#A9A9A9"/>

          {/* Right arm */}
          <ellipse cx="280" cy="200" rx="30" ry="70" fill="url(#stoneBody)" transform="rotate(20 280 200)"/>
          <ellipse cx="285" cy="170" rx="15" ry="20" fill="#A9A9A9" transform="rotate(20 285 170)"/>
          <ellipse cx="290" cy="210" rx="18" ry="25" fill="#A9A9A9" transform="rotate(20 290 210)"/>
          <ellipse cx="295" cy="250" rx="12" ry="15" fill="#A9A9A9" transform="rotate(20 295 250)"/>
          
          {/* Right hand */}
          <ellipse cx="310" cy="280" rx="25" ry="20" fill="url(#stoneBody)"/>
          <ellipse cx="310" cy="280" rx="25" ry="20" fill="url(#rockTexture)" opacity="0.6"/>
          <ellipse cx="320" cy="275" rx="6" ry="4" fill="#A9A9A9"/>
          <ellipse cx="310" cy="270" rx="7" ry="5" fill="#A9A9A9"/>
          <ellipse cx="300" cy="275" rx="6" ry="4" fill="#A9A9A9"/>
          <ellipse cx="305" cy="285" rx="5" ry="3" fill="#A9A9A9"/>
        </g>

        {/* Enhanced tail system */}
        <g>
          {tailType === 'spiked' ? (
            <g>
              {/* Spiked stone tail */}
              <ellipse cx="180" cy="350" rx="20" ry="40" fill="url(#stoneBody)" transform="rotate(-30 180 350)"/>
              <ellipse cx="160" cy="380" rx="18" ry="35" fill="url(#stoneBody)" transform="rotate(-45 160 380)"/>
              <ellipse cx="140" cy="405" rx="15" ry="25" fill="url(#stoneBody)" transform="rotate(-60 140 405)"/>
              {/* Crystal spikes */}
              <polygon points="175,335 182,320 189,335" fill="url(#crystalGradient)" stroke="#9370DB"/>
              <polygon points="155,365 162,350 169,365" fill="url(#crystalGradient)" stroke="#9370DB"/>
              <polygon points="135,390 142,375 149,390" fill="url(#crystalGradient)" stroke="#9370DB"/>
            </g>
          ) : (
            <g>
              {/* Normal stone tail */}
              <ellipse cx="180" cy="350" rx="18" ry="35" fill="url(#stoneBody)" transform="rotate(-30 180 350)"/>
              <ellipse cx="165" cy="375" rx="15" ry="30" fill="url(#stoneBody)" transform="rotate(-45 165 375)"/>
              <ellipse cx="150" cy="395" rx="12" ry="20" fill="url(#stoneBody)" transform="rotate(-60 150 395)"/>
            </g>
          )}
        </g>

        {/* Massive stone legs */}
        <g>
          {/* Left leg */}
          <ellipse cx="170" cy="320" rx="25" ry="50" fill="url(#stoneBody)"/>
          <ellipse cx="170" cy="320" rx="25" ry="50" fill="url(#rockTexture)" opacity="0.6"/>
          {/* Leg boulder segments */}
          <ellipse cx="170" cy="300" rx="15" ry="20" fill="#A9A9A9"/>
          <ellipse cx="170" cy="340" rx="18" ry="25" fill="#A9A9A9"/>
          
          {/* Left foot */}
          <ellipse cx="170" cy="380" rx="20" ry="15" fill="url(#stoneBody)"/>
          <ellipse cx="170" cy="380" rx="20" ry="15" fill="url(#rockTexture)" opacity="0.6"/>

          {/* Right leg */}
          <ellipse cx="230" cy="320" rx="25" ry="50" fill="url(#stoneBody)"/>
          <ellipse cx="230" cy="320" rx="25" ry="50" fill="url(#rockTexture)" opacity="0.6"/>
          <ellipse cx="230" cy="300" rx="15" ry="20" fill="#A9A9A9"/>
          <ellipse cx="230" cy="340" rx="18" ry="25" fill="#A9A9A9"/>
          
          {/* Right foot */}
          <ellipse cx="230" cy="380" rx="20" ry="15" fill="url(#stoneBody)"/>
          <ellipse cx="230" cy="380" rx="20" ry="15" fill="url(#rockTexture)" opacity="0.6"/>
        </g>

        {/* Back spikes (if upgraded) */}
        {hasSpikes && (
          <g>
            {Array.from({ length: 5 }).map((_, i) => (
              <polygon key={i} 
                      points={`${170 + i * 15},125 ${178 + i * 15},105 ${186 + i * 15},125`} 
                      fill="url(#crystalGradient)" 
                      stroke="#9370DB"/>
            ))}
          </g>
        )}

        {/* Additional moss and lichen details */}
        <ellipse cx="145" cy="260" rx="8" ry="5" fill="url(#mossTexture)" opacity="0.9"/>
        <ellipse cx="255" cy="300" rx="10" ry="7" fill="url(#mossTexture)" opacity="0.9"/>
        <ellipse cx="190" cy="350" rx="6" ry="4" fill="url(#mossTexture)" opacity="0.9"/>

        {/* Stone highlights and shadows */}
        <ellipse cx="185" cy="115" rx="15" ry="8" fill="#FFFFFF" opacity="0.3"/>
        <ellipse cx="170" cy="170" rx="20" ry="15" fill="#FFFFFF" opacity="0.2"/>
        
        {/* Rock formation edge highlights */}
        <path d="M130 180 Q200 170 270 180" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" fill="none"/>
        <path d="M140 220 Q200 210 260 220" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" fill="none"/>
        <path d="M150 260 Q200 250 250 260" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" fill="none"/>
      </svg>
    );
  };

  // Render based on monster ID
  switch(monsterId) {
    case 1:
      return renderFireSalamander();
    case 2:
      return renderOceanTurtle();
    case 3:
      return renderSkyDragon();
    case 4:
      return renderEarthGolem();
    default:
      return renderFireSalamander();
  }
}