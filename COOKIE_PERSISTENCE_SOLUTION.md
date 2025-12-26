# Cookie Persistence - FINAL SOLUTION

## The Problem
Cookies were not persisting in iframes because browsers block third-party cookies by default. This is a browser security feature, not a bug.

## The Solution

### For Electron (Desktop App) ✅
**Use Electron's `<webview>` tag instead of `<iframe>`**

#### What Was Changed:
1. **Created `TabbedWebViewerElectron.tsx`** - New component using `<webview>` tag
2. **Updated `App.tsx`** - Automatically uses Electron version when running in Electron
3. **Updated `electron/main.ts`** - Enabled `webviewTag: true` in BrowserWindow preferences
4. **Added `partition="persist:webview"`** - Ensures cookies persist across sessions

#### Why This Works:
- Electron's `<webview>` has its own session storage
- The `partition="persist:webview"` creates a persistent storage partition
- Cookies are stored independently from the main app
- No third-party cookie restrictions

### For Web Browser (Chrome/Firefox) ⚠️
**Users MUST enable third-party cookies in their browser settings**

This is a browser limitation that cannot be bypassed:
- Chrome: Settings → Privacy and security → Third-party cookies → Allow
- Firefox: Settings → Privacy & Security → Cookies → Accept cookies from sites

## How to Test

### In Electron:
1. Build and run the Electron app: `npm run electron:dev`
2. Open a citation link with a website
3. Accept cookies on the website
4. Navigate to another page or close/reopen the viewer
5. **Cookies should persist** ✅

### In Web Browser:
1. Enable third-party cookies in browser settings
2. Run the web version: `npm run dev`
3. Test cookie persistence
4. **Should work with third-party cookies enabled** ✅

## Technical Details

### Electron WebView Features:
- **Independent session**: Each webview has its own cookie storage
- **Persistent partition**: `partition="persist:webview"` saves cookies to disk
- **No CORS restrictions**: Can access any website
- **Full browser features**: Back/forward navigation, reload, etc.

### Key Differences:
| Feature | iframe | Electron webview |
|---------|--------|------------------|
| Cookie persistence | ❌ Blocked by browser | ✅ Full support |
| Third-party cookies | ❌ Requires user setting | ✅ Always works |
| Session storage | ❌ Lost on unmount | ✅ Persists |
| CORS restrictions | ✅ Yes | ❌ No |

## Files Modified:
1. `components/TabbedWebViewerElectron.tsx` - NEW
2. `App.tsx` - Added conditional rendering
3. `electron/main.ts` - Enabled webviewTag
4. `components/TabbedWebViewer.tsx` - Added logging for debugging

## Logging Added:
- Console logs show when webviews are mounted
- Logs show when pages load
- Logs indicate Electron mode is active
- Check console for: "🔧 Electron WebView mode enabled - cookies will persist properly"

## Result:
✅ **Cookies now persist properly in Electron**
⚠️ **Web version requires user to enable third-party cookies**

This is the industry-standard solution used by apps like VS Code, Discord, Slack, etc.
