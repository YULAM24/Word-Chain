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

import {DictionaryClient} from './dictionary';
import {startingVariants} from './ranking';
test('두음법칙 변형을 고려하되 끄면 원래 글자만 사용',()=>{
  assert.deepEqual(startingVariants('력',true),['력','녁','역']);
  assert.deepEqual(startingVariants('녀',true),['녀','여']);
  assert.deepEqual(startingVariants('름',true),['름','늠']);
  assert.deepEqual(startingVariants('력',false),['력']);
});
test('동일 검색 동시 요청 합치기·캐시·만료·품사/인증키 분리',async()=>{
  let calls=0,now=0;
  const client=new DictionaryClient(async()=>{calls++;await new Promise(r=>setImmediate(r));return {words:[],total:0};},()=>now);
  await Promise.all([client.search('a','가',true,1),client.search('a','가',true,1)]);
  await client.search('a','가',true,1);assert.equal(calls,1);
  await client.search('a','가',false,1);await client.search('b','가',true,1);assert.equal(calls,3);
  now=30*60*1000;await client.search('a','가',true,1);assert.equal(calls,4);
});
test('실패한 요청은 캐시하지 않음',async()=>{
  let calls=0;const client=new DictionaryClient(async()=>{calls++;throw new Error('offline');});
  await assert.rejects(client.search('a','가',true,1));await assert.rejects(client.search('a','가',true,1));assert.equal(calls,2);
});
test('두음법칙 후속어와 불완전 응답을 한방으로 잘못 분류하지 않음',async()=>{
  const client=new DictionaryClient(async(_key,prefix)=>({total:prefix==='역'?1:0,words:prefix==='역'?[{text:'역사',definition:'',link:''}]:[]}));
  assert.deepEqual(await client.difficulty('a','력',true,true),{replies:1,complete:true});
  assert.deepEqual(await client.difficulty('a','력',true,false),{replies:0,complete:true});
  const incomplete=new DictionaryClient(async()=>({total:101,words:[]}));
  assert.deepEqual(await incomplete.difficulty('a','가',true,false),{replies:0,complete:false});
});
test('실패한 난도 조회는 알 수 없음으로 남기고 취소된 분석은 요청하지 않음',async()=>{
  let calls=0;const client=new DictionaryClient(async()=>{calls++;throw new Error('offline');});
  assert.deepEqual(await client.rank('a',['가방'],true,true,()=>false),{});
  const before=calls;assert.deepEqual(await client.rank('a',['가구'],true,true,()=>true),{});assert.equal(calls,before);
});
test('동시에 보내는 사전 요청 수 제한',async()=>{
  let active=0,max=0;
  const client=new DictionaryClient(async()=>{active++;max=Math.max(max,active);await new Promise(r=>setImmediate(r));active--;return {total:0,words:[]};});
  await Promise.all(Array.from('가나다라마바사아자차카타파하').map(s=>client.search('a',s,true,1)));
  assert.equal(max,4);
});
