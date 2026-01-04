# Auto-Update System - Setup Guide

## ✅ What's Implemented

Your ConstructLM app now has a **complete auto-update system** that:
- ✅ Checks for updates automatically on startup
- ✅ Shows update notification with version info
- ✅ Downloads updates in the background
- ✅ Installs and restarts automatically
- ✅ Works seamlessly with your C: drive installation

## 🚀 How It Works

### For Users:
1. **App starts** → Checks for updates (3 seconds after launch)
2. **Update found** → Notification appears in top-right corner
3. **Click "Download"** → Update downloads with progress bar
4. **Click "Install & Restart"** → App updates and restarts automatically

### For Developers:
The system uses **electron-updater** with GitHub Releases as the update server.

## 📋 Setup Steps

### 1. Update package.json (Already Done ✅)

The `publish` configuration is already added:
```json
"publish": [
  {
    "provider": "github",
    "owner": "yourusername",
    "repo": "ConstructLM"
  }
]
```

**Action Required:** Replace `yourusername` with your actual GitHub username.

### 2. Create GitHub Repository

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit with auto-update"

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/ConstructLM.git
git push -u origin main
```

### 3. Generate GitHub Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (all)
4. Copy the token

### 4. Set Environment Variable

**Windows (PowerShell):**
```powershell
$env:GH_TOKEN="your_github_token_here"
```

**Or permanently:**
```powershell
[System.Environment]::SetEnvironmentVariable('GH_TOKEN', 'your_token', 'User')
```

### 5. Build and Publish

```bash
# Build the app with auto-update
npm run electron:build

# This creates:
# - release/ConstructLM Setup 1.0.0.exe (installer)
# - release/latest.yml (update manifest)
```

### 6. Create GitHub Release

**Option A: Automatic (with GH_TOKEN set)**
```bash
# electron-builder will auto-publish to GitHub
npm run electron:build
```

**Option B: Manual**
1. Go to: https://github.com/yourusername/ConstructLM/releases/new
2. Tag: `v1.0.0`
3. Title: `ConstructLM v1.0.0`
4. Upload files:
   - `ConstructLM Setup 1.0.0.exe`
   - `ConstructLM Setup 1.0.0.exe.blockmap`
   - `latest.yml`
5. Click "Publish release"

## 🔄 Releasing Updates

### When you have a new version:

1. **Update version in package.json:**
```json
{
  "version": "1.1.0"
}
```

2. **Build:**
```bash
npm run electron:build
```

3. **Create new GitHub release:**
   - Tag: `v1.1.0`
   - Upload new files from `release/` folder

4. **Users get notified automatically!**

## 📝 Update Manifest (latest.yml)

This file tells the app about available updates:
```yaml
version: 1.0.0
files:
  - url: ConstructLM Setup 1.0.0.exe
    sha512: [hash]
    size: [bytes]
path: ConstructLM Setup 1.0.0.exe
sha512: [hash]
releaseDate: '2025-01-03T12:00:00.000Z'
```

## 🎯 Testing Updates

### Test with local server:

1. **Install `http-server`:**
```bash
npm install -g http-server
```

2. **Serve release folder:**
```bash
cd release
http-server -p 8080 --cors
```

3. **Update electron/main.ts temporarily:**
```typescript
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'http://localhost:8080'
});
```

4. **Test the update flow**

## 🔒 Code Signing (Optional but Recommended)

For production, sign your app to avoid Windows SmartScreen warnings:

1. **Get a code signing certificate** (from DigiCert, Sectigo, etc.)

2. **Update package.json:**
```json
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "your_password",
  "signingHashAlgorithms": ["sha256"]
}
```

## 🐛 Troubleshooting

### Update not detected:
- Check GitHub release is published (not draft)
- Verify `latest.yml` is uploaded
- Check console for errors: `autoUpdater.logger = console`

### Download fails:
- Ensure files are publicly accessible
- Check internet connection
- Verify file URLs in `latest.yml`

### Install fails:
- Run as administrator
- Check antivirus isn't blocking
- Ensure app isn't running from temp folder

## 📊 Update Flow Diagram

```
App Starts
    ↓
Check for Updates (3s delay)
    ↓
Update Available? ──No──> Continue normally
    ↓ Yes
Show Notification
    ↓
User clicks "Download"
    ↓
Download with Progress
    ↓
Download Complete
    ↓
Show "Install & Restart"
    ↓
User clicks Install
    ↓
App Quits & Installs
    ↓
New Version Starts
```

## 🎉 Benefits

- ✅ **Seamless updates** - Users always have latest version
- ✅ **No manual downloads** - Everything automatic
- ✅ **Progress tracking** - Users see download progress
- ✅ **Rollback safe** - Old version kept until install succeeds
- ✅ **Background downloads** - Users can keep working

## 📱 User Experience

**Before:**
1. Check website for new version
2. Download installer manually
3. Run installer
4. Uninstall old version
5. Install new version

**After:**
1. Click "Download Update"
2. Click "Install & Restart"
3. Done! ✨

## 🔐 Security Notes

- Updates are verified with SHA512 checksums
- HTTPS required for update server
- Code signing prevents tampering warnings
- Users can choose when to install

## 📚 Additional Resources

- [electron-updater docs](https://www.electron.build/auto-update)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Code Signing Guide](https://www.electron.build/code-signing)

---

**Your app now has enterprise-grade auto-update! 🚀**
