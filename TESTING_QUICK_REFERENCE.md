# Citation Highlight Testing - Quick Reference

## 🎯 Debug Log Filter

In browser console, filter by: **`🎯[CITE-HL]`**

## 🎨 Color Guide

| Color  | Meaning |
|--------|---------|
| 🟠 ORANGE | ✅ NEW Mark.js highlighting (Text, Markdown) |
| 🟡 YELLOW | ✅ Row highlighting (Excel, CSV) OR PDF canvas overlay |
| 🟡 YELLOW on text | ❌ OLD system - report as bug |

## ✅ Expected Behavior by File Type

### Text Files (.txt)
- 🟠 Orange highlight on exact text
- ✅ Auto-scroll
- ❌ NO partial matches

### Markdown Files (.md)
- 🟠 Orange highlight on exact text
- ✅ Auto-scroll
- ❌ NO partial matches

### PDF Files (.pdf)
- 🟡 Yellow canvas overlay
- ✅ Auto-scroll
- ✅ Positioned over text

### Excel Files (.xlsx)
- 🟡 Yellow row background
- ✅ Auto-scroll to row
- ❌ NO orange text highlights
- ❌ NO fuzzy number matching

### CSV Files (.csv)
- 🟡 Yellow row background
- ✅ Auto-scroll to row
- ❌ NO orange text highlights
- ❌ NO fuzzy number matching

## 🐛 Common Issues to Report

1. **Excel/CSV**: Orange highlights on individual cells → BUG
2. **Excel/CSV**: Multiple numbers highlighted → BUG
3. **Text/Markdown**: Yellow highlights → BUG (old system)
4. **Text/Markdown**: Partial word matches (e.g., "Voi" from "Voice") → BUG
5. **Any viewer**: No auto-scroll → BUG
6. **Any viewer**: No `🎯[CITE-HL]` logs → BUG

## 📋 Quick Test Steps

1. Open DevTools (F12)
2. Filter console: `🎯[CITE-HL]`
3. Click citation chip
4. Check highlight color
5. Check auto-scroll
6. Copy logs if issue found

## 📊 Log Examples

### ✅ Good Log (Text/Markdown)
```
🎯[CITE-HL] TextViewer: Citation highlight event received
🎯[CITE-HL] Highlighting complete { totalMarks: 1, duration: '15ms', success: true }
🎯[CITE-HL] Scrolling to first highlight
```

### ✅ Good Log (Excel/CSV)
```
🎯[CITE-HL] ExcelViewer: Citation highlight event received
🎯[CITE-HL] ExcelViewer: Scrolling to highlighted row
```

### ❌ Bad Log (No matches)
```
🎯[CITE-HL] Highlighting complete { totalMarks: 0, success: false }
🎯[CITE-HL] No matches found for quote
```

## 🔧 Quick Fixes

### If no highlights appear:
1. Check console for `🎯[CITE-HL]` logs
2. Verify quote text matches document exactly
3. Clear browser cache
4. Reload page

### If wrong color appears:
1. Clear browser cache
2. Hard reload (Ctrl+Shift+R)
3. Check CSS is loaded

### If fuzzy matching in Excel/CSV:
1. Check for orange highlights (should be none)
2. Copy console logs
3. Report as bug

---

**Remember**: Only copy logs with `🎯[CITE-HL]` prefix!
