import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('후보 넘기기·사용 복사·턴 넘기기·새 게임',async()=>{
  const elements=new Map<string,any>();
  const get=(id:string)=>{if(!elements.has(id))elements.set(id,{value:'',checked:true,hidden:true,textContent:'',disabled:false,addEventListener(_name:string,fn:unknown){this.handler=fn;}});return elements.get(id);};
  let copied='';
  const context=vm.createContext({document:{getElementById:get},window:{helper:{search:async()=>({result:{total:2,words:[{text:'가방',definition:'도구',link:''},{text:'가구',definition:'집기',link:''}]}}),copy:async(s:string)=>{copied=s;},pin:async()=>{},open:async()=>{}}}});
  vm.runInContext(readFileSync(require.resolve('./renderer.js'),'utf8'),context);
  get('prefix').value='가';get('searchForm').handler({preventDefault(){}});await flush();
  assert.equal(get('word').textContent,'가방');get('skip').onclick();assert.equal(get('word').textContent,'가구');
  await get('use').onclick();await flush();assert.equal(copied,'가구');assert.equal(get('prefix').value,'구');
  get('pass').onclick();assert.equal(get('use').disabled,true);assert.equal(get('prefix').value,'');
  get('reset').onclick();assert.equal(get('word').textContent,'새 게임');
});
test('늦게 도착한 검색은 넘긴 턴을 덮어쓰지 않음',async()=>{
 const elements=new Map<string,any>();const get=(id:string)=>{if(!elements.has(id))elements.set(id,{value:'가',checked:true,addEventListener(_n:string,fn:unknown){this.handler=fn;}});return elements.get(id);};
 let resolve!:(v:unknown)=>void;
 const context=vm.createContext({document:{getElementById:get},window:{helper:{search:()=>new Promise(r=>{resolve=r;})}}});
 vm.runInContext(readFileSync(require.resolve('./renderer.js'),'utf8'),context);
 get('searchForm').handler({preventDefault(){}});get('pass').onclick();resolve({result:{total:1,words:[{text:'가방'}]}});await flush();assert.equal(get('word').textContent,'턴을 넘겼습니다');
});
