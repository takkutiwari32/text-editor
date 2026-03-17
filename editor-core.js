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
    }
  },
  onChange: () => {
    // Automatically calculate Word Count and Read Time as you type
    editor.save().then((outputData) => {
      let text = '';
      outputData.blocks.forEach(block => {
        if (block.data.text) {
          // Strip HTML tags from the text data before counting
          text += block.data.text.replace(/<[^>]*>?/gm, '') + ' ';
        }
      });
      const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
      document.getElementById('word-count').innerText = words;
      document.getElementById('read-time').innerText = Math.max(1, Math.ceil(words / 200)) + ' min';
    });
  }
});

// --- Wire up Left Sidebar Wix-Style Buttons ---
document.getElementById('tool-header').addEventListener('click', () => { editor.blocks.insert('header'); });
document.getElementById('tool-image').addEventListener('click', () => { editor.blocks.insert('image'); });
document.getElementById('tool-code').addEventListener('click', () => { editor.blocks.insert('code'); });
document.getElementById('tool-table').addEventListener('click', () => { editor.blocks.insert('table'); });
document.getElementById('tool-list').addEventListener('click', () => { editor.blocks.insert('list'); });

// --- Publish Button ---
document.getElementById('publish-btn').addEventListener('click', () => {
  const title = document.getElementById('article-title').value;
  if(!title) { 
    alert('Please enter an article title first.'); 
    return; 
  }
  
  editor.save().then((outputData) => {
    console.log('Final Article Data: ', { title: title, content: outputData });
    alert('UI is fully operational! Check Developer Console. Next we build the Node.js file saver.');
  });
});
