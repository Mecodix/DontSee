export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#09090b', // Zinc 950
          glass: 'rgba(24, 24, 27, 0.6)', // Zinc 900 / 60%
          raised: '#18181b', // Zinc 900
        },
        primary: {
          DEFAULT: '#d0bcff',
          foreground: '#381e72',
          hover: '#e8def8'
        },
        border: 'rgba(255, 255, 255, 0.08)',
      },
      fontFamily: {
        brand: ['Outfit', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      backgroundImage: {
        'aurora': 'radial-gradient(circle at 50% 0%, rgba(124, 58, 237, 0.15), transparent 50%), radial-gradient(circle at 0% 50%, rgba(56, 189, 248, 0.1), transparent 50%)',
      }
    },
  },
  plugins: [],
}
