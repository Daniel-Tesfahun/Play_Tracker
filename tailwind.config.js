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
      // Plus Jakarta Sans has tall ascenders/descenders; Tailwind's default leading for
      // large sizes (as low as 1.0) clips them on Android (e.g. the "y" in "Ready").
      // ~1.2× keeps every glyph inside its line box.
      fontSize: {
        lg: ['18px', { lineHeight: '26px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '38px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
        '5xl': ['48px', { lineHeight: '58px' }],
        '6xl': ['60px', { lineHeight: '72px' }],
      },
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
