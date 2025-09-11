/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./first project/src/**/*.{js,jsx,ts,tsx}",
    "./first project/index.html"
  ],
  
  
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ghdc: {
          bg: '#0a0c10',
          text: '#f0f3f6',
          primary: '#58a6ff',
          secondary: '#1f6feb',
          accent: '#d29922',
          border: '#30363d',
          muted: '#21262d',
          subtle: '#8b949e',
          danger: '#ff7b72',
          success: '#3fb950',
          warning: '#d29922',
        }
      }
    },
  },
  plugins: [],
}