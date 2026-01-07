/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./App.{js,jsx,ts,tsx}",
    "./index.tsx"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#007AFF',
          light: '#5AC8FA',
          dark: '#0A5FC4',
        },
        accent: {
          orange: '#FF6B35',
          red: '#FF6B6B',
          green: '#34C759',
        },
        dark: {
          bg: '#000000',
          card: '#1c1c1e',
          card2: '#2c2c2e',
          card3: '#3a3a3c',
          border: '#333333',
          subtle: '#999999',
        },
        light: {
          bg: '#ffffff',
          card: '#ffffff',
          card2: '#f5f5f5',
          card3: '#e5e5e5',
          border: '#cccccc',
          subtle: '#666666',
        },
      },
      spacing: {
        '4.5': '18px',
        '18': '72px',
      },
      borderRadius: {
        '4xl': '32px',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
