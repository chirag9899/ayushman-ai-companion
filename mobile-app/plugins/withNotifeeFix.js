const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Fix Notifee JitPack dependency resolution issues
 * Adds proper repository ordering and retry logic
 */
const withNotifeeFix = (config) => {
  return withProjectBuildGradle(config, (config) => {
    // Add repository configuration after buildscript block
    const buildGradle = config.modResults.contents;
    
    // Check if we already have the fix
    if (buildGradle.includes('notifee-maven-fix')) {
      return config;
    }
    
    // Add before allprojects block
    const allProjectsIndex = buildGradle.indexOf('allprojects');
    if (allProjectsIndex === -1) {
      return config;
    }
    
    const fix = `
// notifee-maven-fix: Ensure proper repository ordering for Notifee
subprojects {
    afterEvaluate { project ->
        if (project.hasProperty("android")) {
            project.android {
                // Force specific notifee core version
                configurations.all {
                    resolutionStrategy {
                        force 'app.notifee:core:202108261754'
                    }
                }
            }
        }
    }
}

`;
    
    config.modResults.contents = 
      buildGradle.slice(0, allProjectsIndex) + 
      fix + 
      buildGradle.slice(allProjectsIndex);
    
    return config;
  });
};

module.exports = withNotifeeFix;
