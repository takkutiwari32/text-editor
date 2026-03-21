// --- MOBILE ELECTRON BYPASS (POLYFILL) ---
const ipcRenderer = {
  invoke: async (channel, payload) => {
    if (channel === 'fetch-cloud-ai') {
      const apiKey = payload.apiKey;
      if (!apiKey) return { error: "System Error: No API Key provided. Open Settings (⚙️) to enter your key." };
      try {
        const cloudUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
        const response = await fetch(cloudUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: payload.prompt }] }] })
        });
        const data = await response.json();
        if (data.error && data.error.message) return { error: "Cloud API Error: " + data.error.message };
        if (data.candidates && data.candidates[0].content.parts[0].text) {
          return { response: data.candidates[0].content.parts[0].text };
        } else return { error: "Format still unexpected." };
      } catch (err) { return { error: "Cloud connection physically failed. Check your internet." }; }
    }
  },
  send: (channel, payload) => {
    if (channel === 'save-article') {
      
      // 1. Check if we have an open file AND the user didn't click "Save As"
      let fileName = payload.isSaveAs ? null : window.currentOpenFile;

      // 2. If no file is open, OR if they clicked Save As, ask for a name
      if (!fileName) {
        const suggestedName = payload.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        // Change the prompt text so the user knows what is happening
        const promptMessage = payload.isSaveAs 
          ? "SAVE AS - Enter a name for the new copy:" 
          : "Name your save file (it will be saved to your Documents folder):";
          
        let customName = prompt(promptMessage, suggestedName);
        if (!customName) return; 

        fileName = customName.endsWith('.json') ? customName : customName + '.json';
      }

      // 3. Package the title, the file name, and the canvas data together
      const fullPackage = {
        articleTitle: payload.title,
        fileName: fileName, 
        editorData: payload.content
      };
      
      const fileContent = JSON.stringify(fullPackage, null, 2);

      try {
        if (window.Capacitor && window.Capacitor.Plugins.Filesystem) {
          window.Capacitor.Plugins.Filesystem.writeFile({
            path: fileName,
            data: fileContent,
            directory: 'DOCUMENTS', 
            encoding: 'utf8'
          }).then(() => {
            // 4. Lock the filename into the app's active memory
            window.currentOpenFile = fileName;
            alert('Hardware Sync Complete!\nSuccessfully saved to Documents: ' + fileName);
          }).catch((err) => {
            alert('Android OS Write Error: ' + err.message);
          });
        } else {
          // Desktop Fallback
          window.currentOpenFile = fileName;
          const a = document.createElement('a');
          a.href = "data:text/json;charset=utf-8," + encodeURIComponent(fileContent);
          a.download = fileName;
          document.body.appendChild(a); 
          a.click(); 
          document.body.removeChild(a);
        }
      } catch (error) {
        alert("System Error: " + error.message);
      }
    }
  },
  on: () => {}
};

// Override the desktop shell commands so the BYOK "Get API Key" button opens the phone's web browser
const shell = { openExternal: (url) => window.open(url, '_blank') };
const os = { release: () => 'android' };

// --- BYOK: LOCAL STORAGE ENGINE & FIRST-BOOT INTERCEPTOR ---
function getLocalApiKey() {
  return localStorage.getItem('gemini_api_key') || '';
}

// 1. The First-Boot Auto-Trigger
window.addEventListener('DOMContentLoaded', () => {
  const existingKey = getLocalApiKey();
  if (!existingKey) {
    document.getElementById('api-modal').style.display = 'flex';
  }
});

// 1.5 Native OS Browser Routing (With WSL Matrix Bypass)
document.getElementById('get-key-btn').addEventListener('click', () => {
  const targetUrl = 'https://aistudio.google.com/app/apikey';
  
  if (os.release().toLowerCase().includes('microsoft') || os.release().toLowerCase().includes('wsl')) {
      exec(`explorer.exe "${targetUrl}"`);
  } else {
      shell.openExternal(targetUrl);
  }
});

// 2. Manual Settings Trigger
document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('api-key-input').value = getLocalApiKey();
  document.getElementById('api-modal').style.display = 'flex';
});

// 3. UI Handlers
document.getElementById('close-modal-btn').addEventListener('click', () => {
  document.getElementById('api-modal').style.display = 'none';
});

document.getElementById('save-api-btn').addEventListener('click', () => {
  const newKey = document.getElementById('api-key-input').value.trim();
  if (!newKey) {
    alert("Please paste a valid API key first.");
    return;
  }
  localStorage.setItem('gemini_api_key', newKey);
  document.getElementById('api-modal').style.display = 'none';
  alert('Hardware Sync Complete: Pro CMS AI Engine is now online.');
});

// --- 1. CUSTOM AUDIO ENGINE ---
class SimpleAudioTool {
  static get toolbox() { return { title: 'Audio', icon: '🎵' }; }
  constructor({data}) { this.data = data; }
  
  render() {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '15px'; wrapper.style.background = '#161b22'; wrapper.style.border = '1px solid #30363d'; wrapper.style.borderRadius = '6px';
    const input = document.createElement('input');
    input.placeholder = 'Paste Audio URL (.mp3) and press Enter...';
    input.style.width = '100%'; input.style.padding = '10px'; input.style.background = '#0d1117'; input.style.color = '#fff'; input.style.border = '1px solid #30363d';
    const audio = document.createElement('audio'); audio.controls = true; audio.style.width = '100%'; audio.style.display = 'none';
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { audio.src = input.value; audio.style.display = 'block'; input.style.display = 'none'; } });
    if (this.data && this.data.url) { audio.src = this.data.url; audio.style.display = 'block'; input.style.display = 'none'; }
    wrapper.appendChild(input); wrapper.appendChild(audio); return wrapper;
  }
  save(blockContent) { const audio = blockContent.querySelector('audio'); return { url: audio ? audio.src : '' }; }
}

// --- 2. CUSTOM DRAWING ENGINE (PRO UI) ---
class SimpleDrawTool {
  static get toolbox() { return { title: 'Draw', icon: '🖍️' }; }
  
  constructor({data}) { 
    this.data = data || {}; 
    this.wrapper = null;
    this.imagePreview = null;
    this.placeholder = null;
  }

  // 1. Render the block in the editor
  render() {
    this.wrapper = document.createElement('div');
    this.wrapper.style.width = '100%';
    this.wrapper.style.textAlign = 'center';
    this.wrapper.style.cursor = 'pointer';

    // The Image (Hidden until drawn)
    this.imagePreview = document.createElement('img');
    this.imagePreview.style.width = '100%'; 
    this.imagePreview.style.height = 'auto'; 
    this.imagePreview.style.display = this.data.image ? 'block' : 'none';
    this.imagePreview.style.borderRadius = '4px';

    // The Placeholder
    this.placeholder = document.createElement('div');
    this.placeholder.innerHTML = '🖍️ Tap to Draw';
    this.placeholder.style.padding = '40px';
    this.placeholder.style.background = '#161b22';
    this.placeholder.style.border = '2px dashed #30363d';
    this.placeholder.style.borderRadius = '8px';
    this.placeholder.style.color = '#58a6ff';
    this.placeholder.style.fontWeight = 'bold';
    this.placeholder.style.display = this.data.image ? 'none' : 'block';

    if (this.data.image) this.imagePreview.src = this.data.image;

    this.wrapper.appendChild(this.imagePreview);
    this.wrapper.appendChild(this.placeholder);

    // Open full screen on tap
    this.wrapper.addEventListener('click', () => { this.openFullScreenEditor(); });

    // Auto-open if new
    if (!this.data.image) {
      setTimeout(() => { this.openFullScreenEditor(); }, 50);
    }

    return this.wrapper;
  }

  // 2. The Full-Screen Logic
  openFullScreenEditor() {
    const modal = document.getElementById('draw-modal');
    const container = document.getElementById('draw-canvas-container');
    const oldCanvas = document.getElementById('fullscreen-draw-canvas');
    const cancelBtn = document.getElementById('draw-cancel-btn');
    const saveBtn = document.getElementById('draw-save-btn');
    
    // UI Panels
    const primaryToolsDiv = document.getElementById('draw-primary-tools');
    const optionsDrawer = document.getElementById('draw-options-drawer');
    const colorPaletteDiv = document.getElementById('draw-color-palette');
    const widthSelectorDiv = document.getElementById('draw-width-selector');

    const ratio = window.devicePixelRatio || 1;
    const canvas = oldCanvas.cloneNode(true);
    oldCanvas.parentNode.replaceChild(canvas, oldCanvas);

    modal.style.display = 'flex';

    canvas.width = container.clientWidth * ratio;
    canvas.height = container.clientHeight * ratio;
    canvas.style.width = container.clientWidth + 'px';
    canvas.style.height = container.clientHeight + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (this.data.image) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, container.clientWidth, container.clientHeight);
      img.src = this.data.image;
    }

    // --- STATE MANAGEMENT ---
    let currentTool = 'pen'; // 'pen', 'highlighter', 'eraser'
    let currentColor = '#000000';
    let currentWidth = 4;
    let activeToolBtn = null;
    let activeColorBtn = null;
    let activeWidthBtn = null;

    // A helper to parse hex to rgba for the highlighter
    const hexToRgba = (hex, alpha) => {
        let r = parseInt(hex.slice(1, 3), 16),
            g = parseInt(hex.slice(3, 5), 16),
            b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const updateContext = () => {
        if (currentTool === 'eraser') {
            ctx.strokeStyle = '#ffffff';
            ctx.globalCompositeOperation = "source-over"; // normal drawing over white
            ctx.lineWidth = currentWidth * 3; // Eraser is naturally thicker
        } else if (currentTool === 'highlighter') {
            ctx.strokeStyle = hexToRgba(currentColor, 0.4); // 40% opacity
            // Multiply blending mode gives that authentic marker feel over other inks
            ctx.globalCompositeOperation = "multiply"; 
            ctx.lineWidth = currentWidth * 4; // Highlighters are thick
        } else {
            // Standard Pen
            ctx.strokeStyle = currentColor;
            ctx.globalCompositeOperation = "source-over";
            ctx.lineWidth = currentWidth;
        }
    };

    // --- BUILD PRIMARY TOOLS ---
    primaryToolsDiv.innerHTML = '';
    const tools = [
        { id: 'pen', icon: 'M12 19l7-7 3 3-7 7-3-3z M18 13l-1.5-1.5 L17 10l1.5 1.5z M2 22h4l11-11-4-4L2 18v4z' },
        { id: 'highlighter', icon: 'M17.5 2.5h-5l-5 5v5l5 5h5l5-5v-5l-5-5z M12.5 7.5l-5 5 M10 15H2v7h7v-7z' }, // Custom-ish path
        { id: 'eraser', icon: 'M20 20H7L3 16c-1.5-1.5-1.5-3.5 0-5L13 1 22 10l-10 10V10' }
    ];

    tools.forEach(t => {
        const btn = document.createElement('div');
        btn.style.width = '40px'; btn.style.height = '40px';
        btn.style.display = 'flex'; btn.style.justifyContent = 'center'; btn.style.alignItems = 'center';
        btn.style.cursor = 'pointer'; btn.style.borderRadius = '8px';
        
        // Add a bottom indicator line like the image
        const indicator = document.createElement('div');
        indicator.style.position = 'absolute'; indicator.style.bottom = '-10px'; indicator.style.width = '20px';
        indicator.style.height = '3px'; indicator.style.borderRadius = '2px';
        indicator.style.background = 'transparent';
        indicator.style.transition = 'background 0.2s';
        
        btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b949e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:relative;"><path d="${t.icon}"></path></svg>`;
        btn.style.position = 'relative';
        btn.appendChild(indicator);

        if (t.id === 'pen') {
            btn.querySelector('svg').style.stroke = '#58a6ff';
            indicator.style.background = '#58a6ff';
            activeToolBtn = btn;
        }

        btn.onclick = () => {
            // If tapping the ALREADY active tool, toggle the drawer
            if (currentTool === t.id) {
                optionsDrawer.style.display = optionsDrawer.style.display === 'none' ? 'flex' : 'none';
                return;
            }

            // Otherwise, switch tools
            currentTool = t.id;
            
            // Reset old active button
            if (activeToolBtn) {
                activeToolBtn.querySelector('svg').style.stroke = '#8b949e';
                activeToolBtn.querySelector('div').style.background = 'transparent';
            }
            
            // Set new active button
            btn.querySelector('svg').style.stroke = '#58a6ff';
            indicator.style.background = '#58a6ff';
            activeToolBtn = btn;

            // Always open drawer when switching to a new tool (except eraser which might not need colors)
            optionsDrawer.style.display = 'flex';
            
            // Hide colors if eraser is selected, show if pen/highlighter
            colorPaletteDiv.style.display = (currentTool === 'eraser') ? 'none' : 'flex';

            updateContext();
        };
        primaryToolsDiv.appendChild(btn);
    });

    // --- BUILD COLOR PALETTE ---
    colorPaletteDiv.innerHTML = '';
    const palette = ['#000000', '#ff5252', '#fbc02d', '#4caf50', '#2196f3', '#9c27b0', '#795548', '#ffffff'];
    
    palette.forEach((color, i) => {
        const cBtn = document.createElement('div');
        cBtn.style.minWidth = '28px'; cBtn.style.height = '28px';
        cBtn.style.borderRadius = '50%'; cBtn.style.backgroundColor = color;
        cBtn.style.cursor = 'pointer'; cBtn.style.border = '2px solid #30363d';
        
        if (i === 0) {
            cBtn.style.borderColor = '#58a6ff';
            activeColorBtn = cBtn;
        }

        cBtn.onclick = () => {
            currentColor = color;
            if (activeColorBtn) activeColorBtn.style.borderColor = '#30363d';
            cBtn.style.borderColor = '#58a6ff';
            activeColorBtn = cBtn;
            updateContext();
        };
        colorPaletteDiv.appendChild(cBtn);
    });

    // --- BUILD WIDTH SELECTOR ---
    widthSelectorDiv.innerHTML = '';
    const widths = [2, 4, 8, 14, 22, 32]; // CSS pixel widths
    
    widths.forEach((w) => {
        const wBtn = document.createElement('div');
        wBtn.style.width = '30px'; wBtn.style.height = '30px';
        wBtn.style.display = 'flex'; wBtn.style.justifyContent = 'center'; wBtn.style.alignItems = 'center';
        wBtn.style.cursor = 'pointer';
        
        const dot = document.createElement('div');
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = '#8b949e';
        // Visual representation of the width (scaled down a bit so the biggest doesn't overflow)
        const displaySize = Math.max(4, Math.min(24, w)); 
        dot.style.width = displaySize + 'px';
        dot.style.height = displaySize + 'px';
        dot.style.transition = 'all 0.2s';
        
        wBtn.appendChild(dot);

        // Default selection (width 4)
        if (w === 4) {
            dot.style.backgroundColor = '#ffffff';
            dot.style.boxShadow = '0 0 0 2px #0d1117, 0 0 0 4px #ffffff';
            activeWidthBtn = dot;
        }

        wBtn.onclick = () => {
            currentWidth = w;
            if (activeWidthBtn) {
                activeWidthBtn.style.backgroundColor = '#8b949e';
                activeWidthBtn.style.boxShadow = 'none';
            }
            dot.style.backgroundColor = '#ffffff';
            dot.style.boxShadow = '0 0 0 2px #0d1117, 0 0 0 4px #ffffff';
            activeWidthBtn = dot;
            updateContext();
        };
        widthSelectorDiv.appendChild(wBtn);
    });

    // Ensure initial context is set
    updateContext();
    // Start with drawer open
    optionsDrawer.style.display = 'flex';


    // --- DRAWING LOGIC ---
    let isDrawing = false;
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDraw = (e) => { 
        isDrawing = true; 
        const pos = getPos(e); 
        ctx.beginPath(); 
        ctx.moveTo(pos.x, pos.y); 
        
        // Hide the drawer if it's open while drawing starts to save screen space
        if(optionsDrawer.style.display === 'flex') {
            optionsDrawer.style.display = 'none';
        }
    };
    const draw = (e) => { if (!isDrawing) return; e.preventDefault(); const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
    const stopDraw = () => { isDrawing = false; ctx.closePath(); };

    canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw); canvas.addEventListener('mouseout', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false }); canvas.addEventListener('touchmove', draw, { passive: false }); canvas.addEventListener('touchend', stopDraw);

    // --- CLOSE & SAVE LOGIC ---
    cancelBtn.onclick = () => { modal.style.display = 'none'; };
    
    saveBtn.onclick = () => {
      // Revert composite operation before saving just in case
      ctx.globalCompositeOperation = "source-over"; 
      this.data.image = canvas.toDataURL('image/png');
      this.imagePreview.src = this.data.image;
      
      this.imagePreview.style.display = 'block';
      this.placeholder.style.display = 'none'; 
      
      this.wrapper.dispatchEvent(new Event('input', { bubbles: true }));
      modal.style.display = 'none';
    };
  }

  save(blockContent) { 
    return { image: this.data.image || '' }; 
  }
}


// --- 2.5 CUSTOM MOBILE TABLE ENGINE ---
class MobileTableTool {
  static get toolbox() { return { title: 'Table', icon: '⊞' }; }
  
  constructor({ data }) {
    // If no data exists, start with a blank 2x2 grid
    this.data = data && data.content ? data : { content: [['', ''], ['', '']] };
    this.wrapper = undefined;
  }

  render() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'custom-table-wrapper';
    this.drawGrid();
    return this.wrapper;
  }

  drawGrid() {
    this.wrapper.innerHTML = ''; // Clear old grid

    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'custom-table-scroll';
    
    const table = document.createElement('table');
    table.className = 'custom-table';

    // Build the rows and columns based on our data array
    this.data.content.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      row.forEach((cellText, colIndex) => {
        const td = document.createElement('td');
        // Show placeholder if empty
        td.innerHTML = cellText ? cellText : '<span style="color:#bbb; font-style:italic;">Empty</span>';
        
        // THE MAGIC: When clicked, open the Modal instead of typing inline!
        td.onclick = () => this.openEditor(rowIndex, colIndex);
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    scrollContainer.appendChild(table);
    this.wrapper.appendChild(scrollContainer);

    // Build the Add Row / Add Column buttons
    const controls = document.createElement('div');
    controls.className = 'custom-table-controls';

    const addColBtn = document.createElement('button');
    addColBtn.className = 'custom-table-btn';
    addColBtn.innerText = '+ Column';
    addColBtn.onclick = () => {
      this.data.content.forEach(row => row.push('')); // Add blank cell to every row
      this.drawGrid();
    };

    const addRowBtn = document.createElement('button');
    addRowBtn.className = 'custom-table-btn';
    addRowBtn.innerText = '+ Row';
    addRowBtn.onclick = () => {
      const newRow = new Array(this.data.content[0].length).fill(''); // Create empty row matching width
      this.data.content.push(newRow);
      this.drawGrid();
    };

    controls.appendChild(addRowBtn);
    controls.appendChild(addColBtn);
    this.wrapper.appendChild(controls);
  }

  openEditor(r, c) {
    const modal = document.getElementById('cell-edit-modal');
    const input = document.getElementById('cell-edit-input');
    const saveBtn = document.getElementById('cell-save-btn');
    const cancelBtn = document.getElementById('cell-cancel-btn');
    const title = document.getElementById('cell-edit-title');

    title.innerText = `Edit Row ${r + 1}, Column ${c + 1}`;
    input.value = this.data.content[r][c] || ''; // Load current text
    modal.style.display = 'flex';
    input.focus();

    // Clean up old listeners so we don't save to the wrong cell!
    saveBtn.onclick = null; 
    cancelBtn.onclick = null;

    cancelBtn.onclick = () => { modal.style.display = 'none'; };
    saveBtn.onclick = () => {
      this.data.content[r][c] = input.value.trim(); // Save to data array
      modal.style.display = 'none';
      this.drawGrid(); // Redraw the table with new data
    };
  }

  // Tells EditorJS how to package the data for saving/PDFs
  save(blockContent) {
    return { content: this.data.content };
  }
}

// --- 3. EDITOR INITIALIZATION ---
const editor = new EditorJS({
  holder: 'editor-container', placeholder: '',
  tools: {
    header: { class: Header, inlineToolbar: ['link', 'bold', 'italic', 'underline', 'Marker'] },
    // RIGHT HERE: Notice how we swapped out the default Table class for MobileTableTool!
    list: { class: EditorjsList, inlineToolbar: true }, code: { class: CodeTool }, table: MobileTableTool, Marker: { class: Marker }, underline: { class: Underline },
    image: { class: ImageTool, config: { uploader: { uploadByFile(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve({ success: 1, file: { url: reader.result } }); reader.onerror = error => reject(error); }); } } } },
    audio: SimpleAudioTool, draw: SimpleDrawTool    
  },
  onChange: () => {
    editor.save().then((outputData) => {
      let text = ''; outputData.blocks.forEach(block => { if (block.data.text) text += block.data.text.replace(/<[^>]*>?/gm, '') + ' '; });
      const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
      document.getElementById('word-count').innerText = words; document.getElementById('read-time').innerText = Math.max(1, Math.ceil(words / 200)) + ' min';
    });
  }
});

// --- 4. WIRING UP THE GUI BUTTONS ---
document.getElementById('tool-header').addEventListener('click', () => { editor.blocks.insert('header'); });
document.getElementById('tool-image').addEventListener('click', () => { editor.blocks.insert('image'); });
document.getElementById('tool-code').addEventListener('click', () => { editor.blocks.insert('code'); });
document.getElementById('tool-table').addEventListener('click', () => { editor.blocks.insert('table'); });
document.getElementById('tool-list').addEventListener('click', () => { editor.blocks.insert('list'); });
document.getElementById('tool-audio').addEventListener('click', () => { editor.blocks.insert('audio'); });
document.getElementById('tool-draw').addEventListener('click', () => { editor.blocks.insert('draw'); });

// --- 5. PUBLISH LOGIC (SAVE & SAVE AS) ---
const getDocumentTitle = (outputData) => {
  if (outputData.blocks && outputData.blocks.length > 0 && outputData.blocks[0].data && outputData.blocks[0].data.text) {
    const tmp = document.createElement('div');
    tmp.innerHTML = outputData.blocks[0].data.text;
    const text = tmp.textContent || tmp.innerText || '';
    return text.substring(0, 30).trim() || "Untitled_Document";
  }
  return "Untitled_Document";
};

document.getElementById('publish-btn').addEventListener('click', () => {
  editor.save().then((outputData) => { 
    const title = getDocumentTitle(outputData);
    ipcRenderer.send('save-article', { title: title, content: outputData, isSaveAs: false }); 
  });
});

document.getElementById('save-as-btn').addEventListener('click', () => {
  editor.save().then((outputData) => { 
    const title = getDocumentTitle(outputData);
    ipcRenderer.send('save-article', { title: title, content: outputData, isSaveAs: true }); 
  });
});

ipcRenderer.on('save-response', (event, response) => {
  if(response.success) { alert('Success! Article physically saved to your OS at:\n' + response.path); } else { alert('System Error saving file: ' + response.error); }
});

// --- 6. TYPOGRAPHY ENGINE (MOBILE & DESKTOP FIX) ---
let selectionTimeout;

// 1. Listen for the native mobile text selection handles
document.addEventListener('selectionchange', () => {
  clearTimeout(selectionTimeout);
  
  selectionTimeout = setTimeout(() => {
    // --- NEW FIX: Protect the target if interacting with the tool menu ---
    const activeId = document.activeElement ? document.activeElement.id : '';
    if (['style-color', 'style-size', 'style-font'].includes(activeId)) {
      return; // Abort cleanup so the target span survives!
    }
    // --------------------------------------------------------------------

    const selection = window.getSelection();
    const oldTarget = document.getElementById('pending-style-target');
    
    // THE FIX: If you tap away and the selection collapses, instantly clear the red highlight!
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      if (oldTarget) {
        oldTarget.removeAttribute('id');
        oldTarget.style.backgroundColor = 'transparent';
      }
      return;
    }

    const range = selection.getRangeAt(0);
    if (!range.commonAncestorContainer.parentElement || !range.commonAncestorContainer.parentElement.closest('.ce-block')) return;

    if (oldTarget) { 
      oldTarget.removeAttribute('id'); 
      oldTarget.style.backgroundColor = 'transparent'; 
    }

    const span = document.createElement('span'); 
    span.id = 'pending-style-target'; 
    span.style.backgroundColor = 'rgba(248, 81, 73, 0.2)'; 
    
    try { 
      span.appendChild(range.extractContents()); 
      range.insertNode(span); 
    } catch (err) { console.warn("Typography Lock Failed", err); }
    
  }, 400); 
});

// 2. The Apply Function
function applyTypography(type, value) {
  const targetSpan = document.getElementById('pending-style-target'); 
  if (!targetSpan) {
    alert("Please highlight some text in the editor first!");
    return; 
  }
  
  // Apply the actual CSS
  if (type === 'color') targetSpan.style.color = value; 
  if (type === 'size') targetSpan.style.fontSize = value; 
  if (type === 'font') targetSpan.style.fontFamily = value;

  // Force the red highlight background to disappear so it looks clean
  targetSpan.style.backgroundColor = 'transparent';
  
  // CRITICAL: Tell EditorJS that the block was modified so it saves the data
  const activeBlock = targetSpan.closest('.cdx-block');
  if (activeBlock) activeBlock.dispatchEvent(new Event('input', { bubbles: true }));
}

// 3. Wire up the UI Inputs
const colorInput = document.getElementById('style-color');
// Use 'input' instead of 'change' so color updates in real-time as you drag the color picker
colorInput.addEventListener('input', () => { applyTypography('color', colorInput.value); });

const sizeInput = document.getElementById('style-size');
sizeInput.addEventListener('change', () => { applyTypography('size', sizeInput.value); });
sizeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyTypography('size', sizeInput.value); });

const fontInput = document.getElementById('style-font');
fontInput.addEventListener('change', () => { applyTypography('font', fontInput.value); });

// --- AI CO-PILOT CHAT ENGINE ---
document.getElementById('ai-send-btn').addEventListener('click', async () => {
  const inputField = document.getElementById('ai-chat-input'); const prompt = inputField.value.trim(); if (!prompt) return;
  const chatWindow = document.getElementById('ai-chat-window');
  chatWindow.innerHTML += "<div><strong style='color: #58a6ff;'>You:</strong> " + prompt + "</div>"; inputField.value = '';
  const loadingId = 'loading-' + Date.now(); chatWindow.innerHTML += "<div id='" + loadingId + "' style='color: var(--text-muted);'><em>Cloud AI is thinking...</em></div>"; chatWindow.scrollTop = chatWindow.scrollHeight;
  try {
    const data = await ipcRenderer.invoke('fetch-cloud-ai', { prompt: prompt, apiKey: getLocalApiKey() });
    document.getElementById(loadingId).remove();
    if (data.error) { chatWindow.innerHTML += "<div style='color: red;'><strong>System Error:</strong> " + data.error + "</div>"; } else { chatWindow.innerHTML += "<div><strong style='color: #f85149;'>Cloud AI:</strong> " + data.response + "</div>"; }
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) { document.getElementById(loadingId).remove(); chatWindow.innerHTML += "<div style='color: red;'><strong>System Error:</strong> IPC bridge failure.</div>"; }
});
document.getElementById('ai-chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('ai-send-btn').click(); });

// --- THE MEMORY ANCHOR ---
let lastActiveBlock = null;
document.addEventListener('click', (e) => { const block = e.target.closest('.cdx-block'); if (block) { lastActiveBlock = block; } });
document.addEventListener('keyup', (e) => { const block = e.target.closest('.cdx-block'); if (block) { lastActiveBlock = block; } });

// --- AI GRAMMAR FIXER ---
document.getElementById('ai-grammar-btn').addEventListener('click', async () => {
  if (!lastActiveBlock) { alert("System Error: Click inside a specific paragraph first."); return; }
  const originalText = lastActiveBlock.innerText.trim(); if (!originalText) return;
  const grammarBtn = document.getElementById('ai-grammar-btn'); const originalBtnText = grammarBtn.innerText;
  grammarBtn.innerText = "Processing Cloud Grammar..."; grammarBtn.style.opacity = "0.7";
  const strictPrompt = "You are a strict proofreader. Fix all spelling and grammar errors in the following text. Do not add any conversational filler. Do not explain the changes. Do not use quotes. Return strictly the corrected text and nothing else. Text: " + originalText;
  try {
    const data = await ipcRenderer.invoke('fetch-cloud-ai', { prompt: strictPrompt, apiKey: getLocalApiKey() });
    if (data.error) { grammarBtn.innerText = "API Error"; } else { lastActiveBlock.innerHTML = data.response.trim(); lastActiveBlock.dispatchEvent(new Event('input', { bubbles: true })); grammarBtn.innerText = "Grammar Fixed!"; }
  } catch (error) { grammarBtn.innerText = "Bridge Offline"; }
  setTimeout(() => { grammarBtn.innerText = originalBtnText; grammarBtn.style.opacity = "1"; }, 2500);
});

// --- AI FORMATTING AGENT (TARGET LOCK) ---
document.getElementById('ai-format-btn').addEventListener('click', async () => {
  const inputField = document.getElementById('ai-chat-input'); const command = inputField.value.trim();
  if (!command) { alert("System Error: Tell the AI what formatting to apply in the chat input first."); return; }
  if (!lastActiveBlock) { alert("System Error: Click inside a specific paragraph first so the AI knows what to target."); return; }
  const originalHTML = lastActiveBlock.innerHTML; if (!originalHTML) return;
  const formatBtn = document.getElementById('ai-format-btn'); const originalBtnText = formatBtn.innerText; const chatWindow = document.getElementById('ai-chat-window');
  formatBtn.innerText = "Executing AI Format..."; formatBtn.style.opacity = "0.7";
  const strictPrompt = "You are a CSS injection engine. The user command is: " + command + ". The raw text/HTML is: " + originalHTML + ". Wrap the text in a <span style='...'> tag with the exact CSS properties needed (like font-weight: bold, font-style: italic, text-decoration: underline, color, etc). Keep all text intact. Return strictly the modified HTML span and absolutely nothing else. Do not use markdown blocks.";
  try {
    const data = await ipcRenderer.invoke('fetch-cloud-ai', { prompt: strictPrompt, apiKey: getLocalApiKey() });
    if (data.error) { formatBtn.innerText = "API Error"; chatWindow.innerHTML += "<div style='color: red;'><strong>Format Engine Failed:</strong> " + data.error + "</div>"; chatWindow.scrollTop = chatWindow.scrollHeight; } 
    else { lastActiveBlock.innerHTML = data.response.trim(); lastActiveBlock.dispatchEvent(new Event('input', { bubbles: true })); formatBtn.innerText = "Format Applied!"; inputField.value = '';  }
  } catch (error) { formatBtn.innerText = "Bridge Offline"; }
  setTimeout(() => { formatBtn.innerText = originalBtnText; formatBtn.style.opacity = "1"; }, 2500);
});

// --- GHOST AUTO-CORRECT ENGINE ---
let isGhostEngineActive = false; let ghostTypingTimer; const GHOST_PAUSE_DURATION = 3000; 
document.getElementById('ai-auto-toggle').addEventListener('change', (e) => {
  isGhostEngineActive = e.target.checked; const chatWindow = document.getElementById('ai-chat-window');
  if (isGhostEngineActive) { chatWindow.innerHTML += "<div><strong style='color: #58a6ff;'>System:</strong> Ghost Auto-Correct ARMED. AI will engage when you pause typing.</div>"; } 
  else { chatWindow.innerHTML += "<div><strong style='color: #8b949e;'>System:</strong> Ghost Auto-Correct DISARMED. Manual mode active.</div>"; }
  chatWindow.scrollTop = chatWindow.scrollHeight;
});
document.getElementById('editor-container').addEventListener('keyup', (e) => {
  if (!isGhostEngineActive) return; if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') return;
  const activeBlock = e.target.closest('.cdx-block'); if (!activeBlock) return;
  clearTimeout(ghostTypingTimer);
  ghostTypingTimer = setTimeout(async () => {
    const rawText = activeBlock.innerText.trim(); if (rawText.length < 5) return; 
    const originalBg = activeBlock.style.backgroundColor; activeBlock.style.backgroundColor = 'rgba(88, 166, 255, 0.1)'; activeBlock.style.transition = 'background-color 0.3s ease';
    const strictPrompt = "You are a strict proofreader. Fix all spelling and grammar errors in the following text. Do not add any conversational filler. Do not explain the changes. Do not use quotes. Return strictly the corrected text and nothing else. Text: " + rawText;
    try {
      const data = await ipcRenderer.invoke('fetch-cloud-ai', { prompt: strictPrompt, apiKey: getLocalApiKey() });
      if (!data.error) { activeBlock.innerHTML = data.response.trim(); activeBlock.dispatchEvent(new Event('input', { bubbles: true })); }
    } catch (error) { console.error("Ghost Engine Bridge Failure"); }
    activeBlock.style.backgroundColor = originalBg;
  }, GHOST_PAUSE_DURATION);
});

// --- 8. DYNAMIC CANVAS WIDTH ENGINE ---
const widthSlider = document.getElementById('canvas-width-slider'); const widthDisplay = document.getElementById('width-display');
widthSlider.addEventListener('input', (e) => {
  const newWidth = e.target.value + '%'; document.documentElement.style.setProperty('--editor-width', newWidth); widthDisplay.innerText = newWidth;
});

// --- 9. DYNAMIC LINE SPACING ENGINE ---
const lineHeightSlider = document.getElementById('line-height-slider'); 
const lineHeightDisplay = document.getElementById('line-height-display');

if (lineHeightSlider && lineHeightDisplay) {
  lineHeightSlider.addEventListener('input', (e) => {
    const newHeight = e.target.value; 
    document.documentElement.style.setProperty('--editor-line-height', newHeight); 
    lineHeightDisplay.innerText = newHeight;
  });
}

// --- 10. THE OS INTENT INTERCEPTOR (FILE READER) ---
async function loadFileFromOS(contentUrl) {
  try {
    const result = await window.Capacitor.Plugins.Filesystem.readFile({
      path: contentUrl,
      encoding: 'utf8'
    });
    
    let fileText = result.data;
    
    if (!fileText.trim().startsWith('{') && !fileText.includes(' ')) {
      try { fileText = atob(fileText); } catch(e) { }
    }
    
    let parsedData;

    try {
      parsedData = JSON.parse(fileText);
    } catch (e) {
      const singleBlockText = fileText.replace(/\n/g, '<br>');
      const textBlocks = [{ type: "paragraph", data: { text: singleBlockText } }];
      parsedData = { articleTitle: "Imported Text Document", editorData: { blocks: textBlocks }, fileName: null };
    }
    
    editor.isReady.then(() => {
      if (parsedData.articleTitle && parsedData.editorData) {
        editor.render(parsedData.editorData);
        window.currentOpenFile = parsedData.fileName || null;
      } else {
        editor.render(parsedData);
        window.currentOpenFile = null; 
      }
    });
  } catch (error) { alert('System Error unpacking file: ' + error.message); }
}

if (window.Capacitor && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.getLaunchUrl().then(ret => { if (ret && ret.url) loadFileFromOS(ret.url); });
  window.Capacitor.Plugins.App.addListener('appUrlOpen', event => { if (event && event.url) loadFileFromOS(event.url); });
}

// --- 11. NATIVE VECTOR PDF EXPORT ENGINE ---
document.getElementById('export-pdf-btn').addEventListener('click', async () => {
  const exportBtn = document.getElementById('export-pdf-btn');
  const originalText = exportBtn.innerText;
  exportBtn.innerText = "Compiling..."; exportBtn.disabled = true;

  try {
    const outputData = await editor.save();
    const titleText = getDocumentTitle(outputData);
    const suggestedName = titleText.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    let customName = prompt("Name your Native PDF file:", suggestedName);
    if (!customName) { exportBtn.innerText = originalText; exportBtn.disabled = false; return; }
    
    const fileName = customName.endsWith('.pdf') ? customName : customName + '.pdf';
    
    // FIX 1: Removed the auto-injected title block from the content array
    const docDefinition = {
      content: [], 
      styles: {
        paragraph: { fontSize: 12, margin: [0, 0, 0, 15], lineHeight: 1.5 },
        h1: { fontSize: 20, bold: true, margin: [0, 15, 0, 10] }, h2: { fontSize: 18, bold: true, margin: [0, 15, 0, 10] }, h3: { fontSize: 16, bold: true, margin: [0, 15, 0, 10] },
        code: { font: 'Courier', fontSize: 10, background: '#f4f4f4', margin: [0, 5, 0, 15] },
        list: { margin: [0, 0, 0, 15] }
      }
    };

    const cleanText = (html) => { const tmp = document.createElement('div'); tmp.innerHTML = html; return tmp.textContent || tmp.innerText || ''; };

    // 3. The Smart Compiler Loop
    outputData.blocks.forEach(block => {
      try {
        switch (block.type) {
          case 'paragraph': 
            if (block.data.text) docDefinition.content.push({ text: cleanText(block.data.text), style: 'paragraph' }); 
            break;
            
          case 'header': 
            if (block.data.text) docDefinition.content.push({ text: cleanText(block.data.text), style: 'h' + block.data.level }); 
            break;
            
          case 'list':
            if (block.data.items && block.data.items.length > 0) {
              const items = block.data.items.map(i => { const itemText = typeof i === 'object' ? (i.content || '') : i; return cleanText(itemText) || ' '; }); 
              if (block.data.style === 'ordered') docDefinition.content.push({ ol: items, style: 'list' }); 
              else docDefinition.content.push({ ul: items, style: 'list' });
            }
            break;
            
          case 'code': 
            if (block.data.code) docDefinition.content.push({ text: cleanText(block.data.code), style: 'code' }); 
            break;
            
          case 'draw': 
            if (block.data.image) {
              // FIX 2: Replaced 'width: 515' with 'fit: [515, 700]' to prevent tall mobile screens from overflowing the A4 page height
              docDefinition.content.push({ image: block.data.image, fit: [515, 700], alignment: 'center', margin: [0, 10, 0, 15] }); 
            }
            break;
            
          case 'image':
            const imgUrl = block.data.file ? block.data.file.url : block.data.url;
            if (imgUrl && imgUrl.startsWith('data:image')) {
              // FIX 2: Applied the same fit constraint to standard images
              docDefinition.content.push({ image: imgUrl, fit: [515, 700], alignment: 'center', margin: [0, 10, 0, 15] });
            } else {
              docDefinition.content.push({ text: `[ Image linked from OS ]`, color: '#888888', italics: true, margin: [0, 5, 0, 15] });
            }
            break;
            
          case 'table':
            if (block.data.content && block.data.content.length > 0) {
              const tableBody = block.data.content.map(row => row.map(cell => cleanText(cell) || ' '));
              const colWidths = Array(tableBody[0].length).fill('*');
              
              docDefinition.content.push({ 
                table: { 
                  widths: colWidths, 
                  body: tableBody 
                }, 
                layout: 'lightHorizontalLines',
                margin: [0, 10, 0, 15] 
              });
            }
            break;
            
          default:
            docDefinition.content.push({ text: `[ ${block.type} attachment saved in CMS ]`, color: '#888888', italics: true, margin: [0, 5, 0, 15] });
        }
      } catch (err) { console.log("Safely skipped a broken block", err); }
    });

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.getBase64(async (base64Data) => {
      try {
        if (window.Capacitor && window.Capacitor.Plugins.Filesystem) {
          await window.Capacitor.Plugins.Filesystem.writeFile({ path: fileName, data: base64Data, directory: 'DOCUMENTS' });
          alert('Success! Native PDF compiled and saved to Documents:\n' + fileName);
        } else { pdfDocGenerator.download(fileName); }
      } catch (err) { alert('Android OS Write Error: ' + err.message); }
      exportBtn.innerText = originalText; exportBtn.disabled = false;
    });
  } catch (error) { alert("System Error compiling PDF: " + error.message); exportBtn.innerText = originalText; exportBtn.disabled = false; }
});
// --- 11.5 PLAIN TEXT EXPORT ENGINE ---
document.getElementById('export-txt-btn').addEventListener('click', async () => {
  const exportBtn = document.getElementById('export-txt-btn');
  const originalText = exportBtn.innerText;
  exportBtn.innerText = "Extracting..."; 
  exportBtn.disabled = true;

  try {
    const outputData = await editor.save();
    
    // 1. Figure out the file name
    const titleText = getDocumentTitle(outputData);
    const suggestedName = titleText.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    let customName = prompt("Name your Plain Text file:", suggestedName);
    if (!customName) { exportBtn.innerText = originalText; exportBtn.disabled = false; return; }
    
    const fileName = customName.endsWith('.txt') ? customName : customName + '.txt';

    // 2. Helper function to strip out bold/italic/underline HTML tags
    const cleanText = (html) => { 
        const tmp = document.createElement('div'); 
        tmp.innerHTML = html; 
        return tmp.textContent || tmp.innerText || ''; 
    };

    let plainText = "";

    // 3. The Extraction Loop
    outputData.blocks.forEach(block => {
      try {
        switch (block.type) {
          case 'paragraph': 
          case 'header': 
            plainText += cleanText(block.data.text) + "\n\n";
            break;
            
          case 'list':
            if (block.data.items && block.data.items.length > 0) {
              block.data.items.forEach((item, index) => {
                const itemText = cleanText(typeof item === 'object' ? (item.content || '') : item);
                const prefix = block.data.style === 'ordered' ? `${index + 1}. ` : "- ";
                plainText += prefix + itemText + "\n";
              });
              plainText += "\n";
            }
            break;
            
          case 'code': 
            plainText += "--- CODE ---\n" + cleanText(block.data.code) + "\n------------\n\n";
            break;
            
          case 'table':
            if (block.data.content && block.data.content.length > 0) {
              block.data.content.forEach(row => {
                 const rowText = row.map(cell => cleanText(cell)).join(" | ");
                 plainText += rowText + "\n";
              });
              plainText += "\n";
            }
            break;
            
          case 'image':
          case 'draw':
          case 'audio':
            // We can't save pictures in a .txt file, so we leave a placeholder!
            plainText += `[ Media Attachment: ${block.type} ]\n\n`;
            break;
        }
      } catch (err) { console.log("Safely skipped a broken block", err); }
    });

    // Clean up trailing empty space
    plainText = plainText.trim();

    // 4. Save to Android OS or Desktop
    if (window.Capacitor && window.Capacitor.Plugins.Filesystem) {
      await window.Capacitor.Plugins.Filesystem.writeFile({ 
          path: fileName, 
          data: plainText, 
          directory: 'DOCUMENTS',
          encoding: 'utf8'
      });
      alert('Success! Plain Text file saved to Documents:\n' + fileName);
    } else { 
        // Desktop Browser Fallback
        const a = document.createElement('a');
        a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(plainText);
        a.download = fileName;
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a);
    }
  } catch (error) { 
      alert("System Error extracting text: " + error.message); 
  } finally {
      exportBtn.innerText = originalText; 
      exportBtn.disabled = false; 
  }
});
// --- 12. GHOST UX: PRECISION SLIDER ISOLATION ---
window.addEventListener('load', () => {
  const allSliders = document.querySelectorAll('input[type="range"]');
  allSliders.forEach(slider => {
    const parentRow = slider.closest('.typo-row');
    const startSlide = () => { document.body.classList.add('is-sliding'); if (parentRow) parentRow.classList.add('active-slider-row'); };
    const stopSlide = () => { document.body.classList.remove('is-sliding'); if (parentRow) parentRow.classList.remove('active-slider-row'); };
    slider.addEventListener('touchstart', startSlide, {passive: true}); slider.addEventListener('mousedown', startSlide);
    slider.addEventListener('touchend', stopSlide); slider.addEventListener('mouseup', stopSlide); slider.addEventListener('touchcancel', stopSlide);
  });
});
// --- 13. ZEN FOCUS MODE ENGINE ---
const zenBtn = document.getElementById('zen-mode-btn');
const exitZenBtn = document.getElementById('exit-zen-btn');

if (zenBtn && exitZenBtn) {
  zenBtn.addEventListener('click', () => {
    document.body.classList.add('zen-mode');
    
    // Close the mobile dropdown menu if it was open when triggering Zen Mode
    const mobileDropdown = document.querySelector('.mobile-top-dropdown');
    if (mobileDropdown) mobileDropdown.classList.remove('open');
  });

  exitZenBtn.addEventListener('click', () => {
    document.body.classList.remove('zen-mode');
  });
}