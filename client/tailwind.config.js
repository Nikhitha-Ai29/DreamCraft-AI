/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: { 50: '#fffaf3', 100: '#fff1dc', 200: '#ffe2b8', 300: '#ffd08a' },
        burgundy: { 400: '#fb7185', 500: '#ed4775', 600: '#d92f68', 700: '#b92359', 800: '#8e1d4b' },
        plum: { 400: '#b05ad3', 500: '#933bd0', 600: '#7529b3', 700: '#5d218e' },
        rose: { 300: '#ffc0cb', 400: '#ff91ad', 500: '#f46b98' },
        saffron: { 100: '#fff4c2', 300: '#ffd65e', 500: '#f5ae22' },
        lagoon: { 100: '#d7f7ef', 300: '#67d8c2', 500: '#16a995' },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      },
    },
  },
  plugins: [],
};
