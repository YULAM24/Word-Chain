import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('후보 넘기기·사용 복사·턴 넘기기·새 게임',async()=>{
  const elements=new Map<string,any>();
  const get=(id:string)=>{if(!elements.has(id))elements.set(id,{value:'',checked:['nouns','dueum','pin'].includes(id),hidden:true,textContent:'',disabled:false,addEventListener(_name:string,fn:unknown){this.handler=fn;}});return elements.get(id);};
  let copied='';
  const context=vm.createContext({document:{getElementById:get},window:{helper:{cancelRank:async()=>{},rank:async()=>({}),search:async()=>({result:{total:2,words:[{text:'가방',definition:'도구',link:''},{text:'가구',definition:'집기',link:''}]}}),copy:async(s:string)=>{copied=s;},pin:async()=>{},open:async()=>{}}}});
  vm.runInContext(readFileSync(require.resolve('./renderer.js'),'utf8'),context);
  get('prefix').value='가';get('searchForm').handler({preventDefault(){}});await flush();
  assert.equal(get('word').textContent,'가방');get('skip').onclick();assert.equal(get('word').textContent,'가구');
  await get('use').onclick();await flush();assert.equal(copied,'가구');assert.equal(get('prefix').value,'구');
  get('pass').onclick();assert.equal(get('use').disabled,true);assert.equal(get('prefix').value,'');
  get('reset').onclick();assert.equal(get('word').textContent,'새 게임');
});
test('늦게 도착한 검색은 넘긴 턴을 덮어쓰지 않음',async()=>{
 const elements=new Map<string,any>();const get=(id:string)=>{if(!elements.has(id))elements.set(id,{value:'가',checked:['nouns','dueum','pin'].includes(id),addEventListener(_n:string,fn:unknown){this.handler=fn;}});return elements.get(id);};
 let resolve!:(v:unknown)=>void;
 const context=vm.createContext({document:{getElementById:get},window:{helper:{cancelRank:async()=>{},rank:async()=>({}),search:()=>new Promise(r=>{resolve=r;})}}});
 vm.runInContext(readFileSync(require.resolve('./renderer.js'),'utf8'),context);
 get('searchForm').handler({preventDefault(){}});get('pass').onclick();resolve({result:{total:1,words:[{text:'가방'}]}});await flush();assert.equal(get('word').textContent,'턴을 넘겼습니다');
});

test('설정으로 한방·난도 우선순위 전환, 원래 순서 복원, 분석 중에도 후보 사용 가능',async()=>{
 const elements=new Map<string,any>();
 const get=(id:string)=>{if(!elements.has(id))elements.set(id,{value:'가',checked:['nouns','dueum'].includes(id),hidden:true,addEventListener(_n:string,fn:unknown){this.handler=fn;}});return elements.get(id);};
 let finish!:(v:unknown)=>void;
 const context=vm.createContext({document:{getElementById:get},window:{helper:{cancelRank:async()=>{},rank:()=>new Promise(r=>{finish=r;}),search:async()=>({result:{total:3,words:[{text:'가방',definition:'',link:''},{text:'가구',definition:'',link:''},{text:'가늄',definition:'',link:''}]}})}}});
 vm.runInContext(readFileSync(require.resolve('./renderer.js'),'utf8'),context);
 get('searchForm').handler({preventDefault(){}});await flush();assert.equal(get('word').textContent,'가방');
 get('oneShot').checked=true;get('oneShot').handler();assert.equal(get('use').disabled,false);
 finish({'방':{replies:100,complete:true},'구':{replies:2,complete:true},'늄':{replies:0,complete:true}});await flush();
 assert.equal(get('word').textContent,'가늄');assert.match(get('status').textContent,/한방 후보/);
 get('skip').onclick();assert.equal(get('word').textContent,'가방');
 get('hard').checked=true;get('hard').handler();finish({'방':{replies:100,complete:true},'구':{replies:2,complete:true},'늄':{replies:0,complete:true}});await flush();assert.equal(get('word').textContent,'가구');
 get('oneShot').checked=false;get('oneShot').handler();finish({});await flush();
 get('hard').checked=false;get('hard').handler();assert.equal(get('word').textContent,'가방');
});

test('턴을 넘긴 뒤 도착한 난도 분석은 이전 단어를 되살리지 않음',async()=>{
 const elements=new Map<string,any>();const get=(id:string)=>{if(!elements.has(id))elements.set(id,{value:'가',checked:['nouns','dueum','hard'].includes(id),addEventListener(_n:string,fn:unknown){this.handler=fn;}});return elements.get(id);};
 let finish!:(v:unknown)=>void;
 const context=vm.createContext({document:{getElementById:get},window:{helper:{cancelRank:async()=>{},rank:()=>new Promise(r=>{finish=r;}),search:async()=>({result:{total:1,words:[{text:'가방',definition:'',link:''}]}})}}});
 vm.runInContext(readFileSync(require.resolve('./renderer.js'),'utf8'),context);
 get('searchForm').handler({preventDefault(){}});await flush();get('pass').onclick();finish({'방':{replies:0,complete:true}});await flush();assert.equal(get('word').textContent,'턴을 넘겼습니다');assert.equal(get('use').disabled,true);
});
