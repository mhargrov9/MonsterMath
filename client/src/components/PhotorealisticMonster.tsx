import React from 'react';

interface PhotorealisticMonsterProps {
  monsterId: number;
  evolutionStage: number;
  upgradeChoices: Record<string, any>;
  size?: 'small' | 'medium' | 'large';
  animationState?: 'idle' | 'windup' | 'attack' | 'hit' | 'victory' | 'defeat';
  facingDirection?: 'left' | 'right';
}

export default function PhotorealisticMonster({
  monsterId,
  evolutionStage,
  upgradeChoices,
  size = 'medium',
  animationState = 'idle',
  facingDirection = 'right',
}: PhotorealisticMonsterProps) {
  const dimensions = {
    small: { width: 200, height: 200 },
    medium: { width: 320, height: 320 },
    large: { width: 450, height: 450 },
  };

  const { width, height } = dimensions[size];

  // Photorealistic Fire Dragon
  const renderFireDragon = () => {
    const hasSharpTeeth = upgradeChoices?.teeth === 'razor';
    const hasSpikes = upgradeChoices?.spikes === 'metallic';
    const hasMuscles = upgradeChoices?.muscles === 'enhanced';
    const hasWings = upgradeChoices?.wings === 'flame';
    const tailType = upgradeChoices?.tail || 'normal';

    const getTransform = () => {
      const baseTransform = facingDirection === 'left' ? 'scaleX(-1)' : '';

      switch (animationState) {
        case 'windup':
          return `${baseTransform} scale(0.95) rotate(-3deg) translateY(5px)`;
        case 'attack':
          return `${baseTransform} scale(1.08) rotate(2deg) translateX(${facingDirection === 'right' ? '15px' : '-15px'}) translateY(-3px)`;
        case 'hit':
          return `${baseTransform} scale(0.92) rotate(${facingDirection === 'right' ? '-4deg' : '4deg'}) translateX(${facingDirection === 'right' ? '-10px' : '10px'}) translateY(8px)`;
        case 'victory':
          return `${baseTransform} scale(1.05) rotate(1deg) translateY(-5px)`;
        case 'defeat':
          return `${baseTransform} scale(0.85) rotate(-8deg) translateY(25px)`;
        default:
          return baseTransform;
      }
    };

    return (
      <div
        className="relative transition-all duration-500 ease-out"
        style={{
          transform: getTransform(),
          filter:
            animationState === 'attack'
              ? 'drop-shadow(0 0 30px rgba(255, 69, 0, 0.9)) contrast(1.2)'
              : 'drop-shadow(0 8px 25px rgba(0, 0, 0, 0.4))',
        }}
      >
        <div className="relative" style={{ width, height }}>
          {/* Atmospheric Ground Shadow */}
          <div
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-gradient-radial from-black/40 to-transparent rounded-full blur-lg"
            style={{ width: width * 0.9, height: height * 0.2, top: '85%' }}
          />

          {/* Main Dragon Body - Photorealistic */}
          <div
            className="absolute rounded-lg"
            style={{
              width: width * 0.85,
              height: height * 0.7,
              left: '7.5%',
              top: '20%',
              background: `
                radial-gradient(ellipse 60% 40% at 35% 25%, rgba(255, 140, 0, 0.8) 0%, transparent 70%),
                radial-gradient(ellipse 40% 60% at 65% 45%, rgba(255, 69, 0, 0.6) 0%, transparent 60%),
                linear-gradient(135deg, #8B0000 0%, #DC143C 15%, #FF4500 35%, #FF6347 55%, #CD5C5C 75%, #8B0000 100%)
              `,
              boxShadow: `
                inset 0 0 ${width * 0.15}px rgba(255, 255, 255, 0.2),
                inset 0 0 ${width * 0.08}px rgba(255, 165, 0, 0.4),
                inset ${width * 0.02}px ${width * 0.02}px ${width * 0.06}px rgba(139, 0, 0, 0.8),
                0 ${height * 0.08}px ${height * 0.15}px rgba(0, 0, 0, 0.6)
              `,
              filter: hasMuscles
                ? 'contrast(1.3) saturate(1.4)'
                : 'contrast(1.1) saturate(1.2)',
              borderRadius: '45% 55% 55% 45%',
            }}
          />

          {/* Realistic Scale Texture */}
          <div
            className="absolute rounded-lg opacity-40"
            style={{
              width: width * 0.8,
              height: height * 0.65,
              left: '10%',
              top: '22.5%',
              background: `
                repeating-conic-gradient(
                  from 0deg at 30% 30%,
                  rgba(255, 255, 255, 0.1) 0deg,
                  transparent 5deg,
                  rgba(255, 255, 255, 0.1) 10deg,
                  transparent 15deg
                ),
                repeating-conic-gradient(
                  from 45deg at 70% 70%,
                  rgba(139, 0, 0, 0.2) 0deg,
                  transparent 8deg,
                  rgba(139, 0, 0, 0.2) 16deg,
                  transparent 24deg
                )
              `,
              borderRadius: '45% 55% 55% 45%',
            }}
          />

          {/* Enhanced Muscle Definition */}
          {hasMuscles && (
            <>
              <div
                className="absolute rounded-full opacity-70"
                style={{
                  width: width * 0.25,
                  height: height * 0.35,
                  left: '20%',
                  top: '30%',
                  background:
                    'radial-gradient(ellipse 80% 100%, rgba(220, 20, 60, 0.6) 0%, rgba(255, 69, 0, 0.3) 50%, transparent 100%)',
                  boxShadow: 'inset 2px 2px 8px rgba(139, 0, 0, 0.8)',
                }}
              />
              <div
                className="absolute rounded-full opacity-70"
                style={{
                  width: width * 0.25,
                  height: height * 0.35,
                  left: '55%',
                  top: '30%',
                  background:
                    'radial-gradient(ellipse 80% 100%, rgba(220, 20, 60, 0.6) 0%, rgba(255, 69, 0, 0.3) 50%, transparent 100%)',
                  boxShadow: 'inset 2px 2px 8px rgba(139, 0, 0, 0.8)',
                }}
              />
            </>
          )}

          {/* Photorealistic Dragon Head */}
          <div
            className="absolute"
            style={{
              width: width * 0.55,
              height: width * 0.55,
              left: '22.5%',
              top: '5%',
              background: `
                radial-gradient(ellipse 50% 30% at 40% 20%, rgba(255, 215, 0, 0.7) 0%, transparent 60%),
                radial-gradient(ellipse 70% 40% at 30% 35%, rgba(255, 140, 0, 0.5) 0%, transparent 70%),
                linear-gradient(125deg, #8B0000 0%, #DC143C 20%, #FF4500 40%, #FF6347 60%, #CD5C5C 80%, #8B0000 100%)
              `,
              boxShadow: `
                inset 0 0 ${width * 0.12}px rgba(255, 255, 255, 0.25),
                inset 0 0 ${width * 0.06}px rgba(255, 140, 0, 0.4),
                0 ${height * 0.04}px ${height * 0.08}px rgba(0, 0, 0, 0.5)
              `,
              borderRadius: '40% 60% 50% 50%',
            }}
          />

          {/* Dragon Snout */}
          <div
            className="absolute"
            style={{
              width: width * 0.2,
              height: width * 0.15,
              left: facingDirection === 'right' ? '62%' : '18%',
              top: '28%',
              background: `
                linear-gradient(${facingDirection === 'right' ? '90deg' : '270deg'}, #8B0000 0%, #DC143C 30%, #FF4500 70%, #FF6347 100%)
              `,
              boxShadow: `inset 0 0 ${width * 0.04}px rgba(255, 255, 255, 0.2)`,
              borderRadius:
                facingDirection === 'right'
                  ? '10% 80% 80% 10%'
                  : '80% 10% 10% 80%',
            }}
          />

          {/* Photorealistic Dragon Eyes */}
          <div
            className="absolute rounded-full"
            style={{
              width: width * 0.12,
              height: width * 0.12,
              left: '32%',
              top: '15%',
              background: `
                radial-gradient(circle at 30% 30%, rgba(255, 255, 0, 0.9) 0%, rgba(255, 140, 0, 0.8) 30%, rgba(255, 69, 0, 0.7) 60%, rgba(139, 0, 0, 0.9) 100%)
              `,
              boxShadow: `
                inset 0 0 ${width * 0.03}px rgba(0, 0, 0, 0.8),
                inset 0 0 ${width * 0.015}px rgba(255, 255, 0, 0.6),
                0 0 ${width * 0.02}px rgba(255, 165, 0, 0.8)
              `,
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: width * 0.12,
              height: width * 0.12,
              left: '56%',
              top: '15%',
              background: `
                radial-gradient(circle at 30% 30%, rgba(255, 255, 0, 0.9) 0%, rgba(255, 140, 0, 0.8) 30%, rgba(255, 69, 0, 0.7) 60%, rgba(139, 0, 0, 0.9) 100%)
              `,
              boxShadow: `
                inset 0 0 ${width * 0.03}px rgba(0, 0, 0, 0.8),
                inset 0 0 ${width * 0.015}px rgba(255, 255, 0, 0.6),
                0 0 ${width * 0.02}px rgba(255, 165, 0, 0.8)
              `,
            }}
          />

          {/* Vertical Pupils */}
          <div
            className="absolute bg-black"
            style={{
              width: width * 0.02,
              height: width * 0.08,
              left: '37%',
              top: '17%',
              borderRadius: '50%',
            }}
          />
          <div
            className="absolute bg-black"
            style={{
              width: width * 0.02,
              height: width * 0.08,
              left: '61%',
              top: '17%',
              borderRadius: '50%',
            }}
          />

          {/* Razor Sharp Teeth */}
          {hasSharpTeeth && (
            <>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    width: width * 0.015,
                    height: width * 0.06,
                    left: `${45 + i * 2}%`,
                    top: '32%',
                    background:
                      'linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 50%, #E0E0E0 100%)',
                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                    boxShadow:
                      '0 0 3px rgba(255, 255, 255, 0.8), inset 0 0 2px rgba(0, 0, 0, 0.3)',
                    transform: `rotate(${-10 + i * 4}deg)`,
                  }}
                />
              ))}
            </>
          )}

          {/* Massive Dragon Wings */}
          {hasWings && (
            <>
              <div
                className="absolute"
                style={{
                  width: width * 0.4,
                  height: width * 0.55,
                  left: facingDirection === 'right' ? '0%' : '60%',
                  top: '15%',
                  background: `
                    radial-gradient(ellipse 70% 40% at 70% 30%, rgba(255, 165, 0, 0.7) 0%, transparent 70%),
                    linear-gradient(135deg, rgba(139, 0, 0, 0.9) 0%, rgba(220, 20, 60, 0.8) 30%, rgba(255, 69, 0, 0.7) 60%, rgba(255, 140, 0, 0.6) 100%)
                  `,
                  clipPath:
                    facingDirection === 'right'
                      ? 'polygon(80% 0%, 100% 20%, 90% 100%, 10% 80%, 0% 40%)'
                      : 'polygon(20% 0%, 0% 20%, 10% 100%, 90% 80%, 100% 40%)',
                  filter: 'blur(0.5px)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
                  animation:
                    animationState === 'attack'
                      ? 'wingFlap 0.3s ease-in-out'
                      : 'none',
                }}
              />
              <div
                className="absolute"
                style={{
                  width: width * 0.4,
                  height: width * 0.55,
                  left: facingDirection === 'right' ? '60%' : '0%',
                  top: '15%',
                  background: `
                    radial-gradient(ellipse 70% 40% at 30% 30%, rgba(255, 165, 0, 0.7) 0%, transparent 70%),
                    linear-gradient(45deg, rgba(139, 0, 0, 0.9) 0%, rgba(220, 20, 60, 0.8) 30%, rgba(255, 69, 0, 0.7) 60%, rgba(255, 140, 0, 0.6) 100%)
                  `,
                  clipPath:
                    facingDirection === 'right'
                      ? 'polygon(20% 0%, 0% 20%, 10% 100%, 90% 80%, 100% 40%)'
                      : 'polygon(80% 0%, 100% 20%, 90% 100%, 10% 80%, 0% 40%)',
                  filter: 'blur(0.5px)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
                  animation:
                    animationState === 'attack'
                      ? 'wingFlap 0.3s ease-in-out'
                      : 'none',
                }}
              />
            </>
          )}

          {/* Metallic Spikes */}
          {hasSpikes && (
            <>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    width: width * 0.03,
                    height: width * 0.12,
                    left: `${25 + i * 12}%`,
                    top: '8%',
                    background:
                      'linear-gradient(180deg, #C0C0C0 0%, #808080 30%, #696969 70%, #2F2F2F 100%)',
                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                    boxShadow:
                      '0 0 5px rgba(255, 255, 255, 0.5), inset 0 0 3px rgba(0, 0, 0, 0.7)',
                    transform: `rotate(${-15 + i * 7}deg)`,
                  }}
                />
              ))}
            </>
          )}

          {/* Powerful Dragon Tail */}
          <div
            className="absolute"
            style={{
              width: width * 0.18,
              height: width * 0.45,
              left: tailType === 'spiked' ? '78%' : '82%',
              top: '45%',
              background: `
                linear-gradient(150deg, #8B0000 0%, #DC143C 25%, #FF4500 50%, #FF6347 75%, #CD5C5C 100%)
              `,
              borderRadius: '60% 40% 40% 60%',
              transform: `rotate(${animationState === 'attack' ? '35deg' : '20deg'})`,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              filter: tailType === 'spiked' ? 'contrast(1.2)' : 'none',
            }}
          />

          {/* Fire Breath Effect */}
          {animationState === 'attack' && (
            <>
              <div
                className="absolute animate-pulse"
                style={{
                  width: width * 0.35,
                  height: width * 0.2,
                  left: facingDirection === 'right' ? '75%' : '-10%',
                  top: '28%',
                  background:
                    facingDirection === 'right'
                      ? 'linear-gradient(90deg, rgba(255, 69, 0, 0.8) 0%, rgba(255, 140, 0, 0.6) 50%, transparent 100%)'
                      : 'linear-gradient(270deg, rgba(255, 69, 0, 0.8) 0%, rgba(255, 140, 0, 0.6) 50%, transparent 100%)',
                  borderRadius: '50%',
                  filter: 'blur(2px)',
                }}
              />
              <div
                className="absolute animate-ping"
                style={{
                  width: width * 0.25,
                  height: width * 0.15,
                  left: facingDirection === 'right' ? '80%' : '-5%',
                  top: '30%',
                  background:
                    facingDirection === 'right'
                      ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.9) 0%, rgba(255, 165, 0, 0.7) 70%, transparent 100%)'
                      : 'linear-gradient(270deg, rgba(255, 215, 0, 0.9) 0%, rgba(255, 165, 0, 0.7) 70%, transparent 100%)',
                  borderRadius: '50%',
                }}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  // Photorealistic Ice Dragon
  const renderIceDragon = () => {
    const hasSharpTeeth = upgradeChoices?.teeth === 'razor';
    const hasSpikes = upgradeChoices?.spikes === 'ice';
    const hasMuscles = upgradeChoices?.muscles === 'enhanced';
    const hasWings = upgradeChoices?.wings === 'ice';
    const tailType = upgradeChoices?.tail || 'normal';

    const getTransform = () => {
      const baseTransform = facingDirection === 'left' ? 'scaleX(-1)' : '';

      switch (animationState) {
        case 'windup':
          return `${baseTransform} scale(0.95) rotate(-3deg) translateY(5px)`;
        case 'attack':
          return `${baseTransform} scale(1.08) rotate(2deg) translateX(${facingDirection === 'right' ? '15px' : '-15px'}) translateY(-3px)`;
        case 'hit':
          return `${baseTransform} scale(0.92) rotate(${facingDirection === 'right' ? '-4deg' : '4deg'}) translateX(${facingDirection === 'right' ? '-10px' : '10px'}) translateY(8px)`;
        case 'victory':
          return `${baseTransform} scale(1.05) rotate(1deg) translateY(-5px)`;
        case 'defeat':
          return `${baseTransform} scale(0.85) rotate(-8deg) translateY(25px)`;
        default:
          return baseTransform;
      }
    };

    return (
      <div
        className="relative transition-all duration-500 ease-out"
        style={{
          transform: getTransform(),
          filter:
            animationState === 'attack'
              ? 'drop-shadow(0 0 30px rgba(70, 130, 180, 0.9)) contrast(1.2)'
              : 'drop-shadow(0 8px 25px rgba(0, 0, 0, 0.4))',
        }}
      >
        <div className="relative" style={{ width, height }}>
          {/* Atmospheric Ground Shadow */}
          <div
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-gradient-radial from-black/40 to-transparent rounded-full blur-lg"
            style={{ width: width * 0.9, height: height * 0.2, top: '85%' }}
          />

          {/* Main Ice Dragon Body */}
          <div
            className="absolute rounded-lg"
            style={{
              width: width * 0.85,
              height: height * 0.7,
              left: '7.5%',
              top: '20%',
              background: `
                radial-gradient(ellipse 60% 40% at 35% 25%, rgba(173, 216, 230, 0.8) 0%, transparent 70%),
                radial-gradient(ellipse 40% 60% at 65% 45%, rgba(70, 130, 180, 0.6) 0%, transparent 60%),
                linear-gradient(135deg, #191970 0%, #4169E1 15%, #4682B4 35%, #87CEEB 55%, #B0C4DE 75%, #191970 100%)
              `,
              boxShadow: `
                inset 0 0 ${width * 0.15}px rgba(255, 255, 255, 0.3),
                inset 0 0 ${width * 0.08}px rgba(173, 216, 230, 0.5),
                inset ${width * 0.02}px ${width * 0.02}px ${width * 0.06}px rgba(25, 25, 112, 0.8),
                0 ${height * 0.08}px ${height * 0.15}px rgba(0, 0, 0, 0.6)
              `,
              filter: hasMuscles
                ? 'contrast(1.3) saturate(1.4)'
                : 'contrast(1.1) saturate(1.2)',
              borderRadius: '45% 55% 55% 45%',
            }}
          />

          {/* Ice Crystal Texture */}
          <div
            className="absolute rounded-lg opacity-50"
            style={{
              width: width * 0.8,
              height: height * 0.65,
              left: '10%',
              top: '22.5%',
              background: `
                repeating-linear-gradient(
                  30deg,
                  rgba(255, 255, 255, 0.15) 0px,
                  rgba(255, 255, 255, 0.15) 3px,
                  transparent 3px,
                  transparent 12px
                ),
                repeating-linear-gradient(
                  -30deg,
                  rgba(173, 216, 230, 0.2) 0px,
                  rgba(173, 216, 230, 0.2) 2px,
                  transparent 2px,
                  transparent 10px
                )
              `,
              borderRadius: '45% 55% 55% 45%',
            }}
          />

          {/* Rest of ice dragon features following similar photorealistic pattern... */}
          {/* Ice Dragon Head */}
          <div
            className="absolute"
            style={{
              width: width * 0.55,
              height: width * 0.55,
              left: '22.5%',
              top: '5%',
              background: `
                radial-gradient(ellipse 50% 30% at 40% 20%, rgba(224, 255, 255, 0.7) 0%, transparent 60%),
                radial-gradient(ellipse 70% 40% at 30% 35%, rgba(173, 216, 230, 0.5) 0%, transparent 70%),
                linear-gradient(125deg, #191970 0%, #4169E1 20%, #4682B4 40%, #87CEEB 60%, #B0C4DE 80%, #191970 100%)
              `,
              boxShadow: `
                inset 0 0 ${width * 0.12}px rgba(255, 255, 255, 0.3),
                inset 0 0 ${width * 0.06}px rgba(173, 216, 230, 0.4),
                0 ${height * 0.04}px ${height * 0.08}px rgba(0, 0, 0, 0.5)
              `,
              borderRadius: '40% 60% 50% 50%',
            }}
          />

          {/* Ice Breath Effect */}
          {animationState === 'attack' && (
            <>
              <div
                className="absolute animate-pulse"
                style={{
                  width: width * 0.4,
                  height: width * 0.2,
                  left: facingDirection === 'right' ? '75%' : '-15%',
                  top: '28%',
                  background:
                    facingDirection === 'right'
                      ? 'linear-gradient(90deg, rgba(173, 216, 230, 0.8) 0%, rgba(224, 255, 255, 0.6) 50%, transparent 100%)'
                      : 'linear-gradient(270deg, rgba(173, 216, 230, 0.8) 0%, rgba(224, 255, 255, 0.6) 50%, transparent 100%)',
                  borderRadius: '50%',
                  filter: 'blur(2px)',
                }}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  // Render the appropriate monster based on monsterId
  const renderMonster = () => {
    switch (monsterId) {
      case 1:
        return renderFireDragon();
      case 2:
        return renderIceDragon();
      case 3:
        return renderFireDragon(); // Thunder dragon - similar to fire but could be customized
      case 4:
        return renderIceDragon(); // Water dragon - similar to ice but could be customized
      default:
        return renderFireDragon();
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      {renderMonster()}

      <style>{`
        @keyframes wingFlap {
          0%, 100% { transform: translateY(0) rotate(0deg) scaleY(1); }
          50% { transform: translateY(-3px) rotate(2deg) scaleY(0.95); }
        }
        
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}
