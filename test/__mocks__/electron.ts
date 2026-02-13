import { vi } from "vitest"

export const app = {
  whenReady: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  quit: vi.fn(),
  getPath: vi.fn().mockReturnValue("/tmp"),
}

export const BrowserWindow = Object.assign(
  vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    on: vi.fn(),
    show: vi.fn(),
    webContents: {
      setWindowOpenHandler: vi.fn(),
      on: vi.fn(),
      send: vi.fn(),
      openDevTools: vi.fn(),
    },
  })),
  {
    getAllWindows: vi.fn().mockReturnValue([]),
  },
)

export const ipcMain = {
  on: vi.fn(),
  handle: vi.fn(),
  removeHandler: vi.fn(),
}

export const shell = {
  openExternal: vi.fn(),
}

export const dialog = {
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
  showMessageBox: vi.fn(),
}
