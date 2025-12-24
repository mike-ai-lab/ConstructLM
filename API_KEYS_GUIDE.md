# 🔑 API Keys Setup Guide

Complete step-by-step instructions for obtaining API keys for all supported providers in ConstructLM.

---

## 📋 Quick Overview

| Provider | Free Tier | Daily Limits | Best For |
|----------|-----------|--------------|----------|
| **Google Gemini** | ✅ Yes | 1,500 requests/day | Documents, images, large files |
| **Groq** | ✅ Yes | 14,400 requests/day | Fast responses, coding |
| **OpenAI** | ❌ Paid | Pay-per-use | GPT-4o quality |
| **AWS Bedrock** | ⚠️ Credits | $100 free credits | Claude 3.5 Sonnet |

---

## 1️⃣ Google Gemini API Key (FREE)

### What You Get:
- ✅ **Completely FREE** forever
- ✅ 1,500 requests per day
- ✅ 1 million tokens per minute
- ✅ Supports images, PDFs, documents
- ✅ Up to 1M context window

### Step-by-Step:

1. **Go to Google AI Studio**
   - Visit: https://aistudio.google.com/app/apikey
   - Or search "Google AI Studio API Key"

2. **Sign in with Google Account**
   - Use any Gmail account
   - No credit card required

3. **Create API Key**
   - Click **"Get API Key"** or **"Create API Key"**
   - Select **"Create API key in new project"** (recommended)
   - Or choose an existing Google Cloud project

4. **Copy Your API Key**
   - Format: `AIzaSy...` (starts with AIzaSy)
   - Click the copy icon
   - **IMPORTANT:** Keep this key private!

5. **Add to ConstructLM**
   - Open Settings (⚙️ gear icon)
   - Paste into **"Google Gemini"** field
   - Click **Test** button (▶️) to verify
   - Click **"Save & Apply"**

### Troubleshooting:
- ❌ **"API key not valid"**: Make sure you copied the entire key
- ❌ **"Quota exceeded"**: Wait 24 hours or create a new Google account
- ❌ **"API not enabled"**: Visit https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com and enable it

---

## 2️⃣ Groq API Key (FREE)

### What You Get:
- ✅ **Completely FREE** forever
- ✅ 14,400 requests per day
- ✅ 30 requests per minute
- ✅ Ultra-fast inference (fastest in the market)
- ✅ Llama 3.3, Llama 4, Qwen, Kimi, Compound models

### Step-by-Step:

1. **Go to Groq Console**
   - Visit: https://console.groq.com/keys
   - Or go to https://groq.com → Click "Start Building"

2. **Create Account**
   - Click **"Sign Up"** or **"Get Started"**
   - Sign up with:
     - Google account (fastest)
     - GitHub account
     - Email + password
   - **No credit card required**

3. **Verify Email** (if using email signup)
   - Check your inbox
   - Click verification link

4. **Create API Key**
   - Once logged in, you'll see the API Keys page
   - Click **"Create API Key"**
   - Give it a name (e.g., "ConstructLM")
   - Click **"Submit"**

5. **Copy Your API Key**
   - Format: `gsk_...` (starts with gsk_)
   - **IMPORTANT:** Copy it immediately - you won't see it again!
   - Store it safely

6. **Add to ConstructLM**
   - Open Settings (⚙️ gear icon)
   - Paste into **"Groq"** field
   - Click **Test** button (▶️) to verify
   - Click **"Save & Apply"**

### Available Models:
- ✅ Llama 3.3 70B Versatile (very smart)
- ✅ Llama 3.1 8B Instant (extremely fast)
- ✅ Llama 4 Scout & Maverick (latest)
- ✅ Qwen 3 32B (Alibaba's powerful model)
- ✅ GPT OSS 120B, 20B, Safeguard (OpenAI open source)
- ✅ Llama Guard & Prompt Guard (safety models)

### Troubleshooting:
- ❌ **"Invalid API key format"**: Must start with `gsk_`
- ❌ **"Rate limit exceeded"**: Wait 1 minute (30 requests/min limit)
- ❌ **"Daily quota exceeded"**: Wait 24 hours (14,400 requests/day)

---

## 3️⃣ OpenAI API Key (PAID)

### What You Get:
- ❌ **Paid service** - requires credit card
- 💰 Pay-per-use pricing
- ✅ GPT-4o, GPT-4o Mini
- ✅ Industry-leading quality
- ⚠️ $5 minimum credit purchase

### Step-by-Step:

1. **Go to OpenAI Platform**
   - Visit: https://platform.openai.com/api-keys
   - Or go to https://platform.openai.com → Click "API"

2. **Create Account**
   - Click **"Sign Up"**
   - Use email or Google/Microsoft account
   - Verify your email

3. **Add Payment Method**
   - Go to: https://platform.openai.com/account/billing/overview
   - Click **"Add payment method"**
   - Enter credit card details
   - Add at least $5 credit

4. **Create API Key**
   - Go to: https://platform.openai.com/api-keys
   - Click **"Create new secret key"**
   - Give it a name (e.g., "ConstructLM")
   - Set permissions (recommended: "All")
   - Click **"Create secret key"**

5. **Copy Your API Key**
   - Format: `sk-...` (starts with sk-)
   - **IMPORTANT:** Copy immediately - you won't see it again!
   - Store it safely

6. **Add to ConstructLM**
   - Open Settings (⚙️ gear icon)
   - Paste into **"OpenAI"** field
   - Click **Test** button (▶️) to verify
   - Click **"Save & Apply"**

### Pricing (as of 2024):
- GPT-4o: ~$2.50 per 1M input tokens, ~$10 per 1M output tokens
- GPT-4o Mini: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens

### Troubleshooting:
- ❌ **"Invalid API key"**: Must start with `sk-`
- ❌ **"Insufficient quota"**: Add more credits to your account
- ❌ **"Rate limit exceeded"**: Upgrade to higher tier or wait

---

## 4️⃣ AWS Bedrock (FREE CREDITS)

### What You Get:
- ⚠️ **$100 free credits** for new AWS accounts
- ✅ Claude 3.5 Sonnet (best for coding)
- ✅ Claude 3 Haiku (fast & cheap)
- ✅ Llama 3 70B, Mistral Large
- 💰 Pay-per-use after credits expire

### Step-by-Step:

1. **Create AWS Account**
   - Visit: https://aws.amazon.com
   - Click **"Create an AWS Account"**
   - Enter email, password, account name
   - **Credit card required** (for verification, won't be charged)

2. **Verify Identity**
   - Enter phone number
   - Receive verification code
   - Enter credit card details (for verification only)

3. **Choose Support Plan**
   - Select **"Basic Support - Free"**
   - Complete signup

4. **Enable Bedrock Access**
   - Go to: https://console.aws.amazon.com/bedrock
   - Select region: **US East (N. Virginia)** or **us-east-1**
   - Click **"Model access"** in left sidebar
   - Click **"Manage model access"**
   - Enable these models:
     - ✅ Anthropic Claude 3.5 Sonnet
     - ✅ Anthropic Claude 3 Haiku
     - ✅ Meta Llama 3 70B
     - ✅ Mistral Large
   - Click **"Request model access"**
   - Wait 1-5 minutes for approval (usually instant)

5. **Create IAM User & Access Keys**
   - Go to: https://console.aws.amazon.com/iam/home#/users
   - Click **"Add users"**
   - Username: `constructlm-bedrock`
   - Select **"Access key - Programmatic access"**
   - Click **"Next: Permissions"**

6. **Attach Permissions**
   - Click **"Attach existing policies directly"**
   - Search for: `AmazonBedrockFullAccess`
   - Check the box next to it
   - Click **"Next: Tags"** → **"Next: Review"** → **"Create user"**

7. **Copy Access Keys**
   - You'll see:
     - **Access Key ID**: `AKIA...` (starts with AKIA)
     - **Secret Access Key**: `...` (long random string)
   - **IMPORTANT:** Copy both immediately - you won't see the secret again!
   - Download the CSV file as backup

8. **Add to ConstructLM**
   - Open Settings (⚙️ gear icon)
   - Paste **Access Key ID** into first AWS field
   - Paste **Secret Access Key** into second AWS field
   - Click **"Save & Apply"**

### Pricing (after free credits):
- Claude 3.5 Sonnet: ~$3 per 1M tokens
- Claude 3 Haiku: ~$0.25 per 1M tokens
- Llama 3 70B: ~$0.99 per 1M tokens

### Troubleshooting:
- ❌ **"Model access denied"**: Enable model access in Bedrock console
- ❌ **"Invalid credentials"**: Check both Access Key ID and Secret Key
- ❌ **"Region not supported"**: Use `us-east-1` (N. Virginia)

---

## 🎯 Recommended Setup

### For Most Users (FREE):
1. ✅ **Google Gemini** - Best for documents, images, large files
2. ✅ **Groq** - Best for fast responses, coding, chat

### For Power Users:
1. ✅ **Google Gemini** - Primary for documents
2. ✅ **Groq** - Fast responses
3. ✅ **AWS Bedrock** - Claude 3.5 for complex coding
4. ⚠️ **OpenAI** - Only if you need GPT-4o specifically

---

## 🔒 Security Best Practices

1. **Never share your API keys** with anyone
2. **Don't commit keys to Git** - they're stored locally only
3. **Rotate keys regularly** (every 3-6 months)
4. **Use separate keys** for different projects
5. **Monitor usage** in provider dashboards
6. **Revoke compromised keys** immediately

---

## 📊 Testing Your Keys

After adding keys in Settings:

1. Click the **▶️ Test button** next to each key
2. Wait for validation (5-10 seconds)
3. Look for:
   - ✅ **Green checkmark** = Valid key
   - ❌ **Red X** = Invalid or expired key
4. Click **"Save & Apply"** to save working keys

---

## 🆘 Need Help?

### Google Gemini Issues:
- Dashboard: https://aistudio.google.com
- Docs: https://ai.google.dev/docs

### Groq Issues:
- Dashboard: https://console.groq.com
- Docs: https://console.groq.com/docs

### OpenAI Issues:
- Dashboard: https://platform.openai.com
- Docs: https://platform.openai.com/docs

### AWS Bedrock Issues:
- Console: https://console.aws.amazon.com/bedrock
- Docs: https://docs.aws.amazon.com/bedrock

---

## ✅ Quick Checklist

- [ ] Google Gemini API key added and tested
- [ ] Groq API key added and tested
- [ ] (Optional) OpenAI API key added and tested
- [ ] (Optional) AWS credentials added and tested
- [ ] All keys saved in Settings
- [ ] Test a message with each provider

**You're all set! Start chatting with your preferred models! 🚀**
