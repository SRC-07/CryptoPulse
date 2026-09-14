import React from 'react';

export default function Sparkline({ points = [], isPositive = true, width = 110, height = 32 }) {
  if (!points || points.length < 2) {
    return (
      <svg width={width} height={height} className="sparkline">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="var(--border-accent)" strokeWidth="1.5" strokeDasharray="3,3" />
      </svg>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * (width - 4) + 2;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const strokeColor = isPositive ? 'var(--color-positive)' : 'var(--color-negative)';

  return (
    <svg width={width} height={height} className="sparkline" style={{ overflow: 'visible' }}>
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  );
}
