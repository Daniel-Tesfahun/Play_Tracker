/**
 * One project, two installable apps that live side by side on a phone:
 *
 *   APP_VARIANT=development (default) → "PlayTracker Dev", com.flotitan.playtracker.dev,
 *                                        slate/amber icon; connects to your PC for live changes.
 *   APP_VARIANT=production             → "PlayTracker", com.flotitan.playtracker,
 *                                        violet/cyan icon; standalone, full speed.
 *
 * eas.json sets APP_VARIANT per build profile. Everything else comes from app.json.
 */
const IS_DEV = (process.env.APP_VARIANT ?? 'development') === 'development';

module.exports = ({ config }) => {
  if (!IS_DEV) return config;

  return {
    ...config,
    name: 'PlayTracker Dev',
    scheme: 'playtracker-dev',
    icon: './assets/icon-dev.png',
    ios: {
      ...config.ios,
      bundleIdentifier: `${config.ios.bundleIdentifier}.dev`,
    },
    android: {
      ...config.android,
      package: `${config.android.package}.dev`,
      adaptiveIcon: {
        ...config.android.adaptiveIcon,
        foregroundImage: './assets/android-icon-foreground-dev.png',
        backgroundImage: './assets/android-icon-background-dev.png',
      },
    },
  };
};
