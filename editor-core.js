// --- 1. CUSTOM AUDIO ENGINE ---
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
  const title = document.getElementById('article-title').value;
  if(!title) { alert('Please enter an article title first.'); return; }
  
  editor.save().then((outputData) => {
    console.log('Final Article Data: ', { title: title, content: outputData });
    alert('Custom engines successfully fired! Check Developer Console.');
  });
});
