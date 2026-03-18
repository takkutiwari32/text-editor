const { ipcRenderer  } = require('electron');
const { shell } = require('electron'); // Required to open external links safely

// --- BYOK: LOCAL STORAGE ENGINE & FIRST-BOOT INTERCEPTOR ---
function getLocalApiKey() {
  return localStorage.getItem('gemini_api_key') || '';
}

// 1. The First-Boot Auto-Trigger
window.addEventListener('DOMContentLoaded', () => {
  const existingKey = getLocalApiKey();
  if (!existingKey) {
    // If no key exists, violently interrupt the user and force the onboarding screen
    document.getElementById('api-modal').style.display = 'flex';
  }
});

// 1.5 Native OS Browser Routing
document.getElementById('get-key-btn').addEventListener('click', () => {
  // This violently forces Windows to open their real default browser (Chrome/Edge)
  shell.openExternal('https://aistudio.google.com/app/apikey');
});

// 2. Manual Settings Trigger
document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('api-key-input').value = getLocalApiKey();
  document.getElementById('api-modal').style.display = 'flex';
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
    const canvas = document.createElement('canvas'); canvas.width = 750; canvas.height = 400; canvas.style.border = '2px dashed #30363d'; canvas.style.background = '#ffffff'; canvas.style.cursor = 'crosshair'; canvas.style.borderRadius = '8px';
    const ctx = canvas.getContext('2d'); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#d32f2f'; 
    if (this.data && this.data.image) { const img = new Image(); img.src = this.data.image; img.onload = () => ctx.drawImage(img, 0, 0); }
    let isDrawing = false;
    canvas.addEventListener('mousedown', (e) => { isDrawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); });
    canvas.addEventListener('mousemove', (e) => { if(isDrawing) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } });
    canvas.addEventListener('mouseup', () => { isDrawing = false; }); canvas.addEventListener('mouseout', () => { isDrawing = false; });
    const hint = document.createElement('div'); hint.innerText = "Freehand Drawing Canvas (Red Marker)"; hint.style.fontSize = "0.8rem"; hint.style.color = "#8b949e"; hint.style.marginTop = "5px";
    wrapper.appendChild(canvas); wrapper.appendChild(hint); return wrapper;
  }
  save(blockContent) { const canvas = blockContent.querySelector('canvas'); return { image: canvas.toDataURL('image/png') }; }
}

// --- 3. EDITOR INITIALIZATION ---
const editor = new EditorJS({
  holder: 'editor-container', placeholder: 'Start typing your epic tech article here...',
  tools: {
    header: { class: Header, inlineToolbar: ['link', 'bold', 'italic', 'underline', 'Marker'] },
    list: { class: EditorjsList, inlineToolbar: true }, code: { class: CodeTool }, table: { class: Table, inlineToolbar: true }, Marker: { class: Marker }, underline: { class: Underline },
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

// --- 5. PUBLISH LOGIC ---
document.getElementById('publish-btn').addEventListener('click', () => {
  const title = document.getElementById('article-title').innerText.trim();
  if(!title) { alert('Please enter an article title first.'); return; }
  editor.save().then((outputData) => { ipcRenderer.send('save-article', { title: title, content: outputData }); });
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

// --- 7. THE KEYBOARD HIJACKER (NUCLEAR DOM INJECTOR) ---
document.getElementById('editor-container').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); document.execCommand('insertLineBreak');
  }
}, true); 

// --- 8. DYNAMIC CANVAS WIDTH ENGINE ---
const widthSlider = document.getElementById('canvas-width-slider'); const widthDisplay = document.getElementById('width-display');
widthSlider.addEventListener('input', (e) => {
  const newWidth = e.target.value + '%'; document.documentElement.style.setProperty('--editor-width', newWidth); widthDisplay.innerText = newWidth;
});
