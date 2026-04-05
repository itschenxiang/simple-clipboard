// State
let clips = [];
let selectedClip = null;
let currentFilter = 'all';
let searchType = 'content';

// DOM Elements
const clipboardList = document.getElementById('clipboardList');
const previewText = document.getElementById('previewText');
const previewPin = document.getElementById('previewPin');
const previewCopy = document.getElementById('previewCopy');
const searchInput = document.getElementById('searchInput');
const statusCount = document.getElementById('statusCount');
const toast = document.getElementById('toast');
const timeTooltip = document.getElementById('timeTooltip');
const imageHoverPreview = document.getElementById('imageHoverPreview');
const imageHoverPreviewImg = document.getElementById('imageHoverPreviewImg');
const imageModal = document.getElementById('imageModal');
const imageModalImg = document.getElementById('imageModalImg');
const imageModalClose = document.getElementById('imageModalClose');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsClose = document.getElementById('settingsClose');
const storagePath = document.getElementById('storagePath');
const openStorageBtn = document.getElementById('openStorageBtn');
const sidebarIcons = document.querySelectorAll('.sidebar-icon[data-filter]');

// Format relative time
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

// Get type icon SVG
function getTypeIcon(type) {
  const icons = {
    text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    url: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
  };
  return icons[type] || icons.text;
}

// Show toast notification
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Render clips
function renderClips() {
  let filteredClips = clips;

  // Apply filter
  if (currentFilter === 'pinned') {
    filteredClips = clips.filter(c => c.pinned);
  } else if (currentFilter !== 'all') {
    filteredClips = clips.filter(c => c.type === currentFilter);
  }

  // Apply search
  const searchTerm = searchInput.value.toLowerCase();
  if (searchTerm) {
    if (searchType === 'content') {
      filteredClips = filteredClips.filter(c =>
        c.content.toLowerCase().includes(searchTerm)
      );
    } else if (searchType === 'tag') {
      filteredClips = filteredClips.filter(c =>
        (c.tags || []).some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
  }

  if (filteredClips.length === 0) {
    clipboardList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
        ${searchTerm ? 'No matching clips found' : 'No clips yet. Copy something to get started!'}
      </div>
    `;
    statusCount.textContent = '0 clips';
    return;
  }

  clipboardList.innerHTML = filteredClips.map((clip) => `
    <div class="clipboard-item ${clip.pinned ? 'pinned' : ''} ${selectedClip?.id === clip.id ? 'selected' : ''}"
         data-id="${clip.id}">
      <div class="item-header">
        <div class="item-type">
          ${getTypeIcon(clip.type)}
          ${clip.type.toUpperCase()}
        </div>
        <div class="item-time" data-fulltime="${clip.createdAt}">${formatTime(clip.createdAt)}</div>
      </div>
      <div class="item-content ${clip.type}">${clip.type === 'image' ? `<img src="${clip.content}" class="item-thumbnail">` : escapeHtml(clip.content)}</div>
      <div class="item-footer">
        <div class="item-tags">
          ${(clip.tags || []).map(tag => `<span class="tag" data-tag="${tag}" data-id="${clip.id}">${escapeHtml(tag)}<button class="tag-delete-btn" data-action="remove-tag" data-id="${clip.id}" data-tag="${tag}">×</button></span>`).join('')}
          <button class="tag-add-btn" data-action="add-tag" data-id="${clip.id}" title="Add tag">+</button>
        </div>
        <div class="item-actions">
          <button class="item-action-btn ${clip.pinned ? 'pinned' : 'pin-btn'}" data-action="pin" data-id="${clip.id}" title="${clip.pinned ? 'Unpin' : 'Pin'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L12 22"/>
              <path d="M5 12l7-7 7 7"/>
            </svg>
          </button>
          <button class="item-action-btn copy-btn" data-action="copy" data-id="${clip.id}" title="Copy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
          <button class="item-action-btn delete-btn" data-action="delete" data-id="${clip.id}" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  statusCount.textContent = `${filteredClips.length} clip${filteredClips.length !== 1 ? 's' : ''}`;

  // Add event listeners
  document.querySelectorAll('.clipboard-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Don't select if clicking on action buttons or tags
      if (e.target.closest('.item-action-btn') || e.target.closest('.item-tags')) {
        return;
      }

      const id = item.dataset.id;
      const clip = clips.find(c => c.id === id);
      selectClip(clip);
    });
  });

  document.querySelectorAll('.item-action-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === 'pin') {
        await handlePin(id);
      } else if (action === 'copy') {
        await handleCopy(id);
      } else if (action === 'delete') {
        await handleDelete(id);
      } else if (action === 'add-tag') {
        await handleAddTag(id);
      }
    });
  });

  // Add event listener for tag delete buttons
  document.querySelectorAll('.tag-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const tag = btn.dataset.tag;
      clips = await window.electronAPI.removeTag(id, tag);
      selectedClip = clips.find(c => c.id === id);
      renderClips();
      updatePreview();
    });
  });

  // Add event listener for add tag button
  document.querySelectorAll('.tag-add-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      await handleAddTag(id);
    });
  });

  // Add event listeners for time tooltip
  document.querySelectorAll('.item-time').forEach(timeEl => {
    timeEl.addEventListener('mouseenter', (e) => {
      const isoTime = timeEl.dataset.fulltime;
      if (!isoTime) return;
      const date = new Date(isoTime);
      const formattedTime = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0') + ':' +
        String(date.getSeconds()).padStart(2, '0');
      timeTooltip.textContent = formattedTime;
      timeTooltip.classList.add('show');

      // Position tooltip above the time element
      const rect = timeEl.getBoundingClientRect();
      timeTooltip.style.left = rect.left + 'px';
      timeTooltip.style.top = (rect.top - timeTooltip.offsetHeight - 5) + 'px';
    });

    timeEl.addEventListener('mouseleave', () => {
      timeTooltip.classList.remove('show');
    });
  });
}

// Select clip
function selectClip(clip) {
  selectedClip = clip;
  renderClips();
  updatePreview();
}

// Update preview panel
function updatePreview() {
  if (!selectedClip) {
    previewText.innerHTML = `
      <div class="preview-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
        Select a clip to preview
      </div>
    `;
    previewPin.style.display = 'none';
    return;
  }

  previewPin.style.display = 'flex';
  if (selectedClip.type === 'image') {
    previewText.innerHTML = `<img src="${selectedClip.content}" class="preview-full-image">`;
  } else {
    previewText.innerHTML = `<div class="preview-text ${selectedClip.type}-content">${escapeHtml(selectedClip.content)}</div>`;
  }

  if (selectedClip.pinned) {
    previewPin.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L12 22"/>
        <path d="M5 12l7-7 7 7"/>
      </svg>
      Pinned
    `;
    previewPin.classList.add('pinned');
  } else {
    previewPin.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L12 22"/>
        <path d="M5 12l7-7 7 7"/>
      </svg>
      Pin
    `;
    previewPin.classList.remove('pinned');
  }
}

// Handle pin
async function handlePin(id) {
  clips = await window.electronAPI.pinClip(id);
  const clip = clips.find(c => c.id === id);
  if (clip) {
    selectedClip = clip;
  }
  renderClips();
  updatePreview();
  showToast(clips.find(c => c.id === id)?.pinned ? 'Clip pinned' : 'Clip unpinned');
}

// Handle copy
async function handleCopy(id) {
  const clip = clips.find(c => c.id === id);
  if (clip) {
    await window.electronAPI.copyClip(clip.content);
    showToast('Copied to clipboard!');
  }
}

// Handle delete
async function handleDelete(id) {
  clips = await window.electronAPI.deleteClip(id);
  if (selectedClip?.id === id) {
    selectedClip = null;
  }
  renderClips();
  updatePreview();
  showToast('Clip deleted');
}

// Handle add tag - show inline input
async function handleAddTag(id) {
  const itemTags = document.querySelector(`.clipboard-item[data-id="${id}"] .item-tags`);
  if (!itemTags) return;

  // Remove any existing input
  const existingInput = itemTags.querySelector('.tag-input-inline');
  if (existingInput) return;

  // Hide the + button
  const addBtn = itemTags.querySelector('.tag-add-btn');
  if (addBtn) addBtn.style.display = 'none';

  // Create inline input
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'tag-input-inline';
  input.placeholder = 'tag...';
  input.style.cssText = 'padding: 2px 6px; font-size: 12px; border: 1px solid var(--accent); border-radius: 4px; outline: none; width: 60px;';

  let isComposing = false;

  input.addEventListener('compositionstart', () => {
    isComposing = true;
  });

  input.addEventListener('compositionend', () => {
    isComposing = false;
  });

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && !isComposing) {
      const tagValue = input.value.trim();
      if (tagValue) {
        clips = await window.electronAPI.addTag(id, tagValue);
        selectedClip = clips.find(c => c.id === id);
        renderClips();
        updatePreview();
        showToast('Tag added');
      } else {
        renderClips();
      }
    } else if (e.key === 'Escape') {
      renderClips();
    }
  });

  input.addEventListener('blur', async () => {
    // Delay blur to avoid issues with IME
    setTimeout(async () => {
      if (document.activeElement !== input) {
        const tagValue = input.value.trim();
        if (tagValue) {
          clips = await window.electronAPI.addTag(id, tagValue);
          selectedClip = clips.find(c => c.id === id);
          renderClips();
          updatePreview();
          showToast('Tag added');
        } else {
          renderClips();
        }
      }
    }, 100);
  });

  itemTags.appendChild(input);
  input.focus();
}

// Handle clear
async function handleClear() {
  if (clips.length === 0) return;

  if (confirm('Clear all unpinned clips?')) {
    clips = await window.electronAPI.clearHistory();
    selectedClip = null;
    renderClips();
    updatePreview();
    showToast('History cleared');
  }
}

// Filter click handlers
sidebarIcons.forEach(icon => {
  icon.addEventListener('click', () => {
    sidebarIcons.forEach(i => i.classList.remove('active'));
    icon.classList.add('active');
    currentFilter = icon.dataset.filter;
    renderClips();
  });
});

// Search type dropdown handler
const searchTypeBtn = document.getElementById('searchType');
const searchDropdown = document.getElementById('searchDropdown');

searchTypeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  searchDropdown.classList.toggle('show');
});

document.querySelectorAll('.search-dropdown-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    const type = item.dataset.type;
    searchType = type;

    // Update UI
    document.querySelector('.search-type-text').textContent = type === 'content' ? 'Content' : 'Tag';
    document.querySelectorAll('.search-dropdown-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    searchDropdown.classList.remove('show');
    renderClips();
  });
});

document.addEventListener('click', () => {
  searchDropdown.classList.remove('show');
});

// Search input handler
searchInput.addEventListener('input', () => {
  renderClips();
});

// Preview handlers
previewPin.addEventListener('click', () => {
  if (selectedClip) {
    handlePin(selectedClip.id);
  }
});

previewCopy.addEventListener('click', () => {
  if (selectedClip) {
    handleCopy(selectedClip.id);
  }
});

// Splitter drag functionality
const splitter = document.getElementById('splitter');
const previewPanel = document.querySelector('.preview-panel');

let isResizing = false;

splitter.addEventListener('mousedown', (e) => {
  isResizing = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;

  const container = document.querySelector('.app-container');
  const containerRect = container.getBoundingClientRect();
  const mainContent = document.querySelector('.main-content');
  const mainRect = mainContent.getBoundingClientRect();

  // Calculate new width for preview panel
  const newWidth = containerRect.right - e.clientX - 4; // 4px is splitter width

  if (newWidth >= 200 && newWidth <= 500) {
    previewPanel.style.flex = `0 0 ${newWidth}px`;
    previewPanel.style.width = `${newWidth}px`;
  }
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// Settings modal handler
function setupSettingsModal() {
  settingsBtn.addEventListener('click', async () => {
    const path = await window.electronAPI.getStoragePath();
    storagePath.textContent = path;
    settingsModal.classList.add('show');
  });

  settingsClose.addEventListener('click', () => {
    settingsModal.classList.remove('show');
  });

  settingsOverlay.addEventListener('click', () => {
    settingsModal.classList.remove('show');
  });

  openStorageBtn.addEventListener('click', async () => {
    await window.electronAPI.openStorageFolder();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal.classList.contains('show')) {
      settingsModal.classList.remove('show');
    }
  });
}

// Image modal click handler
function setupImageModal() {
  // Click on preview image to show modal
  previewText.addEventListener('click', (e) => {
    if (selectedClip && selectedClip.type === 'image') {
      const img = e.target.closest('img');
      if (img) {
        imageModalImg.src = selectedClip.content;
        imageModal.classList.add('show');
      }
    }
  });

  // Close modal
  imageModalClose.addEventListener('click', () => {
    imageModal.classList.remove('show');
  });

  imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
      imageModal.classList.remove('show');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && imageModal.classList.contains('show')) {
      imageModal.classList.remove('show');
    }
  });
}

// Initialize
async function init() {
  clips = await window.electronAPI.getClips();
  renderClips();
  updatePreview();
  setupImageModal();
  setupSettingsModal();

  // Listen for updates from main process
  window.electronAPI.onClipsUpdated((updatedClips) => {
    clips = updatedClips;
    if (selectedClip) {
      selectedClip = clips.find(c => c.id === selectedClip.id);
    }
    renderClips();
    updatePreview();
  });
}

init();