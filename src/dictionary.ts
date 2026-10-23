export interface Word { text: string; definition: string; link: string }
export interface SearchResult { words: Word[]; total: number; scanned?: number }
export function parseResponse(data: unknown, prefix: string, nouns: boolean): SearchResult {
  const body = data as { channel?: {total?: number | string; item?: any[]}; error?: unknown };
  if (!body || body.error || !body.channel || body.channel.total === undefined) throw new Error('사전 응답을 확인할 수 없습니다. 인증키와 API 이용 상태를 확인하세요.');
  const total = Number(body.channel.total);
  if (!Number.isSafeInteger(total) || total < 0 || (total > 0 && !Array.isArray(body.channel.item))) throw new Error('불완전한 사전 응답입니다. 다시 검색하세요.');
  const words: Word[] = [];
  for (const item of body.channel.item ?? []) {
    const text = String(item.word ?? '').replace(/[-^\d]/g, '');
    if (!/^[가-힣]{2,}$/.test(text) || !text.startsWith(prefix) || (nouns && String(item.pos ?? '').trim() !== '명사')) continue;
    const sense = Array.isArray(item.sense) ? item.sense[0] : item.sense;
    words.push({text, definition: String(sense?.definition ?? ''), link: String(sense?.link ?? '')});
  }
  return {words, total, scanned: (body.channel.item ?? []).length};
}
export async function search(key: string, prefix: string, nouns: boolean, start: number): Promise<SearchResult> {
  if (!key.trim()) throw new Error('설정에서 공식 사전 API 인증키를 입력하세요.');
  if (!/^[가-힣]+$/.test(prefix)) throw new Error('완성된 한글 시작 글자를 입력하세요. 예: 가');
  if (!Number.isInteger(start) || start < 1 || start > 1000) throw new Error('조회 범위를 벗어났습니다.');
  const params = new URLSearchParams({key: key.trim(), q: prefix, req_type: 'json', advanced: 'y', method: 'start', num: '100', start: String(start)});
  if (nouns) params.set('pos','1');
  let response: Response;
  try { response = await fetch(`https://stdict.korean.go.kr/api/search.do?${params}`, {signal: AbortSignal.timeout(15000)}); }
  catch { throw new Error('사전 연결 실패. 네트워크를 확인하고 다시 검색하세요.'); }
  if (!response.ok) throw new Error(`사전 요청 실패 (HTTP ${response.status}). 인증키와 연결을 확인하세요.`);
  let data: unknown;
  try { data = await response.json(); } catch { throw new Error('사전 응답을 읽지 못했습니다. 인증키와 API 이용 상태를 확인하세요.'); }
  return parseResponse(data, prefix, nouns);
}

/** Per-process, bounded cache; never persists credentials or dictionary responses. */
export class DictionaryClient {
  private cache = new Map<string,{expires:number; result:SearchResult}>();
  private pending = new Map<string,Promise<SearchResult>>();
  private active = 0;
  private waiting: Array<()=>void> = [];
  constructor(private load: typeof search = search, private now: ()=>number = Date.now) {}
  async search(key:string,prefix:string,nouns:boolean,start:number):Promise<SearchResult> {
    const id=JSON.stringify([key,prefix,nouns,start]);
    const cached=this.cache.get(id);
    if(cached && cached.expires>this.now())return cached.result;
    const pending=this.pending.get(id);if(pending)return pending;
    const job=(async()=>{
      if(this.active>=4)await new Promise<void>(resolve=>this.waiting.push(resolve));
      else this.active++;
      try {
        const result=await this.load(key,prefix,nouns,start);
        this.cache.delete(id);
        this.cache.set(id,{expires:this.now()+30*60*1000,result});
        if(this.cache.size>300)this.cache.delete(this.cache.keys().next().value!);
        return result;
      } finally {
        const next=this.waiting.shift();if(next)next();else this.active--;
      }
    })();
    this.pending.set(id,job);
    try{return await job;}finally{this.pending.delete(id);}
  }
  async difficulty(key:string,ending:string,nouns:boolean,dueum:boolean):Promise<import('./ranking').Difficulty> {
    const {startingVariants}=await import('./ranking');
    const pages=await Promise.all(startingVariants(ending,dueum).map(v=>this.search(key,v,nouns,1)));
    const replies=new Set(pages.flatMap(p=>p.words.map(w=>w.text))).size;
    const complete=pages.every(p=>p.total<=100 && (p.scanned ?? p.total)>=p.total);
    return complete ? {replies,complete} : {replies,complete,matches:pages.reduce((sum,p)=>sum+p.total,0)};
  }
  async rank(key:string,texts:string[],nouns:boolean,dueum:boolean,cancelled:()=>boolean, progress?: (p:import('./ranking').RankProgress)=>void):Promise<Record<string,import('./ranking').Difficulty>> {
    const endings=[...new Set(texts.map(w=>w.slice(-1)))];
    const result:Record<string,import('./ranking').Difficulty>={};
    let index=0, completed=0, failed=0;
    const worker=async()=>{
      while(index<endings.length && !cancelled()){
        const ending=endings[index++];
        let rating: import('./ranking').Difficulty | undefined;
        try{rating=await this.difficulty(key,ending,nouns,dueum);result[ending]=rating;}catch{failed++;}
        completed++;
        if(!cancelled())progress?.({ratings:rating?{[ending]:rating}:{},completed,total:endings.length,failed});
      }
    };
    await Promise.all(Array.from({length:4},worker));return result;
  }
}
