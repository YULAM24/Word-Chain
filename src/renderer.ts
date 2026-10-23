interface Word {text:string;definition:string;link:string}
interface SearchResult {words:Word[];total:number}
interface Difficulty {replies:number;complete:boolean}
interface Window {helper:{search(a:unknown):Promise<{result?:SearchResult; error?:string}>;rank(a:unknown):Promise<Record<string,Difficulty>>;cancelRank():Promise<void>;pin(v:boolean):Promise<void>;copy(s:string):Promise<void>;open(s:string):Promise<void>}}
const el = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
let words:Word[] = [], used = new Set<string>(), skipped = new Set<string>(), current:Word|undefined;
let generation=0, rankRevision=0, nextStart=1, total=0, busy=false, query='', nouns=true, ranking=false;
let ratings:Record<string,Difficulty>={};
const checked=(id:string)=>el<HTMLInputElement>(id).checked;
const say = (s:string) => {el('status').textContent=s;};
for(const id of ['oneShot','hard','dueum']){
  try{const saved=localStorage.getItem('wordchain-'+id);if(saved!==null)el<HTMLInputElement>(id).checked=saved==='true';}catch{/* Storage may be unavailable. */}
}
function display(word?:Word, title='후보 없음', definition='다른 시작 글자를 검색하거나 턴을 넘기세요.') {
  current=word;
  el('word').textContent=word?.text??title;
  el('definition').textContent=word?.definition??definition;
  for(const id of ['use','skip','source']) el<HTMLButtonElement>(id).disabled=!word;
}
function updateStatus(){
  let detail='';
  const d=current&&ratings[current.text.slice(-1)];
  if(checked('oneShot')||checked('hard')){
    if(d)detail=d.complete ? (d.replies===0?' · 한방 후보 (후속 0개)':` · 후속 ${d.replies}개`) : ` · 후속 ${d.replies}개 이상`;
    else if(!ranking)detail=' · 난도 미확인';
    if(ranking)detail+=' · 난도 분석 중';
  }
  say(`후보 ${words.length}개 · 사용 ${used.size}개${detail}`);
}
async function fetchPage(token:number) {
  busy=true; ranking=false; rankRevision++;say('공식 사전 조회 중…');
  const reply=await window.helper.search({key:el<HTMLInputElement>('key').value,prefix:query,nouns,start:nextStart});
  if(token!==generation)return;
  busy=false;
  if(reply.error || !reply.result){display(undefined,'조회 실패','설정과 연결 상태를 확인하고 다시 검색하세요.');say(reply.error??'조회 실패');return;}
  total=reply.result.total; nextStart+=100;
  const seen=new Set(words.map(w=>w.text));
  for(const w of reply.result.words)if(!seen.has(w.text)){words.push(w);seen.add(w.text);}
  advance();
  if(token===generation&&!busy)void analyze();
}
function ordered():Word[]{
  if(!checked('oneShot')&&!checked('hard'))return words;
  const score=(w:Word):[number,number]=>{
    const d=ratings[w.text.slice(-1)];
    return [checked('oneShot')&&d?.complete&&d.replies===0?0:1,checked('hard')?(d?(d.complete?d.replies:Math.max(101,d.replies)):Infinity):0];
  };
  return words.map((word,index)=>({word,index,s:score(word)})).sort((a,b)=>a.s[0]-b.s[0]||a.s[1]-b.s[1]||a.index-b.index).map(x=>x.word);
}
async function analyze(){
  const revision=++rankRevision, token=generation;
  if((!checked('oneShot')&&!checked('hard'))||!words.length){ranking=false;return;}
  ranking=true;updateStatus();
  // Only analyze the latest page. Earlier pages retain their ratings.
  const texts=words.slice(-100).map(w=>w.text);
  let result:Record<string,Difficulty>;
  try{result=await window.helper.rank({key:el<HTMLInputElement>('key').value,texts,nouns,dueum:checked('dueum')});}catch{result={};}
  if(token!==generation||revision!==rankRevision)return;
  ranking=false;Object.assign(ratings,result);
  if(!busy)advance();
}
function advance(){
  const word=ordered().find(w=>!used.has(w.text)&&!skipped.has(w.text));
  if(word){display(word);updateStatus();}
  else if(nextStart<=total&&nextStart<=1000){display(undefined,'다음 후보 조회 중…','');void fetchPage(generation);}
  else{display();say(total>=1000?'API 조회 범위 내 후보를 모두 확인했습니다.':'조건에 맞는 미사용 후보가 없습니다.');}
}
function begin(){generation++;rankRevision++;ranking=false;busy=false;words=[];ratings={};skipped.clear();nextStart=1;total=0;query=el<HTMLInputElement>('prefix').value.trim();nouns=checked('nouns');display(undefined,'검색 중…','');void fetchPage(generation);}
el('searchForm').addEventListener('submit',event=>{event.preventDefault();begin();});
el('pin').addEventListener('change',()=>void window.helper.pin(checked('pin')));
el('settingsButton').onclick=()=>{el('settings').hidden=!el('settings').hidden;};
el('issue').onclick=()=>void window.helper.open('https://stdict.korean.go.kr/openapi/openApiInfo.do');
el('source').onclick=()=>{if(current)void window.helper.open(current.link);};
for(const id of ['oneShot','hard','dueum'])el(id).addEventListener('change',()=>{
  try{localStorage.setItem('wordchain-'+id,String(checked(id)));}catch{/* Ignore unavailable storage. */}
  rankRevision++;ranking=false;ratings={};void window.helper.cancelRank();
  if(words.length&&!busy){advance();void analyze();}
});
el('skip').onclick=()=>{if(current&&!busy){skipped.add(current.text);advance();}};
el('use').onclick=async()=>{if(!current||busy)return;const text=current.text;const token=generation;await window.helper.copy(text);if(token!==generation)return;used.add(text);el<HTMLInputElement>('prefix').value=text.slice(-1);begin();};
function pass(){generation++;rankRevision++;ranking=false;busy=false;words=[];ratings={};void window.helper.cancelRank();display(undefined,'턴을 넘겼습니다','다음 시작 글자를 입력하세요.');el<HTMLInputElement>('prefix').value='';say('게임 내 패스 조작은 직접 해 주세요.');}
el('pass').onclick=pass;
el('reset').onclick=()=>{used.clear();skipped.clear();pass();el('word').textContent='새 게임';};
