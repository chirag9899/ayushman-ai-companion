const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Aggressive JitPack bypass for Notifee
 * Forces Maven Central and disables JitPack for Notifee dependencies
 */
const withNotifeeJitpackBypass = (config) => {
  // Step 1: Modify root build.gradle to prioritize Maven Central
  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // If already patched, skip
    if (contents.includes('notifee-jitpack-bypass')) {
      return config;
    }

    // Replace allprojects repositories to put Maven Central FIRST
    // and add a filter to exclude Notifee from JitPack
    const allprojectsMatch = contents.match(/allprojects\s*\{[\s\S]*?repositories\s*\{[\s\S]*?\n\s*\}/);
    
    if (allprojectsMatch) {
      const newRepositories = `allprojects {
    repositories {
        // notifee-jitpack-bypass: Maven Central first to avoid JitPack
        mavenCentral()
        google()
        // Only use JitPack for non-Notifee packages
        maven {
            url "https://jitpack.io"
            content {
                excludeGroup "app.notifee"
                excludeGroup "com.github.notifee"
            }
        }
    }`;
      
      contents = contents.replace(/allprojects\s*\{[\s\S]*?repositories\s*\{[\s\S]*?\n\s*\}/, newRepositories);
    }

    config.modResults.contents = contents;
    return config;
  });

  // Step 2: Modify app build.gradle to exclude Notifee transitive dependency
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes('notifee-exclude-transitive')) {
      return config;
    }

    // Find dependencies block and add Notifee exclusion
    const depsMatch = contents.match(/dependencies\s*\{/);
    if (depsMatch) {
      const insertPos = depsMatch.index + depsMatch[0].length;
      const exclusionBlock = `
    // notifee-exclude-transitive: Exclude dynamic version resolution
    configurations.all {
        exclude group: 'app.notifee', module: 'core'
        resolutionStrategy {
            // Force specific versions from Maven Central
            force 'com.google.code.gson:gson:2.10.1'
            force 'com.google.guava:guava:31.1-android'
        }
    }`;
      
      contents = contents.slice(0, insertPos) + exclusionBlock + contents.slice(insertPos);
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
};

module.exports = withNotifeeJitpackBypass;
