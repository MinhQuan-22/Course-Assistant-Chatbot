import React from "react";

type IconProps = { size?: number; color?: string; style?: React.CSSProperties };

export function IconFilter({ size = 20, color = "rgba(255,255,255,0.9)", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M3 5h18l-7 8v6l-4 2v-8L3 5z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconExport({ size = 20, color = "rgba(255,255,255,0.9)", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M12 3v10" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 7l4-4 4 4" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path
        d="M4 14v6h16v-6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconEdit({ size = 20, color = "rgba(255,255,255,0.9)", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M4 20h4l10.5-10.5a1.8 1.8 0 0 0 0-2.6l-1.4-1.4a1.8 1.8 0 0 0-2.6 0L4 16v4z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M13 6l5 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconTrash({ size = 20, color = "rgba(255,255,255,0.9)", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M6 7h12"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9 7V5h6v2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 7l1 14h6l1-14"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 11v6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 11v6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconUsers({ size = 22, color = "rgba(255,255,255,0.9)", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M16 11a3 3 0 1 0-2.999-3A3 3 0 0 0 16 11Z"
        stroke={color}
        strokeWidth="1.8"
      />
      <path
        d="M8 11a3 3 0 1 0-2.999-3A3 3 0 0 0 8 11Z"
        stroke={color}
        strokeWidth="1.8"
      />
      <path
        d="M3.5 20c.6-3.4 3.1-5 6.5-5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M20.5 20c-.6-3.4-3.1-5-6.5-5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconChat({ size = 22, color = "rgba(255,255,255,0.9)", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M4 5h16v10H7l-3 3V5z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 9h8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 12h5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconHelp({ size = 22, color = "rgba(255,255,255,0.9)", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z"
        stroke={color}
        strokeWidth="1.8"
      />
      <path
        d="M9.8 9.2a2.4 2.4 0 0 1 4.3 1.4c0 1.6-1.7 2-2.3 2.7-.3.4-.3.7-.3 1.7"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 17.6h.01" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconChart({ size = 22, color = "rgba(255,255,255,0.9)", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M4 19h16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 19V11" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 19V7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 19V14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconDoc({ size = 22, color = "rgba(255,255,255,0.9)", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path
        d="M7 3h7l3 3v15H7V3z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 15h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}