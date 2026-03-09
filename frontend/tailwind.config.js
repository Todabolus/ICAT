/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cap: {
          navy:  '#003652',
          blue:  '#0070AD',
          sky:   '#12ABDB',
          bg:    '#EEF3F7',
          muted: '#6B8299',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
