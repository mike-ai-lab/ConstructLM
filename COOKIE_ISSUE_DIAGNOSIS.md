# Cookie Persistence Issue - Diagnosis

## The Real Problem

The cookie prompts keep appearing because **browsers block third-party cookies by default in iframes**. This is a browser security feature, not a bug in our code.

## Why This Happens

1. **Third-Party Cookie Blocking**: When you embed a website in an iframe, the browser treats it as a "third-party context"
2. **Browser Default Settings**: Chrome, Firefox, and most browsers block third-party cookies by default
3. **Sandbox Limitations**: Even with `allow-same-origin` and `allow-storage-access-by-user-activation`, the browser may still block cookies

## What the Logs Show

- `Blocked autofocusing on a <button>` - Cross-origin security restriction
- `X-Frame-Options: sameorigin` - Website prevents iframe embedding
- Multiple `JQMIGRATE` messages - jQuery loading repeatedly (indicates page reloads)

## The Fundamental Issue

**You cannot force a browser to accept third-party cookies in iframes.** This is by design for user privacy and security.

## Possible Solutions

### 1. **User Must Enable Third-Party Cookies** (Recommended)
- Chrome: Settings → Privacy and security → Third-party cookies → Allow
- This is what users need to do for ANY iframe-based browser

### 2. **Use Electron's WebView Instead of Iframe**
- Electron's `<webview>` tag has its own session and can store cookies independently
- Requires switching from iframe to webview (Electron-only)

### 3. **Proxy All Traffic Through Your Server**
- Route all requests through your backend
- Your server fetches the page and serves it (becomes first-party)
- Complex and may violate website terms of service

### 4. **Storage Access API** (Partial Solution)
- Use `document.requestStorageAccess()` API
- Requires user interaction
- Not supported in all browsers
- Already attempted with `allow-storage-access-by-user-activation`

## Why Other Apps "Don't Have This Issue"

They either:
1. Use Electron's `<webview>` tag (not iframe)
2. Use a full browser engine (Chromium Embedded Framework)
3. Users have already enabled third-party cookies
4. They're not actually preserving cookies either

## Next Steps

**For Web Version (Chrome/Firefox):**
- Accept that this is a browser limitation
- Add a notice telling users to enable third-party cookies
- Or accept that cookie prompts will appear

**For Electron Version:**
- Switch from `<iframe>` to `<webview>` tag
- Configure session to persist cookies
- This will work properly in Electron

## Test This Theory

1. Open Chrome Settings
2. Go to Privacy and security → Third-party cookies
3. Select "Allow third-party cookies"
4. Test your app again - cookies should persist

If cookies persist after enabling third-party cookies, this confirms the diagnosis.
