# ConstructLM Quick Start Guide

Get up and running with ConstructLM in 5 minutes! 🚀

## 📋 Prerequisites

- **Node.js** v16 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- At least one AI provider API key (see below)

## 🔑 Step 1: Get Your API Key (Free!)

### Option A: Google Gemini (Recommended - Free Tier)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIzaSy...`)

### Option B: Groq (Alternative - Free Tier)
1. Visit [Groq Console](https://console.groq.com/)
2. Sign up for a free account
3. Navigate to API Keys section
4. Generate a new API key (starts with `gsk_...`)

## 💻 Step 2: Install ConstructLM

### For Web Version:

```bash
# Clone the repository
git clone https://github.com/yourusername/ConstructLM.git
cd ConstructLM

# Install dependencies
npm install

# Create environment file
copy .env.example .env.local

# Edit .env.local and add your API key
# VITE_GEMINI_API_KEY=your_actual_key_here

# Start the development server
npm run dev
```

Open your browser to `http://localhost:5173`

### For Desktop App (Windows):

**Option 1: Download Pre-built Installer**
1. Go to [Releases](https://github.com/yourusername/ConstructLM/releases)
2. Download `ConstructLM-Setup-1.0.0.exe`
3. Run the installer
4. Launch ConstructLM
5. Click the gear icon (⚙️) to add your API key

**Option 2: Build from Source**
```bash
# After cloning and installing dependencies
npm run electron:build

# Installer will be in release/ folder
```

## 🎯 Step 3: First Use

### 1. Configure Your API Key
- Click the **gear icon** (⚙️) in the top right
- Paste your API key in the appropriate field
- Click "Test" to verify it works
- Click "Save & Apply"

### 2. Upload Your First Document
- Click the **file icon** (📁) or drag & drop a file
- Supported formats: PDF, DOCX, TXT, CSV, Excel, Markdown
- Wait for processing to complete

### 3. Start Chatting
- Type your question in the input box
- Use `@filename` to reference specific documents
- Click citations in responses to view sources
- Try different AI models from the dropdown

## 🎨 Key Features to Try

### 📄 Document Analysis
```
Upload a PDF → Ask "Summarize this document"
```

### 🧠 Mind Maps
```
Right-click any document → "Generate Mind Map"
```

### 🌐 Web Research
```
Click the link icon → Add a URL → Ask questions about it
```

### 🎤 Voice Input
```
Click the microphone icon → Speak your question
```

### 📝 Save Important Responses
```
Click the bookmark icon on any AI response
```

### ✅ Task Management
```
Switch to "Todos" tab → Create tasks with subtasks
```

### 💾 GitHub Integration
```
Switch to "GitHub" tab → Paste a repo URL → Import files
```

## 🔧 Common Issues & Solutions

### Issue: "API Key missing" error
**Solution:** Open Settings (⚙️) and add your API key

### Issue: "Rate limit reached"
**Solution:** Switch to a different model (Gemini 2.5 Flash has high limits)

### Issue: Document not processing
**Solution:** Check file size (<50MB) and format is supported

### Issue: Citations not working
**Solution:** Make sure you've uploaded documents and they're selected (checkmark)

### Issue: Electron app won't start
**Solution:** Run `npm run electron:dev` to see error messages

## 💡 Pro Tips

1. **Use @mentions** - Type `@` to reference specific files in your questions
2. **Try different models** - Each has strengths (Gemini for docs, Llama for speed)
3. **Save to notebook** - Bookmark important responses for later
4. **Use folders** - Organize files into folders for better management
5. **Export your data** - Settings → Export Data (backup your work!)
6. **Keyboard shortcuts** - `Ctrl+Enter` to send, `Esc` to close modals
7. **Dark mode** - Automatically follows your system preference
8. **Multiple chats** - Create separate chats for different projects

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed features
- Check [Help Documentation](?) in the app (? icon)
- Explore the [GitHub Integration](README.md#github-integration)
- Try [Mind Map Generation](README.md#mind-maps)
- Set up [Local Models](README.md#local-models) (optional)

## 🆘 Need Help?

- **In-App Help**: Click the `?` icon in the top right
- **Activity Logs**: Settings → View Logs (for debugging)
- **GitHub Issues**: [Report a bug](https://github.com/yourusername/ConstructLM/issues)
- **Documentation**: Check the README.md file

## 🎉 You're Ready!

That's it! You're now ready to use ConstructLM for:
- 📄 Document analysis
- 💬 AI-powered conversations
- 🧠 Mind mapping
- 📝 Note-taking
- ✅ Task management
- 🌐 Web research
- 💻 Code analysis

**Enjoy using ConstructLM! 🚀**

---

**Version:** 1.0.0  
**Last Updated:** January 2025  
**License:** MIT
