import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseResponse,search} from './dictionary';
test('표제어 정규화와 시작 글자·품사·길이 필터',()=>{
const data={channel:{total:5,item:[{word:'가-방01',pos:'명사',sense:{definition:'도구',link:'https://stdict.korean.go.kr/test'}},{word:'가다',pos:'동사'},{word:'가',pos:'명사'},{word:'나무',pos:'명사'},{word:'가ABC',pos:'명사'}]}};
assert.deepEqual(parseResponse(data,'가',true).words.map(w=>w.text),['가방']);
assert.equal(parseResponse(data,'가',true).words[0].definition,'도구');
assert.deepEqual(parseResponse(data,'가',false).words.map(w=>w.text),['가방','가다']);
});
test('인증 오류와 잘못된 응답을 빈 검색 결과로 취급하지 않음',()=>{assert.throws(()=>parseResponse({error:{}},'가',true));assert.throws(()=>parseResponse({},'가',true));});
test('빈 결과',()=>assert.deepEqual(parseResponse({channel:{total:0}},'가',true),{words:[],total:0}));
test('잘못된 입력은 네트워크 호출 전에 거부',async()=>{await assert.rejects(search('','가',true,1));await assert.rejects(search('key','ㄱ',true,1));await assert.rejects(search('key','가',true,1001));});
test('공식 API 요청과 페이지 번호',async()=>{
const original=globalThis.fetch;
try{globalThis.fetch=async input=>{const url=new URL(String(input));assert.equal(url.hostname,'stdict.korean.go.kr');assert.equal(url.searchParams.get('start'),'101');assert.equal(url.searchParams.get('method'),'start');assert.equal(url.searchParams.get('req_type'),'json');return new Response(JSON.stringify({channel:{total:0}}));};await search('test-key','가',true,101);}finally{globalThis.fetch=original;}
});
