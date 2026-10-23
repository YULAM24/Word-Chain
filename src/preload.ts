import {contextBridge, ipcRenderer} from 'electron';
contextBridge.exposeInMainWorld('helper', {
  search:(args:unknown) => ipcRenderer.invoke('search',args),
  rank:(args:unknown) => ipcRenderer.invoke('rank',args),
  onRankProgress:(callback:(progress:unknown)=>void) => {
    const listener=(_event:Electron.IpcRendererEvent,progress:unknown)=>callback(progress);
    ipcRenderer.on('rank-progress',listener);
    return ()=>ipcRenderer.removeListener('rank-progress',listener);
  },
  cancelRank:() => ipcRenderer.invoke('cancel-rank'),
  pin:(value:boolean) => ipcRenderer.invoke('pin',value),
  copy:(text:string) => ipcRenderer.invoke('copy',text),
  open:(url:string) => ipcRenderer.invoke('open',url)
});
