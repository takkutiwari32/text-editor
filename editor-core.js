// --- 1. CUSTOM AUDIO ENGINE ---
const { ipcRenderer } = require('electron');
class SimpleAudioTool {
  static get toolbox() { return { title: 'Audio', icon: '🎵' }; }
  constructor({data}) { this.data = data; }
  
  render() {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '15px';
    wrapper.style.background = '#161b22';
    wrapper.style.border = '1px solid #30363d';
    wrapper.style.borderRadius = '6px';

    const input = document.createElement('input');
    input.placeholder = 'Paste Audio URL (.mp3) and press Enter...';
    input.style.width = '100%'; input.style.padding = '10px'; input.style.background = '#0d1117'; input.style.color = '#fff'; input.style.border = '1px solid #30363d';
    
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.style.width = '100%'; audio.style.display = 'none';

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        audio.src = input.value;
        audio.style.display = 'block';
        input.style.display = 'none';
      }
    });

    if (this.data && this.data.url) {
      audio.src = this.data.url;
      audio.style.display = 'block';
      input.style.display = 'none';
    }

    wrapper.appendChild(input);
    wrapper.appendChild(audio);
    return wrapper;
  }
  
  save(blockContent) {
    const audio = blockContent.querySelector('audio');
    return { url: audio ? audio.src : '' };
  }
}

// --- 2. CUSTOM DRAWING ENGINE (HTML5 Canvas) ---
class SimpleDrawTool {
  static get toolbox() { return { title: 'Draw', icon: '🖍️' }; }
  constructor({data}) { this.data = data; }
  
  render() {
    const wrapper = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.width = 750; canvas.height = 400;
    canvas.style.border = '2px dashed #30363d';
    canvas.style.background = '#ffffff'; // White canvas for drawing
    canvas.style.cursor = 'crosshair';
    canvas.style.borderRadius = '8px';
    
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#d32f2f'; // Primary Red Marker
    
    if (this.data && this.data.image) {
      const img = new Image();
      img.src = this.data.image;
      img.onload = () => ctx.drawImage(img, 0, 0);
    }
    
    let isDrawing = false;
    canvas.addEventListener('mousedown', (e) => { isDrawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); });
    canvas.addEventListener('mousemove', (e) => { if(isDrawing) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } });
    canvas.addEventListener('mouseup', () => { isDrawing = false; });
    canvas.addEventListener('mouseout', () => { isDrawing = false; });
    
    const hint = document.createElement('div');
    hint.innerText = "Freehand Drawing Canvas (Red Marker)";
    hint.style.fontSize = "0.8rem"; hint.style.color = "#8b949e"; hint.style.marginTop = "5px";

    wrapper.appendChild(canvas);
    wrapper.appendChild(hint);
    return wrapper;
  }
  
  save(blockContent) {
    const canvas = blockContent.querySelector('canvas');
    // Converts the raw drawing into a Base64 image string for the JSON!
    return { image: canvas.toDataURL('image/png') };
  }
}

// --- 3. EDITOR INITIALIZATION ---
const editor = new EditorJS({
  holder: 'editor-container',
  placeholder: 'Start typing your epic tech article here...',
  tools: {
    header: { class: Header, inlineToolbar: ['link', 'bold', 'italic', 'underline', 'Marker'] },
    list: { class: EditorjsList, inlineToolbar: true },
    code: { class: CodeTool },
    table: { class: Table, inlineToolbar: true },
    Marker: { class: Marker },
    underline: { class: Underline },
    image: {
      class: ImageTool,
      config: {
        uploader: {
          uploadByFile(file) {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => resolve({ success: 1, file: { url: reader.result } });
              reader.onerror = error => reject(error);
            });
          }
        }
      }
    },
    audio: SimpleAudioTool, // Registering our custom audio engine
    draw: SimpleDrawTool    // Registering our custom drawing engine
  },
  onChange: () => {
    editor.save().then((outputData) => {
      let text = '';
      outputData.blocks.forEach(block => {
        if (block.data.text) text += block.data.text.replace(/<[^>]*>?/gm, '') + ' ';
      });
      const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
      document.getElementById('word-count').innerText = words;
      document.getElementById('read-time').innerText = Math.max(1, Math.ceil(words / 200)) + ' min';
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
  
  editor.save().then((outputData) => {
    // Blast the data over IPC to the Node.js backend instead of just logging it
    ipcRenderer.send('save-article', { title: title, content: outputData });
  });
});

// Listen for the Node.js backend to confirm the file was physically written
ipcRenderer.on('save-response', (event, response) => {
  if(response.success) {
    alert('Success! Article physically saved to your OS at:\n' + response.path);
  } else {
    alert('System Error saving file: ' + response.error);
  }
});
// --- 6. TYPOGRAPHY ENGINE WITH PHYSICAL DOM ANCHORS ---

// Silently inject a physical anchor, but clear it if the user just clicks away
document.querySelector('.document-container').addEventListener('mouseup', () => {
  const selection = window.getSelection();
  
  // 1. ALWAYS clear any old abandoned targets the moment you click anywhere
  const oldTarget = document.getElementById('pending-style-target');
  if (oldTarget) {
      oldTarget.removeAttribute('id');
      oldTarget.style.backgroundColor = ''; 
  }

  // 2. ONLY wrap a new anchor if text is actively being highlighted
  if (selection.rangeCount > 0 && !selection.isCollapsed) {
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.id = 'pending-style-target';
    
    // Give it a subtle red background so you know it is locked and ready
    span.style.backgroundColor = 'rgba(248, 81, 73, 0.2)'; 

    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      console.log('Target locked into physical DOM.');
    } catch (err) {
      console.log('Cross-block selection prevented.');
    }
  }
});

// --- AUTO-APPLY TYPOGRAPHY LOGIC ---

// Helper function to surgically inject styles
function applyTypography(type, value) {
  const targetSpan = document.getElementById('pending-style-target');
  if (!targetSpan) return; // Fail silently if nothing is anchored

  if (type === 'color') targetSpan.style.color = value;
  if (type === 'size') targetSpan.style.fontSize = value;
  if (type === 'font') targetSpan.style.fontFamily = value;
  
  // We DO NOT remove the 'pending-style-target' ID here.
  // This allows you to chain commands (e.g. pick a color, then immediately type a size).
  // The anchor will naturally reset the next time you highlight a new word.
}

// 1. Font Color: Apply on Enter, Double-Click, OR when the OS Color Dialog closes
const colorInput = document.getElementById('style-color');
colorInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') applyTypography('color', colorInput.value);
});
colorInput.addEventListener('dblclick', () => {
  applyTypography('color', colorInput.value);
});
colorInput.addEventListener('change', () => {
  applyTypography('color', colorInput.value); // Triggers the moment you close the Windows color picker
});

// 2. Font Size: Apply instantly on pressing Enter
const sizeInput = document.getElementById('style-size');
sizeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') applyTypography('size', sizeInput.value);
});

// 3. Font Style: Apply instantly the moment a dropdown option is clicked
const fontInput = document.getElementById('style-font');
fontInput.addEventListener('change', () => {
  applyTypography('font', fontInput.value);
});
// --- AI CO-PILOT NEURAL BRIDGE (BACKTICK-FREE VERSION) ---
document.getElementById('ai-send-btn').addEventListener('click', async () => {
  const inputField = document.getElementById('ai-chat-input');
  const prompt = inputField.value.trim();
  if (!prompt) return;

  const chatWindow = document.getElementById('ai-chat-window');
  
  // 1. Render User Message
  chatWindow.innerHTML += "<div><strong style='color: #58a6ff;'>You:</strong> " + prompt + "</div>";
  inputField.value = '';
  
  // 2. Render Loading State
  const loadingId = 'loading-' + Date.now();
  chatWindow.innerHTML += "<div id='" + loadingId + "' style='color: var(--text-muted);'><em>Phi-3 is thinking...</em></div>";
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // 3. Fire payload to local Ubuntu server
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi3',
        prompt: prompt,
        stream: false 
      })
    });

    const data = await response.json();
    document.getElementById(loadingId).remove();
    
    // 4. Render AI Response
    chatWindow.innerHTML += "<div><strong style='color: #f85149;'>Phi-3:</strong> " + data.response + "</div>";
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    document.getElementById(loadingId).remove();
    chatWindow.innerHTML += "<div style='color: red;'><strong>System Error:</strong> Connection to local engine failed. Is Ollama running?</div>";
  }
});

// Allow pressing Enter to send prompts
document.getElementById('ai-chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('ai-send-btn').click();
});

// --- CORE PUBLISH LOGIC ---
document.getElementById('publish-btn').addEventListener('click', () => {
    console.log("Publish engine engaged. Compiling document payload...");
    document.querySelector('.save-status').innerText = 'Draft status: Saved to Local OS';
});
