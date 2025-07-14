// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // Création de la fenêtre principale
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Permet d'utiliser `require` dans le rendu (utile pour debug)
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // En dev, on pointe vers le serveur React
  win.loadURL('http://localhost:3000');

  // (Optionnel) Ouvre les DevTools
  // win.webContents.openDevTools();
}

// Quand Electron est prêt, on crée la fenêtre
app.whenReady().then(createWindow);

// Quitter sur Windows/Linux quand toutes les fenêtres sont fermées
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Sur macOS, recréer une fenêtre si l'icône dock est cliquée
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

