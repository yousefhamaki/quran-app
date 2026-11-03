const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Lets the main activity show over the lock screen and turn the screen on, which the full-screen alarm needs.
 * (The app switches this off again at run time, see showOverLockScreen in modules/daily-alarm, so that during normal use
 * it stays behind the lock screen.)
 */
module.exports = function withAlarmActivity(config) {
  return withAndroidManifest(config, mod => {
    const app = mod.modResults.manifest.application?.[0];
    const main = app?.activity?.find(a => a.$['android:name'] === '.MainActivity');
    if (main) {
      main.$['android:showWhenLocked'] = 'true';
      main.$['android:turnScreenOn'] = 'true';
    }
    return mod;
  });
};
