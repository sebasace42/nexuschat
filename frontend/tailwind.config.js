/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void:    '#0b0c10',
        deep:    '#13141a',
        panel:   '#1a1b23',
        main:    '#1f2029',
        input:   '#2a2b36',
        hover:   '#2e2f3e',
        active:  '#3a3b52',
        accent:  '#7c6ff7',
        'accent-bright':  '#a8a0ff',
        'accent-green':   '#3ba55d',
        'accent-yellow':  '#faa81a',
        'accent-red':     '#ed4245',
        'accent-teal':    '#00d4aa',
        'text-primary':   '#e8e9f3',
        'text-secondary': '#9a9cb8',
        'text-muted':     '#5d5f7a',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
