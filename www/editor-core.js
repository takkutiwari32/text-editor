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
      let fileName = payload.isSaveAs ? null : window.currentOpenFile;
      if (!fileName) {
        const suggestedName = payload.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const promptMessage = payload.isSaveAs ? "SAVE AS - Enter a name for the new copy:" : "Name your save file (it will be saved to your Documents folder):";
        let customName = prompt(promptMessage, suggestedName);
        if (!customName) return; 
        fileName = customName.endsWith('.json') ? customName : customName + '.json';
      }
      const fullPackage = { articleTitle: payload.title, fileName: fileName, editorData: payload.content };
      const fileContent = JSON.stringify(fullPackage, null, 2);

      try {
        if (window.Capacitor && window.Capacitor.Plugins.Filesystem) {
          window.Capacitor.Plugins.Filesystem.writeFile({
            path: fileName, data: fileContent, directory: 'DOCUMENTS', encoding: 'utf8'
          }).then(() => {
            window.currentOpenFile = fileName;
            alert('Hardware Sync Complete!\nSuccessfully saved to Documents: ' + fileName);
          }).catch((err) => { alert('Android OS Write Error: ' + err.message); });
        } else {
          window.currentOpenFile = fileName;
          const a = document.createElement('a');
          a.href = "data:text/json;charset=utf-8," + encodeURIComponent(fileContent);
          a.download = fileName;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }
      } catch (error) { alert("System Error: " + error.message); }
    }
  },
  on: () => {}
};

const shell = { openExternal: (url) => window.open(url, '_blank') };
const os = { release: () => 'android' };

// --- GLOBAL HAPTIC ENGINE ---
const triggerHaptic = () => { if(navigator.vibrate) navigator.vibrate(15); };

// --- BYOK: LOCAL STORAGE ENGINE & FIRST-BOOT INTERCEPTOR ---
function getLocalApiKey() { return localStorage.getItem('gemini_api_key') || ''; }

window.addEventListener('DOMContentLoaded', () => {
  const existingKey = getLocalApiKey();
  if (!existingKey) { document.getElementById('api-modal').style.display = 'flex'; }
});

document.getElementById('get-key-btn').addEventListener('click', () => {
  triggerHaptic();
  const targetUrl = 'https://aistudio.google.com/app/apikey';
  if (os.release().toLowerCase().includes('microsoft') || os.release().toLowerCase().includes('wsl')) { exec(`explorer.exe "${targetUrl}"`); } 
  else { shell.openExternal(targetUrl); }
});

document.getElementById('settings-btn').addEventListener('click', () => {
  triggerHaptic();
  document.getElementById('api-key-input').value = getLocalApiKey();
  document.getElementById('api-modal').style.display = 'flex';
});

document.getElementById('close-modal-btn').addEventListener('click', () => { triggerHaptic(); document.getElementById('api-modal').style.display = 'none'; });

document.getElementById('save-api-btn').addEventListener('click', () => {
  triggerHaptic();
  const newKey = document.getElementById('api-key-input').value.trim();
  if (!newKey) { alert("Please paste a valid API key first."); return; }
  localStorage.setItem('gemini_api_key', newKey);
  document.getElementById('api-modal').style.display = 'none';
  alert('Hardware Sync Complete: Pro CMS AI Engine is now online.');
});

// --- 1. CUSTOM AUDIO ENGINE (NATIVE FILE PICKER) ---
class SimpleAudioTool {
  static get toolbox() { return { title: 'Audio', icon: '🎵' }; }
  
  constructor({data}) { 
    this.data = data || {}; 
  }

  render() {
    this.wrapper = document.createElement('div');
    this.wrapper.style.padding = '15px'; 
    this.wrapper.style.background = '#161b22'; 
    this.wrapper.style.border = this.data.url ? '1px solid #30363d' : '2px dashed #30363d'; 
    this.wrapper.style.borderRadius = '8px';
    this.wrapper.style.textAlign = 'center';

    this.audioPlayer = document.createElement('audio'); 
    this.audioPlayer.controls = true; 
    this.audioPlayer.style.width = '100%'; 
    this.audioPlayer.style.display = this.data.url ? 'block' : 'none';
    this.audioPlayer.style.outline = 'none';

    this.placeholder = document.createElement('div');
    this.placeholder.innerHTML = '🎵 Tap to Select Audio File';
    this.placeholder.style.padding = '20px';
    this.placeholder.style.color = '#58a6ff';
    this.placeholder.style.fontWeight = 'bold';
    this.placeholder.style.cursor = 'pointer';
    this.placeholder.style.display = this.data.url ? 'none' : 'block';

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'audio/*';
    this.fileInput.style.display = 'none';

    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          this.data.url = event.target.result;
          this.audioPlayer.src = this.data.url;
          this.audioPlayer.style.display = 'block';
          this.placeholder.style.display = 'none';
          this.wrapper.style.border = '1px solid #30363d';
          this.wrapper.dispatchEvent(new Event('input', { bubbles: true }));
        };
        reader.readAsDataURL(file);
      }
    });

    this.placeholder.addEventListener('click', () => { triggerHaptic(); this.fileInput.click(); });
    if (this.data && this.data.url) { this.audioPlayer.src = this.data.url; }

    this.wrapper.appendChild(this.placeholder);
    this.wrapper.appendChild(this.fileInput);
    this.wrapper.appendChild(this.audioPlayer); 
    
    return this.wrapper;
  }
  
  save() { return { url: this.data.url || '' }; }
}

// --- 2. CUSTOM DRAWING ENGINE (PRO UI) ---
class SimpleDrawTool {
  static get toolbox() { return { title: 'Draw', icon: '🖍️' }; }
  
  constructor({data}) { 
    this.data = data || {}; 
    this.wrapper = null;
    this.imagePreview = null;
    this.placeholder = null;
    this.editBtn = null;
  }

  render() {
    this.wrapper = document.createElement('div');
    this.wrapper.style.width = '100%';
    this.wrapper.style.textAlign = 'center';
    this.wrapper.style.position = 'relative'; // Required for absolute positioning of the overlay

    this.imagePreview = document.createElement('img');
    this.imagePreview.style.width = '100%'; 
    this.imagePreview.style.height = 'auto'; 
    this.imagePreview.style.display = this.data.image ? 'block' : 'none';
    this.imagePreview.style.borderRadius = '8px';
    this.imagePreview.style.border = '1px solid var(--border-color)';

    this.placeholder = document.createElement('div');
    this.placeholder.innerHTML = '🖍️ Tap to Draw';
    this.placeholder.style.padding = '40px';
    this.placeholder.style.background = '#161b22';
    this.placeholder.style.border = '2px dashed #30363d';
    this.placeholder.style.borderRadius = '8px';
    this.placeholder.style.color = '#58a6ff';
    this.placeholder.style.fontWeight = 'bold';
    this.placeholder.style.cursor = 'pointer';
    this.placeholder.contentEditable = 'false'; 
    this.placeholder.style.display = this.data.image ? 'none' : 'block';

    /* THE FIX: Floating Top-Right Pill Overlay */
    this.editBtn = document.createElement('button');
    this.editBtn.type = 'button'; 
    this.editBtn.contentEditable = 'false'; 
    this.editBtn.innerHTML = '✎ Edit';
    this.editBtn.style.position = 'absolute';
    this.editBtn.style.top = '10px';
    this.editBtn.style.right = '10px';
    this.editBtn.style.padding = '6px 14px';
    this.editBtn.style.background = 'rgba(16, 20, 26, 0.85)';
    this.editBtn.style.color = '#58a6ff';
    this.editBtn.style.border = '1px solid rgba(88, 166, 255, 0.3)';
    this.editBtn.style.borderRadius = '20px';
    this.editBtn.style.backdropFilter = 'blur(8px)';
    this.editBtn.style.fontWeight = 'bold';
    this.editBtn.style.fontSize = '0.85rem';
    this.editBtn.style.cursor = 'pointer';
    this.editBtn.style.zIndex = '5';
    this.editBtn.style.display = this.data.image ? 'block' : 'none';

    if (this.data.image) this.imagePreview.src = this.data.image;

    this.wrapper.appendChild(this.imagePreview);
    this.wrapper.appendChild(this.editBtn);
    this.wrapper.appendChild(this.placeholder);

    // Event Shields
    const preventHijack = (e) => e.stopPropagation();
    
    this.placeholder.addEventListener('mousedown', preventHijack);
    this.placeholder.addEventListener('pointerdown', preventHijack);
    this.placeholder.addEventListener('touchstart', preventHijack, { passive: true });
    this.placeholder.addEventListener('click', (e) => { 
        e.preventDefault(); e.stopPropagation();
        triggerHaptic(); this.openFullScreenEditor(); 
    });
    
    this.editBtn.addEventListener('mousedown', preventHijack);
    this.editBtn.addEventListener('pointerdown', preventHijack);
    this.editBtn.addEventListener('touchstart', preventHijack, { passive: true });
    this.editBtn.addEventListener('click', (e) => { 
        e.preventDefault(); e.stopPropagation();
        triggerHaptic(); this.openFullScreenEditor(); 
    });

    if (!this.data.image) { setTimeout(() => { this.openFullScreenEditor(); }, 50); }
    return this.wrapper;
  }

  openFullScreenEditor() {
    const modal = document.getElementById('draw-modal');
    const container = document.getElementById('draw-canvas-container');
    const oldCanvas = document.getElementById('fullscreen-draw-canvas');
    const cancelBtn = document.getElementById('draw-cancel-btn');
    const saveBtn = document.getElementById('draw-save-btn');
    
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

    let currentTool = 'pen';
    let currentColor = '#000000';
    let currentWidth = 4;
    let activeToolBtn = null;
    let activeColorBtn = null;
    let activeWidthBtn = null;

    const hexToRgba = (hex, alpha) => {
        let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const updateContext = () => {
        if (currentTool === 'eraser') {
            ctx.strokeStyle = '#ffffff';
            ctx.globalCompositeOperation = "source-over";
            ctx.lineWidth = currentWidth * 3;
        } else if (currentTool === 'highlighter') {
            ctx.strokeStyle = hexToRgba(currentColor, 0.4);
            ctx.globalCompositeOperation = "multiply"; 
            ctx.lineWidth = currentWidth * 4;
        } else {
            ctx.strokeStyle = currentColor;
            ctx.globalCompositeOperation = "source-over";
            ctx.lineWidth = currentWidth;
        }
    };

    primaryToolsDiv.innerHTML = '';
    const tools = [
        { id: 'pen', icon: 'M12 19l7-7 3 3-7 7-3-3z M18 13l-1.5-1.5 L17 10l1.5 1.5z M2 22h4l11-11-4-4L2 18v4z' },
        { id: 'highlighter', icon: 'M17.5 2.5h-5l-5 5v5l5 5h5l5-5v-5l-5-5z M12.5 7.5l-5 5 M10 15H2v7h7v-7z' },
        { id: 'eraser', icon: 'M20 20H7L3 16c-1.5-1.5-1.5-3.5 0-5L13 1 22 10l-10 10V10' }
    ];

    tools.forEach(t => {
        const btn = document.createElement('div');
        btn.style.width = '40px'; btn.style.height = '40px';
        btn.style.display = 'flex'; btn.style.justifyContent = 'center'; btn.style.alignItems = 'center';
        btn.style.cursor = 'pointer';
        btn.style.borderRadius = '8px';
        
        const indicator = document.createElement('div');
        indicator.style.position = 'absolute';
        indicator.style.bottom = '-10px';
        indicator.style.width = '20px';
        indicator.style.height = '3px';
        indicator.style.borderRadius = '2px';
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
            triggerHaptic();
            if (currentTool === t.id) {
                optionsDrawer.style.display = optionsDrawer.style.display === 'none' ? 'flex' : 'none';
                return;
            }
            currentTool = t.id;
            if (activeToolBtn) {
                activeToolBtn.querySelector('svg').style.stroke = '#8b949e';
                activeToolBtn.querySelector('div').style.background = 'transparent';
            }
            btn.querySelector('svg').style.stroke = '#58a6ff';
            indicator.style.background = '#58a6ff';
            activeToolBtn = btn;
            optionsDrawer.style.display = 'flex';
            colorPaletteDiv.style.display = (currentTool === 'eraser') ? 'none' : 'flex';
            updateContext();
        };
        primaryToolsDiv.appendChild(btn);
    });

    colorPaletteDiv.innerHTML = '';
    const palette = ['#000000', '#ff5252', '#fbc02d', '#4caf50', '#2196f3', '#9c27b0', '#795548', '#ffffff'];
    palette.forEach((color, i) => {
        const cBtn = document.createElement('div');
        cBtn.style.minWidth = '28px'; cBtn.style.height = '28px';
        cBtn.style.borderRadius = '50%'; cBtn.style.backgroundColor = color;
        cBtn.style.cursor = 'pointer';
        cBtn.style.border = '2px solid #30363d';
        if (i === 0) { cBtn.style.borderColor = '#58a6ff'; activeColorBtn = cBtn; }

        cBtn.onclick = () => {
            triggerHaptic();
            currentColor = color;
            if (activeColorBtn) activeColorBtn.style.borderColor = '#30363d';
            cBtn.style.borderColor = '#58a6ff';
            activeColorBtn = cBtn;
            updateContext();
        };
        colorPaletteDiv.appendChild(cBtn);
    });

    widthSelectorDiv.innerHTML = '';
    const widths = [2, 4, 8, 14, 22, 32];
    widths.forEach((w) => {
        const wBtn = document.createElement('div');
        wBtn.style.width = '30px'; wBtn.style.height = '30px';
        wBtn.style.display = 'flex'; wBtn.style.justifyContent = 'center'; wBtn.style.alignItems = 'center';
        wBtn.style.cursor = 'pointer';
        
        const dot = document.createElement('div');
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = '#8b949e';
        const displaySize = Math.max(4, Math.min(24, w)); 
        dot.style.width = displaySize + 'px';
        dot.style.height = displaySize + 'px';
        dot.style.transition = 'all 0.2s';
        wBtn.appendChild(dot);

        if (w === 4) {
            dot.style.backgroundColor = '#ffffff';
            dot.style.boxShadow = '0 0 0 2px #0d1117, 0 0 0 4px #ffffff';
            activeWidthBtn = dot;
        }

        wBtn.onclick = () => {
            triggerHaptic();
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

    updateContext();
    optionsDrawer.style.display = 'flex';

    let isDrawing = false;
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDraw = (e) => { 
        if (e.touches && e.touches.length > 1) { isDrawing = false; return; }
        isDrawing = true; 
        const pos = getPos(e); 
        ctx.beginPath(); 
        ctx.moveTo(pos.x, pos.y); 
        if(optionsDrawer.style.display === 'flex') optionsDrawer.style.display = 'none';
    };
    const draw = (e) => { 
        if (!isDrawing) return; 
        if (e.touches && e.touches.length > 1) { isDrawing = false; ctx.closePath(); return; }
        e.preventDefault(); 
        const pos = getPos(e); 
        ctx.lineTo(pos.x, pos.y); 
        ctx.stroke(); 
    };
    const stopDraw = () => { isDrawing = false; ctx.closePath(); };

    canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw); canvas.addEventListener('mouseout', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false }); canvas.addEventListener('touchmove', draw, { passive: false }); canvas.addEventListener('touchend', stopDraw);

    cancelBtn.onclick = () => { triggerHaptic(); modal.style.display = 'none'; };
    
    saveBtn.onclick = () => {
      triggerHaptic();
      ctx.globalCompositeOperation = "source-over"; 
      this.data.image = canvas.toDataURL('image/png');
      this.imagePreview.src = this.data.image;
      this.imagePreview.style.display = 'block';
      this.editBtn.style.display = 'block';
      this.placeholder.style.display = 'none'; 
      this.wrapper.dispatchEvent(new Event('input', { bubbles: true }));
      modal.style.display = 'none';
    };
  }
  save() { return { image: this.data.image || '' }; }
}

// --- 2.5 CUSTOM MOBILE TABLE ENGINE ---
class MobileTableTool {
  static get toolbox() { return { title: 'Table', icon: '⊞' }; }
  
  constructor({ data }) {
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
    this.wrapper.innerHTML = '';
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'custom-table-scroll';
    const table = document.createElement('table');
    table.className = 'custom-table';

    this.data.content.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      row.forEach((cellText, colIndex) => {
        const td = document.createElement('td');
        td.innerHTML = cellText ? cellText : '<span style="color:#bbb; font-style:italic;">Empty</span>';
        td.onclick = () => { triggerHaptic(); this.openEditor(rowIndex, colIndex); };
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    scrollContainer.appendChild(table);
    this.wrapper.appendChild(scrollContainer);

    const controls = document.createElement('div');
    controls.className = 'custom-table-controls';

    const addColBtn = document.createElement('button');
    addColBtn.className = 'custom-table-btn';
    addColBtn.innerText = '+ Column';
    addColBtn.onclick = () => { triggerHaptic(); this.data.content.forEach(row => row.push('')); this.drawGrid(); };

    const addRowBtn = document.createElement('button');
    addRowBtn.className = 'custom-table-btn';
    addRowBtn.innerText = '+ Row';
    addRowBtn.onclick = () => { triggerHaptic(); this.data.content.push(new Array(this.data.content[0].length).fill('')); this.drawGrid(); };

    controls.appendChild(addRowBtn);
    controls.appendChild(addColBtn);
    this.wrapper.appendChild(controls);
  }

  openEditor(r, c) {
    const modal = document.getElementById('cell-edit-modal');
    const input = document.getElementById('cell-edit-input');
    const saveBtn = document.getElementById('cell-save-btn');
    const cancelBtn = document.getElementById('cell-cancel-btn');
    document.getElementById('cell-edit-title').innerText = `Edit Row ${r + 1}, Column ${c + 1}`;
    input.value = this.data.content[r][c] || '';
    modal.style.display = 'flex';
    input.focus();

    saveBtn.onclick = null; cancelBtn.onclick = null;
    cancelBtn.onclick = () => { triggerHaptic(); modal.style.display = 'none'; };
    saveBtn.onclick = () => { triggerHaptic(); this.data.content[r][c] = input.value.trim(); modal.style.display = 'none'; this.drawGrid(); };
  }
  save() { return { content: this.data.content }; }
}

let undo;

// --- THE NEW AUTO-SAVE ENGINE & INIT ---
const editor = new EditorJS({
  holder: 'editor-container', 
  placeholder: 'Start writing your document...',
  tools: {
    header: { class: Header, inlineToolbar: ['link', 'bold', 'italic', 'underline', 'Marker'] },
    list: { class: EditorjsList, inlineToolbar: true }, code: { class: CodeTool }, table: MobileTableTool, Marker: { class: Marker }, underline: { class: Underline },
    image: { class: ImageTool, config: { uploader: { uploadByFile(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve({ success: 1, file: { url: reader.result } }); reader.onerror = error => reject(error); }); } } } },
    audio: SimpleAudioTool, draw: SimpleDrawTool    
  },
  onReady: () => {
    undo = new Undo({ editor });
  },
  onChange: () => {
    editor.save().then((outputData) => {
      // Silent Local Backup
      localStorage.setItem('pro_cms_autosave', JSON.stringify(outputData));
      
      // Visual Save Indicator
      const statusIndicator = document.getElementById('save-status-indicator');
      if(statusIndicator) {
          statusIndicator.innerText = "Saving...";
          setTimeout(() => { statusIndicator.innerText = "Draft: Auto-Saved"; }, 500);
      }

      // Stats
      let text = ''; outputData.blocks.forEach(block => { if (block.data.text) text += block.data.text.replace(/<[^>]*>?/gm, '') + ' '; });
      const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
      const wordCountSpan = document.getElementById('word-count');
      const readTimeSpan = document.getElementById('read-time');
      if(wordCountSpan) wordCountSpan.innerText = words; 
      if(readTimeSpan) readTimeSpan.innerText = Math.max(1, Math.ceil(words / 200)) + ' min';
    });
  }
});

// --- 4. WIRING UP THE GUI BUTTONS ---
const bindTool = (id, tool) => { document.getElementById(id).addEventListener('click', () => { triggerHaptic(); editor.blocks.insert(tool); }); };
bindTool('tool-header', 'header'); bindTool('tool-image', 'image'); bindTool('tool-code', 'code'); 
bindTool('tool-table', 'table'); bindTool('tool-list', 'list'); bindTool('tool-audio', 'audio'); bindTool('tool-draw', 'draw');

document.getElementById('undo-btn').addEventListener('click', () => { triggerHaptic(); if(undo) undo.undo(); });
document.getElementById('redo-btn').addEventListener('click', () => { triggerHaptic(); if(undo) undo.redo(); });

// --- 5. PUBLISH LOGIC (SAVE & SAVE AS) ---
const getDocumentTitle = (outputData) => {
  if (outputData.blocks && outputData.blocks.length > 0 && outputData.blocks[0].data && outputData.blocks[0].data.text) {
    const tmp = document.createElement('div');
    tmp.innerHTML = outputData.blocks[0].data.text;
    return (tmp.textContent || tmp.innerText || '').substring(0, 30).trim() || "Untitled_Document";
  }
  return "Untitled_Document";
};

document.getElementById('publish-btn').addEventListener('click', () => {
  triggerHaptic();
  editor.save().then((outputData) => { ipcRenderer.send('save-article', { title: getDocumentTitle(outputData), content: outputData, isSaveAs: false }); });
});

document.getElementById('save-as-btn').addEventListener('click', () => {
  triggerHaptic();
  editor.save().then((outputData) => { ipcRenderer.send('save-article', { title: getDocumentTitle(outputData), content: outputData, isSaveAs: true }); });
});

ipcRenderer.on('save-response', (event, response) => {
  if(response.success) { alert('Success! Article physically saved to your OS at:\n' + response.path); } else { alert('System Error saving file: ' + response.error); }
});

// --- 6. TYPOGRAPHY ENGINE ---
let selectionTimeout;
document.addEventListener('selectionchange', () => {
  clearTimeout(selectionTimeout);
  selectionTimeout = setTimeout(() => {
    const activeId = document.activeElement ? document.activeElement.id : '';
    if (['style-color', 'style-size', 'style-font'].includes(activeId)) return;

    const selection = window.getSelection();
    const oldTarget = document.getElementById('pending-style-target');
    
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      if (oldTarget) { oldTarget.removeAttribute('id'); oldTarget.style.backgroundColor = 'transparent'; }
      return;
    }

    const range = selection.getRangeAt(0);
    if (!range.commonAncestorContainer.parentElement || !range.commonAncestorContainer.parentElement.closest('.ce-block')) return;

    if (oldTarget) { oldTarget.removeAttribute('id'); oldTarget.style.backgroundColor = 'transparent'; }

    const span = document.createElement('span'); 
    span.id = 'pending-style-target'; 
    span.style.backgroundColor = 'rgba(248, 81, 73, 0.2)'; 
    
    try { span.appendChild(range.extractContents()); range.insertNode(span); } catch (err) {}
  }, 400); 
});

function applyTypography(type, value) {
  const targetSpan = document.getElementById('pending-style-target'); 
  if (!targetSpan) { alert("Please highlight some text in the editor first!"); return; }
  if (type === 'color') targetSpan.style.color = value; 
  if (type === 'size') targetSpan.style.fontSize = value; 
  if (type === 'font') targetSpan.style.fontFamily = value;
  targetSpan.style.backgroundColor = 'transparent';
  const activeBlock = targetSpan.closest('.cdx-block');
  if (activeBlock) activeBlock.dispatchEvent(new Event('input', { bubbles: true }));
}

document.getElementById('style-color').addEventListener('input', (e) => { applyTypography('color', e.target.value); });
document.getElementById('style-size').addEventListener('change', (e) => { applyTypography('size', e.target.value); });
document.getElementById('style-size').addEventListener('keydown', (e) => { if (e.key === 'Enter') applyTypography('size', e.target.value); });
document.getElementById('style-font').addEventListener('change', (e) => { applyTypography('font', e.target.value); });


// --- 7. THE NEW PREMIUM AI NEXUS ENGINE (GLOBAL OVERRIDE) ---
let lastActiveBlock = null;
document.addEventListener('click', (e) => { const block = e.target.closest('.cdx-block'); if (block) lastActiveBlock = block; });
document.addEventListener('keyup', (e) => { const block = e.target.closest('.cdx-block'); if (block) lastActiveBlock = block; });

// FAB Toggle
document.getElementById('ai-nexus-fab').addEventListener('click', () => {
    triggerHaptic();
    document.getElementById('ai-nexus-popup').classList.toggle('open');
});

// AI Grammar Fix (Kept isolated to active block to avoid losing formatting)
document.getElementById('ai-grammar-btn').addEventListener('click', async () => {
  triggerHaptic();
  if (!lastActiveBlock) { alert("Please tap inside a paragraph first."); return; }
  const originalText = lastActiveBlock.innerText.trim(); if (!originalText) return;
  
  const grammarBtn = document.getElementById('ai-grammar-btn'); 
  const originalBtnText = grammarBtn.innerText;
  grammarBtn.innerText = "✨ Processing..."; grammarBtn.style.opacity = "0.7";
  
  const strictPrompt = "You are a strict proofreader. Fix all spelling and grammar errors in the following text. Do not add any conversational filler. Do not explain the changes. Do not use quotes. Return strictly the corrected text and nothing else. Text: " + originalText;
  try {
    const data = await ipcRenderer.invoke('fetch-cloud-ai', { prompt: strictPrompt, apiKey: getLocalApiKey() });
    if (data.error) { grammarBtn.innerText = "API Error"; alert(data.error); } 
    else { 
        lastActiveBlock.innerHTML = data.response.trim(); 
        lastActiveBlock.dispatchEvent(new Event('input', { bubbles: true })); 
        grammarBtn.innerText = "✨ Grammar Fixed!"; 
    }
  } catch (error) { grammarBtn.innerText = "Bridge Offline"; }
  
  setTimeout(() => { grammarBtn.innerText = originalBtnText; grammarBtn.style.opacity = "1"; }, 2500);
});

// Contextual AI Format Input
document.getElementById('ai-format-btn').addEventListener('click', () => {
  triggerHaptic();
  const container = document.getElementById('ai-format-input-wrapper');
  container.style.display = container.style.display === 'block' ? 'none' : 'block';
  if(container.style.display === 'block') document.getElementById('ai-format-input').focus();
});

// Safe DOM Injection targeting contenteditable, NOT the structural block wrappers
document.getElementById('ai-format-input').addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return;
  const command = e.target.value.trim();
  if (!command) return;
  
  const formatBtn = document.getElementById('ai-format-btn'); 
  const originalBtnText = formatBtn.innerText; 
  
  formatBtn.innerText = "🎨 Formatting Canvas..."; formatBtn.style.opacity = "0.7";
  e.target.disabled = true;

  const strictPrompt = "You are a CSS inline-style generator. The user command is: '" + command + "'. Return ONLY a valid CSS inline style string (e.g., color: red; font-weight: bold;). Do not include HTML tags, no markdown formatting, no explanations. Just the CSS properties.";
  
  try {
    const data = await ipcRenderer.invoke('fetch-cloud-ai', { prompt: strictPrompt, apiKey: getLocalApiKey() });
    if (data.error) { formatBtn.innerText = "API Error"; alert(data.error); } 
    else { 
        let generatedCSS = data.response.replace(/```(css)?/gi, '').replace(/`/g, '').replace(/"/g, "'").trim();
        
        // Target only the exact text containers to prevent Editor.js from corrupting
        const editableElements = document.querySelectorAll('[contenteditable="true"]');
        if(editableElements.length === 0) { alert("No text to format!"); }
        
        editableElements.forEach(el => {
            const currentHTML = el.innerHTML;
            if (currentHTML) {
                // Safely wrap text without destroying Editor.js hooks
                el.innerHTML = `<span style="${generatedCSS}">${currentHTML}</span>`;
                el.dispatchEvent(new Event('input', { bubbles: true })); 
            }
        });

        formatBtn.innerText = "🎨 Format Applied!"; 
        e.target.value = '';
        document.getElementById('ai-format-input-wrapper').style.display = 'none';
        document.getElementById('ai-nexus-popup').classList.remove('open');
    }
  } catch (error) { formatBtn.innerText = "Bridge Offline"; }
  
  e.target.disabled = false;
  setTimeout(() => { formatBtn.innerText = originalBtnText; formatBtn.style.opacity = "1"; }, 2500);
});

// Ghost Auto-Correct
let isGhostEngineActive = false; let ghostTypingTimer; const GHOST_PAUSE_DURATION = 3000; 
document.getElementById('ai-auto-toggle').addEventListener('change', (e) => {
  triggerHaptic();
  isGhostEngineActive = e.target.checked; 
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
    } catch (error) {}
    activeBlock.style.backgroundColor = originalBg;
  }, GHOST_PAUSE_DURATION);
});

const widthSlider = document.getElementById('canvas-width-slider'); const widthDisplay = document.getElementById('width-display');
if(widthSlider && widthDisplay) { widthSlider.addEventListener('input', (e) => { document.documentElement.style.setProperty('--editor-width', e.target.value + '%'); widthDisplay.innerText = e.target.value + '%'; }); }

const lineHeightSlider = document.getElementById('line-height-slider'); const lineHeightDisplay = document.getElementById('line-height-display');
if (lineHeightSlider && lineHeightDisplay) { lineHeightSlider.addEventListener('input', (e) => { document.documentElement.style.setProperty('--editor-line-height', e.target.value); lineHeightDisplay.innerText = e.target.value; }); }

// --- 10. THE OS INTENT INTERCEPTOR (FILE READER) ---
async function loadFileFromOS(contentUrl) {
  try {
    if (contentUrl.toLowerCase().endsWith('.pdf')) {
      const modal = document.getElementById('pdf-modal');
      const spinnerOverlay = document.getElementById('pdf-loading-spinner');
      const spinnerText = document.getElementById('pdf-spinner-text');
      
      if(modal) modal.style.display = 'flex';
      
      if (spinnerOverlay) {
          spinnerOverlay.style.display = 'flex';
          if (spinnerText) spinnerText.innerText = "Loading massive file...";
      }

      await new Promise(resolve => setTimeout(resolve, 50));

      const result = await window.Capacitor.Plugins.Filesystem.readFile({
        path: contentUrl
      });
      
      if (spinnerText) spinnerText.innerText = "Decoding PDF...";
      await new Promise(resolve => setTimeout(resolve, 50));

      launchPdfAnnotator(result.data, contentUrl);
      return; 
    }

    const result = await window.Capacitor.Plugins.Filesystem.readFile({
      path: contentUrl,
      encoding: 'utf8'
    });
    
    let fileText = result.data;
    if (!fileText.trim().startsWith('{') && !fileText.includes(' ')) { try { fileText = atob(fileText); } catch(e) { } }
    
    let parsedData;
    try { parsedData = JSON.parse(fileText); } 
    catch (e) {
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
  } catch (error) { 
      alert('System Error unpacking file: ' + error.message); 
      const modal = document.getElementById('pdf-modal');
      if (modal) modal.style.display = 'none';
  }
}

if (window.Capacitor && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.getLaunchUrl().then(ret => { if (ret && ret.url) loadFileFromOS(ret.url); });
  window.Capacitor.Plugins.App.addListener('appUrlOpen', event => { if (event && event.url) loadFileFromOS(event.url); });
}

// --- 11. NATIVE VECTOR PDF EXPORT ENGINE ---
document.getElementById('export-pdf-btn').addEventListener('click', async () => {
  triggerHaptic();
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
              docDefinition.content.push({ image: block.data.image, fit: [515, 700], alignment: 'center', margin: [0, 10, 0, 15] }); 
            }
            break;
          case 'image':
            const imgUrl = block.data.file ? block.data.file.url : block.data.url;
            if (imgUrl && imgUrl.startsWith('data:image')) {
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
                table: { widths: colWidths, body: tableBody }, layout: 'lightHorizontalLines', margin: [0, 10, 0, 15] 
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
  triggerHaptic();
  const exportBtn = document.getElementById('export-txt-btn');
  const originalText = exportBtn.innerText;
  exportBtn.innerText = "Extracting..."; exportBtn.disabled = true;
  try {
    const outputData = await editor.save();
    const titleText = getDocumentTitle(outputData);
    const suggestedName = titleText.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    let customName = prompt("Name your Plain Text file:", suggestedName);
    if (!customName) { exportBtn.innerText = originalText; exportBtn.disabled = false; return; }
    const fileName = customName.endsWith('.txt') ? customName : customName + '.txt';

    const cleanText = (html) => { const tmp = document.createElement('div'); tmp.innerHTML = html; return tmp.textContent || tmp.innerText || ''; };
    let plainText = "";

    outputData.blocks.forEach(block => {
      try {
        switch (block.type) {
          case 'paragraph': 
          case 'header': 
            plainText += cleanText(block.data.text) + "\n\n"; break;
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
          case 'code': plainText += "--- CODE ---\n" + cleanText(block.data.code) + "\n------------\n\n"; break;
          case 'table':
            if (block.data.content && block.data.content.length > 0) {
              block.data.content.forEach(row => { plainText += row.map(cell => cleanText(cell)).join(" | ") + "\n"; });
              plainText += "\n";
            }
            break;
          case 'image': case 'draw': case 'audio':
            plainText += `[ Media Attachment: ${block.type} ]\n\n`; break;
        }
      } catch (err) { }
    });

    plainText = plainText.trim();
    if (window.Capacitor && window.Capacitor.Plugins.Filesystem) {
      await window.Capacitor.Plugins.Filesystem.writeFile({ path: fileName, data: plainText, directory: 'DOCUMENTS', encoding: 'utf8' });
      alert('Success! Plain Text file saved to Documents:\n' + fileName);
    } else { 
        const a = document.createElement('a');
        a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(plainText);
        a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
  } catch (error) { alert("System Error extracting text: " + error.message); } 
  finally { exportBtn.innerText = originalText; exportBtn.disabled = false; }
});

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
    triggerHaptic();
    document.body.classList.add('zen-mode');
    const mobileDropdown = document.querySelector('.mobile-top-dropdown');
    if (mobileDropdown) mobileDropdown.classList.remove('open');
  });
  exitZenBtn.addEventListener('click', () => { triggerHaptic(); document.body.classList.remove('zen-mode'); });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('zen-mode')) { document.body.classList.remove('zen-mode'); }
});

// --- 14. PDF ANNOTATOR ENGINE (OFF-SCREEN BUFFERING + ASYNC TEXT + PINCH ZOOM) ---
let activePdf = { 
  base64Data: null, originalPath: null, doc: null, 
  pageNum: 1, totalPages: 0, annotations: {},
  renderTask: null,
  zoomLevel: 1.0 
};
let currentRenderPage = 0; 

async function applyPdfZoom(newZoom) {
    activePdf.zoomLevel = Math.max(1.0, Math.min(newZoom, 5.0));
    const spinnerOverlay = document.getElementById('pdf-loading-spinner');
    const spinnerText = document.getElementById('pdf-spinner-text');

    if (spinnerOverlay) {
        spinnerOverlay.style.display = 'flex';
        spinnerOverlay.style.backgroundColor = 'rgba(16, 20, 26, 0.4)';
        if (spinnerText) spinnerText.innerText = "Enhancing Text...";
    }
    
    await new Promise(r => setTimeout(r, 10)); 
    
    await renderPdfPage(activePdf.pageNum);

    if (spinnerOverlay) {
        spinnerOverlay.style.display = 'none';
        spinnerOverlay.style.backgroundColor = 'rgba(16, 20, 26, 0.85)';
    }
}

async function launchPdfAnnotator(base64Data, filePath) {
  activePdf.base64Data = base64Data;
  activePdf.originalPath = filePath;
  activePdf.pageNum = 1;
  activePdf.zoomLevel = 1.0;
  currentRenderPage = 1;
  activePdf.annotations = {};
  if (activePdf.renderTask) activePdf.renderTask = null;

  const modal = document.getElementById('pdf-modal');
  const spinnerOverlay = document.getElementById('pdf-loading-spinner');
  if(modal) modal.style.display = 'flex';
  
  try {
    const res = await fetch("data:application/pdf;base64," + base64Data);
    const arrayBuffer = await res.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        cMapUrl: '[https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/](https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/)',
        cMapPacked: true,
    });
    
    activePdf.doc = await loadingTask.promise;
    activePdf.totalPages = activePdf.doc.numPages;
    const pageCountSpan = document.getElementById('pdf-page-count');
    if(pageCountSpan) pageCountSpan.innerText = activePdf.totalPages;
    
    await renderPdfPage(activePdf.pageNum);
    setupPdfDrawingTools();
    
    if (spinnerOverlay) spinnerOverlay.style.display = 'none';

  } catch (err) {
    if (spinnerOverlay) spinnerOverlay.style.display = 'none';
    alert("Error loading PDF: " + err.message);
    if(modal) modal.style.display = 'none';
  }
}

async function renderPdfPage(num) {
  currentRenderPage = num;
  const pageNumSpan = document.getElementById('pdf-page-num');
  if(pageNumSpan) {
      pageNumSpan.innerText = num;
      pageNumSpan.style.opacity = '0.5'; 
  }

  if (activePdf.renderTask) {
      await activePdf.renderTask.cancel();
      activePdf.renderTask = null;
  }

  const page = await activePdf.doc.getPage(num);
  if (currentRenderPage !== num) return; 

  const container = document.getElementById('pdf-canvas-container');
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const cssWidth = container.clientWidth - 40; 
  const baseFitScale = cssWidth / unscaledViewport.width;
  
  const finalScale = baseFitScale * (activePdf.zoomLevel || 1.0);
  const ratio = window.devicePixelRatio || 2; 
  
  const viewport = page.getViewport({ scale: finalScale * ratio }); 
  const cssViewport = page.getViewport({ scale: finalScale }); 
  
  const offScreenCanvas = document.createElement('canvas');
  const baseCtx = offScreenCanvas.getContext('2d');
  
  offScreenCanvas.width = viewport.width;
  offScreenCanvas.height = viewport.height;
  baseCtx.fillStyle = '#ffffff';
  baseCtx.fillRect(0, 0, offScreenCanvas.width, offScreenCanvas.height);
  
  const renderContext = { canvasContext: baseCtx, viewport: viewport };
  activePdf.renderTask = page.render(renderContext);
  
  try {
      await activePdf.renderTask.promise;
  } catch (err) {
      if (err.name === 'RenderingCancelledException') return; 
      console.error(err);
      return;
  }
  
  activePdf.renderTask = null;
  if (currentRenderPage !== num) return;

  const oldBaseCanvas = document.getElementById('pdf-base-canvas');
  offScreenCanvas.id = 'pdf-base-canvas';
  offScreenCanvas.style.display = 'block';
  offScreenCanvas.style.width = cssViewport.width + 'px';
  offScreenCanvas.style.height = cssViewport.height + 'px';
  
  if(oldBaseCanvas) oldBaseCanvas.parentNode.replaceChild(offScreenCanvas, oldBaseCanvas);
  
  const wrapper = document.getElementById('pdf-transform-wrapper');
  if(wrapper) {
      wrapper.style.transform = `scale(1)`;
  }

  const glassCanvas = document.getElementById('pdf-glass-canvas');
  if(glassCanvas) {
      glassCanvas.width = offScreenCanvas.width;
      glassCanvas.height = offScreenCanvas.height;
      glassCanvas.style.width = cssViewport.width + 'px';
      glassCanvas.style.height = cssViewport.height + 'px';
      
      const glassCtx = glassCanvas.getContext('2d');
      glassCtx.setTransform(1, 0, 0, 1, 0, 0);
      glassCtx.clearRect(0, 0, glassCanvas.width, glassCanvas.height);
      glassCtx.lineCap = 'round';
      glassCtx.lineJoin = 'round';

      if (activePdf.annotations && activePdf.annotations[num]) {
        const img = new Image();
        img.onload = () => glassCtx.drawImage(img, 0, 0, glassCanvas.width, glassCanvas.height);
        img.src = activePdf.annotations[num];
      }
  }

  if(pageNumSpan) pageNumSpan.style.opacity = '1';

  const textLayerDiv = document.getElementById('pdf-text-layer');
  if(textLayerDiv) {
      textLayerDiv.innerHTML = '';
      textLayerDiv.style.width = cssViewport.width + 'px';
      textLayerDiv.style.height = cssViewport.height + 'px';
      textLayerDiv.style.setProperty('--scale-factor', cssViewport.scale);

      page.getTextContent().then(textContent => {
          if (currentRenderPage !== num) return; 
          pdfjsLib.renderTextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport: cssViewport,
              textDivs: []
          }).promise.then(() => {
              if (currentRenderPage !== num) return;
              const spans = textLayerDiv.querySelectorAll('span');
              spans.forEach(span => { span.innerHTML += ' '; });
          });
      }).catch(e => console.warn("Text extraction aborted", e));
  }
}

function saveCurrentPageAnnotation() {
  const glassCanvas = document.getElementById('pdf-glass-canvas');
  if(glassCanvas) activePdf.annotations[activePdf.pageNum] = glassCanvas.toDataURL('image/png');
}

document.getElementById('pdf-prev-btn').addEventListener('click', () => {
  triggerHaptic();
  if (activePdf.pageNum <= 1) return;
  saveCurrentPageAnnotation();
  activePdf.pageNum--;
  renderPdfPage(activePdf.pageNum);
});

document.getElementById('pdf-next-btn').addEventListener('click', () => {
  triggerHaptic();
  if (activePdf.pageNum >= activePdf.totalPages) return;
  saveCurrentPageAnnotation();
  activePdf.pageNum++;
  renderPdfPage(activePdf.pageNum);
});

const pdfPageNumClickable = document.getElementById('pdf-page-num');
if(pdfPageNumClickable) {
    pdfPageNumClickable.addEventListener('click', () => {
        triggerHaptic();
        const jump = prompt(`Jump to page (1 - ${activePdf.totalPages}):`, activePdf.pageNum);
        if (jump) {
            const jumpNum = parseInt(jump, 10);
            if (jumpNum >= 1 && jumpNum <= activePdf.totalPages) {
                saveCurrentPageAnnotation();
                activePdf.pageNum = jumpNum;
                renderPdfPage(activePdf.pageNum);
            }
        }
    });
}

document.getElementById('pdf-cancel-btn').addEventListener('click', () => {
  triggerHaptic();
  const pdfModal = document.getElementById('pdf-modal');
  if(pdfModal) pdfModal.style.display = 'none';
  
  const spinner = document.getElementById('pdf-loading-spinner');
  if (spinner) spinner.style.display = 'none';
  activePdf = { base64Data: null, originalPath: null, doc: null, pageNum: 1, totalPages: 0, annotations: {} };
});

document.getElementById('pdf-save-btn').addEventListener('click', async () => {
  triggerHaptic();
  saveCurrentPageAnnotation(); 
  const saveBtn = document.getElementById('pdf-save-btn');
  saveBtn.innerText = "Baking...";
  
  try {
    const pdfDoc = await PDFLib.PDFDocument.load(activePdf.base64Data);
    const pages = pdfDoc.getPages();

    for (const [pageNumStr, pngBase64] of Object.entries(activePdf.annotations)) {
      const pageNum = parseInt(pageNumStr) - 1; 
      if (pngBase64.length < 1000) continue; 

      const pngImage = await pdfDoc.embedPng(pngBase64);
      const page = pages[pageNum];
      
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight(),
      });
    }

    const bakedPdfBase64 = await pdfDoc.saveAsBase64();
    
    if (window.Capacitor && window.Capacitor.Plugins.Filesystem) {
        const fileName = activePdf.originalPath.substring(activePdf.originalPath.lastIndexOf('/') + 1);
        await window.Capacitor.Plugins.Filesystem.writeFile({
          path: fileName, data: bakedPdfBase64, directory: 'DOCUMENTS'
        });
        alert("Success! Annotations baked into PDF.");
        const pdfModal = document.getElementById('pdf-modal');
        if(pdfModal) pdfModal.style.display = 'none';
    } else {
        const a = document.createElement('a');
        a.href = "data:application/pdf;base64," + bakedPdfBase64;
        a.download = "Annotated_Document.pdf";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        const pdfModal = document.getElementById('pdf-modal');
        if(pdfModal) pdfModal.style.display = 'none';
    }
  } catch (error) { alert("Error baking PDF: " + error.message); } 
  finally { saveBtn.innerText = "Save PDF"; }
});

function setupPdfDrawingTools() {
  const glassCanvas = document.getElementById('pdf-glass-canvas');
  if(!glassCanvas) return;
  const ctx = glassCanvas.getContext('2d');
  
  const toolbarContainer = document.getElementById('pdf-toolbar-container');
  if(toolbarContainer) {
      toolbarContainer.innerHTML = `
        <div style="display: flex; justify-content: center; gap: 15px; padding: 15px; background: #0d1117; border-top: 1px solid #30363d;">
            <div class="pdf-color-btn" data-color="pan" style="width:30px;height:30px;border-radius:50%;background:#161b22;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow: 0 0 0 3px #ffffff;" title="Pan & Zoom">✋</div>
            <div class="pdf-color-btn" data-color="#d32f2f" style="width:30px;height:30px;border-radius:50%;background:#d32f2f;cursor:pointer;"></div>
            <div class="pdf-color-btn" data-color="#1976d2" style="width:30px;height:30px;border-radius:50%;background:#1976d2;cursor:pointer;"></div>
            <div class="pdf-color-btn" data-color="#388e3c" style="width:30px;height:30px;border-radius:50%;background:#388e3c;cursor:pointer;"></div>
            <div class="pdf-color-btn" data-color="#fbc02d" style="width:30px;height:30px;border-radius:50%;background:#fbc02d;cursor:pointer;"></div>
            <div class="pdf-color-btn" data-color="#000000" style="width:30px;height:30px;border-radius:50%;background:#000000;cursor:pointer;"></div>
            <div class="pdf-color-btn" data-color="#ffffff" style="width:30px;height:30px;border-radius:50%;border:2px solid #ccc;background:#ffffff;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Eraser">E</div>
        </div>
      `;

      let currentColor = 'pan'; 
      let currentWidth = 4; 
      
      glassCanvas.style.pointerEvents = 'none';
      
      document.querySelectorAll('.pdf-color-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
              triggerHaptic();
              document.querySelectorAll('.pdf-color-btn').forEach(b => b.style.boxShadow = 'none');
              btn.style.boxShadow = '0 0 0 3px #ffffff';
              currentColor = btn.getAttribute('data-color');
              
              if (currentColor === 'pan') {
                  glassCanvas.style.pointerEvents = 'none';
              } else {
                  glassCanvas.style.pointerEvents = 'auto';
                  currentWidth = (currentColor === '#ffffff') ? 25 : 4; 
              }
          });
      });

      // THE PINCH-STRETCH-SNAP ZOOM LOGIC
      let pinchStartDistance = 0;
      let isPinching = false;
      let currentScale = 1;
      let animationFrameId = null;

      const container = document.getElementById('pdf-canvas-container');
      const wrapper = document.getElementById('pdf-transform-wrapper');

      if(container) {
          container.addEventListener('touchstart', (e) => {
              if (e.touches.length === 2 && currentColor === 'pan') {
                  isPinching = true;
                  pinchStartDistance = Math.hypot(
                      e.touches[0].clientX - e.touches[1].clientX,
                      e.touches[0].clientY - e.touches[1].clientY
                  );
              }
          }, { passive: false });

          container.addEventListener('touchmove', (e) => {
              if (isPinching && e.touches.length === 2 && currentColor === 'pan') {
                  e.preventDefault(); 
                  const dist = Math.hypot(
                      e.touches[0].clientX - e.touches[1].clientX,
                      e.touches[0].clientY - e.touches[1].clientY
                  );
                  currentScale = dist / pinchStartDistance;
                  
                  if (animationFrameId) cancelAnimationFrame(animationFrameId);
                  animationFrameId = requestAnimationFrame(() => {
                      if (wrapper) wrapper.style.transform = `scale(${currentScale})`;
                  });
              }
          }, { passive: false });

          container.addEventListener('touchend', (e) => {
              if (isPinching && e.touches.length < 2) {
                  isPinching = false;
                  applyPdfZoom(activePdf.zoomLevel * currentScale);
              }
          });
      }

      // DRAWING LOGIC
      let isDrawing = false;
      
      const getPos = (e) => {
        const rect = glassCanvas.getBoundingClientRect();
        const scaleX = glassCanvas.width / rect.width;
        const scaleY = glassCanvas.height / rect.height;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        return { 
            x: (clientX - rect.left) * scaleX, 
            y: (clientY - rect.top) * scaleY 
        };
      };

      const startDraw = (e) => { 
        if (e.touches && e.touches.length > 1) { isDrawing = false; return; }
        isDrawing = true; 
        const pos = getPos(e); 
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentWidth * (activePdf.zoomLevel || 1.0) * (window.devicePixelRatio || 2);
        ctx.beginPath(); 
        ctx.moveTo(pos.x, pos.y); 
      };
      
      const draw = (e) => { 
        if (!isDrawing) return; 
        if (e.touches && e.touches.length > 1) { isDrawing = false; ctx.closePath(); return; }
        e.preventDefault(); 
        const pos = getPos(e); 
        ctx.lineTo(pos.x, pos.y); 
        ctx.stroke(); 
      };
      
      const stopDraw = () => { isDrawing = false; ctx.closePath(); };

      glassCanvas.addEventListener('mousedown', startDraw); glassCanvas.addEventListener('mousemove', draw);
      glassCanvas.addEventListener('mouseup', stopDraw); glassCanvas.addEventListener('mouseout', stopDraw);
      glassCanvas.addEventListener('touchstart', startDraw, { passive: false }); glassCanvas.addEventListener('touchmove', draw, { passive: false }); glassCanvas.addEventListener('touchend', stopDraw);
  }
}