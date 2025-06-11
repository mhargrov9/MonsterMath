import React from 'react';

export default function TestMonsterGraphics() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Monster Graphics Test</h2>
      
      {/* Test SVG with simple shapes */}
      <div className="bg-gray-100 p-4 rounded">
        <h3>Simple SVG Test:</h3>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="red" />
          <circle cx="35" cy="40" r="5" fill="white" />
          <circle cx="65" cy="40" r="5" fill="white" />
          <path d="M35 60 Q50 70 65 60" stroke="black" strokeWidth="2" fill="none"/>
        </svg>
      </div>

      {/* Test different monster types */}
      <div className="grid grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(monsterId => (
          <div key={monsterId} className="bg-gray-100 p-2 rounded text-center">
            <h4>Monster {monsterId}</h4>
            <MonsterSVG monsterId={monsterId} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MonsterSVG({ monsterId }: { monsterId: number }) {
  const colors = {
    1: { primary: "#ff6b6b", secondary: "#d63447" },
    2: { primary: "#fdcb6e", secondary: "#e17055" },
    3: { primary: "#a29bfe", secondary: "#6c5ce7" },
    4: { primary: "#74b9ff", secondary: "#0984e3" },
    5: { primary: "#55a3ff", secondary: "#2d3436" }
  }[monsterId] || { primary: "#ff6b6b", secondary: "#d63447" };

  return (
    <svg width="80" height="80" viewBox="0 0 200 200">
      <defs>
        <linearGradient id={`test-body-${monsterId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.secondary} />
        </linearGradient>
      </defs>
      
      {/* Body */}
      <ellipse cx="100" cy="120" rx="40" ry="30" fill={`url(#test-body-${monsterId})`} />
      
      {/* Head */}
      <ellipse cx="100" cy="70" rx="35" ry="30" fill={colors.primary} />
      
      {/* Eyes */}
      <circle cx="90" cy="65" r="5" fill="white" />
      <circle cx="110" cy="65" r="5" fill="white" />
      <circle cx="90" cy="65" r="2" fill="black" />
      <circle cx="110" cy="65" r="2" fill="black" />
      
      {/* Mouth */}
      <path d="M85 80 Q100 85 115 80" stroke="black" strokeWidth="2" fill="none" />
      
      {/* Type indicator */}
      <text x="100" y="190" textAnchor="middle" fontSize="12" fill={colors.secondary}>
        Type {monsterId}
      </text>
    </svg>
  );
}