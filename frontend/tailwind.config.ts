import type { Config } from 'tailwindcss';

// Design tokens from docs/design/Simple-POS-MVP-UIUX-Proposal.pdf §4 "نظام التصميم الموحد" (p.6).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0d7a6b', hover: '#0a6357', soft: '#e3f3f0', contrast: '#ffffff' },
        accent: { DEFAULT: '#14b8a6' }, // active sidebar item (p.5)
        sidebar: { DEFAULT: '#0f2724', muted: '#9fb5b1' },
        success: { DEFAULT: '#15803d', soft: '#dcfce7' }, // متاح / نجاح / مدفوع / زيادة
        warning: { DEFAULT: '#d97706', soft: '#fef3c7' }, // مشغول / تنبيه / مفتوح
        danger: { DEFAULT: '#dc2626', soft: '#fee2e2' }, // خطر / عجز / ملغي
        info: { DEFAULT: '#2563eb', soft: '#dbeafe' }, // معلومة / وردية مفتوحة
        surface: { DEFAULT: '#ffffff', page: '#f4f6f9', border: '#e2e8f0' },
        ink: { DEFAULT: '#0f172a', muted: '#64748b', disabled: '#94a3b8' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Headings 20–28, body 14–16, labels 12–13 (p.6)
        label: ['12px', { lineHeight: '18px' }],
        'label-lg': ['13px', { lineHeight: '20px' }],
        body: ['14px', { lineHeight: '22px' }],
        'body-lg': ['16px', { lineHeight: '26px' }],
        h3: ['20px', { lineHeight: '30px', fontWeight: '700' }],
        h2: ['24px', { lineHeight: '34px', fontWeight: '700' }],
        h1: ['28px', { lineHeight: '38px', fontWeight: '700' }],
        kpi: ['32px', { lineHeight: '40px', fontWeight: '700' }],
      },
      spacing: {
        touch: '44px', // minimum touch target (p.6, AC-15)
        'touch-lg': '58px', // primary POS actions (p.6)
      },
      minHeight: { touch: '44px', 'touch-lg': '58px' },
      minWidth: { touch: '44px' },
      borderRadius: { card: '16px', control: '12px', pill: '9999px' },
      boxShadow: { card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)' },
      screens: { rail: '1024px' }, // sidebar collapses to icons below 1024 px (p.5)
    },
  },
  plugins: [],
} satisfies Config;
