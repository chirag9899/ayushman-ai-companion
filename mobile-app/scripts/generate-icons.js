#!/usr/bin/env node

/**
 * App Icon Generator Script
 * 
 * This script generates app icons from your mascot image.
 * 
 * Usage:
 *   1. Install dependencies: npm install sharp
 *   2. Run: node scripts/generate-icons.js
 * 
 * Or use online tool: https://www.appicon.co/
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_IMAGE = path.join(__dirname, '../assets/updated/Gemini_Generated_Image_qiy1njqiy1njqiy1.png');
const OUTPUT_DIR = path.join(__dirname, '../assets');

// Icon specifications
const ICONS = [
  {
    name: 'icon.png',
    size: 1024,
    background: { r: 230, g: 244, b: 254 }, // Light blue from your theme
    padding: 0.1 // 10% padding
  },
  {
    name: 'splash-icon.png',
    size: 1024,
    background: { r: 238, g: 246, b: 242 }, // #eef6f2 splash bg
    padding: 0.15
  },
  {
    name: 'android-icon-foreground.png',
    size: 1024,
    transparent: true,
    padding: 0.05
  },
  {
    name: 'favicon.png',
    size: 48,
    background: { r: 230, g: 244, b: 254 },
    padding: 0.05
  }
];

async function generateIcon(config) {
  const outputPath = path.join(OUTPUT_DIR, config.name);
  
  console.log(`Generating ${config.name} (${config.size}x${config.size})...`);
  
  let pipeline = sharp(INPUT_IMAGE);
  
  // Calculate resize dimensions with padding
  const padding = Math.floor(config.size * config.padding);
  const resizeSize = config.size - (padding * 2);
  
  // Resize maintaining aspect ratio
  pipeline = pipeline.resize(resizeSize, resizeSize, {
    fit: 'contain',
    background: config.transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : config.background
  });
  
  // Add padding/background
  if (!config.transparent) {
    pipeline = pipeline.extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: config.background
    });
  }
  
  // Ensure final size
  pipeline = pipeline.resize(config.size, config.size, {
    fit: 'cover',
    position: 'center'
  });
  
  // Save as PNG
  await pipeline.png().toFile(outputPath);
  
  console.log(`✅ Created: ${outputPath}`);
}

async function generateAndroidBackground() {
  // Create simple gradient background for Android adaptive icon
  const size = 1024;
  const outputPath = path.join(OUTPUT_DIR, 'android-icon-background.png');
  
  console.log(`Generating android-icon-background.png...`);
  
  // Create a gradient-like background using solid color
  const background = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#E6F4FE;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#eef6f2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
    </svg>`
  );
  
  await sharp(background)
    .resize(size, size)
    .png()
    .toFile(outputPath);
  
  console.log(`✅ Created: ${outputPath}`);
}

async function main() {
  console.log('🎨 Ayushman AI Companion - Icon Generator\n');
  
  // Check if input image exists
  if (!fs.existsSync(INPUT_IMAGE)) {
    console.error(`❌ Input image not found: ${INPUT_IMAGE}`);
    console.log('\nMake sure your mascot image is at:');
    console.log('  assets/updated/Gemini_Generated_Image_qiy1njqiy1njqiy1.png');
    process.exit(1);
  }
  
  // Check if sharp is installed
  try {
    require('sharp');
  } catch (err) {
    console.error('❌ sharp is not installed.');
    console.log('\nInstall it first:');
    console.log('  npm install sharp');
    console.log('\nOr use the online tool:');
    console.log('  https://www.appicon.co/');
    process.exit(1);
  }
  
  // Generate icons
  try {
    for (const icon of ICONS) {
      await generateIcon(icon);
    }
    
    // Generate Android background
    await generateAndroidBackground();
    
    console.log('\n✨ All icons generated successfully!');
    console.log('\nNext steps:');
    console.log('  1. Review the generated icons in assets/');
    console.log('  2. Build production APK: npx eas build --platform android --profile production');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateIcon, generateAndroidBackground };
