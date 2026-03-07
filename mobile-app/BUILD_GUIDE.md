# Production Build Guide - Ayushman AI Companion

## Overview
This guide explains how to build a production APK (not dev build) and update app metadata/icons for submission.

## Current Status
✅ EAS project configured (`eas.json` has production profile)
✅ App icons exist in `assets/`
✅ Updated mascot images available in `assets/updated/`
✅ Backend API deployed and working

---

## Step 1: Build Production APK

### Option A: Build on EAS Cloud (Recommended)

```bash
cd /Users/sam/Desktop/ai-bharat/ayushman-ai-companion/mobile-app

# Build production APK
npx eas build --platform android --profile production

# Or build for both platforms
npx eas build --platform all --profile production
```

**What happens:**
- EAS builds a signed APK/AAB in the cloud
- You'll get a download link via email
- Build takes ~15-30 minutes
- APK will be signed with your keystore (created automatically on first build)

### Option B: Build Locally (Requires Android SDK)

```bash
# Generate native Android project
npx expo prebuild --platform android

# Build release APK locally
cd android
./gradlew assembleRelease

# APK will be at: android/app/build/outputs/apk/release/app-release.apk
```

---

## Step 2: Update App Icons (Optional but Recommended)

Your current icons are generic. Let's use your mascot for better branding:

### Required Icon Sizes:

| File | Size | Purpose |
|------|------|---------|
| `icon.png` | 1024x1024 | Main app icon (iOS & Android) |
| `splash-icon.png` | 1024x1024 | Splash screen |
| `android-icon-foreground.png` | 1024x1024 | Android adaptive foreground |
| `android-icon-background.png` | 1024x1024 | Android adaptive background |
| `favicon.png` | 48x48 | Web/PWA favicon |

### Quick Icon Generation:

Use your mascot image to generate all icons:

```bash
# Install expo asset tools
npm install -g sharp

# Or use online generator:
# https://www.appicon.co/ - Upload your mascot, download all sizes
```

**Recommended mascot for icon:**
- Use `assets/updated/Gemini_Generated_Image_qiy1njqiy1njqiy1.png` (friendly expression)
- Or `assets/Gemini_Generated_Image_78t78978t78978t7-cutout.png` (main mascot)

---

## Step 3: Update App Metadata in app.json

### Current Metadata (Review & Update):

```json
{
  "expo": {
    "name": "Ayushman AI Companion",
    "slug": "ayushman-ai-companion-mobile",
    "version": "1.0.0",
    "description": "AI-powered healthcare companion for medication reminders and health tracking",
    "githubUrl": "https://github.com/chirag9899/ayushman-ai-companion",
    "privacyPolicyUrl": "https://your-privacy-policy-url.com"
  }
}
```

### Suggested Updates:

1. **Add description** for app stores
2. **Update version** if making changes
3. **Add primaryColor** for consistent branding

---

## Step 4: Build & Download APK

### Full Build Process:

```bash
# 1. Navigate to mobile-app directory
cd /Users/sam/Desktop/ai-bharat/ayushman-ai-companion/mobile-app

# 2. Verify EAS login
npx eas whoami

# 3. Build production APK
npx eas build --platform android --profile production --non-interactive

# 4. Wait for email with download link
# Or check status:
npx eas build:list
```

### After Build Completes:

1. **Download APK** from the EAS dashboard or email link
2. **Test on real device** - Install and verify all features
3. **Upload to Google Drive** for landing page download link
4. **Share download link** - Update landing page with actual URL

---

## Step 5: Update Landing Page Download Link

Once you have the APK URL from Google Drive:

```bash
# Update landing/index.html
# Find: https://drive.google.com/your-apk
# Replace with: https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing
```

**Google Drive Sharing Steps:**
1. Upload APK to Google Drive
2. Right-click → Share → Change to "Anyone with link"
3. Copy link
4. Update `landing/index.html` line 1076

---

## Icon Generation Script (Optional)

If you want to automate icon creation from your mascot:

```javascript
// scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');

const INPUT_IMAGE = 'assets/updated/Gemini_Generated_Image_qiy1njqiy1njqiy1.png';
const OUTPUT_DIR = 'assets';

const sizes = [
  { name: 'icon.png', size: 1024 },
  { name: 'splash-icon.png', size: 1024 },
  { name: 'android-icon-foreground.png', size: 1024 },
  { name: 'favicon.png', size: 48 },
];

async function generateIcons() {
  for (const { name, size } of sizes) {
    await sharp(INPUT_IMAGE)
      .resize(size, size, { fit: 'contain', background: { r: 230, g: 244, b: 254 } })
      .png()
      .toFile(`${OUTPUT_DIR}/${name}`);
    console.log(`Generated ${name}`);
  }
}

generateIcons();
```

Run with: `node scripts/generate-icons.js`

---

## Common Issues & Fixes

### Issue: "You don't have permissions"
**Fix:** Run `npx eas login` and authenticate with your Expo account

### Issue: "Keystore not found"
**Fix:** EAS auto-generates on first build, or run:
```bash
npx eas credentials -p android
```

### Issue: APK too large (>100MB)
**Fix:** Check assets folder for large images/videos. Compress or remove unused.

### Issue: Build fails with native errors
**Fix:** 
```bash
# Clean and rebuild
rm -rf node_modules android ios
npm install
npx expo prebuild --clean
npx eas build --platform android --profile production
```

---

## Quick Checklist

Before building production APK:

- [ ] Backend API is deployed and working
- [ ] `EXPO_PUBLIC_API_BASE_URL` points to production backend
- [ ] App icons are branded with mascot
- [ ] Version number is correct in `app.json`
- [ ] No debug/staging code in production build
- [ ] All features tested in development build
- [ ] Google Drive folder ready for APK upload

---

## Next Steps After Build

1. ✅ Download production APK
2. ✅ Install on Android device and test
3. ✅ Upload to Google Drive
4. ✅ Update landing page download link
5. ✅ Submit hackathon deliverables (APK link, video, deck)

---

**Need Help?**
- Check EAS build logs: `npx eas build:logs`
- View build status: `npx eas build:list`
- Documentation: https://docs.expo.dev/build/setup/
