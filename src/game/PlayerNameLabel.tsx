import React from 'react';
import { Html } from '@/src/lib/r3f/drei';

export type PlayerNameLabelProps = {
  name: string;
  isCurrentTurn: boolean;
};

const baseStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.95)',
  color: '#1f2937',
  fontSize: 12,
  fontWeight: 600,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  lineHeight: 1.2,
  letterSpacing: 0.1,
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
  whiteSpace: 'nowrap',
  maxWidth: 140,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  userSelect: 'none',
  border: '2px solid transparent',
  transition: 'box-shadow 160ms ease, border-color 160ms ease',
};

const activeStyle: React.CSSProperties = {
  borderColor: '#f59e0b',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25), 0 0 12px rgba(245, 158, 11, 0.6)',
};

export const PlayerNameLabel: React.FC<PlayerNameLabelProps> = ({ name, isCurrentTurn }) => {
  const style = isCurrentTurn ? { ...baseStyle, ...activeStyle } : baseStyle;

  return (
    <Html position={[0, 1.5, 0]} center pointerEvents="none">
      <div style={style}>{name}</div>
    </Html>
  );
};
