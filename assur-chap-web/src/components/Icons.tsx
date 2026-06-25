// ==========================================================================
// Assur Chap — Jeu d'icônes SVG (stroke, héritent de currentColor)
// ==========================================================================
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 22, ...props }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export const Icon = {
  shield: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  car: (p: P) => (
    <svg {...base(p)}>
      <path d="M5 13l1.5-4.5A2 2 0 018.4 7h7.2a2 2 0 011.9 1.5L19 13" />
      <path d="M4 13h16v4a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H7v1a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
      <circle cx="7.5" cy="15.5" r="1" />
      <circle cx="16.5" cy="15.5" r="1" />
    </svg>
  ),
  file: (p: P) => (
    <svg {...base(p)}>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  ),
  wallet: (p: P) => (
    <svg {...base(p)}>
      <path d="M3 7a2 2 0 012-2h12a2 2 0 012 2v1H5a2 2 0 00-2 2z" />
      <path d="M3 9h16a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <circle cx="16.5" cy="14" r="1.2" />
    </svg>
  ),
  check: (p: P) => (
    <svg {...base(p)}>
      <path d="M5 12l4 4L19 6" />
    </svg>
  ),
  checkCircle: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-5" />
    </svg>
  ),
  clock: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  warning: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 3l9 16H3z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  ),
  bell: (p: P) => (
    <svg {...base(p)}>
      <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" />
      <path d="M10 20a2 2 0 004 0" />
    </svg>
  ),
  sun: (p: P) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </svg>
  ),
  moon: (p: P) => (
    <svg {...base(p)}>
      <path d="M20 14.5A8 8 0 119.5 4a6.5 6.5 0 0010.5 10.5z" />
    </svg>
  ),
  plus: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  arrowRight: (p: P) => (
    <svg {...base(p)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  star: (p: P) => (
    <svg {...base({ ...p })} fill="currentColor" stroke="none">
      <path d="M12 3l2.5 5.5L20 9.3l-4 4 1 6L12 16.8 7 19.3l1-6-4-4 5.5-.8z" />
    </svg>
  ),
  mapPin: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 21s-6-5.2-6-10a6 6 0 0112 0c0 4.8-6 10-6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  ),
  refresh: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 12a8 8 0 0113.5-5.8L20 8M20 4v4h-4" />
      <path d="M20 12a8 8 0 01-13.5 5.8L4 16M4 20v-4h4" />
    </svg>
  ),
  logout: (p: P) => (
    <svg {...base(p)}>
      <path d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  chart: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  users: (p: P) => (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0112 0M16 6a3 3 0 010 6M21 20a6 6 0 00-4-5.6" />
    </svg>
  ),
  search: (p: P) => (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </svg>
  ),
  qr: (p: P) => (
    <svg {...base(p)}>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2M20 16v4M14 18h2v2h-2z" />
    </svg>
  ),
  x: (p: P) => (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  bolt: (p: P) => (
    <svg {...base(p)}>
      <path d="M13 3L4 14h6l-1 7 9-11h-6z" />
    </svg>
  ),
  scale: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 3v18M7 21h10M5 7h14M5 7l-2 5a3 3 0 006 0zM19 7l-2 5a3 3 0 006 0z" />
    </svg>
  ),
  phone: (p: P) => (
    <svg {...base(p)}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
    </svg>
  ),
  sparkle: (p: P) => (
    <svg {...base(p)}>
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
    </svg>
  ),
  google: (p: P) => (
    <svg {...base({ ...p })} stroke="none">
      <path fill="#EA4335" d="M12 11v3.2h4.5c-.2 1.2-1.5 3.4-4.5 3.4a5.1 5.1 0 010-10.2c1.6 0 2.6.7 3.2 1.3l2.2-2.1C16.1 4.3 14.3 3.5 12 3.5a8.5 8.5 0 100 17c4.9 0 8.1-3.4 8.1-8.2 0-.6-.1-1-.2-1.3z" />
    </svg>
  ),
};

export type IconName = keyof typeof Icon;
