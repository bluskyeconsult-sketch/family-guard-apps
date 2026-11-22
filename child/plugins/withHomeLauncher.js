// Config plugin: make the child app's MainActivity a HOME launcher, so the
// phone returns to the Family Guard home screen. Combined with device-owner
// setAsHomeLauncher(), this keeps the child on the approved-apps launcher.
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withHomeLauncher(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app || !app.activity) return cfg;
    const main = app.activity.find((a) =>
      (a.$['android:name'] || '').includes('.MainActivity'),
    );
    if (!main) return cfg;
    main['intent-filter'] = main['intent-filter'] || [];
    const hasHome = main['intent-filter'].some((f) =>
      (f.category || []).some((c) => c.$['android:name'] === 'android.intent.category.HOME'),
    );
    if (!hasHome) {
      main['intent-filter'].push({
        action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.HOME' } },
          { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        ],
      });
    }
    return cfg;
  });
};
