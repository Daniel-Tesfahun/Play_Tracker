const fonts = require('./src/theme/fonts');
const { cssVariables, tailwindColors } = require('./src/theme/palette');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  // Weights are separate font families (see fonts.js), so the stock
  // font-weight utilities are replaced by the plugin below.
  corePlugins: { fontWeight: false },
  theme: {
    extend: {
      colors: tailwindColors,
    },
  },
  plugins: [
    // Dark values as the default, so classes resolve even outside ThemeRoot.
    ({ addBase }) => addBase({ ':root': cssVariables('dark') }),
    ({ addUtilities }) =>
      addUtilities({
        '.font-normal': { fontFamily: fonts.regular },
        '.font-medium': { fontFamily: fonts.medium },
        '.font-semibold': { fontFamily: fonts.semibold },
        '.font-bold': { fontFamily: fonts.bold },
        '.font-extrabold': { fontFamily: fonts.extrabold },
      }),
  ],
};
