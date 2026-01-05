# Cache Busting Solution

## Problem Solved
- Browser caching old JavaScript/CSS files after builds
- Unable to verify which version is running
- Changes not appearing after deployment

## Solutions Implemented

### 1. **Build-Time Cache Busting**
- All assets get unique timestamps in filenames
- Format: `assets/[name]-[hash]-[timestamp].js`
- Forces browser to download new files every build

### 2. **HTTP Cache Headers**
Added to `index.html`:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

### 3. **Version Tracking**
- `version.json` auto-generated on each build
- Contains: version, buildId (timestamp), buildDate
- Displayed in console and UI footer

### 4. **Helper Scripts**

#### `fresh-build.bat` - Quick Clean Build
```bash
fresh-build.bat
```
- Removes old dist folders
- Updates version
- Builds fresh

#### `clear-cache.bat` - Nuclear Option
```bash
clear-cache.bat
```
- Clears npm cache
- Removes node_modules
- Removes all build artifacts
- Reinstalls dependencies
- Use when nothing else works

## How to Verify Version

### In Browser Console:
Look for: `🚀 ConstructLM v1.0.0 | Build: 1234567890 | 12/25/2024, 10:30:00 AM`

### In UI:
Bottom of chat: `v1.0.0-567890` (last 6 digits of build ID)

### Each Build Gets Unique ID:
- Build ID = Unix timestamp
- Changes every build
- Easy to verify you're running latest

## Usage

### Normal Build:
```bash
npm run build
```
Version auto-updates via `prebuild` hook

### Electron Build:
```bash
npm run electron:build
```
Version auto-updates via `preelectron:build` hook

### Force Fresh Build:
```bash
fresh-build.bat
```

### Nuclear Cache Clear:
```bash
clear-cache.bat
```

## Browser Cache Clearing

If still seeing old version:
1. **Hard Refresh**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Clear Site Data**: DevTools → Application → Clear Storage
3. **Incognito Mode**: Test in private window

## Verification Checklist

✅ Check console for build ID on page load
✅ Check UI footer for version number
✅ Build ID should match your latest build time
✅ Different build = different ID

## Technical Details

- **Vite Config**: Timestamp added to all output filenames
- **Package.json**: Prebuild hooks run version script
- **App.tsx**: Imports and displays version info
- **version.json**: Generated before each build
