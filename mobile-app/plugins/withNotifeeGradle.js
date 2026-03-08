const { withGradleProperties, withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Fix JitPack timeout issues for Notifee by:
 * 1. Increasing Gradle HTTP timeouts
 * 2. Ensuring JitPack is listed with correct URL
 */
const withNotifeeGradle = (config) => {
  // Step 1: Add longer HTTP timeouts to gradle.properties
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;

    const set = (key, value) => {
      const idx = props.findIndex(p => p.type === 'property' && p.key === key);
      if (idx === -1) {
        props.push({ type: 'property', key, value });
      } else {
        props[idx].value = value;
      }
    };

    // Increase timeouts to 5 minutes
    set('systemProp.http.socketTimeout', '300000');
    set('systemProp.https.socketTimeout', '300000');
    set('systemProp.http.connectionTimeout', '300000');
    set('systemProp.https.connectionTimeout', '300000');

    // Allow insecure protocols (JitPack sometimes needs this)
    set('systemProp.org.gradle.internal.http.connectionTimeout', '300000');
    set('systemProp.org.gradle.internal.http.socketTimeout', '300000');

    return config;
  });

  // Step 2: Ensure JitPack is in allprojects repositories
  config = withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes('jitpack.io') && contents.includes('notifee-jitpack-fix')) {
      return config;
    }

    // Add retry config for repositories  
    const allProjectsMatch = contents.match(/allprojects\s*\{[\s\S]*?repositories\s*\{/);
    if (!allProjectsMatch) return config;

    const insertAfter = allProjectsMatch.index + allProjectsMatch[0].length;
    const jitpackConfig = `
        // notifee-jitpack-fix
        maven {
            url "https://jitpack.io"
            content {
                includeGroup "app.notifee"
                includeGroup "com.github.notifee"
            }
        }`;

    // Only add if jitpack is not already there
    if (!contents.includes('jitpack.io')) {
      config.modResults.contents =
        contents.slice(0, insertAfter) +
        jitpackConfig +
        contents.slice(insertAfter);
    }

    return config;
  });

  return config;
};

module.exports = withNotifeeGradle;
