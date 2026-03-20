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

// --- 2. CUSTOM DRAWING ENGINE ---
class SimpleDrawTool {
  static get toolbox() { return { title: 'Draw', icon: '🖍️' }; }
  constructor({data}) { this.data = data; }
  render() {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.overflow = 'hidden'; 

    // --- NEW COLOR GRID UI ---
    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.gap = '12px';
    toolbar.style.padding = '10px 0';
    toolbar.style.alignItems = 'center';

    // The Color Palette (Red, Blue, Green, Yellow, Black, White/Eraser)
    const colors = ['#d32f2f', '#1976d2', '#388e3c', '#fbc02d', '#000000', '#ffffff']; 
    let activeColorBtn = null;

    const canvas = document.createElement('canvas'); 
    canvas.width = 800; canvas.height = 400; 
    canvas.style.width = '100%'; canvas.style.height = 'auto'; 
    canvas.style.border = '2px dashed #30363d'; 
    canvas.style.background = '#ffffff'; 
    canvas.style.cursor = 'crosshair'; 
    canvas.style.borderRadius = '8px';
    canvas.style.touchAction = 'none'; 

    const ctx = canvas.getContext('2d'); 
    ctx.lineWidth = 4; ctx.lineCap = 'round'; 
    ctx.strokeStyle = colors[0]; // Default to Red

    // Build the interactive color buttons
    colors.forEach((color, index) => {
      const colorBtn = document.createElement('div');
      colorBtn.style.width = '24px'; colorBtn.style.height = '24px';
      colorBtn.style.borderRadius = '50%'; 
      colorBtn.style.backgroundColor = color;
      colorBtn.style.cursor = 'pointer';
      colorBtn.style.border = '2px solid transparent';
      
      // Give the white "eraser" a grey border so it doesn't vanish on white backgrounds
      if (color === '#ffffff') colorBtn.style.border = '2px solid #e1e4e8'; 

      // Highlight the first color by default
      if (index === 0) {
        colorBtn.style.boxShadow = '0 0 0 2px #58a6ff';
        activeColorBtn = colorBtn;
      }

      // Wire up the tap to change ink color
      colorBtn.addEventListener('click', () => {
        ctx.strokeStyle = color;
        if (activeColorBtn) activeColorBtn.style.boxShadow = 'none'; // Remove old glow
        colorBtn.style.boxShadow = '0 0 0 2px #58a6ff'; // Add new glow
        activeColorBtn = colorBtn;
      });
      toolbar.appendChild(colorBtn);
    });

    if (this.data && this.data.image) { 
      const img = new Image(); img.src = this.data.image; 
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height); 
    }
    
    let isDrawing = false;
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const startDraw = (e) => { isDrawing = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
    const draw = (e) => { if(!isDrawing) return; e.preventDefault(); const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
    const stopDraw = () => { isDrawing = false; };

    canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw); canvas.addEventListener('mouseout', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false }); canvas.addEventListener('touchmove', draw, { passive: false }); canvas.addEventListener('touchend', stopDraw);

    const hint = document.createElement('div'); hint.innerText = "Select a color. Swipe to draw. (White acts as an eraser)"; hint.style.fontSize = "0.8rem"; hint.style.color = "#8b949e"; hint.style.marginTop = "5px";
    
    wrapper.appendChild(toolbar);
    wrapper.appendChild(canvas); 
    wrapper.appendChild(hint); 
    return wrapper;
  }
  save(blockContent) { const canvas = blockContent.querySelector('canvas'); return { image: canvas.toDataURL('image/png') }; }
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

// --- 6. TYPOGRAPHY ENGINE ---
document.querySelector('.document-container').addEventListener('mouseup', () => {
  const selection = window.getSelection();
  const oldTarget = document.getElementById('pending-style-target');
  if (oldTarget) { oldTarget.removeAttribute('id'); oldTarget.style.backgroundColor = ''; }
  if (selection.rangeCount > 0 && !selection.isCollapsed) {
    const range = selection.getRangeAt(0); const span = document.createElement('span'); span.id = 'pending-style-target'; span.style.backgroundColor = 'rgba(248, 81, 73, 0.2)'; 
    try { span.appendChild(range.extractContents()); range.insertNode(span); } catch (err) { }
  }
});
function applyTypography(type, value) {
  const targetSpan = document.getElementById('pending-style-target'); if (!targetSpan) return; 
  if (type === 'color') targetSpan.style.color = value; if (type === 'size') targetSpan.style.fontSize = value; if (type === 'font') targetSpan.style.fontFamily = value;
}
const colorInput = document.getElementById('style-color');
colorInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyTypography('color', colorInput.value); });
colorInput.addEventListener('dblclick', () => { applyTypography('color', colorInput.value); });
colorInput.addEventListener('change', () => { applyTypography('color', colorInput.value); });
const sizeInput = document.getElementById('style-size');
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
    const docDefinition = {
      content: [{ text: titleText, style: 'mainTitle' }],
      styles: {
        mainTitle: { fontSize: 26, bold: true, margin: [0, 0, 0, 20], color: '#111111' },
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
          case 'paragraph': if (block.data.text) docDefinition.content.push({ text: cleanText(block.data.text), style: 'paragraph' }); break;
          case 'header': if (block.data.text) docDefinition.content.push({ text: cleanText(block.data.text), style: 'h' + block.data.level }); break;
          case 'list':
            if (block.data.items && block.data.items.length > 0) {
              const items = block.data.items.map(i => { const itemText = typeof i === 'object' ? (i.content || '') : i; return cleanText(itemText) || ' '; }); 
              if (block.data.style === 'ordered') docDefinition.content.push({ ol: items, style: 'list' }); else docDefinition.content.push({ ul: items, style: 'list' });
            }
            break;
          case 'code': if (block.data.code) docDefinition.content.push({ text: cleanText(block.data.code), style: 'code' }); break;
          case 'draw': if (block.data.image) docDefinition.content.push({ image: block.data.image, fit: [350, 300], margin: [0, 10, 0, 15] }); break;
          case 'image':
            const imgUrl = block.data.file ? block.data.file.url : block.data.url;
            if (imgUrl && imgUrl.startsWith('data:image')) docDefinition.content.push({ image: imgUrl, fit: [450, 400], margin: [0, 10, 0, 15] });
            else docDefinition.content.push({ text: `[ Image linked from OS ]`, color: '#888888', italics: true, margin: [0, 5, 0, 15] });
            break;
          case 'table':
            if (block.data.content && block.data.content.length > 0) {
              const tableBody = block.data.content.map(row => row.map(cell => cleanText(cell) || ' '));
              docDefinition.content.push({ table: { body: tableBody }, margin: [0, 10, 0, 15] });
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