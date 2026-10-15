// react-native-android-widget pulls in androidx.work:work-runtime-ktx:2.7.1, but WorkManager 2.8+ already contains
// those classes, so the build fails with "Duplicate class androidx.work.OneTimeWorkRequestKt".
// Excluding the old -ktx artifact fixes it; this plugin re-applies the fix every time `expo prebuild` regenerates android/.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// quran: drop duplicate work-runtime-ktx';

module.exports = function withWorkRuntimeFix(config) {
  return withAppBuildGradle(config, cfg => {
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += `\n${MARKER}\nconfigurations.all {\n    exclude group: 'androidx.work', module: 'work-runtime-ktx'\n}\n`;
    }
    return cfg;
  });
};
