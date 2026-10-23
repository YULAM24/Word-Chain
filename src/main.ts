import {app, BrowserWindow, ipcMain, clipboard, shell} from 'electron';
import path from 'node:path';
import {search} from './dictionary';
let win: BrowserWindow;
app.whenReady().then(() => {
  win = new BrowserWindow({width: 360, height: 440, minWidth: 320, minHeight: 400, alwaysOnTop: true, autoHideMenuBar: true, backgroundColor:'#111827', webPreferences:{preload:path.join(__dirname,'preload.js'), contextIsolation:true, nodeIntegration:false, sandbox:true}});
  win.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  win.webContents.on('will-navigate', event => event.preventDefault());
  void win.loadFile(path.join(__dirname,'index.html'));
});
ipcMain.handle('search', async (_event, args: unknown) => {
  try {
    const a = args as {key:string; prefix:string; nouns:boolean; start:number};
    if (!a || typeof a.key !== 'string' || typeof a.prefix !== 'string' || typeof a.nouns !== 'boolean' || a.key.length > 1024 || a.prefix.length > 30) throw new Error('검색 입력을 확인하세요.');
    return {result:await search(a.key,a.prefix,a.nouns,a.start)};
  } catch (error) { return {error: error instanceof Error ? error.message : '조회 실패'}; }
});
ipcMain.handle('pin', (_event, value: boolean) => {win.setAlwaysOnTop(Boolean(value));});
ipcMain.handle('copy', (_event, text: unknown) => {if(typeof text === 'string' && /^[가-힣]{2,}$/.test(text)) clipboard.writeText(text);});
ipcMain.handle('open', (_event, value: unknown) => {
  if(typeof value !== 'string') return;
  try { const url = new URL(value); if(url.protocol === 'https:' && url.hostname === 'stdict.korean.go.kr') return shell.openExternal(url.href); } catch { /* Ignore invalid links. */ }
});
app.on('window-all-closed', () => app.quit());
