/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./main.jsx",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#FFF8F0', // marfil
        'secondary': '#E6C073', // dorado suave
        'accent': '#556B2F', // verde oliva
        'terracotta': '#D07F5F', // terracota
      },
    },
  },
  plugins: [],
}