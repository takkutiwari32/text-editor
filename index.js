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
    }
  });
});
