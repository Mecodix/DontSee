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
        surface: '#141218',
        'surface-container': '#1d1b20',
        'surface-raised': '#2b2930', // New
        'surface-error': '#3f2e4d', // New
        primary: '#d0bcff',
        'on-primary': '#381e72',
        'secondary-container': '#4a4458',
        'secondary-hover': '#5c566b', // New
        outline: '#938f99',
        error: '#f2b8b5',
        'error-container': '#8c1d18',
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
