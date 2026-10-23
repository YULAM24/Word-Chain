export interface Word { text: string; definition: string; link: string }
export interface SearchResult { words: Word[]; total: number }
export function parseResponse(data: unknown, prefix: string, nouns: boolean): SearchResult {
  const body = data as { channel?: {total?: number | string; item?: any[]}; error?: unknown };
  if (!body || body.error || !body.channel || body.channel.total === undefined) throw new Error('사전 응답을 확인할 수 없습니다. 인증키와 API 이용 상태를 확인하세요.');
  const words: Word[] = [];
  for (const item of body.channel.item ?? []) {
    const text = String(item.word ?? '').replace(/[-^\d]/g, '');
    if (!/^[가-힣]{2,}$/.test(text) || !text.startsWith(prefix) || (nouns && item.pos !== '명사')) continue;
    const sense = Array.isArray(item.sense) ? item.sense[0] : item.sense;
    words.push({text, definition: String(sense?.definition ?? ''), link: String(sense?.link ?? '')});
  }
  return {words, total: Number(body.channel.total)};
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
