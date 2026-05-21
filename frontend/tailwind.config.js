/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:    '#0f172a',
          slate:   '#1f2937',
          green:   '#16a34a',
          'green-dark': '#15803d',
          amber:   '#f59e0b',
          'amber-light': '#fde68a',
          bg:      '#f9fafb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
        cardHover: '0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.06)',
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(90deg, #0f172a 0%, #15803d 50%, #16a34a 100%)',
        'hero-grid':
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};
