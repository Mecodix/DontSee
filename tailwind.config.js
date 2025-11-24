/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Core Surface - "No-Midtone" Rule
        // #0a0a0a (Deep Black)
        background: '#0a0a0a',
        surface: '#121212',
        'surface-raised': '#1c1c1c',

        // Electric Accents
        primary: {
          DEFAULT: '#8b5cf6', // Violet-500 equivalent but we'll use hex for precision
          hover: '#7c3aed',   // Violet-600
          foreground: '#ffffff',
          electric: '#a855f7', // Punchier violet
        },

        // Status
        success: '#22c55e', // Neon Green-ish
        error: '#ef4444',   // Bright Red
        warning: '#f59e0b',

        // Glass borders
        border: 'rgba(255, 255, 255, 0.08)',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem', // Extreme rounding
      },
      animation: {
        'enter': 'enter 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
      },
      keyframes: {
        enter: {
          'from': { opacity: '0', transform: 'translateY(20px) scale(0.96)' },
          'to': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(100%)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        }
      }
    }
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.glass': {
          'background': 'rgba(255, 255, 255, 0.03)',
          'backdrop-filter': 'blur(16px)',
          'border': '1px solid rgba(255, 255, 255, 0.08)',
        },
        '.glass-heavy': {
          'background': 'rgba(10, 10, 10, 0.7)',
          'backdrop-filter': 'blur(24px)',
          'border-top': '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.text-glow': {
          'text-shadow': '0 0 20px rgba(139, 92, 246, 0.5)',
        }
      })
    })
  ],
}
