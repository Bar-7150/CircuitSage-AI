/**
 * CircuitSage AI — Electron Main Process
 *
 * Enforces comprehensive security controls:
 * - contextIsolation: true
 * - nodeIntegration: false
 * - sandbox: true
 * - Content Security Policy (CSP) enforcement
 * - Navigation restrictions (blocking arbitrary web navigation)
 * - Safe external link delegation to OS browser
 * - Background child process supervision for Express API
 */

const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipc');
const { startManagedApiServer, stopManagedApiServer } = require('./processManager');

let mainWindow = null;

const IS_DEV = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
const FRONTEND_URL = process.env.ELECTRON_START_URL || 'http://localhost:3000';

/**
 * Configure Content Security Policy (CSP) headers
 */
function setupContentSecurityPolicy() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self' http://localhost:3000",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com http://localhost:3000",
            "font-src 'self' https://fonts.gstatic.com data: http://localhost:3000",
            "connect-src 'self' http://localhost:3000 http://127.0.0.1:8000 http://localhost:8000 ws://localhost:3000 https://*.supabase.co",
            "img-src 'self' data: blob: http://localhost:8000 http://localhost:3000"
          ].join('; ')
        ]
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'CircuitSage AI — IoT Desktop IDE',
    backgroundColor: '#020617', // Slate 950
    show: false, // Show once ready-to-show to prevent white flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  // Reveal window smoothly when content is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (IS_DEV && process.env.ELECTRON_DEV_TOOLS === 'true') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // ==========================================================================
  // NAVIGATION & WINDOW SECURITY CONTROLS
  // ==========================================================================

  // Prevent renderer from navigating away from trusted local app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      const isAllowedLocal = parsed.origin === 'http://localhost:3000' ||
                             parsed.origin === 'http://127.0.0.1:3000';
      if (!isAllowedLocal) {
        console.warn(`[Security] Blocked unauthorized in-window navigation to: ${navigationUrl}`);
        event.preventDefault();
        // Open safe external links in user's OS browser instead
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          shell.openExternal(navigationUrl);
        }
      }
    } catch {
      event.preventDefault();
    }
  });

  // Intercept window.open calls from renderer (target="_blank")
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(url);
      }
    } catch (err) {
      console.error('[Security] Failed to open external URL:', err.message);
    }
    return { action: 'deny' }; // Never open auxiliary Electron windows
  });

  // Load the Next.js application
  loadFrontendApp(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Loads the Next.js frontend with retry logic if the dev server is starting
 */
async function loadFrontendApp(win, maxRetries = 10) {
  let attempt = 0;

  async function tryLoad() {
    try {
      await win.loadURL(FRONTEND_URL);
      console.log(`[Electron Main] Successfully loaded ${FRONTEND_URL}`);
    } catch (err) {
      attempt++;
      if (attempt < maxRetries) {
        console.log(`[Electron Main] Next.js frontend not ready yet (attempt ${attempt}/${maxRetries}). Retrying in 1s...`);
        setTimeout(tryLoad, 1000);
      } else {
        console.error(`[Electron Main] Failed to load frontend after ${maxRetries} attempts:`, err.message);
        // Load fallback error screen
        win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
          <!DOCTYPE html>
          <html>
            <body style="background:#020617;color:#f8fafc;font-family:sans-serif;padding:40px;text-align:center;">
              <h2>⚡ CircuitSage AI Desktop</h2>
              <p style="color:#94a3b8;">Unable to connect to Next.js frontend on <code>${FRONTEND_URL}</code>.</p>
              <p style="font-size:13px;color:#cbd5e1;">Please ensure <code>npm run dev:web</code> is running.</p>
            </body>
          </html>
        `)}`);
      }
    }
  }

  tryLoad();
}

// ============================================================================
// APP LIFECYCLE & SUPERVISION
// ============================================================================

app.whenReady().then(async () => {
  setupContentSecurityPolicy();

  // Register whitelisted IPC handlers
  registerIpcHandlers(() => mainWindow);

  // Supervise background Express API
  try {
    await startManagedApiServer(8000);
  } catch (err) {
    console.error('[ProcessManager] Error starting API server:', err.message);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Graceful shutdown
app.on('before-quit', () => {
  stopManagedApiServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
