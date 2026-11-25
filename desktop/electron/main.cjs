const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const isDevelopment = !app.isPackaged

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f5f7fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  const packagedIndexUrl = pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = isDevelopment ? url.startsWith('http://127.0.0.1:5174/') : url === packagedIndexUrl
    if (!allowed) event.preventDefault()
  })

  if (isDevelopment) {
    mainWindow.loadURL('http://127.0.0.1:5174')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}


app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
