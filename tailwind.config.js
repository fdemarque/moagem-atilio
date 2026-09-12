/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        sacaria: {
          in: '#16a34a', // Verde forte para entrada
          out: '#dc2626', // Vermelho forte para saída
        }
      },
      fontSize: {
        'touch-lg': ['1.25rem', { lineHeight: '1.75rem' }],
        'touch-xl': ['1.5rem', { lineHeight: '2rem' }],
      }
    },
  },
  plugins: [],
}
