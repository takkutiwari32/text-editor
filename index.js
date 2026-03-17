require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Required to let our custom JS talk directly to Node.js
    }
  });

  // Load our dark-mode IDE
  mainWindow.loadFile('article.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- HARDCORE FILE SYSTEM LOGIC ---
// This listens for the 'save-article' signal from our UI
ipcMain.on('save-article', (event, articleData) => {
  // 1. Define the save directory inside our project
  const dirPath = path.join(__dirname, 'articles');
  
  // 2. If the 'articles' folder doesn't exist yet, build it
  if (!fs.existsSync(dirPath)){
      fs.mkdirSync(dirPath);
  }
  
  // 3. Strip out spaces and weird characters from the title for a safe OS file name
  const safeTitle = articleData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filePath = path.join(dirPath, safeTitle + '.json');

  // 4. Physically write the structured JSON to the Ubuntu hard drive
  fs.writeFile(filePath, JSON.stringify(articleData.content, null, 2), (err) => {
    if (err) {
      console.error('Failed to save to local OS:', err);
      event.reply('save-response', { success: false, error: err.message });
    } else {
      console.log('SUCCESS: Article securely written to' + filePath);
      event.reply('save-response', { success: true, path: filePath });
     // --- SECURE CLOUD AI BRIDGE ---
ipcMain.handle('fetch-cloud-ai', async (event, prompt) => {
  const apiKey = process.env.CLOUD_AI_KEY;
  
  if (!apiKey) {
    return { error: "System Error: CLOUD_AI_KEY missing from .env vault." };
  }

  try {
    const cloudUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
    
    const response = await fetch(cloudUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    
    // Extract the text safely from the cloud JSON payload
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      return { response: data.candidates[0].content.parts[0].text };
    } else {
      return { error: "Cloud server returned an unexpected format." };
    }
    
  } catch (err) {
    return { error: "Cloud connection failed. Check your internet." };
  }
});
    }
  });
});
