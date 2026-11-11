const fs=require('fs');
let code=fs.readFileSync(require('path').join(__dirname,'..','src','AlertasTrafego.gs'),'utf8');
// in-memory sheets
function mkSheet(rows){ return {rows, notes:{},
  getLastRow(){ return this.rows.length; }, getMaxRows(){ return 50; },
  getRange(r,c,nr=1,nc=1){ const sh=this; return {
    getValues(){ const out=[]; for(let i=0;i<nr;i++){ const row=sh.rows[r-1+i]||[]; const o=[]; for(let j=0;j<nc;j++) o.push(row[c-1+j]===undefined?'':row[c-1+j]); out.push(o);} return out; },
    setValues(v){ v.forEach((row,i)=>{ sh.rows[r-1+i]=sh.rows[r-1+i]||[]; row.forEach((x,j)=>sh.rows[r-1+i][c-1+j]=x); }); },
    setValue(x){ this.setValues([[x]]); }, setNote(n){ sh.notes[r+','+c]=n; } }; } }; }
const sheets={
 'Clientes': mkSheet([['Cliente','ID','Mon','Resp'],
   ['Mimallu','111','Sim','Gustavo, Ana','Automático'],
   ['Lovini','222','Sim','','Automático'],
   ['Rastok','333','Sim','Gustavo, Fulano','Automático']]),
 'Equipe': mkSheet([['Nome'],
   ['Gustavo','Administrador','g@x.com','Só as dele','Sim',true,true,true,true,true,'GUS1','','999'],
   ['Ana','Gestor','ana@x.com','Só as dele','Sim',true,true,false,false,false,'ANA1','',''],
   ['Head','Head','head@x.com','Todas','Sim',true,false,false,false,false,'','',''],
   ['Lider','Líder master','lider@x.com','Todas','Sim',false,false,false,false,true,'','','']]),
 'Configurações': mkSheet([['Configuração','Valor'],['Intervalo entre alertas repetidos (horas)',6]]),
 'Histórico de alertas': mkSheet([['Data']]),
};
const SpreadsheetApp={getActive:()=>({getSheetByName:n=>sheets[n], getSpreadsheetTimeZone:()=>'America/Sao_Paulo'})};
const store={}; const PropertiesService={getScriptProperties:()=>({getProperty:k=>store[k]||(k==='META_TOKEN'||k==='TELEGRAM_TOKEN'?'x':null), setProperty:(k,v)=>store[k]=v, getProperties:()=>store, deleteProperty:k=>delete store[k]})};
const Utilities={formatDate:(d,tz,f)=>f==='H'?'14':'2026-11-10'};
const sent=[]; const MailApp={sendEmail:o=>sent.push(['email',o.to,o.subject,o.htmlBody.slice(0,140)])};
const UrlFetchApp={fetch:(u,o)=>{ sent.push(['tg',JSON.parse(o.payload).chat_id,JSON.parse(o.payload).text.slice(0,140)]); return {getResponseCode:()=>200,getContentText:()=>'{}'}; }};
const console2=console;
code+=`
verificarConta_=function(c){ 
  if(c.id==='222') { const e=new Error('Invalid OAuth'); e.code=190; throw e; }
  return {saldo:10,gastoMedio:20,gastoHoje:5,diagnostico:'d',alertas:[
  {chave:c.id+'|saldo',cat:'saldo',cliente:c.nome,tipo:'Saldo acabando',texto:'pouco saldo'},
  {chave:c.id+'|media|x',cat:'custo',cliente:c.nome,tipo:'Custo acima do normal',texto:'caro'}]}; };
const r=verificar_(true); console.log(r);
console.log(JSON.stringify(sent,null,0));
console.log(sheets['Clientes'].rows.map(x=>x[14]));
console.log(sheets['Histórico de alertas'].rows.slice(1).map(x=>x.slice(1)));
const r2=verificar_(true); console.log('2a rodada', r2);
`;
eval(code);
