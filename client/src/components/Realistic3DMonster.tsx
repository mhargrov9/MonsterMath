import React from 'react';

interface Realistic3DMonsterProps {
  monsterId: number;
  evolutionStage: number;
  upgradeChoices: Record<string, any>;
  size?: 'small' | 'medium' | 'large';
  animationState?: 'idle' | 'windup' | 'attack' | 'hit' | 'victory' | 'defeat';
  facingDirection?: 'left' | 'right';
}

export default function Realistic3DMonster({ 
  monsterId, 
  evolutionStage, 
  upgradeChoices, 
  size = 'medium',
  animationState = 'idle',
  facingDirection = 'right'
}: Realistic3DMonsterProps) {
  const dimensions = {
    small: { width: 200, height: 200 },
    medium: { width: 320, height: 320 },
    large: { width: 450, height: 450 }
  };

  const { width, height } = dimensions[size];

  // Get monster-specific realistic rendering with enhanced 3D creature features
  const renderRealisticFlamePhoenix = () => {
    const hasSharpTeeth = upgradeChoices?.teeth === 'razor';
    const hasSpikes = upgradeChoices?.spikes === 'metallic';
    const hasMuscles = upgradeChoices?.muscles === 'enhanced';
    const hasWings = upgradeChoices?.wings === 'flame';
    const tailType = upgradeChoices?.tail || 'normal';
    
    // Animation transforms
    const getTransform = () => {
      const baseTransform = facingDirection === 'left' ? 'scaleX(-1)' : '';
      
      switch (animationState) {
        case 'windup':
          return `${baseTransform} scale(0.9) rotate(-5deg)`;
        case 'attack':
          return `${baseTransform} scale(1.1) rotate(5deg) translateX(${facingDirection === 'right' ? '20px' : '-20px'})`;
        case 'hit':
          return `${baseTransform} scale(0.95) rotate(${facingDirection === 'right' ? '-3deg' : '3deg'}) translateX(${facingDirection === 'right' ? '-15px' : '15px'})`;
        case 'victory':
          return `${baseTransform} scale(1.05) rotate(2deg)`;
        case 'defeat':
          return `${baseTransform} scale(0.8) rotate(-10deg) translateY(20px)`;
        default:
          return baseTransform;
      }
    };

    return (
      <div 
        className="relative transition-all duration-300 ease-out"
        style={{ 
          transform: getTransform(),
          filter: animationState === 'attack' ? 'drop-shadow(0 0 20px rgba(255, 107, 107, 0.8))' : 'none'
        }}
      >
        {/* Realistic 3D-style Fire Phoenix */}
        <div className="relative" style={{ width, height }}>
          {/* Shadow/Base */}
          <div 
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-black/20 rounded-full blur-sm"
            style={{ width: width * 0.8, height: height * 0.15 }}
          />
          
          {/* Main Body - Realistic texture */}
          <div 
            className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500 via-orange-500 to-red-700"
            style={{
              width: width * 0.7,
              height: height * 0.6,
              left: '15%',
              top: '25%',
              background: `
                radial-gradient(circle at 30% 30%, rgba(255, 200, 100, 0.9) 0%, transparent 50%),
                linear-gradient(135deg, #ff4757 0%, #ff6b6b 30%, #ff3838 60%, #c23616 100%)
              `,
              boxShadow: `
                inset 0 0 ${width * 0.1}px rgba(255, 255, 255, 0.3),
                inset 0 0 ${width * 0.05}px rgba(255, 100, 100, 0.8),
                0 ${height * 0.05}px ${height * 0.1}px rgba(0, 0, 0, 0.3)
              `,
              filter: hasMuscles ? 'contrast(1.2) saturate(1.3)' : 'none'
            }}
          />

          {/* Muscle Definition */}
          {hasMuscles && (
            <>
              <div 
                className="absolute bg-gradient-to-b from-red-400 to-transparent rounded-full opacity-60"
                style={{
                  width: width * 0.2,
                  height: height * 0.3,
                  left: '25%',
                  top: '35%'
                }}
              />
              <div 
                className="absolute bg-gradient-to-b from-red-400 to-transparent rounded-full opacity-60"
                style={{
                  width: width * 0.2,
                  height: height * 0.3,
                  left: '55%',
                  top: '35%'
                }}
              />
            </>
          )}

          {/* Head - 3D realistic */}
          <div 
            className="absolute rounded-full bg-gradient-to-br from-red-400 via-orange-400 to-red-600"
            style={{
              width: width * 0.45,
              height: width * 0.45,
              left: '27.5%',
              top: '10%',
              background: `
                radial-gradient(circle at 35% 25%, rgba(255, 220, 150, 0.8) 0%, transparent 40%),
                linear-gradient(135deg, #ff6b6b 0%, #ff4757 50%, #e55039 100%)
              `,
              boxShadow: `
                inset 0 0 ${width * 0.08}px rgba(255, 255, 255, 0.4),
                0 ${height * 0.03}px ${height * 0.06}px rgba(0, 0, 0, 0.2)
              `
            }}
          />

          {/* Eyes - Realistic 3D */}
          <div 
            className="absolute rounded-full bg-gradient-to-br from-yellow-300 to-orange-500"
            style={{
              width: width * 0.08,
              height: width * 0.08,
              left: '35%',
              top: '20%',
              boxShadow: `inset 0 0 ${width * 0.02}px rgba(0, 0, 0, 0.8), 0 0 ${width * 0.01}px rgba(255, 255, 0, 0.6)`
            }}
          />
          <div 
            className="absolute rounded-full bg-gradient-to-br from-yellow-300 to-orange-500"
            style={{
              width: width * 0.08,
              height: width * 0.08,
              left: '57%',
              top: '20%',
              boxShadow: `inset 0 0 ${width * 0.02}px rgba(0, 0, 0, 0.8), 0 0 ${width * 0.01}px rgba(255, 255, 0, 0.6)`
            }}
          />

          {/* Eye pupils */}
          <div 
            className="absolute rounded-full bg-black"
            style={{
              width: width * 0.04,
              height: width * 0.04,
              left: '37%',
              top: '22%'
            }}
          />
          <div 
            className="absolute rounded-full bg-black"
            style={{
              width: width * 0.04,
              height: width * 0.04,
              left: '59%',
              top: '22%'
            }}
          />

          {/* Teeth - Enhanced if upgraded */}
          {hasSharpTeeth && (
            <>
              <div 
                className="absolute bg-gradient-to-b from-white to-gray-300 transform rotate-12"
                style={{
                  width: width * 0.03,
                  height: width * 0.08,
                  left: '42%',
                  top: '32%',
                  clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                  boxShadow: `0 0 ${width * 0.01}px rgba(255, 255, 255, 0.8)`
                }}
              />
              <div 
                className="absolute bg-gradient-to-b from-white to-gray-300 transform -rotate-12"
                style={{
                  width: width * 0.03,
                  height: width * 0.08,
                  left: '55%',
                  top: '32%',
                  clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                  boxShadow: `0 0 ${width * 0.01}px rgba(255, 255, 255, 0.8)`
                }}
              />
            </>
          )}

          {/* Wings - Flame wings if upgraded */}
          {hasWings && (
            <>
              <div 
                className="absolute bg-gradient-to-r from-orange-400 via-red-500 to-yellow-400 opacity-80"
                style={{
                  width: width * 0.3,
                  height: width * 0.4,
                  left: '5%',
                  top: '20%',
                  clipPath: 'polygon(0% 20%, 100% 0%, 90% 100%, 10% 80%)',
                  filter: 'blur(1px)',
                  animation: animationState === 'attack' ? 'flutter 0.3s ease-in-out' : 'none'
                }}
              />
              <div 
                className="absolute bg-gradient-to-l from-orange-400 via-red-500 to-yellow-400 opacity-80"
                style={{
                  width: width * 0.3,
                  height: width * 0.4,
                  left: '65%',
                  top: '20%',
                  clipPath: 'polygon(0% 0%, 100% 20%, 90% 80%, 10% 100%)',
                  filter: 'blur(1px)',
                  animation: animationState === 'attack' ? 'flutter 0.3s ease-in-out' : 'none'
                }}
              />
            </>
          )}

          {/* Spikes - Metallic spikes if upgraded */}
          {hasSpikes && (
            <>
              <div 
                className="absolute bg-gradient-to-b from-gray-300 to-gray-600"
                style={{
                  width: width * 0.04,
                  height: width * 0.12,
                  left: '30%',
                  top: '15%',
                  clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                  boxShadow: `0 0 ${width * 0.005}px rgba(255, 255, 255, 0.8)`
                }}
              />
              <div 
                className="absolute bg-gradient-to-b from-gray-300 to-gray-600"
                style={{
                  width: width * 0.04,
                  height: width * 0.12,
                  left: '66%',
                  top: '15%',
                  clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                  boxShadow: `0 0 ${width * 0.005}px rgba(255, 255, 255, 0.8)`
                }}
              />
            </>
          )}

          {/* Tail - Enhanced based on upgrade */}
          <div 
            className="absolute bg-gradient-to-t from-red-600 to-red-400"
            style={{
              width: width * 0.15,
              height: width * 0.35,
              left: tailType === 'spiked' ? '75%' : '80%',
              top: '45%',
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              transform: `rotate(${animationState === 'attack' ? '45deg' : '25deg'})`,
              background: tailType === 'spiked' ? 
                'linear-gradient(135deg, #ff4757 0%, #ff3838 50%, #c23616 100%)' :
                'linear-gradient(135deg, #ff6b6b 0%, #ff4757 50%, #e55039 100%)',
              boxShadow: `0 ${height * 0.02}px ${height * 0.04}px rgba(0, 0, 0, 0.2)`
            }}
          />

          {/* Fire Effects for Attack Animation */}
          {animationState === 'attack' && (
            <>
              <div 
                className="absolute animate-pulse"
                style={{
                  width: width * 0.2,
                  height: width * 0.2,
                  left: '70%',
                  top: '30%',
                  background: 'radial-gradient(circle, rgba(255, 165, 0, 0.8) 0%, transparent 70%)',
                  borderRadius: '50%'
                }}
              />
              <div 
                className="absolute animate-ping"
                style={{
                  width: width * 0.15,
                  height: width * 0.15,
                  left: '75%',
                  top: '35%',
                  background: 'radial-gradient(circle, rgba(255, 69, 0, 0.6) 0%, transparent 70%)',
                  borderRadius: '50%'
                }}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  // Get monster-specific realistic rendering
  const renderRealisticIceDragon = () => {
    const hasSharpTeeth = upgradeChoices?.teeth === 'razor';
    const hasSpikes = upgradeChoices?.spikes === 'ice';
    const hasMuscles = upgradeChoices?.muscles === 'enhanced';
    const hasWings = upgradeChoices?.wings === 'ice';
    const tailType = upgradeChoices?.tail || 'normal';
    
    // Animation transforms
    const getTransform = () => {
      const baseTransform = facingDirection === 'left' ? 'scaleX(-1)' : '';
      
      switch (animationState) {
        case 'windup':
          return `${baseTransform} scale(0.9) rotate(-5deg)`;
        case 'attack':
          return `${baseTransform} scale(1.1) rotate(5deg) translateX(${facingDirection === 'right' ? '20px' : '-20px'})`;
        case 'hit':
          return `${baseTransform} scale(0.95) rotate(${facingDirection === 'right' ? '-3deg' : '3deg'}) translateX(${facingDirection === 'right' ? '-15px' : '15px'})`;
        case 'victory':
          return `${baseTransform} scale(1.05) rotate(2deg)`;
        case 'defeat':
          return `${baseTransform} scale(0.8) rotate(-10deg) translateY(20px)`;
        default:
          return baseTransform;
      }
    };

    return (
      <div 
        className="relative transition-all duration-300 ease-out"
        style={{ 
          transform: getTransform(),
          filter: animationState === 'attack' ? 'drop-shadow(0 0 20px rgba(107, 185, 255, 0.8))' : 'none'
        }}
      >
        {/* Realistic 3D-style Ice Dragon */}
        <div className="relative" style={{ width, height }}>
          {/* Shadow/Base */}
          <div 
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-black/20 rounded-full blur-sm"
            style={{ width: width * 0.8, height: height * 0.15 }}
          />
          
          {/* Main Body - Realistic ice texture */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              width: width * 0.7,
              height: height * 0.6,
              left: '15%',
              top: '25%',
              background: `
                radial-gradient(circle at 30% 30%, rgba(180, 220, 255, 0.9) 0%, transparent 50%),
                linear-gradient(135deg, #74b9ff 0%, #0984e3 30%, #0056b3 60%, #003d82 100%)
              `,
              boxShadow: `
                inset 0 0 ${width * 0.1}px rgba(255, 255, 255, 0.4),
                inset 0 0 ${width * 0.05}px rgba(180, 220, 255, 0.8),
                0 ${height * 0.05}px ${height * 0.1}px rgba(0, 0, 0, 0.3)
              `,
              filter: hasMuscles ? 'contrast(1.2) saturate(1.3)' : 'none'
            }}
          />

          {/* Ice Crystal Texture */}
          <div 
            className="absolute rounded-full opacity-30"
            style={{
              width: width * 0.6,
              height: height * 0.5,
              left: '20%',
              top: '30%',
              background: `
                repeating-linear-gradient(
                  45deg,
                  rgba(255, 255, 255, 0.1) 0px,
                  rgba(255, 255, 255, 0.1) 2px,
                  transparent 2px,
                  transparent 8px
                ),
                repeating-linear-gradient(
                  -45deg,
                  rgba(255, 255, 255, 0.1) 0px,
                  rgba(255, 255, 255, 0.1) 2px,
                  transparent 2px,
                  transparent 8px
                )
              `
            }}
          />

          {/* Head - 3D realistic */}
          <div 
            className="absolute rounded-full"
            style={{
              width: width * 0.45,
              height: width * 0.45,
              left: '27.5%',
              top: '10%',
              background: `
                radial-gradient(circle at 35% 25%, rgba(200, 230, 255, 0.8) 0%, transparent 40%),
                linear-gradient(135deg, #a8e6cf 0%, #74b9ff 50%, #0984e3 100%)
              `,
              boxShadow: `
                inset 0 0 ${width * 0.08}px rgba(255, 255, 255, 0.5),
                0 ${height * 0.03}px ${height * 0.06}px rgba(0, 0, 0, 0.2)
              `
            }}
          />

          {/* Eyes - Realistic 3D ice blue */}
          <div 
            className="absolute rounded-full"
            style={{
              width: width * 0.08,
              height: width * 0.08,
              left: '35%',
              top: '20%',
              background: 'radial-gradient(circle, #e0f7ff 0%, #74b9ff 50%, #0984e3 100%)',
              boxShadow: `inset 0 0 ${width * 0.02}px rgba(0, 0, 0, 0.6), 0 0 ${width * 0.01}px rgba(116, 185, 255, 0.8)`
            }}
          />
          <div 
            className="absolute rounded-full"
            style={{
              width: width * 0.08,
              height: width * 0.08,
              left: '57%',
              top: '20%',
              background: 'radial-gradient(circle, #e0f7ff 0%, #74b9ff 50%, #0984e3 100%)',
              boxShadow: `inset 0 0 ${width * 0.02}px rgba(0, 0, 0, 0.6), 0 0 ${width * 0.01}px rgba(116, 185, 255, 0.8)`
            }}
          />

          {/* Eye pupils */}
          <div 
            className="absolute rounded-full bg-black"
            style={{
              width: width * 0.04,
              height: width * 0.04,
              left: '37%',
              top: '22%'
            }}
          />
          <div 
            className="absolute rounded-full bg-black"
            style={{
              width: width * 0.04,
              height: width * 0.04,
              left: '59%',
              top: '22%'
            }}
          />

          {/* Ice Breath Effect for Attack Animation */}
          {animationState === 'attack' && (
            <>
              <div 
                className="absolute animate-pulse"
                style={{
                  width: width * 0.3,
                  height: width * 0.15,
                  left: '70%',
                  top: '30%',
                  background: 'linear-gradient(90deg, rgba(180, 220, 255, 0.8) 0%, transparent 100%)',
                  borderRadius: '50%'
                }}
              />
              <div 
                className="absolute animate-ping"
                style={{
                  width: width * 0.2,
                  height: width * 0.1,
                  left: '75%',
                  top: '35%',
                  background: 'linear-gradient(90deg, rgba(116, 185, 255, 0.6) 0%, transparent 100%)',
                  borderRadius: '50%'
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
        return renderRealisticFlamePhoenix();
      case 2:
        return renderRealisticIceDragon();
      case 3:
        return renderRealisticFlamePhoenix(); // Thunder monster - similar to fire for now
      case 4:
        return renderRealisticIceDragon(); // Water monster - similar to ice for now
      default:
        return renderRealisticFlamePhoenix();
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      {renderMonster()}
      

    </div>
  );
}