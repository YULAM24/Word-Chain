import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import * as dictionary from './dictionary';

test('실제 main→preload→renderer 경로로 다음 페이지 한방 후보가 화면에 반영됨',async()=>{
 const original=globalThis.fetch;
 const calls:string[]=[];
 let releaseSlow! :()=>void;const slow=new Promise<void>(resolve=>{releaseSlow=resolve;});
 const item=(word:string)=>({word,pos:'명사',sense:{definition:'테스트 응답',link:'https://stdict.korean.go.kr/test'}});
 globalThis.fetch=async input=>{
  const url=new URL(String(input)),q=url.searchParams.get('q')!,start=url.searchParams.get('start');calls.push(`${q}:${start}`);
  let total=0,items:ReturnType<typeof item>[]=[];
  if(q==='가'){
   total=101;
   items=start==='1'?[...Array.from({length:99},(_,i)=>item('가'+String.fromCharCode(0xac00+i)+'방')),item('가구')]:[item('가늄')];
  }else if(q==='방'||q==='구'){
   if(q==='방')await slow;
   total=q==='방'?8000:180;items=Array.from({length:100},(_,i)=>item(q+String.fromCharCode(0xac00+i)));
  }
  return new Response(JSON.stringify({channel:{total,item:items}}));
 };
 try{
  const handlers=new Map<string,Function>(),listeners=new Map<string,Function[]>();
  const elements=new Map<string,any>();
  const get=(id:string)=>{if(!elements.has(id))elements.set(id,{value:id==='key'?'test-key':'가',checked:['nouns','oneShot','hard'].includes(id),addEventListener(_n:string,fn:unknown){this.handler=fn;}});return elements.get(id);};
  const rendererWindow:any={};
  class FakeWindow {
   webContents={setWindowOpenHandler(){},on(){},send(channel:string,data:unknown){for(const fn of listeners.get(channel)??[])fn({},data);}};
   loadFile(){} isDestroyed(){return false;} setAlwaysOnTop(){}
  }
  const electron={app:{whenReady:()=>Promise.resolve(),on(){},quit(){}},BrowserWindow:FakeWindow,clipboard:{writeText(){}},shell:{openExternal(){}},ipcMain:{handle:(name:string,fn:Function)=>handlers.set(name,fn)},ipcRenderer:{invoke:async(name:string,args:unknown)=>handlers.get(name)!({},args),on:(name:string,fn:Function)=>{listeners.set(name,[...(listeners.get(name)??[]),fn]);},removeListener(){}},contextBridge:{exposeInMainWorld:(name:string,value:unknown)=>{rendererWindow[name]=value;}}};
  const run=(name:string)=>{
   const file=require.resolve('./'+name+'.js');
   const wrapper=vm.runInNewContext(`(function(require,exports,__dirname){${readFileSync(file,'utf8')}\n})`,{});
   wrapper((module:string)=>module==='electron'?electron:module==='./dictionary'?dictionary:require(module),{},path.dirname(file));
  };
  run('main');await new Promise(r=>setImmediate(r));run('preload');
  vm.runInNewContext(readFileSync(require.resolve('./renderer.js'),'utf8'),{window:rendererWindow,document:{getElementById:get}});
  get('searchForm').handler({preventDefault(){}});
  for(let i=0;i<30&&get('word').textContent!=='가구';i++)await new Promise(r=>setImmediate(r));
  assert.equal(get('word').textContent,'가구','느린 끝글자 분석을 기다리지 않고 순위를 반영해야 함');
  releaseSlow();
  for(let i=0;i<30&&!get('status').textContent?.includes('분석 완료');i++)await new Promise(r=>setImmediate(r));
  assert.ok(calls.includes('가:101'));
  assert.equal(get('word').textContent,'가늄');
  assert.match(get('status').textContent,/한방 후보/);
  assert.match(get('status').textContent,/분석 완료/);
 }finally{releaseSlow();globalThis.fetch=original;}
});
