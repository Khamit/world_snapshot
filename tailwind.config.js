/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        // Анимация для печатающегося текста
        typing: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        blink: {
          '0%, 100%': { borderColor: 'transparent' },
          '50%': { borderColor: '#06b6d4' }, // cyan-500
        },
        // Анимация для сетки
        gridMove: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '100px 100px' },
        },
        // Плавное появление
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Пульсация для акцентов
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        // Движение частиц
        float: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '25%': { transform: 'translateY(-10px) translateX(5px)' },
          '75%': { transform: 'translateY(10px) translateX(-5px)' },
        },
      },
      boxShadow: {
        'cyber': '0 0 20px rgba(6, 182, 212, 0.3)',
        'cyber-lg': '0 0 30px rgba(6, 182, 212, 0.5)',
      },
      animation: {
        typing: 'typing 3s steps(30, end)',
        blink: 'blink 1s step-end infinite',
        gridMove: 'gridMove 20s linear infinite',
        fadeIn: 'fadeIn 1s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 6s ease-in-out infinite',
      },
      backgroundImage: {
        'cyber-grid': 'linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}