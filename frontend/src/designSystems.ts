// ═══════════════════════════════════════════════════════════════
// NHAI DESIGN SYSTEM — Centralized Tokens & Theme
// ═══════════════════════════════════════════════════════════════

export const colors = {
  // Primary palette
  navy: '#11296B',
  blue: '#00509D',
  gold: '#FFDB57',
  primaryGold: '#FFCB05',
  red: '#BF0603',
  neutral: '#EDEDED',

  // Semantic
  surface: '#FFFFFF',
  surfaceSecondary: '#F7F8FC',
  surfaceTertiary: '#EDEFF5',
  border: '#DDE1EC',
  borderLight: '#EEF0F8',

  // Text
  textPrimary: '#0D1B3E',
  textSecondary: '#4A5578',
  textMuted: '#8892AB',
  textInverse: '#FFFFFF',

  // Status
  success: '#16A34A',
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  errorColor: '#BF0603',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
} as const;

export const typography = {
  // Font families (CSS-safe, fallback stacks)
  displayFont: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif",
  bodyFont: "'DM Sans', 'Plus Jakarta Sans', system-ui, sans-serif",
  monoFont: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  '5xl': '48px',
} as const;

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '28px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 3px rgba(17,41,107,0.06), 0 1px 2px rgba(17,41,107,0.04)',
  md: '0 4px 12px rgba(17,41,107,0.08), 0 2px 4px rgba(17,41,107,0.04)',
  lg: '0 8px 24px rgba(17,41,107,0.10), 0 4px 8px rgba(17,41,107,0.06)',
  xl: '0 16px 40px rgba(17,41,107,0.12), 0 8px 16px rgba(17,41,107,0.06)',
  navy: '0 4px 16px rgba(17,41,107,0.25)',
  gold: '0 4px 16px rgba(255,203,5,0.35)',
} as const;

// CSS string for font imports (inject into head or use @import)
export const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');`;

// Global CSS variables (inject as :root styles)
export const cssVariables = `
  :root {
    --color-navy: #11296B;
    --color-blue: #00509D;
    --color-gold: #FFDB57;
    --color-primary-gold: #FFCB05;
    --color-red: #BF0603;
    --color-neutral: #EDEDED;
    --color-surface: #FFFFFF;
    --color-surface-2: #F7F8FC;
    --color-surface-3: #EDEFF5;
    --color-border: #DDE1EC;
    --color-border-light: #EEF0F8;
    --color-text-primary: #0D1B3E;
    --color-text-secondary: #4A5578;
    --color-text-muted: #8892AB;
    --shadow-sm: 0 1px 3px rgba(17,41,107,0.06), 0 1px 2px rgba(17,41,107,0.04);
    --shadow-md: 0 4px 12px rgba(17,41,107,0.08), 0 2px 4px rgba(17,41,107,0.04);
    --shadow-lg: 0 8px 24px rgba(17,41,107,0.10), 0 4px 8px rgba(17,41,107,0.06);
    --shadow-xl: 0 16px 40px rgba(17,41,107,0.12), 0 8px 16px rgba(17,41,107,0.06);
    --font-display: 'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif;
    --font-body: 'DM Sans', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }
`;