// A tiny dependency-free bar chart built from daily summaries. Charts read
// these rolled-up numbers, never raw location points, so the app stays light.
import React from 'react';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { View } from 'react-native';
import { theme } from './ui';

export interface Bar {
  label: string;
  value: number;
}

export function BarChart({
  data,
  height = 160,
  unit = '',
}: {
  data: Bar[];
  height?: number;
  unit?: string;
}) {
  const width = Math.max(260, data.length * 30);
  const pad = 24;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = (width - pad * 2) / Math.max(1, data.length) - 6;
  const plotH = height - pad * 2;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke={theme.line} strokeWidth={1} />
        {data.map((d, i) => {
          const h = (d.value / max) * plotH;
          const x = pad + i * ((width - pad * 2) / Math.max(1, data.length)) + 3;
          const y = height - pad - h;
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={y} width={barW} height={h} rx={3} fill={theme.accent} />
              {i % Math.ceil(data.length / 7) === 0 ? (
                <SvgText x={x + barW / 2} y={height - pad + 12} fill={theme.dim} fontSize="9" textAnchor="middle">
                  {d.label}
                </SvgText>
              ) : null}
            </React.Fragment>
          );
        })}
        <SvgText x={pad} y={14} fill={theme.dim} fontSize="10">
          {`max ${max}${unit}`}
        </SvgText>
      </Svg>
    </View>
  );
}
