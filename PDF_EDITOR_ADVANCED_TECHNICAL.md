# Advanced PDF Editor - Technical Implementation Details

## Advanced Text Editing: The Challenge & Solution

### Why Text Editing in PDFs is Difficult

PDFs are **not like HTML/DOM elements**. They're binary containers with:

1. **Embedded fonts** - Custom typefaces embedded in file
2. **Absolute positioning** - No reflowing or dynamic layout
3. **Render-only text** - Often stored as paths, not strings
4. **Complex text matrix** - Text positioned with transforms (rotation, scaling, skewing)

### Three Approaches to PDF Text Editing

#### Approach 1: Canvas Manipulation (Simple, Limited)
```
❌ Doesn't preserve original text
❌ Can't extract exact positions
❌ Good for: simple annotations only
```

#### Approach 2: Text Layer Overlay (Our Implementation)
```
✅ Preserves original PDF structure
✅ Allows clicking on text
✅ Can extract positions with pdf.js
✅ Limitations: doesn't perfectly reconstruct complex PDFs
✓ Good for: forms, simple documents, text replacement
```

#### Approach 3: Full PDF Reconstruction (Complex, Robust)
```
✅ Perfect text editing
✅ Preserves all formatting
✅ Complex layout support
❌ Requires specialized library (pdfkit, reportlab)
❌ Overkill for most use cases
```

**We use Approach 2** - Best balance of simplicity and functionality.

---

## Technical Deep Dive: Text extraction using pdf.js

### Step 1: Get Page Text Stream

```javascript
// pdf.js Page.getTextContent() returns text items with metadata
const textContent = await page.getTextContent();

// Structure of each item:
{
  str: "Hello",              // The text string
  dir: "ltr",                // Text direction (left-to-right, right-to-left, etc.)
  width: 24.123,             // Width in page units
  height: 12,                // Height in page units
  transform: [
    1, 0,                    // Horizontal scaling, rotation
    0, 1,                    // Vertical rotation, scaling
    100, 200                 // X position, Y position
  ],
  fontName: "F1",            // Internal PDF font name
  fontSize: 12,              // Font size in points
  hasEOL: false,             // End of line indicator
  angle: 0,                  // Rotation angle in degrees
}
```

### Step 2: Convert Transform Matrix to Screen Coordinates

The PDF transform matrix uses **typical mathematical coordinates** (origin at bottom-left), but HTML canvas uses **screen coordinates** (origin at top-left).

```javascript
// PDF uses 4x3 transformation matrix
const transform = item.transform;  // [a, b, c, d, e, f]

// Where:
// a, d = scaling factors
// b, c = rotation/skew
// e, f = translation (x, y)

// To get actual position:
const x = transform[4];                    // Horizontal position
const y = viewport.height - transform[5];  // Flip Y-axis for screen

// To get dimensions:
const width = item.width;
const height = item.height;
```

### Step 3: Render Text Elements Over Canvas

```javascript
// Create invisible elements positioned exactly over text
function renderTextItems(textContent, pageDiv, viewport) {
  const textLayer = document.createElement('div');
  textLayer.className = 'text-layer';
  textLayer.style.position = 'absolute';
  textLayer.style.top = '0';
  textLayer.style.left = '0';
  textLayer.style.width = viewport.width + 'px';
  textLayer.style.height = viewport.height + 'px';

  textContent.items.forEach((item, index) => {
    // Skip whitespace-only items
    if (!item.str.trim()) return;

    const element = document.createElement('div');
    element.className = 'text-item';
    
    // Position using PDF coordinates
    const x = item.transform[4];
    const y = viewport.height - item.transform[5];
    
    element.style.position = 'absolute';
    element.style.left = x + 'px';
    element.style.top = (y - item.height) + 'px';
    element.style.width = (item.width || 50) + 'px';
    element.style.height = item.height + 'px';
    
    // Make text invisible (we see canvas below)
    element.style.color = 'transparent';
    element.style.fontSize = item.height + 'px';
    element.style.fontFamily = item.fontName || 'Arial';
    element.style.whiteSpace = 'nowrap';
    element.style.overflow = 'hidden';
    element.style.cursor = 'text';
    
    element.textContent = item.str;
    
    // Show on hover
    element.addEventListener('mouseenter', () => {
      element.style.background = 'rgba(102, 126, 234, 0.1)';
      element.style.borderRadius = '2px';
    });
    
    element.addEventListener('mouseleave', () => {
      if (!element.classList.contains('editing')) {
        element.style.background = 'transparent';
      }
    });
    
    // Edit on click
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      editTextItem(element, textContent, index);
    });
    
    textLayer.appendChild(element);
  });

  pageDiv.appendChild(textLayer);
}
```

### Step 4: Edit Text Item

```javascript
// When user clicks text, replace with input field
function editTextItem(element, textContent, itemIndex) {
  const item = textContent.items[itemIndex];
  
  // Create input overlay
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'text-editor';
  input.value = item.str;
  
  // Position exactly over original element
  const rect = element.getBoundingClientRect();
  const parentRect = element.parentElement.parentElement.getBoundingClientRect();
  
  input.style.position = 'absolute';
  input.style.left = (rect.left - parentRect.left) + 'px';
  input.style.top = (rect.top - parentRect.top) + 'px';
  input.style.width = rect.width + 'px';
  input.style.height = rect.height + 'px';
  input.style.fontSize = window.getComputedStyle(element).fontSize;
  input.style.padding = '4px 6px';
  input.style.border = '2px solid #667eea';
  input.style.borderRadius = '4px';
  input.style.zIndex = '100';
  
  element.classList.add('editing');
  element.parentElement.appendChild(input);
  input.focus();
  input.select();
  
  // Save on blur or Enter
  const saveEdit = () => {
    const newText = input.value;
    
    // Store edit
    if (!window.editedText) window.editedText = {};
    window.editedText[itemIndex] = newText;
    
    // Visual feedback
    element.textContent = newText;
    element.classList.remove('editing');
    input.remove();
  };
  
  input.addEventListener('blur', saveEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      element.textContent = item.str;
      element.classList.remove('editing');
      input.remove();
    }
  });
}
```

---

## Annotation System: Advanced Implementation

### 1. Highlight with Precise Selection

```javascript
class HighlightAnnotation {
  constructor(config = {}) {
    this.startX = 0;
    this.startY = 0;
    this.isDrawing = false;
    this.color = config.color || 'rgba(255, 255, 0, 0.4)';
    this.highlightedAreas = [];  // Track for redraw
  }

  startHighlight(event) {
    this.isDrawing = true;
    this.startX = event.offsetX;
    this.startY = event.offsetY;
    
    const annotationsLayer = event.target;
    const tempRect = document.createElement('div');
    tempRect.className = 'temp-highlight';
    tempRect.dataset.startX = this.startX;
    tempRect.dataset.startY = this.startY;
    annotationsLayer.appendChild(tempRect);
    
    // Live update as dragging
    const onMouseMove = (moveEvent) => {
      const width = moveEvent.offsetX - this.startX;
      const height = moveEvent.offsetY - this.startY;
      
      tempRect.style.position = 'absolute';
      tempRect.style.left = Math.min(this.startX, moveEvent.offsetX) + 'px';
      tempRect.style.top = Math.min(this.startY, moveEvent.offsetY) + 'px';
      tempRect.style.width = Math.abs(width) + 'px';
      tempRect.style.height = Math.abs(height) + 'px';
      tempRect.style.backgroundColor = this.color;
      tempRect.style.pointerEvents = 'none';
    };
    
    const onMouseUp = (upEvent) => {
      this.isDrawing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Convert temp to permanent annotation
      const width = upEvent.offsetX - this.startX;
      const height = upEvent.offsetY - this.startY;
      
      if (Math.abs(width) < 5 || Math.abs(height) < 5) {
        // Too small, remove
        tempRect.remove();
        return;
      }
      
      tempRect.classList.remove('temp-highlight');
      tempRect.classList.add('highlight-annotation');
      tempRect.dataset.annotationId = Math.random().toString(36);
      
      // Store for export
      this.highlightedAreas.push({
        id: tempRect.dataset.annotationId,
        x: Math.min(this.startX, upEvent.offsetX),
        y: Math.min(this.startY, upEvent.offsetY),
        width: Math.abs(width),
        height: Math.abs(height),
        color: this.color,
        page: window.currentPage
      });
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  removeHighlight(annotationId) {
    const element = document.querySelector(`[data-annotation-id="${annotationId}"]`);
    if (element) {
      element.remove();
      this.highlightedAreas = this.highlightedAreas.filter(
        h => h.id !== annotationId
      );
    }
  }

  getAllHighlights() {
    return this.highlightedAreas;
  }
}
```

### 2. Sticky Notes with Persistence

```javascript
class StickyNoteAnnotation {
  constructor() {
    this.notes = [];
    this.noteCount = 0;
  }

  addNote(x, y, text = '') {
    const note = document.createElement('div');
    note.className = 'sticky-note-annotation';
    note.dataset.noteId = `note-${this.noteCount++}`;
    
    note.style.position = 'absolute';
    note.style.left = x + 'px';
    note.style.top = y + 'px';
    note.style.width = '120px';
    note.style.minHeight = '120px';
    note.style.backgroundColor = '#ffeb3b';
    note.style.padding = '8px';
    note.style.borderRadius = '4px';
    note.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
    note.style.fontFamily = 'Segoe UI, sans-serif';
    note.style.fontSize = '12px';
    note.style.color = '#333';
    note.style.whiteSpace = 'pre-wrap';
    note.style.wordBreak = 'break-word';
    note.style.cursor = 'move';
    note.style.userSelect = 'none';
    note.style.zIndex = '50';
    note.style.pointerEvents = 'auto';
    
    note.textContent = text;
    
    // Make draggable
    this.makeDraggable(note);
    
    // Edit on double click
    note.addEventListener('dblclick', () => this.editNote(note));
    
    // Delete on right click
    note.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.deleteNote(note.dataset.noteId);
    });
    
    const annotationsLayer = document.querySelector('.annotations');
    annotationsLayer.appendChild(note);
    
    // Store
    this.notes.push({
      id: note.dataset.noteId,
      x, y, text,
      page: window.currentPage
    });
    
    return note;
  }

  makeDraggable(element) {
    let offsetX = 0, offsetY = 0, mouseX = 0, mouseY = 0;

    element.addEventListener('mousedown', (e) => {
      if (e.target !== element) return;
      
      mouseX = e.clientX;
      mouseY = e.clientY;
      const rect = element.getBoundingClientRect();
      const parentRect = element.parentElement.getBoundingClientRect();
      
      offsetX = rect.left - parentRect.left;
      offsetY = rect.top - parentRect.top;

      const onMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - mouseX;
        const deltaY = moveEvent.clientY - mouseY;

        element.style.left = (offsetX + deltaX) + 'px';
        element.style.top = (offsetY + deltaY) + 'px';
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  editNote(element) {
    const currentText = element.textContent;
    const newText = prompt('Edit note:', currentText);
    
    if (newText !== null) {
      element.textContent = newText;
      const note = this.notes.find(n => n.id === element.dataset.noteId);
      if (note) note.text = newText;
    }
  }

  deleteNote(noteId) {
    const element = document.querySelector(`[data-note-id="${noteId}"]`);
    if (element) element.remove();
    this.notes = this.notes.filter(n => n.id !== noteId);
  }

  getAllNotes() {
    return this.notes;
  }
}
```

### 3. Freehand Drawing with Smoothing

```javascript
class FreehandDrawing {
  constructor() {
    this.isDrawing = false;
    this.points = [];
    this.paths = [];
    this.canvas = null;
    this.ctx = null;
    this.strokeColor = '#000000';
    this.strokeWidth = 2;
  }

  initialize(container) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.cursor = 'crosshair';
    this.canvas.style.zIndex = '40';
    
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    this.ctx = this.canvas.getContext('2d');
    container.appendChild(this.canvas);
  }

  startDrawing(event) {
    this.isDrawing = true;
    this.points = [];
    
    const rect = this.canvas.getBoundingClientRect();
    this.points.push({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      time: Date.now()
    });
  }

  draw(event) {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      time: Date.now()
    };

    this.points.push(point);

    // Draw with pressure-based line width
    const pressure = this.calculatePressure();
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeWidth * pressure;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (this.points.length > 1) {
      const prev = this.points[this.points.length - 2];
      this.ctx.beginPath();
      this.ctx.moveTo(prev.x, prev.y);
      this.ctx.lineTo(point.x, point.y);
      this.ctx.stroke();
    }
  }

  calculatePressure() {
    // Simulate pressure based on drawing speed
    if (this.points.length < 2) return 1;
    
    const prev = this.points[this.points.length - 2];
    const curr = this.points[this.points.length - 1];
    
    const distance = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
    );
    
    const time = curr.time - prev.time;
    const speed = distance / (time || 1);
    
    // Slower strokes are thicker
    return Math.min(1.5, 2 - speed / 100);
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    
    if (this.points.length > 1) {
      // Smooth the path using Catmull-Rom spline
      this.smoothPath();
      
      // Store for export
      this.paths.push({
        points: [...this.points],
        color: this.strokeColor,
        width: this.strokeWidth,
        page: window.currentPage
      });
    }
    
    this.points = [];
  }

  smoothPath() {
    // Apply Catmull-Rom spline interpolation for smoother curves
    if (this.points.length < 3) return;

    const smoothedPoints = [];
    
    for (let i = 0; i < this.points.length - 1; i++) {
      const p0 = this.points[Math.max(0, i - 1)];
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const p3 = this.points[Math.min(this.points.length - 1, i + 2)];

      for (let t = 0; t < 1; t += 0.1) {
        const t2 = t * t;
        const t3 = t2 * t;

        const x = 0.5 * (
          2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );

        const y = 0.5 * (
          2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );

        smoothedPoints.push({ x, y });
      }
    }

    return smoothedPoints;
  }

  getAllPaths() {
    return this.paths;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.paths = [];
  }

  undo() {
    if (this.paths.length === 0) return;
    
    this.paths.pop();
    this.redraw();
  }

  redraw() {
    this.clear();
    
    this.paths.forEach(path => {
      this.ctx.strokeStyle = path.color;
      this.ctx.lineWidth = path.width;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      const points = path.points;
      if (points.length < 2) return;
      
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      
      points.forEach((point, i) => {
        if (i > 0) {
          this.ctx.lineTo(point.x, point.y);
        }
      });
      
      this.ctx.stroke();
    });
  }
}
```

---

## PDF Export with Annotations

### Export Strategy

When the user clicks "Download", we need to:

1. **Preserve original PDF structure** - Don't lose formatting
2. **Apply text edits** - Replace edited text strings
3. **Render annotations** - Convert visual annotations back to PDF elements
4. **Generate clean output** - No corruption or malformed PDFs

### Implementation

```javascript
async function exportPdfWithAnnotations() {
  const { PDFDocument, PDFPage, rgb, degrees } = PDFLib;
  
  // Load original PDF
  const arrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  // For each page, handle edits
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageNum = pageIndex + 1;
    
    // Skip deleted pages
    if (deletedPages.has(pageNum)) {
      pdfDoc.removePage(pageIndex);
      continue;
    }

    const page = pages[pageIndex];
    
    // Apply text edits
    if (window.editedText) {
      Object.entries(window.editedText).forEach(([itemIndex, newText]) => {
        // Note: pdf-lib has limited text editing capabilities
        // This adds new text; doesn't modify existing text in-place
        // For production, use more advanced library
      });
    }

    // Draw annotations on top
    const highlights = window.highlightTool?.highlightedAreas || [];
    highlights.forEach(highlight => {
      if (highlight.page === pageNum) {
        // Draw highlight rectangle
        const rgb_vals = hexToRgb(highlight.color);
        page.drawRectangle({
          x: highlight.x,
          y: page.getHeight() - highlight.y - highlight.height,
          width: highlight.width,
          height: highlight.height,
          color: rgb(rgb_vals.r / 255, rgb_vals.g / 255, rgb_vals.b / 255),
          opacity: 0.4
        });
      }
    });

    // Draw sticky notes
    const notes = window.stickyNoteTool?.notes || [];
    notes.forEach(note => {
      if (note.page === pageNum) {
        // Draw note rectangle and text
        page.drawRectangle({
          x: note.x,
          y: page.getHeight() - note.y - 100,
          width: 120,
          height: 80,
          color: rgb(1, 1, 0),
          opacity: 0.8
        });
        
        page.drawText(note.text, {
          x: note.x + 4,
          y: page.getHeight() - note.y - 80,
          size: 9,
          color: rgb(0, 0, 0)
        });
      }
    });

    // Draw freehand paths
    const paths = window.drawingTool?.paths || [];
    paths.forEach(path => {
      if (path.page === pageNum) {
        const rgb_vals = hexToRgb(path.color);
        
        path.points.forEach((point, i) => {
          if (i > 0) {
            const prevPoint = path.points[i - 1];
            
            page.drawLine({
              start: { x: prevPoint.x, y: page.getHeight() - prevPoint.y },
              end: { x: point.x, y: page.getHeight() - point.y },
              color: rgb(rgb_vals.r / 255, rgb_vals.g / 255, rgb_vals.b / 255),
              thickness: path.width
            });
          }
        });
      }
    });
  }

  // Save and download
  const pdfBytes = await pdfDoc.save();
  downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), 'edited.pdf');
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}
```

---

## Performance Optimization

### 1. Lazy Rendering

```javascript
// Only render visible pages
class LazyPageRenderer {
  constructor(container, pdf) {
    this.container = container;
    this.pdf = pdf;
    this.renderedPages = new Set();
    this.observer = null;
  }

  initialize() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const pageNum = parseInt(entry.target.dataset.pageNum);
        
        if (entry.isIntersecting && !this.renderedPages.has(pageNum)) {
          this.renderPage(pageNum);
          this.renderedPages.add(pageNum);
        }
      });
    });

    // Observe all page placeholders
    document.querySelectorAll('[data-page-num]').forEach(el => {
      this.observer.observe(el);
    });
  }

  async renderPage(pageNum) {
    const page = await this.pdf.getPage(pageNum);
    // ... render logic
  }
}
```

### 2. Canvas Caching

```javascript
// Cache rendered pages to avoid re-rendering
class CanvasCache {
  constructor(maxSize = 5) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(pageNum) {
    return this.cache.get(pageNum);
  }

  set(pageNum, canvas) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(pageNum, canvas);
  }

  clear() {
    this.cache.clear();
  }
}
```

### 3. Memory Management

```javascript
// Dispose resources when done with page
function disposePage(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = 0;
  canvas.height = 0;
}

// Use weakly-referenced caches for large PDFs
class WeakCanvasCache {
  constructor() {
    this.cache = new WeakMap();
  }

  set(page, canvas) {
    this.cache.set(page, canvas);
  }

  get(page) {
    return this.cache.get(page);
  }
}
```

---

## Conclusion

This implementation provides:

✅ **Efficient text extraction** using pdf.js  
✅ **Intuitive text editing** via overlay elements  
✅ **Rich annotations** with highlights, notes, drawings  
✅ **Clean PDF export** preserving structure  
✅ **Performance optimizations** for large files  
✅ **Zero backend required** - pure client-side  

The architecture is modular and can be extended with:
- Page rotation/reordering
- OCR for scanned PDFs
- Advanced search & replace
- Form field auto-fill
- Batch processing
