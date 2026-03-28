/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(15, 23, 42, 0.07), 0 10px 20px -5px rgba(15, 23, 42, 0.04)',
        'soft-lg': '0 10px 40px -10px rgba(15, 23, 42, 0.12), 0 2px 10px -4px rgba(15, 23, 42, 0.06)',
        glow: '0 0 0 1px rgba(99, 102, 241, 0.15), 0 20px 50px -15px rgba(99, 102, 241, 0.25)',
      },
      backgroundImage: {
        'grid-slate':
          'linear-gradient(to right, rgb(148 163 184 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.08) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
