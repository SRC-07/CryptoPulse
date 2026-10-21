import React, { useId } from 'react';

/**
 * Generador determinista de curva 7D en caso de que la fuente externa
 * no retorne puntos de sparkline (ej. modo offline, fallback de MongoDB o límite de API).
 */
function generateFallbackTrend(change24h = 0, symbol = 'BTC') {
  const seed = (symbol || 'BTC')
    .split('')
    .reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);

  const numPoints = 28;
  const points = [];
  const basePrice = 100;
  const overallTrend = (change24h || 0) / 100;

  for (let i = 0; i < numPoints; i++) {
    const progress = i / (numPoints - 1);
    // Componente de tendencia principal combinada con oscilaciones armónicas suaves
    const harmonic1 = Math.sin((i * 0.7) + (seed % 6)) * 2.8;
    const harmonic2 = Math.cos((i * 1.3) + ((seed * 3) % 8)) * 1.6;
    const microJitter = Math.sin((i * 2.5) + seed) * 0.7;

    const trendComponent = basePrice * (1 + overallTrend * Math.pow(progress, 1.2));
    const value = trendComponent + harmonic1 + harmonic2 + microJitter;
    points.push(Math.max(value, 1));
  }

  // Asegurar que el último punto termine en la dirección del cambio 24h
  if (change24h > 0 && points[points.length - 1] <= points[0]) {
    points[points.length - 1] = points[0] * (1 + Math.abs(overallTrend) * 0.5 + 0.02);
  } else if (change24h < 0 && points[points.length - 1] >= points[0]) {
    points[points.length - 1] = points[0] * (1 - Math.abs(overallTrend) * 0.5 - 0.02);
  }

  return points;
}

export default function Sparkline({
  points = null,
  isPositive = true,
  change24h = 0,
  symbol = 'BTC',
  width = 115,
  height = 34,
}) {
  const rawId = useId();
  // Sanitizar el ID para selector SVG seguro
  const gradientId = `spk-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // Si no se proporcionaron puntos o hay menos de 2, generamos una curva de tendencia coherente
  const dataPoints = (Array.isArray(points) && points.length >= 2)
    ? points
    : generateFallbackTrend(change24h, symbol);

  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const range = max - min || 1;

  // Calculamos coordenadas de trazado SVG con márgenes seguros
  const paddingX = 4;
  const paddingTop = 4;
  const paddingBottom = 4;
  const usableWidth = width - (paddingX * 2);
  const usableHeight = height - paddingTop - paddingBottom;

  const coords = dataPoints.map((val, idx) => {
    const x = paddingX + (idx / (dataPoints.length - 1)) * usableWidth;
    const y = paddingTop + usableHeight - ((val - min) / range) * usableHeight;
    return [x, y];
  });

  const polylinePoints = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const firstCoord = coords[0];
  const lastCoord = coords[coords.length - 1];

  // Polígono cerrado para relleno de gradiente sutil debajo de la curva
  const polygonPoints = `${firstCoord[0].toFixed(1)},${height} ${polylinePoints} ${lastCoord[0].toFixed(1)},${height}`;

  const strokeColor = isPositive ? 'var(--color-pulse-green, #27a644)' : 'var(--color-coral-red, #eb5757)';
  const gradColor = isPositive ? '#27a644' : '#eb5757';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', height: `${height}px`, verticalAlign: 'middle' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible', display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradColor} stopOpacity="0.28" />
            <stop offset="70%" stopColor={gradColor} stopOpacity="0.06" />
            <stop offset="100%" stopColor={gradColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Área sombreada con gradiente */}
        <polygon
          fill={`url(#${gradientId})`}
          points={polygonPoints}
        />

        {/* Línea de tendencia de precisión */}
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />

        {/* Punto de cierre actual */}
        <circle
          cx={lastCoord[0]}
          cy={lastCoord[1]}
          r="2.2"
          fill={strokeColor}
        />
      </svg>
    </div>
  );
}

