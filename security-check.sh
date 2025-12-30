#!/bin/bash
# ConstructLM Security Pre-Release Checklist
# Run this script before publishing to GitHub

echo "🔒 ConstructLM Security Pre-Release Checklist"
echo "=============================================="
echo ""

# Check 1: Verify .env.local is in .gitignore
echo "✓ Checking .gitignore..."
if grep -q "^\.env\.local$" .gitignore; then
    echo "  ✅ .env.local is in .gitignore"
else
    echo "  ❌ WARNING: .env.local NOT in .gitignore!"
fi

# Check 2: Verify .env.local is not tracked by git
echo ""
echo "✓ Checking if .env.local is tracked by git..."
if git ls-files --error-unmatch .env.local 2>/dev/null; then
    echo "  ❌ CRITICAL: .env.local IS TRACKED BY GIT!"
    echo "     Run: git rm --cached .env.local"
else
    echo "  ✅ .env.local is not tracked by git"
fi

# Check 3: Verify .env.local doesn't contain real API keys
echo ""
echo "✓ Checking .env.local for placeholder values..."
if [ -f .env.local ]; then
    if grep -q "your_.*_api_key_here" .env.local; then
        echo "  ✅ .env.local contains placeholder values"
    else
        echo "  ⚠️  WARNING: .env.local may contain real API keys!"
        echo "     Please verify and replace with placeholders"
    fi
else
    echo "  ℹ️  .env.local not found (OK if using .env.example)"
fi

# Check 4: Check for hardcoded API keys in source code
echo ""
echo "✓ Scanning source code for potential API keys..."
FOUND_KEYS=$(grep -r "AIzaSy\|sk-\|gsk_" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | grep -v "node_modules" | grep -v "dist" | grep -v "your_" | wc -l)
if [ "$FOUND_KEYS" -eq 0 ]; then
    echo "  ✅ No hardcoded API keys found in source code"
else
    echo "  ⚠️  WARNING: Potential API keys found in source code!"
    echo "     Review these files carefully"
fi

# Check 5: Verify LICENSE file exists
echo ""
echo "✓ Checking for LICENSE file..."
if [ -f LICENSE ]; then
    echo "  ✅ LICENSE file exists"
else
    echo "  ❌ WARNING: LICENSE file missing!"
fi

# Check 6: Verify .env.example exists
echo ""
echo "✓ Checking for .env.example..."
if [ -f .env.example ]; then
    echo "  ✅ .env.example exists"
else
    echo "  ⚠️  WARNING: .env.example missing (recommended)"
fi

# Summary
echo ""
echo "=============================================="
echo "🎯 SUMMARY"
echo "=============================================="
echo ""
echo "Before publishing to GitHub:"
echo "1. ❗ Revoke any exposed API keys at provider websites"
echo "2. ❗ Replace real API keys in .env.local with placeholders"
echo "3. ❗ Verify .env.local is in .gitignore"
echo "4. ❗ Run: git status (ensure .env.local not listed)"
echo "5. ✅ Commit and push to GitHub"
echo ""
echo "🔗 Revoke API keys at:"
echo "   • Google Gemini: https://makersuite.google.com/app/apikey"
echo "   • Groq: https://console.groq.com/"
echo "   • OpenAI: https://platform.openai.com/"
echo ""
