interface Word {text:string;definition:string;link:string}
interface SearchResult {words:Word[];total:number}
interface Difficulty {replies:number;complete:boolean;matches?:number}
interface RankProgress {requestId:number;ratings:Record<string,Difficulty>;completed:number;total:number;failed:number}
interface RankReply {ratings?:Record<string,Difficulty>;failed?:number;error?:string}
interface Window {helper:{search(a:unknown):Promise<{result?:SearchResult; error?:string}>;rank(a:unknown):Promise<RankReply>;onRankProgress?(callback:(p:RankProgress)=>void):()=>void;cancelRank():Promise<void>;pin(v:boolean):Promise<void>;copy(s:string):Promise<void>;open(s:string):Promise<void>}}
const el = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
let words:Word[] = [], used = new Set<string>(), skipped = new Set<string>(), current:Word|undefined;
let generation=0, revision=0, requestId=0, activeRequest=0, nextStart=1, total=0, busy=false, query='', nouns=true, ranking=false;
let ratings:Record<string,Difficulty>={}, failures=0, progressText='', pageError='';
const checked=(id:string)=>el<HTMLInputElement>(id).checked;
const prioritizing=()=>checked('oneShot')||checked('hard');
const say=(s:string)=>{el('status').textContent=s;};
for(const id of ['oneShot','hard','dueum']){
  try{const saved=localStorage.getItem('wordchain-'+id);if(saved!==null)el<HTMLInputElement>(id).checked=saved==='true';}catch{/* Storage may be unavailable. */}
}
function display(word?:Word,title='후보 없음',definition='다른 시작 글자를 검색하거나 턴을 넘기세요.'){
  current=word;el('word').textContent=word?.text??title;el('definition').textContent=word?.definition??definition;
  for(const id of ['use','skip','source'])el<HTMLButtonElement>(id).disabled=!word;
}
function updateStatus(){
  const d=current&&ratings[current.text.slice(-1)];
  let detail='';
  if(prioritizing()){
    if(d)detail=d.complete?(d.replies===0?' · 한방 후보 (후속 0개)':` · 후속 ${d.replies}개`):` · 후속 ${d.replies}개 이상${d.matches!==undefined?` (사전 ${d.matches}건)`:""}`;
    else if(!ranking)detail=' · 난도 미확인';
    detail+=ranking?` · ${progressText||'추가 후보 검색 중'}`:' · 분석 완료';
    if(failures)detail+=` · 분석 실패 ${failures}건 (네트워크·API 이용 한도 확인)`;
    if(pageError)detail+=` · ${pageError}`;
    if(total>1000&&nextStart>1000&&!ranking)detail+=' · 첫 1,000건 범위';
  }
  say(`후보 ${words.length}개 · 사용 ${used.size}개${detail}`);
}
function ordered():Word[]{
  if(!prioritizing())return words;
  const score=(w:Word):[number,number]=>{
    const d=ratings[w.text.slice(-1)];
    return [checked('oneShot')&&d?.complete&&d.replies===0?0:1,checked('hard')?(d?(d.complete?d.replies:Math.max(d.matches??101,d.replies)):Infinity):0];
  };
  return words.map((word,index)=>({word,index,s:score(word)})).sort((a,b)=>a.s[0]-b.s[0]||a.s[1]-b.s[1]||a.index-b.index).map(x=>x.word);
}
function advance(){
  const word=ordered().find(w=>!used.has(w.text)&&!skipped.has(w.text));
  if(word){display(word);updateStatus();}
  else if(ranking){display(undefined,'추가 후보 확인 중…','확인된 후보가 생기면 표시합니다.');updateStatus();}
  else if(nextStart<=total&&nextStart<=1000&&!pageError){void fetchPage(generation);}
  else{display();updateStatus();}
}
function stopAnalysis(){revision++;activeRequest=0;ranking=false;progressText='';void window.helper.cancelRank();}
window.helper.onRankProgress?.(p=>{
  if(!ranking||p.requestId!==activeRequest)return;
  Object.assign(ratings,p.ratings);
  progressText=`난도 ${p.completed}/${p.total} 확인 중`;
  advance();
});
function append(result:SearchResult){
  total=result.total;nextStart+=100;
  const seen=new Set(words.map(w=>w.text));
  for(const w of result.words)if(!seen.has(w.text)){words.push(w);seen.add(w.text);}
}
async function analyze(){
  if(!prioritizing()||!words.length)return;
  const run=++revision,token=generation,key=el<HTMLInputElement>('key').value,dueum=checked('dueum');
  const alive=()=>run===revision&&token===generation;
  ranking=true;failures=0;pageError='';
  const attempted=new Set(Object.keys(ratings));
  try{
    while(alive()){
      const texts=words.filter(w=>!attempted.has(w.text.slice(-1))).slice(0,100).map(w=>w.text);
      if(texts.length){
        for(const t of texts)attempted.add(t.slice(-1));
        activeRequest=++requestId;progressText='난도 분석 중';updateStatus();
        let reply:RankReply;
        try{reply=await window.helper.rank({key,texts,nouns,dueum,requestId:activeRequest});}catch{reply={error:'난도 분석 연결 실패'};}
        if(!alive())return;
        activeRequest=0;
        Object.assign(ratings,reply.ratings??{});failures+=reply.failed??(reply.error?new Set(texts.map(t=>t.slice(-1))).size:0);
        advance();continue;
      }
      if(nextStart>total||nextStart>1000)break;
      progressText=`추가 후보 ${nextStart}~${Math.min(nextStart+99,total)} 검색 중`;updateStatus();
      const reply=await window.helper.search({key,prefix:query,nouns,start:nextStart});
      if(!alive())return;
      if(reply.error||!reply.result){pageError=reply.error??'추가 후보 조회 실패';break;}
      append(reply.result);advance();
    }
  }catch{if(alive())pageError='추가 분석 연결 실패. 다시 검색하세요.';}
  finally{if(alive()){activeRequest=0;ranking=false;progressText='';advance();}}
}
async function fetchPage(token:number){
  busy=true;say('공식 사전 조회 중…');
  if(!words.length)display(undefined,'검색 중…','');
  const reply=await window.helper.search({key:el<HTMLInputElement>('key').value,prefix:query,nouns,start:nextStart});
  if(token!==generation)return;
  busy=false;
  if(reply.error||!reply.result){pageError=reply.error??'조회 실패';display(undefined,'조회 실패','설정과 연결 상태를 확인하고 다시 검색하세요.');say(pageError);return;}
  append(reply.result);
  if(prioritizing()&&words.length){void analyze();advance();}
  else advance();
}
function begin(){
  generation++;stopAnalysis();busy=false;words=[];ratings={};failures=0;pageError='';skipped.clear();nextStart=1;total=0;
  query=el<HTMLInputElement>('prefix').value.trim();nouns=checked('nouns');void fetchPage(generation);
}
el('searchForm').addEventListener('submit',event=>{event.preventDefault();begin();});
el('pin').addEventListener('change',()=>void window.helper.pin(checked('pin')));
el('settingsButton').onclick=()=>{el('settings').hidden=!el('settings').hidden;};
el('issue').onclick=()=>void window.helper.open('https://stdict.korean.go.kr/openapi/openApiInfo.do');
el('source').onclick=()=>{if(current)void window.helper.open(current.link);};
for(const id of ['oneShot','hard','dueum'])el(id).addEventListener('change',()=>{
  try{localStorage.setItem('wordchain-'+id,String(checked(id)));}catch{/* Ignore unavailable storage. */}
  stopAnalysis();if(id==='dueum')ratings={};failures=0;
  if(words.length&&!busy){if(prioritizing())void analyze();advance();}
});
el('skip').onclick=()=>{if(current&&!busy){skipped.add(current.text);advance();}};
el('use').onclick=async()=>{if(!current||busy)return;const text=current.text,token=generation;await window.helper.copy(text);if(token!==generation)return;used.add(text);el<HTMLInputElement>('prefix').value=text.slice(-1);begin();};
function pass(){generation++;stopAnalysis();busy=false;words=[];ratings={};display(undefined,'턴을 넘겼습니다','다음 시작 글자를 입력하세요.');el<HTMLInputElement>('prefix').value='';say('게임 내 패스 조작은 직접 해 주세요.');}
el('pass').onclick=pass;
el('reset').onclick=()=>{used.clear();skipped.clear();pass();el('word').textContent='새 게임';};
