//** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        phoenix: {
          purple: '#6B4EFF',
          dark: '#1A1A2E',
          light: '#F0EDFF',
        }
      }
    },
  },
  plugins: [],
}


