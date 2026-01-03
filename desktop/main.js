import { app, BrowserWindow, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.ELECTRON_DEV === "1";
const devServerURL = process.env.VITE_DEV_SERVER || "http://localhost:5173";

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "ZentroPOS",
    webPreferences: {
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL(devServerURL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(__dirname, "..", "dist", "index.html");
    mainWindow.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  createWindow();

  const setLanguage = (lang) => {
    if (!mainWindow) return;
    const script = `
      localStorage.setItem('lang', '${lang}');
      location.reload();
    `;
    mainWindow.webContents.executeJavaScript(script, true).catch(() => {});
  };

  const menu = Menu.buildFromTemplate([
    {
      label: "View",
      submenu: [
        { role: "zoomIn", label: "Zoom In" },
        { role: "zoomOut", label: "Zoom Out" },
        { type: "separator" },
        {
          label: "Language",
          submenu: [
            { label: "English", click: () => setLanguage("en") },
            { label: "Español", click: () => setLanguage("es") },
            { label: "العربية", click: () => setLanguage("ar") },
          ],
        },
        { type: "separator" },
        { role: "quit", label: "Exit" },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
