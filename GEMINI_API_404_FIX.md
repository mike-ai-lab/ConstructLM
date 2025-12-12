# Gemini API 404 Error - Complete Fix Guide

## Your Error

```
generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDJGXeReGG2IMrb8wNG2Ym_2AaNbaGkSgI:1 
Failed to load resource: the server responded with a status of 404 ()
```

## Root Causes (In Order of Likelihood)

1. ❌ **Gemini API not enabled** in Google Cloud Console
2. ❌ **API key restrictions** (IP, referrer, API restrictions)
3. ❌ **Wrong API endpoint** (using old/deprecated version)
4. ❌ **Project quota exceeded** or billing not set up
5. ❌ **API key compromised** (exposed in public repo)

---

## Solution 1: Enable Gemini API (MOST LIKELY)

### Step 1: Go to Google Cloud Console

1. Open: https://console.cloud.google.com/
2. Sign in with your Google account
3. Select your project (or create one)

### Step 2: Enable the API

1. Click **APIs & Services** (left sidebar)
2. Click **Library**
3. Search for: `Generative Language API`
4. Click on it
5. Click **ENABLE**

Wait 30 seconds for it to activate.

### Step 3: Verify It's Enabled

1. Go to **APIs & Services** → **Enabled APIs & services**
2. Look for **Generative Language API**
3. Should show: ✅ **Enabled**

### Step 4: Test Again

Go back to ConstructLM and test the API key in Settings.

---

## Solution 2: Check API Key Restrictions

### Step 1: View API Key Details

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your API key in the list
3. Click on it to edit

### Step 2: Check Restrictions

Look for these sections:

**Application restrictions:**
- Should be: **None** or **HTTP referrers**
- If set to specific IPs, add: `localhost`, `127.0.0.1`

**API restrictions:**
- Should be: **Unrestricted** or **Generative Language API**
- If restricted to other APIs, add **Generative Language API**

### Step 3: Update Restrictions

If restricted:
1. Click **Edit**
2. Set **Application restrictions** to: **None** (for testing)
3. Set **API restrictions** to: **Unrestricted** (for testing)
4. Click **Save**

Wait 1-2 minutes for changes to take effect.

### Step 4: Test Again

---

## Solution 3: Verify API Endpoint

The endpoint ConstructLM uses is:

```
https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
```

This is **correct** for the current Gemini API.

**If you're getting 404, it means:**
- The API is not enabled in your project
- OR the API key is restricted
- OR the project doesn't have billing enabled

---

## Solution 4: Enable Billing

### Step 1: Check Billing Status

1. Go to: https://console.cloud.google.com/billing
2. Look for your project
3. Check if billing is **Enabled**

### Step 2: Enable Billing (If Needed)

1. Click **Link Billing Account**
2. Select or create a billing account
3. Click **Link**

**Note:** Google gives $300 free credit for new accounts. Gemini API is very cheap (~$0.075 per 1M input tokens).

---

## Solution 5: Create a New API Key

If the current key is compromised or not working:

### Step 1: Create New Key

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **+ Create Credentials**
3. Select **API Key**
4. Copy the new key

### Step 2: Update ConstructLM

1. Open ConstructLM Settings
2. Paste the new API key
3. Click **Test Connection**

### Step 3: Delete Old Key (Optional)

1. Go back to credentials page
2. Find the old key
3. Click the trash icon to delete it

---

## Step-by-Step Verification

### Check 1: API Enabled

```
https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
```

Should show: **ENABLED** (blue button)

### Check 2: API Key Exists

```
https://console.cloud.google.com/apis/credentials
```

Should show your API key in the list

### Check 3: Billing Enabled

```
https://console.cloud.google.com/billing
```

Should show billing account linked to project

### Check 4: No Restrictions

Edit your API key and verify:
- Application restrictions: **None** or **HTTP referrers**
- API restrictions: **Unrestricted** or includes **Generative Language API**

---

## Testing the API Key

### Method 1: In ConstructLM

1. Open ConstructLM
2. Click **Settings** (gear icon)
3. Paste API key in **Google Gemini** field
4. Click **Test Connection** (play button)
5. Should show: ✅ **Valid Key**

### Method 2: Using curl (Command Line)

```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Hello"}]
    }]
  }'
```

Replace `YOUR_API_KEY` with your actual key.

Expected response: JSON with generated text (not 404 error)

### Method 3: Using Browser

Open this URL in your browser (replace YOUR_API_KEY):

```
https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY
```

**If you get 404:** API is not enabled or key is restricted  
**If you get 400:** API is enabled but request format is wrong (this is OK, means API is accessible)

---

## Common Issues & Fixes

### Issue 1: "404 Not Found"

**Cause:** API not enabled or key restricted

**Fix:**
1. Enable Generative Language API
2. Remove API key restrictions
3. Wait 1-2 minutes
4. Test again

### Issue 2: "401 Unauthorized"

**Cause:** Invalid API key

**Fix:**
1. Verify API key is correct
2. Create a new API key
3. Check key hasn't been deleted

### Issue 3: "403 Forbidden"

**Cause:** Billing not enabled or quota exceeded

**Fix:**
1. Enable billing on project
2. Check quota limits
3. Create new project if needed

### Issue 4: "429 Too Many Requests"

**Cause:** Rate limit exceeded

**Fix:**
1. Wait a few minutes
2. Check quota limits
3. Upgrade billing plan if needed

---

## Checklist

- [ ] Gemini API is **ENABLED** in Google Cloud Console
- [ ] API key has **NO restrictions** (or only HTTP referrers)
- [ ] Billing is **ENABLED** on the project
- [ ] API key is **CORRECT** (copy-pasted exactly)
- [ ] Waited **1-2 minutes** after enabling API
- [ ] Tried **Test Connection** in ConstructLM Settings

---

## Quick Fix Summary

1. **Go to:** https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
2. **Click:** ENABLE
3. **Wait:** 1-2 minutes
4. **Go to:** https://console.cloud.google.com/apis/credentials
5. **Edit** your API key
6. **Set** restrictions to: **None** (for testing)
7. **Save**
8. **Test** in ConstructLM Settings

---

## If Still Not Working

### Debug Steps

1. **Check project ID:**
   ```
   https://console.cloud.google.com/home/dashboard
   ```
   Note your Project ID

2. **Verify API is enabled:**
   ```
   https://console.cloud.google.com/apis/enabled
   ```
   Look for "Generative Language API"

3. **Check API key details:**
   ```
   https://console.cloud.google.com/apis/credentials
   ```
   Click your key and verify all settings

4. **Test with curl:**
   ```bash
   curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"test"}]}]}'
   ```

5. **Check browser console:**
   - Open ConstructLM
   - Press F12 (Developer Tools)
   - Go to **Console** tab
   - Look for error messages
   - Copy full error and search online

---

## Getting Help

If you're still stuck:

1. **Check Google Cloud documentation:**
   https://ai.google.dev/tutorials/setup

2. **Check API status:**
   https://status.cloud.google.com/

3. **Review API limits:**
   https://console.cloud.google.com/apis/quotas

4. **Create new project:**
   Sometimes starting fresh helps

---

## Summary

**Your Error:** 404 Not Found  
**Most Likely Cause:** Gemini API not enabled  
**Quick Fix:** Enable API in Google Cloud Console  
**Time to Fix:** 2-3 minutes  

The API key itself looks valid. The issue is that the Generative Language API is not enabled in your Google Cloud project.

**Next Step:** Go to https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com and click ENABLE
