const { app, BrowserWindow, ipcMain, clipboard, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('Application starting...');

// Initialize store for clipboard history
const store = new Store({
  name: 'clipboard-history',
  defaults: {
    clips: [],
    settings: {
      maxClips: 500,
      autoStart: true
    }
  }
});

// Track if quit was initiated by user (dock/cmd+q) vs close button
let willQuit = false;

// Listen for quit initiation
app.on('before-quit', () => {
  willQuit = true;
});

let mainWindow = null;
let tray = null;
let clipboardWatcher = null;
let lastClipboardContent = '';
let lastClipboardImage = '';

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Prevent window from being destroyed on close - just hide it (unless quitting)
  mainWindow.on('close', (e) => {
    if (!willQuit) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  log.info('Main window created');
}

// Create system tray icon
function createTray() {
  // Use the app icon for the tray
  const trayIcon = nativeImage.createFromPath(path.join(__dirname, '../../assets/tray_icon.png'));

  tray = new Tray(trayIcon);
  tray.setToolTip('SimpleClipboard');

  // Click on tray icon to show window
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  log.info('System tray created');
}

// Start monitoring clipboard
function startClipboardWatcher() {
  lastClipboardContent = clipboard.readText();
  const img = clipboard.readImage();
  lastClipboardImage = img.isEmpty() ? '' : img.toDataURL();

  clipboardWatcher = setInterval(() => {
    // Check for text changes
    const currentContent = clipboard.readText();
    if (currentContent && currentContent !== lastClipboardContent) {
      lastClipboardContent = currentContent;

      const newClip = {
        id: Date.now().toString(),
        type: detectClipType(currentContent),
        content: currentContent,
        createdAt: new Date().toISOString(),
        pinned: false,
        tags: []
      };

      addClip(newClip);
    }

    // Check for image changes
    const currentImage = clipboard.readImage();
    const currentImageData = currentImage.isEmpty() ? '' : currentImage.toDataURL();
    if (currentImageData && currentImageData !== lastClipboardImage) {
      lastClipboardImage = currentImageData;

      const newClip = {
        id: Date.now().toString(),
        type: 'image',
        content: currentImageData,
        createdAt: new Date().toISOString(),
        pinned: false,
        tags: []
      };

      addClip(newClip);
    }
  }, 500);

  log.info('Clipboard watcher started');
}

// Add clip to store
function addClip(newClip) {
  let clips = store.get('clips') || [];

  // Check for duplicate (skip for images as data URLs are long)
  if (newClip.type !== 'image') {
    const existingIndex = clips.findIndex(c => c.content === newClip.content);
    if (existingIndex !== -1) {
      clips.splice(existingIndex, 1);
    }
  }

  clips.unshift(newClip);

  const maxClips = store.get('settings.maxClips') || 500;
  if (clips.length > maxClips) {
    clips = clips.slice(0, maxClips);
  }

  store.set('clips', clips);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('clips-updated', clips);
    mainWindow.webContents.send('new-clip', newClip);
  }

  log.info('New clip added:', newClip.type);
}

// Detect clip type based on content
function detectClipType(content) {
  const urlPattern = /^(https?:\/\/|www\.)[^\s]+$/i;
  if (urlPattern.test(content.trim())) {
    return 'url';
  }

  const codePatterns = [
    /^(const|let|var|function|class|import|export|if|for|while)\s/m,
    /[{}\[\]();]/,
    /^(def|class|import|from|if|for|while|return)\s/m,
    /<\/?[a-z][\s\S]*>/i
  ];
  for (const pattern of codePatterns) {
    if (pattern.test(content)) {
      return 'code';
    }
  }

  if (content.startsWith('data:image') || /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(content)) {
    return 'image';
  }

  return 'text';
}

// Stop clipboard watcher
function stopClipboardWatcher() {
  if (clipboardWatcher) {
    clearInterval(clipboardWatcher);
    clipboardWatcher = null;
    log.info('Clipboard watcher stopped');
  }
}

// IPC Handlers
ipcMain.handle('get-clips', () => {
  return store.get('clips') || [];
});

ipcMain.handle('pin-clip', (event, clipId) => {
  let clips = store.get('clips') || [];
  const clipIndex = clips.findIndex(c => c.id === clipId);

  if (clipIndex !== -1) {
    clips[clipIndex].pinned = !clips[clipIndex].pinned;
    store.set('clips', clips);
    return clips;
  }
  return clips;
});

ipcMain.handle('add-tag', (event, { clipId, tag }) => {
  let clips = store.get('clips') || [];
  const clipIndex = clips.findIndex(c => c.id === clipId);

  if (clipIndex !== -1) {
    if (!clips[clipIndex].tags) {
      clips[clipIndex].tags = [];
    }
    if (!clips[clipIndex].tags.includes(tag)) {
      clips[clipIndex].tags.push(tag);
    }
    store.set('clips', clips);
  }
  return clips;
});

ipcMain.handle('remove-tag', (event, { clipId, tag }) => {
  let clips = store.get('clips') || [];
  const clipIndex = clips.findIndex(c => c.id === clipId);

  if (clipIndex !== -1) {
    if (clips[clipIndex].tags) {
      clips[clipIndex].tags = clips[clipIndex].tags.filter(t => t !== tag);
    }
    store.set('clips', clips);
  }
  return clips;
});

ipcMain.handle('delete-clip', (event, clipId) => {
  let clips = store.get('clips') || [];
  clips = clips.filter(c => c.id !== clipId);
  store.set('clips', clips);
  return clips;
});

ipcMain.handle('copy-clip', (event, content) => {
  if (content.startsWith('data:image')) {
    // It's an image - write from base64 data
    const image = clipboard.readImage();
    // For copying back, we need to write the image back
    // Since clipboard.writeImage takes a NativeImage, we need a different approach
    // We'll store image data and use writeImage with the stored data
    const img = clipboard.readImage();
    // Actually clipboard.writeImage expects a NativeImage created from the same app
    // For data URLs, we need to create image from data URL
    const nativeImage = require('electron').nativeImage;
    const imageData = nativeImage.createFromDataURL(content);
    clipboard.writeImage(imageData);
    lastClipboardImage = content;
  } else {
    clipboard.writeText(content);
    lastClipboardContent = content;
  }
  return true;
});

ipcMain.handle('clear-history', () => {
  let clips = store.get('clips') || [];
  clips = clips.filter(c => c.pinned);
  store.set('clips', clips);
  return clips;
});

// Get storage path
ipcMain.handle('get-storage-path', () => {
  return store.path;
});

// Open storage folder
ipcMain.handle('open-storage-folder', () => {
  const { shell } = require('electron');
  shell.showItemInFolder(store.path);
});

// Open link in browser
ipcMain.handle('open-link', (event, url) => {
  const { shell } = require('electron');
  shell.openExternal(url);
});

// App lifecycle
app.whenReady().then(() => {
  log.info('App is ready');
  createWindow();
  createTray();
  startClipboardWatcher();

  if (mainWindow) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('clips-updated', store.get('clips') || []);
    });
  }
});

// Don't quit on macOS when all windows are closed - keep running in background
// app.on('window-all-closed', () => {
//   app.quit();
// });

app.on('activate', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
});

log.info('Main process initialized');
