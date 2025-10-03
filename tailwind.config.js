/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        marketing: '#1e3a8a',
        sales: '#0f766e',
        service: '#854d0e',
      },
      fontFamily: {
        display: ['"Inter"', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
