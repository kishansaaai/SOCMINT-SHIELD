/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { mono: ['"IBM Plex Mono"', 'monospace'] },
      colors: {
        cyan:   '#00ffff',
        navy:   '#020817',
        saffron:'#ff6600',
      },
    },
  },
  plugins: [],
}
