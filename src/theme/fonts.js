/**
 * Font family names as registered by useFonts() in the root layout.
 * Android can't synthesize weights for custom fonts, so each weight is its
 * own family; tailwind.config.js maps font-medium / font-bold / ... to these.
 */
module.exports = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};
