const { cssVariables, tailwindColors } = require('./src/theme/palette');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: tailwindColors,
    },
  },
  plugins: [
    // Dark values as the default, so classes resolve even outside ThemeRoot.
    ({ addBase }) => addBase({ ':root': cssVariables('dark') }),
  ],
};
