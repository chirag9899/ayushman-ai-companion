const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Add Gradle timeout settings for Notifee JitPack resolution
 */
const withNotifeeGradle = (config) => {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;

    const set = (key, value) => {
      const idx = props.findIndex(p => p.type === 'property' && p.key === key);
      if (idx === -1) {
        props.push({ type: 'property', key, value });
      } else {
        props[idx].value = value;
      }
    };

    // Increase timeouts for JitPack
    set('systemProp.http.socketTimeout', '300000');
    set('systemProp.https.socketTimeout', '300000');
    set('systemProp.http.connectionTimeout', '300000');
    set('systemProp.https.connectionTimeout', '300000');

    return config;
  });
};

module.exports = withNotifeeGradle;
