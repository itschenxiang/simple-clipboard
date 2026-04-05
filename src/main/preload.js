const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Get all clips
  getClips: () => ipcRenderer.invoke('get-clips'),

  // Pin/unpin a clip
  pinClip: (clipId) => ipcRenderer.invoke('pin-clip', clipId),

  // Add tag to clip
  addTag: (clipId, tag) => ipcRenderer.invoke('add-tag', { clipId, tag }),

  // Remove tag from clip
  removeTag: (clipId, tag) => ipcRenderer.invoke('remove-tag', { clipId, tag }),

  // Delete a clip
  deleteClip: (clipId) => ipcRenderer.invoke('delete-clip', clipId),

  // Copy clip content to clipboard
  copyClip: (content) => ipcRenderer.invoke('copy-clip', content),

  // Clear all history (keeps pinned)
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // Hide the main window
  hideWindow: () => ipcRenderer.send('hide-window'),

  // Listen for clip updates
  onClipsUpdated: (callback) => {
    ipcRenderer.on('clips-updated', (event, clips) => callback(clips));
  },

  // Listen for new clips
  onNewClip: (callback) => {
    ipcRenderer.on('new-clip', (event, clip) => callback(clip));
  },

  // Get storage path
  getStoragePath: () => ipcRenderer.invoke('get-storage-path'),

  // Open storage folder
  openStorageFolder: () => ipcRenderer.invoke('open-storage-folder'),

  // Open link in browser
  openLink: (url) => ipcRenderer.invoke('open-link', url)
});
