import {contextBridge, ipcRenderer} from 'electron';
contextBridge.exposeInMainWorld('helper', {
  search:(args:unknown) => ipcRenderer.invoke('search',args),
  pin:(value:boolean) => ipcRenderer.invoke('pin',value),
  copy:(text:string) => ipcRenderer.invoke('copy',text),
  open:(url:string) => ipcRenderer.invoke('open',url)
});
