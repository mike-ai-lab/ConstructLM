# 🎯 GitHub Integration - Visual Usage Guide

## 🚀 Getting Started (3 Simple Steps)

### **Step 1: Open GitHub Browser**

**Option A: Header Button**
```
┌─────────────────────────────────────────────────────┐
│  ConstructLM    [Model ▼] [+]  ... [📁] [?] [⚙️]   │
│                                    ↑                 │
│                              Click Here!             │
└─────────────────────────────────────────────────────┘
```

**Option B: Sources Panel**
```
Input Area:
┌─────────────────────────────────────────────────────┐
│  Type your message...                    [🔗] [📎] │
│                                           ↑          │
│                                    Click Link Icon   │
└─────────────────────────────────────────────────────┘

Then paste GitHub URL → Choose "Browse Repository"
```

---

### **Step 2: Enter Repository URL**

```
┌─────────────────────────────────────────────────────┐
│  GitHub Repository Browser                      [X] │
├─────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐         │
│  │ https://github.com/facebook/react     │ [Load] │
│  └───────────────────────────────────────┘         │
│                                                     │
│  Paste any GitHub URL here:                        │
│  • https://github.com/owner/repo                   │
│  • https://github.com/owner/repo/tree/branch       │
│  • https://github.com/owner/repo/blob/main/file.js│
└─────────────────────────────────────────────────────┘
```

---

### **Step 3: Browse & Import**

```
┌─────────────────────────────────────────────────────┐
│  facebook/react  ⭐ 220k  🍴 45k                    │
│  A declarative, efficient JavaScript library...     │
│  [Branch: main ▼] [Import README] [Import Configs] │
├─────────────────────────────────────────────────────┤
│  [← Back]  [🔍 Search files...]      2 selected    │
├─────────────────────────────────────────────────────┤
│  ☐ 📁 packages/                                →   │
│  ☑ 📄 README.md                              15 KB │
│  ☑ 📄 package.json                            3 KB │
│  ☐ 📄 LICENSE                                 1 KB │
│  ☐ 📁 scripts/                                 →   │
├─────────────────────────────────────────────────────┤
│                              [Cancel] [Import 2 files]│
└─────────────────────────────────────────────────────┘

Actions:
1. ☑️ Click checkboxes to select files
2. 📁 Click folders to navigate
3. 🔍 Use search to find files
4. ⚡ Quick import README or configs
5. 📥 Click "Import X files" when ready
```

---

## 💡 Common Workflows

### **Workflow 1: Quick README Import**

```
Step 1: Open GitHub Browser
        ↓
Step 2: Enter repo URL
        ↓
Step 3: Click "Import README"
        ↓
Step 4: Done! README is now in your workspace
```

**Use Case:** Get quick overview of any project

---

### **Workflow 2: Full Code Analysis**

```
Step 1: Open GitHub Browser
        ↓
Step 2: Load repository
        ↓
Step 3: Click "Import Config Files"
        ↓
Step 4: Navigate to src/ folder
        ↓
Step 5: Select main files
        ↓
Step 6: Import all selected
        ↓
Step 7: Ask AI: "Explain this codebase"
```

**Use Case:** Deep dive into project architecture

---

### **Workflow 3: Specific File Study**

```
Step 1: Open GitHub Browser
        ↓
Step 2: Load repository
        ↓
Step 3: Use search: "auth.js"
        ↓
Step 4: Select found file
        ↓
Step 5: Import file
        ↓
Step 6: Ask AI: "How does authentication work?"
```

**Use Case:** Study specific implementation

---

## 🎯 Real Examples

### **Example 1: Learning React Hooks**

```
┌─────────────────────────────────────────────────────┐
│  URL: https://github.com/facebook/react             │
├─────────────────────────────────────────────────────┤
│  Navigate to: packages/react/src/                   │
│                                                      │
│  Select:                                             │
│  ☑ ReactHooks.js                                    │
│  ☑ ReactElement.js                                  │
│  ☑ React.js                                         │
├─────────────────────────────────────────────────────┤
│  Import → Ask AI:                                    │
│  "Explain how useState hook works internally"       │
└─────────────────────────────────────────────────────┘
```

---

### **Example 2: Code Review**

```
┌─────────────────────────────────────────────────────┐
│  URL: https://github.com/myteam/project/tree/pr-123│
├─────────────────────────────────────────────────────┤
│  Select changed files:                               │
│  ☑ src/auth/login.ts                                │
│  ☑ src/utils/validation.ts                          │
│  ☑ tests/auth.test.ts                               │
├─────────────────────────────────────────────────────┤
│  Import → Ask AI:                                    │
│  "Review this code for security issues"             │
└─────────────────────────────────────────────────────┘
```

---

### **Example 3: Documentation Generation**

```
┌─────────────────────────────────────────────────────┐
│  URL: https://github.com/myproject/api              │
├─────────────────────────────────────────────────────┤
│  Quick Actions:                                      │
│  1. Click "Import README"                           │
│  2. Click "Import Config Files"                     │
│  3. Navigate to src/api/                            │
│  4. Select all endpoint files                       │
├─────────────────────────────────────────────────────┤
│  Import → Ask AI:                                    │
│  "Generate API documentation with examples"         │
└─────────────────────────────────────────────────────┘
```

---

## 🔥 Pro Tips

### **Tip 1: Use Search for Speed**

```
Instead of:
📁 Navigate → 📁 Navigate → 📁 Navigate → 📄 Find file

Do this:
🔍 Search: "filename" → ☑️ Select → 📥 Import
```

---

### **Tip 2: Batch Import Related Files**

```
❌ Bad:
Import file1 → Ask question
Import file2 → Ask question
Import file3 → Ask question

✅ Good:
Select file1, file2, file3 → Import all → Ask question
(Better context for AI!)
```

---

### **Tip 3: Start with Config Files**

```
Always import first:
☑️ README.md        (Project overview)
☑️ package.json     (Dependencies)
☑️ tsconfig.json    (TypeScript config)
☑️ .env.example     (Environment vars)

Then import source files
```

---

### **Tip 4: Use Branch Selector**

```
Compare implementations:
1. Load repo on "main" branch
2. Import files
3. Switch to "develop" branch
4. Import same files
5. Ask AI: "What changed between branches?"
```

---

## 📊 Feature Matrix

| Feature | Available | How to Use |
|---------|-----------|------------|
| Browse Repo | ✅ | Enter URL → Load |
| Navigate Folders | ✅ | Click folder name |
| Search Files | ✅ | Type in search box |
| Multi-Select | ✅ | Click checkboxes |
| Import Files | ✅ | Click "Import X files" |
| Switch Branches | ✅ | Use branch dropdown |
| Quick README | ✅ | Click "Import README" |
| Quick Configs | ✅ | Click "Import Config Files" |
| File Sizes | ✅ | Shown next to files |
| Repo Info | ✅ | Stars, forks, description |

---

## 🎨 UI Elements Explained

```
┌─────────────────────────────────────────────────────┐
│  GitHub Repository Browser                      [X] │ ← Close button
├─────────────────────────────────────────────────────┤
│  [URL Input]                                [Load]  │ ← Enter & load repo
├─────────────────────────────────────────────────────┤
│  owner/repo  ⭐ stars  🍴 forks                     │ ← Repo info
│  Description text here...                           │
│  [Branch ▼] [Import README] [Import Config Files]  │ ← Quick actions
├─────────────────────────────────────────────────────┤
│  [← Back]  [🔍 Search...]      X selected          │ ← Navigation & search
├─────────────────────────────────────────────────────┤
│  ☐ 📁 folder/                                  →   │ ← Folder (click to open)
│  ☑ 📄 file.js                                10 KB │ ← File (checkbox to select)
├─────────────────────────────────────────────────────┤
│  Select files to import...                          │ ← Help text
│                              [Cancel] [Import X]    │ ← Action buttons
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Checklist

- [ ] Click GitHub icon in header
- [ ] Paste repository URL
- [ ] Click Load
- [ ] Browse or search for files
- [ ] Select files with checkboxes
- [ ] Click "Import X files"
- [ ] Wait for import to complete
- [ ] Ask AI questions about the code
- [ ] Enjoy AI-powered code analysis!

---

## 🎯 Success Indicators

**You're using it right when:**
- ✅ Files import successfully
- ✅ You can see file content in workspace
- ✅ AI can answer questions about the code
- ✅ Citations reference imported files
- ✅ You're learning faster than before!

---

## 🐛 Common Issues & Solutions

### Issue: "Failed to load repository"
```
Solution:
1. Check URL is correct
2. Ensure repo is public
3. Try switching branch to "master"
```

### Issue: "No files found"
```
Solution:
1. Check if repo is empty
2. Try different branch
3. Verify path exists
```

### Issue: "Import failed"
```
Solution:
1. Check file size (<1MB recommended)
2. Check internet connection
3. Try importing fewer files
```

---

## 📚 Learn More

- **Full Guide**: See `GITHUB_INTEGRATION_GUIDE.md`
- **Quick Reference**: See `GITHUB_QUICK_START.md`
- **Implementation**: See `GITHUB_IMPLEMENTATION_SUMMARY.md`

---

**Happy Coding! 🚀**

Now you can explore any GitHub repository with AI assistance!
