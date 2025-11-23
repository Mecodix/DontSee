/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        brand: ['Outfit', 'sans-serif'],
      },
      colors: {
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-container': 'rgb(var(--color-surface-container) / <alpha-value>)',
        'surface-raised': 'rgb(var(--color-surface-raised) / <alpha-value>)',
        'surface-error': 'rgb(var(--color-surface-error) / <alpha-value>)',

        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)',

        'secondary-container': 'rgb(var(--color-secondary-container) / <alpha-value>)',
        'secondary-hover': 'rgb(var(--color-secondary-hover) / <alpha-value>)',

        outline: 'rgb(var(--color-outline) / <alpha-value>)',

        error: 'rgb(var(--color-error) / <alpha-value>)',
        'error-container': 'rgb(var(--color-error-container) / <alpha-value>)',
      },
      animation: {
        'slide-down': 'slideDown 0.4s cubic-bezier(0.2, 0, 0.2, 1) forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.2, 0.0, 0.2, 1) forwards',
        'blink-eye': 'blink 4s infinite',
        'spin-slow': 'spin 1s linear infinite',
      },
      keyframes: {
        slideDown: {
          'from': { opacity: '0', transform: 'translate(-50%, -20px)' },
          'to': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 48%, 52%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(0.1)' },
        }
      }
    }
  },
  plugins: [],
}
