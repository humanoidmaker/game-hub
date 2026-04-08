import type { Config } from 'tailwindcss';
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6d28d9', foreground: '#ffffff' },
        muted: { DEFAULT: '#1e1b2e', foreground: '#a1a1aa' },
        border: '#2d2b3d',
        background: '#0f0d1a',
        foreground: '#f4f4f5',
        card: '#1a1830',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;
