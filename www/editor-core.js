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

// --- BYOK: LOCAL STORAGE ENGINE & FIRST-BOOT INTERCEPTOR ---
function getLocalApiKey() { return localStorage.getItem('gemini_api_key') || ''; }

window.addEventListener('DOMContentLoaded', () => {
  const existingKey = getLocalApiKey();
  if (!existingKey) { document.getElementById('api-modal').style.display = 'flex'; }
});

document.getElementById('get-key-btn').addEventListener('click', () => {
  const targetUrl = 'https://aistudio.google.com/app/apikey';
  if (os.release().toLowerCase().includes('microsoft') || os.release().toLowerCase().includes('wsl')) { exec(`explorer.exe "${targetUrl}"`); } 
  else { shell.openExternal(targetUrl); }
});

document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('api-key-input').value = getLocalApiKey();
  document.getElementById('api-modal').style.display = 'flex';
});

document.getElementById('close-modal-btn').addEventListener('click', () => { document.getElementById('api-modal').style.display = 'none'; });

document.getElementById('save-api-btn').addEventListener('click', () => {
  const newKey = document.getElementById('api-key-input').value.trim();
  if (!newKey) { alert("Please paste a valid API key first."); return; }
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

  render() {
    this.wrapper = document.createElement('div');
    this.wrapper.style.width = '100%';
    this.wrapper.style.textAlign = 'center';
    this.wrapper.style.cursor = 'pointer';

    this.imagePreview = document.createElement('img');
    this.imagePreview.style.width = '100%'; 
    this.imagePreview.style.height = 'auto'; 
    this.imagePreview.style.display = this.data.image ? 'block' : 'none';
    this.imagePreview.style.borderRadius = '4px';

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

    this.wrapper.addEventListener('click', () => { this.openFullScreenEditor(); });

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
        btn.style.cursor = 'pointer'; btn.style.borderRadius = '8px';
        
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
        cBtn.style.cursor = 'pointer'; cBtn.style.border = '2px solid #30363d';
        if (i === 0) { cBtn.style.borderColor = '#58a6ff'; activeColorBtn = cBtn; }

        cBtn.onclick = () => {
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

    cancelBtn.onclick = () => { modal.style.display = 'none'; };
    
    saveBtn.onclick = () => {
      ctx.globalCompositeOperation = "source-over"; 
      this.data.image = canvas.toDataURL('image/png');
      this.imagePreview.src = this.data.image;
      this.imagePreview.style.display = 'block';
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
        td.onclick = () => this.openEditor(rowIndex, colIndex);
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
    addColBtn.onclick = () => { this.data.content.forEach(row => row.push('')); this.drawGrid(); };

    const addRowBtn = document.createElement('button');
    addRowBtn.className = 'custom-table-btn';
    addRowBtn.innerText = '+ Row';
    addRowBtn.onclick = () => { this.data.content.push(new Array(this.data.content[0].length).fill('')); this.drawGrid(); };

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
    cancelBtn.onclick = () => { modal.style.display = 'none'; };
    saveBtn.onclick = () => { this.data.content[r][c] = input.value.trim(); modal.style.display = 'none'; this.drawGrid(); };
  }
  save() { return { content: this.data.content }; }
}

// --- 3. EDITOR INITIALIZATION ---
const editor = new EditorJS({
  holder: 'editor-container', placeholder: '',
  tools: {
    header: { class: Header, inlineToolbar: ['link', 'bold', 'italic', 'underline', 'Marker'] },
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
    return (tmp.textContent || tmp.innerText || '').substring(0, 30).trim() || "Untitled_Document";
  }
  return "Untitled_Document";
};

document.getElementById('publish-btn').addEventListener('click', () => {
  editor.save().then((outputData) => { ipcRenderer.send('save-article', { title: getDocumentTitle(outputData), content: outputData, isSaveAs: false }); });
});

document.getElementById('save-as-btn').addEventListener('click', () => {
  editor.save().then((outputData) => { ipcRenderer.send('save-article', { title: getDocumentTitle(outputData), content: outputData, isSaveAs: true }); });
});

ipcRenderer.on('save-response', (event, response) => {
  if(response.success) { alert('Success! Article physically saved to your OS at:\n' + response.path); } else { alert('System Error saving file: ' + response.error); }
});

// --- 6. TYPOGRAPHY ENGINE (MOBILE & DESKTOP FIX) ---
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

// --- AI CO-PILOT CHAT ENGINE ---
document.getElementById('ai-send-btn').addEventListener('click', async () => {
  const inputField = document.getElementById('ai-chat-input'); const prompt = inputField.value.trim(); if (!prompt) return;
  const chatWindow = document.getElementById('ai-chat-window');
  chatWindow.innerHTML += "<div><strong style='color: #58a6ff;'>You:</strong> " + prompt + "</div>"; inputField.value = '';
  const loadingId = 'loading-' + Date.now(); chatWindow.innerHTML += "<div id='" + loadingId + "' style='color: var(--text-muted);'><em>Cloud AI is thinking...</em></div>"; chatWindow.scrollTop = chatWindow.scrollHeight;
  try {
    const data = await ipcRenderer.invoke('fetch-cloud-ai', { prompt: prompt, apiKey: getLocalApiKey() });
    document.getElementById(loadingId).remove();
    if (data.error) { chatWindow.innerHTML += "<div style='color: red;'><strong>System Error:</strong> " + data.error + "</div>"; } 
    else { chatWindow.innerHTML += "<div><strong style='color: #f85149;'>Cloud AI:</strong> " + data.response + "</div>"; }
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) { document.getElementById(loadingId).remove(); chatWindow.innerHTML += "<div style='color: red;'><strong>System Error:</strong> IPC bridge failure.</div>"; }
});
document.getElementById('ai-chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('ai-send-btn').click(); });

let lastActiveBlock = null;
document.addEventListener('click', (e) => { const block = e.target.closest('.cdx-block'); if (block) lastActiveBlock = block; });
document.addEventListener('keyup', (e) => { const block = e.target.closest('.cdx-block'); if (block) lastActiveBlock = block; });

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
    } catch (error) {}
    activeBlock.style.backgroundColor = originalBg;
  }, GHOST_PAUSE_DURATION);
});

const widthSlider = document.getElementById('canvas-width-slider'); const widthDisplay = document.getElementById('width-display');
widthSlider.addEventListener('input', (e) => { document.documentElement.style.setProperty('--editor-width', e.target.value + '%'); widthDisplay.innerText = e.target.value + '%'; });

const lineHeightSlider = document.getElementById('line-height-slider'); const lineHeightDisplay = document.getElementById('line-height-display');
if (lineHeightSlider && lineHeightDisplay) { lineHeightSlider.addEventListener('input', (e) => { document.documentElement.style.setProperty('--editor-line-height', e.target.value); lineHeightDisplay.innerText = e.target.value; }); }

// --- 10. THE OS INTENT INTERCEPTOR (FILE READER) ---
async function loadFileFromOS(contentUrl) {
  try {
    if (contentUrl.toLowerCase().endsWith('.pdf')) {
      const modal = document.getElementById('pdf-modal');
      const spinnerOverlay = document.getElementById('pdf-loading-spinner');
      const spinnerText = document.getElementById('pdf-spinner-text');
      
      modal.style.display = 'flex';
      
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
    document.body.classList.add('zen-mode');
    const mobileDropdown = document.querySelector('.mobile-top-dropdown');
    if (mobileDropdown) mobileDropdown.classList.remove('open');
  });
  exitZenBtn.addEventListener('click', () => { document.body.classList.remove('zen-mode'); });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('zen-mode')) { document.body.classList.remove('zen-mode'); }
});

// --- 14. PDF ANNOTATOR ENGINE (CUSTOM PINCH TO ZOOM) ---
let activePdf = { 
  base64Data: null, originalPath: null, doc: null, 
  pageNum: 1, totalPages: 0, annotations: {},
  renderTask: null,
  hdMultiplier: 4,
  zoomLevel: 1.0,
  baseCssWidth: 0,
  baseCssHeight: 0,
  unscaledWidth: 0
};

async function launchPdfAnnotator(base64Data, filePath) {
  activePdf.base64Data = base64Data;
  activePdf.originalPath = filePath;
  activePdf.pageNum = 1;
  activePdf.annotations = {};
  if (activePdf.renderTask) activePdf.renderTask = null;

  const modal = document.getElementById('pdf-modal');
  const spinnerOverlay = document.getElementById('pdf-loading-spinner');
  modal.style.display = 'flex';
  
  try {
    const res = await fetch("data:application/pdf;base64," + base64Data);
    const arrayBuffer = await res.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
    });
    
    activePdf.doc = await loadingTask.promise;
    activePdf.totalPages = activePdf.doc.numPages;
    document.getElementById('pdf-page-count').innerText = activePdf.totalPages;
    
    await renderPdfPage(activePdf.pageNum);
    setupPdfDrawingTools();
    
    if (spinnerOverlay) spinnerOverlay.style.display = 'none';

  } catch (err) {
    if (spinnerOverlay) spinnerOverlay.style.display = 'none';
    alert("Error loading PDF: " + err.message);
    modal.style.display = 'none';
  }
}

// 1. The Helper Function to Apply Zoom Math
function applyPdfZoom(newZoom) {
    activePdf.zoomLevel = Math.max(1.0, Math.min(newZoom, 4.0));
    
    const wrapper = document.getElementById('pdf-transform-wrapper');
    const bounds = document.getElementById('pdf-scroll-bounds');
    const container = document.getElementById('pdf-canvas-container');
    
    wrapper.style.transform = `scale(${activePdf.zoomLevel})`;
    
    if (activePdf.zoomLevel > 1.0) {
        bounds.style.width = (activePdf.baseCssWidth * activePdf.zoomLevel) + 'px';
        bounds.style.height = (activePdf.baseCssHeight * activePdf.zoomLevel) + 'px';
        bounds.style.display = 'block'; 
        container.style.justifyContent = 'flex-start';
    } else {
        bounds.style.width = activePdf.baseCssWidth + 'px';
        bounds.style.height = activePdf.baseCssHeight + 'px';
        bounds.style.display = 'flex'; 
        container.style.justifyContent = 'center';
    }
}

// GUI Zoom Buttons
document.getElementById('pdf-zoom-in-btn').addEventListener('click', () => applyPdfZoom(activePdf.zoomLevel + 0.5));
document.getElementById('pdf-zoom-out-btn').addEventListener('click', () => applyPdfZoom(activePdf.zoomLevel - 0.5));


async function renderPdfPage(num) {
  if (activePdf.renderTask) {
      await activePdf.renderTask.cancel();
      activePdf.renderTask = null;
  }

  document.getElementById('pdf-page-num').innerText = num;
  const page = await activePdf.doc.getPage(num);
  
  const container = document.getElementById('pdf-canvas-container');
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const cssWidth = container.clientWidth - 40; 
  const baseScale = cssWidth / unscaledViewport.width;
  
  // Save measurements for the zoom engine
  activePdf.unscaledWidth = unscaledViewport.width;
  activePdf.baseCssWidth = cssWidth;
  activePdf.baseCssHeight = cssWidth * (unscaledViewport.height / unscaledViewport.width);
  activePdf.zoomLevel = 1.0;
  
  const viewport = page.getViewport({ scale: baseScale * activePdf.hdMultiplier }); 
  
  const oldBaseCanvas = document.getElementById('pdf-base-canvas');
  const baseCanvas = oldBaseCanvas.cloneNode(true);
  oldBaseCanvas.parentNode.replaceChild(baseCanvas, oldBaseCanvas);
  
  const baseCtx = baseCanvas.getContext('2d');
  
  baseCtx.setTransform(1, 0, 0, 1, 0, 0);
  baseCanvas.width = viewport.width;
  baseCanvas.height = viewport.height;

  baseCtx.fillStyle = '#ffffff';
  baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);
  
  baseCanvas.style.width = activePdf.baseCssWidth + 'px';
  baseCanvas.style.height = activePdf.baseCssHeight + 'px';

  const renderContext = { canvasContext: baseCtx, viewport: viewport };
  activePdf.renderTask = page.render(renderContext);
  
  try {
      await activePdf.renderTask.promise;
  } catch (err) {
      if (err.name === 'RenderingCancelledException') return; 
      console.error(err);
  }
  
  activePdf.renderTask = null;

  const textLayerDiv = document.getElementById('pdf-text-layer');
  textLayerDiv.innerHTML = '';
  textLayerDiv.style.width = activePdf.baseCssWidth + 'px';
  textLayerDiv.style.height = activePdf.baseCssHeight + 'px';
  
  const textViewport = page.getViewport({ scale: baseScale });
  textLayerDiv.style.setProperty('--scale-factor', textViewport.scale);

  try {
      const textContent = await page.getTextContent();
      await pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport: textViewport,
          textDivs: []
      }).promise;
      
      // THE FIX: Provide an explicit space character to bridge the selection
      const spans = textLayerDiv.querySelectorAll('span');
      spans.forEach(span => { span.innerHTML += ' '; });
      
  } catch (e) {
      console.warn("Failed to extract PDF text layer: ", e);
  }

  const glassCanvas = document.getElementById('pdf-glass-canvas');
  glassCanvas.width = baseCanvas.width;
  glassCanvas.height = baseCanvas.height;
  glassCanvas.style.width = activePdf.baseCssWidth + 'px';
  glassCanvas.style.height = activePdf.baseCssHeight + 'px';
  
  const glassCtx = glassCanvas.getContext('2d');
  glassCtx.setTransform(1, 0, 0, 1, 0, 0);
  glassCtx.clearRect(0, 0, glassCanvas.width, glassCanvas.height);
  glassCtx.lineCap = 'round';
  glassCtx.lineJoin = 'round';

  if (activePdf.annotations[num]) {
    const img = new Image();
    img.onload = () => glassCtx.drawImage(img, 0, 0, glassCanvas.width, glassCanvas.height);
    img.src = activePdf.annotations[num];
  }
  
  applyPdfZoom(1.0); // Reset zoom physics for the new page
}

function saveCurrentPageAnnotation() {
  const glassCanvas = document.getElementById('pdf-glass-canvas');
  activePdf.annotations[activePdf.pageNum] = glassCanvas.toDataURL('image/png');
}

document.getElementById('pdf-prev-btn').addEventListener('click', () => {
  if (activePdf.pageNum <= 1) return;
  saveCurrentPageAnnotation();
  activePdf.pageNum--;
  renderPdfPage(activePdf.pageNum);
});

document.getElementById('pdf-next-btn').addEventListener('click', () => {
  if (activePdf.pageNum >= activePdf.totalPages) return;
  saveCurrentPageAnnotation();
  activePdf.pageNum++;
  renderPdfPage(activePdf.pageNum);
});

document.getElementById('pdf-cancel-btn').addEventListener('click', () => {
  document.getElementById('pdf-modal').style.display = 'none';
  const spinner = document.getElementById('pdf-loading-spinner');
  if (spinner) spinner.style.display = 'none';
  activePdf = { base64Data: null, originalPath: null, doc: null, pageNum: 1, totalPages: 0, annotations: {} };
});

document.getElementById('pdf-save-btn').addEventListener('click', async () => {
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
        document.getElementById('pdf-modal').style.display = 'none';
    } else {
        const a = document.createElement('a');
        a.href = "data:application/pdf;base64," + bakedPdfBase64;
        a.download = "Annotated_Document.pdf";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        document.getElementById('pdf-modal').style.display = 'none';
    }
  } catch (error) { alert("Error baking PDF: " + error.message); } 
  finally { saveBtn.innerText = "Save PDF"; }
});

function setupPdfDrawingTools() {
  const glassCanvas = document.getElementById('pdf-glass-canvas');
  const ctx = glassCanvas.getContext('2d');
  
  const toolbarContainer = document.getElementById('pdf-toolbar-container');
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
  let currentWidth = 4 * activePdf.hdMultiplier; 
  
  glassCanvas.style.pointerEvents = 'none';
  
  document.querySelectorAll('.pdf-color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
          document.querySelectorAll('.pdf-color-btn').forEach(b => b.style.boxShadow = 'none');
          btn.style.boxShadow = '0 0 0 3px #ffffff';
          currentColor = btn.getAttribute('data-color');
          
          if (currentColor === 'pan') {
              glassCanvas.style.pointerEvents = 'none';
          } else {
              glassCanvas.style.pointerEvents = 'auto';
              currentWidth = (currentColor === '#ffffff') ? 25 * activePdf.hdMultiplier : 4 * activePdf.hdMultiplier; 
          }
      });
  });

  // 2. CUSTOM JAVASCRIPT PINCH-TO-ZOOM ENGINE
  const container = document.getElementById('pdf-canvas-container');
  let initialDistance = 0;
  let initialZoom = 1;

  container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2 && currentColor === 'pan') {
          initialDistance = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          initialZoom = activePdf.zoomLevel;
      }
  }, { passive: false });

  container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && currentColor === 'pan') {
          e.preventDefault(); // Stop Android Native Zoom completely
          const currentDistance = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          const scale = currentDistance / initialDistance;
          applyPdfZoom(initialZoom * scale);
      }
  }, { passive: false });


  // DRAWING LOGIC (Maps to the dynamically scaled viewport!)
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
    ctx.lineWidth = currentWidth;
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