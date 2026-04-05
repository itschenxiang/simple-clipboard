# ClipVault

A modern clipboard manager for macOS with a clean, intuitive interface inspired by WeChat Input Method.

## Features

- **Clipboard Monitoring**: Automatically captures and stores clipboard content
- **Multiple Content Types**: Supports text, URLs, code snippets, and images
- **Tag System**: Add custom tags to organize your clips
- **Search**: Search clips by content or tags
- **Pin Important Clips**: Keep important clips always accessible
- **Image Preview**: Click images to view full size
- **Clean UI**: WeChat-style interface with sidebar filtering

## Requirements

- macOS 10.15 (Catalina) or later
- Node.js 18+ (for development)

## Local Development

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

This will start the application with logging enabled for debugging.

### Build for Production

```bash
npm run build
```

This creates a macOS application bundle in the `dist` folder.

## Data Storage

All clipboard history is stored locally on your device:

```
~/Library/Application Support/simple-clipboard/clipboard-history.json
```

You can view the storage location in the app via **Settings** > **General** > **Data Storage Location**.

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Search | Focus search input |
| Escape | Close modals |

## Project Structure

```
simple-clipboard/
├── src/
│   ├── main/
│   │   ├── main.js       # Main process entry
│   │   └── preload.js    # Preload script for IPC
│   └── renderer/
│       ├── index.html    # Main UI
│       └── renderer.js    # Renderer process logic
├── assets/
│   └── icon.svg          # App icon
├── dist/                  # Build output
├── package.json
└── README.md
```

## Building for Distribution

### Prerequisites

1. Install Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```

2. Configure signing (optional, for App Store):
   - Set `APPLE_ID` environment variable
   - Set `APPLE_APP_SPECIFIC_PASSWORD` for notarization

### Build Commands

```bash
# Build for current platform (macOS)
npm run build

# Build for all platforms
npx electron-builder --mac --linux --windows

# Build directory output (faster, no packaging)
npm run pack
```

### Output Location

Built applications are placed in:
```
dist/mac/ClipVault.app
dist/mac/ClipVault-1.0.0.dmg  (if packaged)
```

## License

MIT
