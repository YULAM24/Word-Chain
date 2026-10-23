interface Word {text:string;definition:string;link:string}
interface SearchResult {words:Word[];total:number}
interface Window {helper:{search(a:unknown):Promise<{result?:SearchResult; error?:string}>;pin(v:boolean):Promise<void>;copy(s:string):Promise<void>;open(s:string):Promise<void>}}
const el = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
let words:Word[] = [], used = new Set<string>(), skipped = new Set<string>(), current:Word|undefined;
let generation=0, nextStart=1, total=0, busy=false, query='', nouns=true;
const say = (s:string) => {el('status').textContent=s;};
function display(word?:Word, title='후보 없음', definition='다른 시작 글자를 검색하거나 턴을 넘기세요.') {
  current=word;
  el('word').textContent=word?.text??title;
  el('definition').textContent=word?.definition??definition;
  for(const id of ['use','skip','source']) el<HTMLButtonElement>(id).disabled=!word;
}
async function fetchPage(token:number) {
  busy=true; say('공식 사전 조회 중…');
  const reply=await window.helper.search({key:el<HTMLInputElement>('key').value,prefix:query,nouns,start:nextStart});
  if(token!==generation)return;
  busy=false;
  if(reply.error || !reply.result){display(undefined,'조회 실패','설정과 연결 상태를 확인하고 다시 검색하세요.');say(reply.error??'조회 실패');return;}
  total=reply.result.total; nextStart+=100;
  const seen=new Set(words.map(w=>w.text));
  for(const w of reply.result.words)if(!seen.has(w.text)){words.push(w);seen.add(w.text);}
  advance();
}
function advance(){
  const word=words.find(w=>!used.has(w.text)&&!skipped.has(w.text));
  if(word){display(word);say(`후보 ${words.length}개 · 사용 ${used.size}개`);}
  else if(nextStart<=total&&nextStart<=1000){display(undefined,'다음 후보 조회 중…','');void fetchPage(generation);}
  else{display();say(total>=1000?'API 조회 범위 내 후보를 모두 확인했습니다.':'조건에 맞는 미사용 후보가 없습니다.');}
}
function begin(){generation++;busy=false;words=[];skipped.clear();nextStart=1;total=0;query=el<HTMLInputElement>('prefix').value.trim();nouns=el<HTMLInputElement>('nouns').checked;display(undefined,'검색 중…','');void fetchPage(generation);}
el('searchForm').addEventListener('submit',event=>{event.preventDefault();begin();});
el('pin').addEventListener('change',()=>void window.helper.pin(el<HTMLInputElement>('pin').checked));
el('settingsButton').onclick=()=>{el('settings').hidden=!el('settings').hidden;};
el('issue').onclick=()=>void window.helper.open('https://stdict.korean.go.kr/openapi/openApiInfo.do');
el('source').onclick=()=>{if(current)void window.helper.open(current.link);};
el('skip').onclick=()=>{if(current&&!busy){skipped.add(current.text);advance();}};
el('use').onclick=async()=>{if(!current||busy)return;const text=current.text;const token=generation;await window.helper.copy(text);if(token!==generation)return;used.add(text);el<HTMLInputElement>('prefix').value=text.slice(-1);begin();};
function pass(){generation++;busy=false;words=[];display(undefined,'턴을 넘겼습니다','다음 시작 글자를 입력하세요.');el<HTMLInputElement>('prefix').value='';say('게임 내 패스 조작은 직접 해 주세요.');}
el('pass').onclick=pass;
el('reset').onclick=()=>{used.clear();skipped.clear();pass();el('word').textContent='새 게임';};
