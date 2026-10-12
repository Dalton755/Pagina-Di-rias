'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
const engineSource=scripts.find(s=>s.includes('root.RouteEngine = api'));
assert.ok(engineSource,'Motor de leitura não encontrado no HTML');
const context={};
vm.runInNewContext(engineSource,context);
const E=context.RouteEngine;
const favorites=['Canhema','Taboão','Vila Capela'];
const scanned=(text)=>E.consolidate(E.parseText(text,favorites,'fixture'),favorites,50,[]);
let pass=0;
function test(name,fn){
  try{fn();pass++;console.log('OK',name);}
  catch(error){console.error('FAIL',name,error.message);process.exitCode=1;}
}
test('Reconhece B-12 Canhema',()=>{
  const rows=scanned('B-12 MOTO Canhema');
  assert.equal(rows.length,1);assert.equal(rows[0].cluster,'Canhema');assert.equal(rows[0].selected,true);
});
test('Reconhece A-18 Taboão',()=>assert.equal(scanned('A-18 MOTO Taboão')[0].selected,true));
test('Reconhece W-8 Vila Capela -z',()=>assert.equal(scanned('W-8 MOTO Vila Capela - z')[0].selected,true));
test('Ignora cluster não favorito',()=>assert.equal(scanned('A-3 MOTO Americanópolis')[0].selected,false));
test('Não associa automaticamente múltiplas rotas na mesma linha',()=>{
  const rows=scanned('B-12 MOTO Canhema A-18 MOTO Taboão');
  assert.equal(rows.length,2);assert.ok(rows.every(r=>r.needsReview&&!r.selected));
});
test('Bloqueia substituição ambígua O/I no código da rota',()=>{
  const row=scanned('A-I MOTO Canhema')[0];
  assert.equal(row.needsReview,true);assert.equal(row.selected,false);
});
test('Bloqueia clusters múltiplos na mesma linha',()=>{
  assert.equal(scanned('B-12 MOTO Canhema Taboão')[0].selected,false);
});
test('Bloqueia código sem cluster',()=>{
  assert.equal(scanned('B-12 MOTO')[0].selected,false);
});
test('Não confunde Canhema com Canhema Norte',()=>{
  assert.equal(scanned('B-12 MOTO Canhema Norte')[0].selected,false);
});
test('Não confunde nome aproximado com certeza',()=>{
  assert.equal(scanned('B-12 MOTO Canhemao')[0].selected,false);
});
test('Desduplica a mesma rota e cluster',()=>{
  const rows=scanned('B-12 MOTO Canhema\nB-12 MOTO Canhema');
  assert.equal(rows.length,1);assert.equal(rows[0].selected,true);
});
test('Bloqueia clusters divergentes para mesma rota',()=>{
  const row=scanned('B-12 MOTO Canhema\nB-12 MOTO Taboão')[0];
  assert.equal(row.conflict,true);assert.equal(row.selected,false);
});
test('Confiança baixa da célula rota não fica mascarada pela linha',()=>{
  const rows=E.parseRows([{text:'B-12 MOTO Canhema',confidence:92,words:[
    {text:'B-12',confidence:41},{text:'MOTO',confidence:99},{text:'Canhema',confidence:99}]}],favorites,'OCR');
  assert.equal(rows[0].confidence,41);
  assert.equal(rows[0].needsReview,true);
  assert.equal(E.consolidate(rows,favorites,3,[])[0].selected,false);
});
test('Ordena prioridades de clusters',()=>{
  const rows=scanned('A-18 MOTO Taboão\nB-12 MOTO Canhema');
  assert.equal(rows[0].cluster,'Canhema');assert.equal(rows[1].cluster,'Taboão');
});
test('Respeita limite máximo',()=>{
  const input=E.parseText('B-12 MOTO Canhema\nB-13 MOTO Canhema\nA-18 MOTO Taboão',favorites,'OCR');
  const rows=E.consolidate(input,favorites,2,[]);
  assert.equal(rows.filter(x=>x.selected).length,2);
});
test('Não marca rota já registrada no dia',()=>{
  const rows=E.consolidate(E.parseText('B-12 MOTO Canhema',favorites,'OCR'),favorites,3,['B-12']);
  assert.equal(rows[0].alreadySent,true);assert.equal(rows[0].selected,false);
});
test('Segmenta linhas por posição de palavras',()=>{
  const word=(text,x,y)=>({text,confidence:96,bbox:{x0:x,x1:x+40,y0:y,y1:y+18}});
  const blocks=[{paragraphs:[{lines:[
    {words:[word('B-12',40,40),word('MOTO',280,40),word('Canhema',540,40)]},
    {words:[word('A-3',40,90),word('MOTO',280,90),word('Americanópolis',540,90)]},
    {words:[word('A-18',40,140),word('MOTO',280,140),word('Taboão',540,140)]}
  ]}]}];
  const rows=E.rowsFromBlocks(blocks);
  assert.equal(rows.length,3);
  const parsed=E.consolidate(E.parseRows(rows,favorites,'OCR'),favorites,10,[]);
  assert.equal(parsed.filter(r=>r.selected).length,2);
});
test('Imagem 39091 contém 17 rotas, mas nenhuma dos 3 clusters favoritos',()=>{
  const rows=E.consolidate(E.parseText([
    'S-4 MOTO Centro SBC',
    'T-20 MOTO Vila São Pedro - z',
    'A-5 MOTO Americanópolis - z',
    'A-1 MOTO Americanópolis - z',
    'B-2 MOTO Rudge Ramos',
    'A-16 MOTO Jardim Clímax',
    'C-5 MOTO Ferrazópolis',
    'B-6 MOTO Centro SBC',
    'A-3 MOTO Americanópolis - z',
    'A-4 MOTO Americanópolis - z',
    'B-14 MOTO Planalto',
    'A-2 MOTO Americanópolis - z',
    'C-6 MOTO Ferrazópolis',
    'B-16 MOTO Vila São Pedro - z',
    'B-5 MOTO Centro SBC',
    'A-12 MOTO Pedreira - z',
    'B-7 MOTO Centro SBC'
  ].join('\n'),favorites,'39091.jpg'),favorites,50,[]);
  assert.equal(rows.length,17);
  assert.equal(rows.filter(r=>r.selected).length,0);
});
test('Imagem com Canhema e Taboão seleciona as 2 regiões favoritas',()=>{
  const rows=scanned('B-12 MOTO Canhema\nA-18 MOTO Taboão\nE-16 MOTO Vila São Pedro - z');
  assert.equal(rows.filter(r=>r.selected).length,2);
});

test('Recuperação geométrica: código e cluster na mesma altura',()=>{
  const routes=[
    {text:'B-12',y:40,confidence:96},
    {text:'A-3',y:100,confidence:92},
    {text:'A-18',y:160,confidence:93}
  ];
  const clusters=[
    {text:'Canhema',y:44,confidence:94},
    {text:'Americanópolis - z',y:98,confidence:93},
    {text:'Taboão',y:157,confidence:95}
  ];
  const recovered=E.recoverColumnRows(routes,clusters,favorites,'teste.jpeg');
  assert.equal(recovered.length,3);
  assert.equal(recovered[0].route,'B-12');
  assert.equal(recovered[0].cluster,'Canhema');
  assert.equal(recovered[1].cluster,'Americanópolis');
  assert.equal(recovered[2].cluster,'Taboão');
  assert.ok(recovered.every(r=>r.recovered&&r.needsReview));
  assert.ok(recovered.every(r=>!E.consolidate([r],favorites,3,[])[0].selected));
});
test('Sem cluster no alinhamento vertical, recupera apenas rota bloqueada',()=>{
  const routeRows=[
    {text:'B-12',y:90,confidence:98},
    {text:'A-18',y:150,confidence:98}
  ];
  const clusterRows=[
    {text:'Canhema',y:130,confidence:98},
    {text:'Taboão',y:205,confidence:98}
  ];
  const recovered=E.recoverColumnRows(routeRows,clusterRows,favorites,'deslocado');
  assert.equal(recovered.length,2);
  assert.ok(recovered.every(r=>!r.cluster&&!r.selected&&r.needsReview));
});
test('Célula ambígua nunca é selecionada automaticamente',()=>{
  const row=E.recoverColumnRows([{text:'A-I',y:100,confidence:89}],
    [{text:'Canhema',y:102,confidence:94}],favorites,'ocr');
  assert.equal(row.length,1);
  assert.equal(row[0].needsReview,true);
  assert.equal(row[0].route,'A-1');
});
test('Segunda leitura mantém alerta de divergência entre imagens',()=>{
  const original=E.parseText('B-12 MOTO Canhema',favorites,'primeira');
  const recovered=E.recoverColumnRows([{text:'B-12',y:65,confidence:90}],
    [{text:'Taboão',y:66,confidence:92}],favorites,'segunda');
  const result=E.consolidate([...original,...recovered],favorites,5,[]);
  assert.equal(result.length,1);
  assert.equal(result[0].conflict,true);
  assert.equal(result[0].selected,false);
});


test('Vídeo 39310: 18 leituras são 17 linhas, CC-6 é variante de C-6',()=>{
  const wanted=['Canhema','Taboão','Jardim Clímax','Vila Capela','Centro SBC','Planalto'];
  const first=E.parseText([
    'A-16 MOTO Jardim Clímax',
    'B-5 MOTO Centro SBC',
    'B-6 MOTO Centro SBC',
    'S-4 MOTO Centro SBC',
    'B-14 MOTO Planalto',
    'A-2 MOTO Americanópolis - z',
    'A-3 MOTO Americanópolis - z',
    'A-4 MOTO Americanópolis - z',
    'A-5 MOTO Americanópolis - z',
    'A-12 MOTO Pedreira - z',
    'B-2 MOTO Rudge Ramos',
    'B-16 MOTO Vila São Pedro - z',
    'C-5 MOTO Ferrazópolis',
    'T-20 MOTO Vila São Pedro - z'
  ].join('\n'),wanted,'39091.jpg');
  first.push(...E.parseRows([{text:'CC-6 MOTO Ferrazópolis',confidence:62,y:810}],wanted,'39091.jpg'));
  const recovered=E.recoverColumnRows([
    {text:'B-7',y:160,confidence:88},
    {text:'A-1',y:275,confidence:91},
    {text:'C-6',y:811,confidence:93}
  ],[
    {text:'Centro SBC',y:161,confidence:94},
    {text:'Americanópolis - z',y:275,confidence:92},
    {text:'Ferrazópolis',y:811,confidence:94}
  ],wanted,'39091.jpg');
  assert.equal(first.length,15);
  assert.equal(recovered.length,3);
  const combined=E.reconcilePasses(first,recovered,'39091.jpg');
  assert.equal(combined.reconciled,1);
  assert.equal(combined.recovered,3);
  const final=E.consolidate(combined.items,wanted,20,[]);
  assert.equal(final.length,17);
  assert.equal(final.some(item=>item.route==='CC-6'),false);
  assert.equal(final.some(item=>item.route==='C-6'&&item.needsReview&&!item.selected),true);
  assert.equal(final.some(item=>item.route==='B-7'&&item.needsReview),true);
  assert.equal(final.some(item=>item.route==='A-1'&&item.needsReview),true);
});
test('Rota CC-6 de outra linha não é eliminada por semelhança de letras',()=>{
  const source='tabela.jpg';
  const primary=[{route:'CC-6',cluster:'Ferrazópolis',source,rowY:100,needsReview:false}];
  const secondary=[{route:'C-6',cluster:'Ferrazópolis',source,rowY:200,needsReview:true,recovered:true}];
  const combined=E.reconcilePasses(primary,secondary,source);
  assert.equal(combined.reconciled,0);
  assert.equal(combined.items.length,2);
});
test('Não concilia códigos com dígitos diferentes ou clusters divergentes',()=>{
  const source='tabela.jpg';
  const p=[{route:'CC-6',cluster:'Ferrazópolis',source,rowY:100,needsReview:true}];
  const s=[
    {route:'C-7',cluster:'Ferrazópolis',rowY:101,needsReview:true},
    {route:'C-6',cluster:'Centro SBC',rowY:101,needsReview:true}
  ];
  assert.equal(E.reconcilePasses(p,s,source).items.length,3);
});
test('Não concilia leituras de imagens diferentes',()=>{
  const first=[{route:'CC-6',cluster:'Ferrazópolis',source:'imagem_1.jpg',rowY:50,needsReview:true}];
  const second=[{route:'C-6',cluster:'Ferrazópolis',rowY:51,source:'imagem_2.jpg',needsReview:true}];
  assert.equal(E.reconcilePasses(first,second,'imagem_2.jpg').reconciled,0);
});

console.log('Total testes aprovados:',pass);
if(process.exitCode)process.exit(1);
