/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pitch: '#0F1B14',
        surface: '#16221C',
        'surface-subtle': '#1B2922',
        'surface-hover': '#22332B',
        main: '#EDEFE7',
        muted: '#9BA39B',
        led: '#F2B705',
        win: '#4C9A6A',
        loss: '#C1443C'
      },
      fontFamily: {
        scoreboard: ['"Archivo Black"', 'Impact', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}