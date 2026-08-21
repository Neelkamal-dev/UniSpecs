/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#FAFAF7',
          muted: '#F4F4F0',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F9F9F8',
          border: '#E7E7E2',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        status: {
          verified: '#15803d',
          'verified-bg': '#f0fdf4',
          'verified-border': '#bbf7d0',
          conflict: '#dc2626',
          'conflict-bg': '#fef2f2',
          'conflict-border': '#fecaca',
          warning: '#d97706',
          'warning-bg': '#fffbeb',
          'warning-border': '#fde68a',
          info: '#2563eb',
          'info-bg': '#eff6ff',
          'info-border': '#bfdbfe',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'dropdown': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}

