# Node on Android

Build native Android apps with Node.js and HTML/CSS. Write your backend in Node.js, your UI in web technologies, bundle everything into a single APK.

## Quick Start

```bash
# Install
npm install node-on-android

# Create your app
echo "require('node-on-android').loadUrl('http://localhost:3000')" > index.js

# Build APK
npx node-on-android . -b /path/to/android/build-tools

# Install on device
adb install app.apk
```

## What You Get

- **Node.js Backend**: Full Node.js runtime running natively on Android
- **WebView UI**: Standard web tech (HTML/CSS/JS) for your interface
- **Single APK**: Everything bundled together, no server needed
- **Offline First**: Your app works without internet
- **Custom Branding**: Configure app name, icons, splash screen via config file

## Prerequisites

1. **Android SDK Build Tools**
   Download from [developer.android.com/studio](https://developer.android.com/studio)
   Mac: Usually in `~/Library/Android/sdk/build-tools/[version]/`

2. **apktool**
   ```bash
   brew install apktool
   ```

3. **ImageMagick** (for custom icons)
   ```bash
   brew install imagemagick
   ```

## Installation

### As Local Dependency

```bash
npm install node-on-android
```

Or use this fork with splash screen improvements:

```bash
npm install github:bigfive/node-on-android
```

### Global Installation

```bash
npm install -g node-on-android
```

## Usage

### Basic Example

Create `index.js`:

```javascript
const http = require('http')
const android = require('node-on-android')

const server = http.createServer((req, res) => {
  res.end(`
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: system-ui;
            padding: 20px;
            background: #f5f5f5;
          }
        </style>
      </head>
      <body>
        <h1>Hello from Node.js!</h1>
        <p>Running on Android</p>
      </body>
    </html>
  `)
})

server.listen(0, () => {
  android.loadUrl(`http://localhost:${server.address().port}`)
})
```

### Build Your App

```bash
node-on-android . -o myapp.apk -b /path/to/build-tools
```

### Deploy to Device

```bash
# Install
adb install myapp.apk

# Launch
adb shell am start -n com.mafintosh.nodeonandroid/.MainActivity

# View logs
adb logcat | grep -i node
```

## Configuration

Create `node-on-android.config.js` in your project root:

```javascript
module.exports = {
  // Exclude files from APK
  excludes: [
    'node_modules',
    '*.apk',
    '.git',
    'test/**'
  ],

  // Customize branding (no rebuild needed!)
  branding: {
    appName: 'My App',

    // App icon (auto-resized for all densities)
    appIcon: './icon.png',

    // Splash screen
    splashLogo: './splash.png',
    splashBackground: '#FFFFFF',
    splashInsets: {
      top: '250dp',
      bottom: '250dp',
      left: '250dp',
      right: '250dp'
    },

    // Theme colors
    colors: {
      primary: '#667eea',
      primaryDark: '#5568d3',
      accent: '#764ba2'
    }
  }
}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `excludes` | Files/patterns to exclude from APK | `['node_modules', '*.apk']` |
| `branding.appName` | App name in launcher | `'Node on Android'` |
| `branding.appIcon` | Path to icon (512x512+ PNG) | Default icon |
| `branding.splashLogo` | Path to splash logo (1024x1024 PNG) | Default logo |
| `branding.splashBackground` | Splash background color (hex) | `'#FFFFFF'` |
| `branding.splashInsets` | Logo size (smaller = bigger) | `250dp` each side |
| `branding.colors.*` | App theme colors | Material Design defaults |

## How It Works

```
┌──────────────────┐
│   Your Node.js   │  Your backend code
│      Code        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Node.js Runtime │  Native ARM64 binary
│   (embedded)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Android APK    │  Single file deployment
│                  │
│  ┌────────────┐  │
│  │  WebView   │  │  Your UI (HTML/CSS/JS)
│  └────────────┘  │
└──────────────────┘
```

1. **Build Time**: Your Node.js code is copied into the APK's assets folder
2. **Runtime**: Android app starts → Node.js runtime initializes → Your `index.js` runs
3. **UI**: Call `android.loadUrl()` to load HTML in the WebView
4. **Communication**: Node.js and WebView share localhost

## API

### `require('node-on-android')`

```javascript
const android = require('node-on-android')

// Load URL in WebView
android.loadUrl('http://localhost:3000')
android.loadUrl('file:///android_asset/index.html')

// Can call multiple times to change page
android.loadUrl('http://localhost:3000/settings')
```

## Project Structure

```
my-app/
├── index.js                      # Your Node.js entry point
├── node-on-android.config.js     # Build configuration
├── package.json
├── icon.png                      # App icon
├── splash.png                    # Splash logo
└── public/                       # Static assets (optional)
    └── style.css
```

## Improvements in This Fork

This fork adds several enhancements over the original:

- ✅ **Splash Screen**: Configurable splash screen with custom logo
- ✅ **WebView Fix**: Splash stays visible until content loads (no white flash)
- ✅ **Config-Based Branding**: Customize app name, icons, colors without rebuilding base APK
- ✅ **Better Build Process**: Fixes apktool output directory bug
- ✅ **Size Optimization**: Excludes node_modules and build artifacts by default
- ✅ **Modern SDK**: Updated to Android SDK 33, Gradle 7.6

## Limitations

- **ARM64 Only**: Currently only supports ARM64 devices (most modern Android phones)
- **Android 5.0+**: Requires API level 21 or higher
- **No Native Modules**: C++ native modules not supported (pure JS only)
- **WebView UI**: You're limited to web technologies for the UI

## Troubleshooting

### Build fails
- Ensure Android build tools are installed and path is correct
- Try specifying exact version: `-b /path/to/sdk/build-tools/33.0.1/`

### APK won't install
- Enable "Install from Unknown Sources" in Android settings
- Check `adb logcat` for errors

### White screen on launch
- This fork fixes the white screen issue with proper splash screen timing
- Check that your Node.js code calls `android.loadUrl()`

### Icons not showing
- Verify ImageMagick is installed: `magick --version`
- Check icon file exists at the path specified in config
- Icon must be PNG format (512x512+ recommended)

## Contributing

This is a fork with improvements. For the original project, see [node-on-mobile/node-on-android](https://github.com/node-on-mobile/node-on-android).

To contribute to this fork:
1. Fork this repository
2. Make your changes
3. Test on a physical device
4. Submit a pull request

## License

MIT

---

**Sources for README best practices:**
- [Make a README](https://www.makeareadme.com/)
- [Professional README Guide](https://coding-boot-camp.github.io/full-stack/github/professional-readme-guide/)
- [awesome-readme](https://github.com/matiassingers/awesome-readme)
