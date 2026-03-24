# PDF Editor - Quick Start Guide

## 🚀 Get Started in 2 Minutes

### Option 1: Standalone HTML (No Installation)

```
1. Download: pdf-editor-standalone.html
2. Double-click it
3. Open a PDF
4. Start editing!
```

**That's it.** Works in Chrome, Firefox, Safari, Edge.

---

## Option 2: ToolsForge Integration

```bash
cd toolforge
npm run dev
# -> localhost:3000/tools/pdf-editor
```

---

## ✏️ How to Edit Text

### Basic Text Editing

```
1. Click any text in the PDF
2. Type to replace
3. Press Enter to save
```

### Change Text Style

```
Toolbar → Text Editing:
├─ Font Size: Pick 8-48pt
├─ Color: Choose any color
└─ Font: Arial, Helvetica, Times New Roman, Courier, Georgia
```

---

## 🎨 Annotations

### Highlight Text

```
1. Toolbar → Highlight button (🟨)
2. Drag across PDF area
3. Releases → yellow highlight appears
4. Ctrl+Z to undo
```

### Add Notes

```
1. Toolbar → Sticky Note button (📌)
2. Click where you want to place note
3. Type note text
4. Double-click note to edit
5. Right-click to delete
```

### Freehand Drawing

```
1. Toolbar → Draw button (✏️)
2. Click and drag on PDF
3. Draw your annotation
4. Releases → drawing saved
```

### Remove Annotations

```
Toolbar → Disable button (❌)
- Turns off annotation mode
- Protects PDF from accidents
```

---

## 📄 Page Management

### Navigate Between Pages

```
At bottom:
← Previous [Page 2 / 10] Next →
```

### Delete a Page

```
1. Navigate to page you want to delete
2. Toolbar → Delete Page
3. Page marked for removal
4. Download → page removed from final PDF
```

### Rotate Page (Coming Soon)

```
Toolbar → Rotate Page button
```

---

## ⬇️ Download Your PDF

### Save Edited PDF

```
1. Make all your edits
2. Header → Download button (⬇️)
3. File downloads as: original-name-edited.pdf
4. Ready to use!
```

---

## 🆘 Troubleshooting

### "I can't edit the text"

**Possible causes:**
- PDF is a scanned image (text is picture, not editable)
- Browser hasn't loaded properly
- JavaScript disabled

**Solutions:**
```
Try: Reload page (F5 or Cmd+R)
Check: Console (F12 → Console tab) for errors
Ensure: JavaScript is enabled
```

### "Drawing/Highlights aren't showing"

**Check:**
```
1. Is annotation mode enabled?
2. Try clicking "Disable" then "Highlight" again
3. Reload page
```

### "PDF won't download"

**Try:**
```
1. Check browser console (F12)
2. Try smaller PDF first
3. Check browser's download permissions
4. Try different browser
```

### "Text looks wrong in PDF"

**Known limitation:**
Some PDFs have complex layouts where text positioning isn't perfectly preserved. This is normal. For critical documents, use Adobe Acrobat for advanced layout control.

---

## 💡 Pro Tips

### Keyboard Shortcuts

```
Ctrl+Z (Cmd+Z)      Undo annotation (if available)
Ctrl+S (Cmd+S)      Trigger download
Escape               Deselect/default mode
Enter                Save text edit
```

### Speed Tips

```
✓ Edit one page at a time for best results
✓ Save frequently as you edit
✓ Use basic annotations - they work best
✓ Close other tabs to free up memory
```

### Best Practices

```
✓ Start with small PDF (< 5 MB) to test
✓ Make backup of original before editing
✓ Review PDF before distributing
✓ Use for: forms, text edits, basic annotations
✗ Don't use for: complex layout preservation
```

---

## 🎯 Common Tasks

### Task: Fill Out a Form

```
1. Open PDF form in editor
2. Click each field
3. Type form data
4. Annotate with notes if needed
5. Download completed form
```

### Task: Add Comments to Document

```
1. Open PDF in editor
2. Select "Sticky Note" mode
3. Click where you want comment
4. Type your comment
5. Continue marking up document
6. Download commented PDF
```

### Task: Redact Sensitive Info

```
1. Use yellow highlight to mark areas
2. (Or use Drawing tool to black out text)
3. Download PDF
4. Note: This is visual only - data still in file
   (For true redaction, use redaction tool or Adobe)
```

### Task: Remove Pages

```
1. Navigate to each page you want to remove
2. Click "Delete Page"
3. When done with all deletions
4. Download → unwanted pages removed
```

### Task: Multiple PDFs to One

```
This editor handles one PDF at a time.
To merge PDFs:
├─ Option 1: Use ToolsForge PDF Merge tool
├─ Option 2: Open in browser, copy pages manually
└─ Option 3: Use dedicated PDF merge software
```

---

## 📊 File Size Guide

| PDF Size | Performance | Recommendation |
|----------|-------------|-----------------|
| < 1 MB | ⚡ Instant | Optimal |
| 1-5 MB | ✓ Fast (~2 sec) | Good |
| 5-20 MB | 🟡 Slow (~5-10 sec) | Works but slower |
| 20+ MB | 🐢 Very slow | Not recommended |

**Tips for Large PDFs:**
```
1. Edit one page at a time
2. Save frequently
3. Close other apps to free RAM
4. Consider splitting PDF into parts
```

---

## 🔒 Privacy & Security

### Your Data is Safe

✅ **100% Client-Side** - Files stay on YOUR computer  
✅ **No Cloud Upload** - Never sent to server  
✅ **No Tracking** - No analytics, no ads  
✅ **Open Source** - Code is public, inspect anytime  
✅ **Offline Capable** - Works with no internet (after first load)  

### How It Works

```
Your Device
    ↓
Browser Session
    ↓
PDF.js (renders locally)
    ↓
Your edits (local state)
    ↓
pdf-lib (processes locally)
    ↓
Download to your device
    ↓
File saved on YOUR computer
```

**No one but you can see your PDFs.**

---

## 📚 Learn More

### Want to Understand the Code?

See these files:
```
1. PDF_EDITOR_COMPLETE_GUIDE.md
   └─ How everything works, architecture, features

2. PDF_EDITOR_ADVANCED_TECHNICAL.md
   └─ Deep technical implementation details

3. pdf-editor-standalone.html
   └─ Full source code in one file (~800 lines)

4. toolforge/src/app/tools/pdf-editor/
   └─ React component version
```

### Modify for Your Needs

The standalone HTML is fully editable. Example changes:

**Change default font color:**
```javascript
// Find this line:
const textColor = document.getElementById('textColor');
// Change value:
textColor.value = '#FF0000';  // Red instead of black
```

**Add new annotation color:**
```javascript
// Edit highlight color options:
highlightColor.value = '#00FF00';  // Green
```

**Modify toolbar layout:**
```html
<!-- Edit tools section in HTML -->
<button class="btn btn-secondary" onclick="...">
  Your button here
</button>
```

---

## 🐛 Report Issues

If something doesn't work:

1. **Check browser console** (F12 → Console)
2. **Try different PDF** (might be PDF-specific issue)
3. **Try different browser** (ensures it's not Chrome-specific)
4. **Clear cache** (Ctrl+Shift+Delete in Chrome)

**Common issues & fixes:**

| Issue | Fix |
|-------|-----|
| Text not editable | Scanned PDF (image) - try OCR tool instead |
| Slow performance | Large PDF - edit one page at a time |
| Downloads fail | Check browser download permissions |
| Annotations missing | Try disabling/enabling mode |
| Text looks jumbled | Complex PDF layout - try simpler PDF |

---

## ✨ What's Next?

### Ready for More?

This PDF editor supports:
```
✅ Text editing
✅ Annotations (highlight, notes, drawing)
✅ Page deletion
✅ Download edited PDFs
📅 Coming soon: Page rotation, OCR, advanced redaction
```

### Want to Extend It?

See **PDF_EDITOR_ADVANCED_TECHNICAL.md** for:
- How to add new annotation types
- How to implement OCR
- Performance optimization
- Custom features

### Integration with ToolsForge

The editor is pre-integrated in ToolsForge at:
```
toolforge/src/app/tools/pdf-editor/
```

You can:
- Combine with other tools (merge, split, compress)
- Add to your custom workflow
- Integrate with AI features
- Export to other formats

---

## 🎓 Educational Use

Want to learn PDF manipulation?

**This is perfect for:**
```
✓ Learning web APIs (Canvas, File APIs, Blob)
✓ Understanding PDF structure
✓ Learning React state management
✓ Building client-side tools
```

**Code to study:**
1. `pdf.js` integration - PDF rendering
2. Text layer overlay - DOM positioning
3. `pdf-lib` integration - PDF modification
4. Annotation tools - Canvas drawing
5. Export/download - Blob creation

---

## 📞 Support

### Getting Help

The editor is designed to be self-explanatory:
- **Hover over buttons** for hints
- **Check toolbar labels** for features
- **Try the buttons** - safe to experiment
- **Read this guide** for detailed instructions

### Documentation

Three levels of documentation:
1. **This file** - Quick start & common tasks
2. **PDF_EDITOR_COMPLETE_GUIDE.md** - Features & architecture
3. **PDF_EDITOR_ADVANCED_TECHNICAL.md** - Code deep-dive

---

## 🎉 You're Ready!

```
1. Open PDF editor
2. Load a PDF
3. Click to edit text
4. Add annotations
5. Download edited PDF
```

**That's all you need to know to get started.**

For advanced features, read the complete guide.

### Questions?

Check the documentation files or inspect the code - it's all open source and readable!

---

## License

This PDF editor is **100% free and open source**.

Use it however you want, modify it, share it, build on it.

**No restrictions. No cost. Forever.**

Happy editing! 🚀
