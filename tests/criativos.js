const fs=require('fs');
let code=fs.readFileSync(require('path').join(__dirname,'..','src','AlertasTrafego.gs'),'utf8');
const Utilities={formatDate:()=> '2026-11-10'};
const SpreadsheetApp={getActive:()=>({getSpreadsheetTimeZone:()=>'America/Sao_Paulo'})};
const M='onsite_conversion.messaging_conversation_started_7d';
code+=`
const R={
 'act_1':{account_status:1,is_prepay_account:false,funding_source_details:{type:1}},
 'act_1/insights|campaign|today':[{campaign_id:'c1',campaign_name:'[MSG] Provador',objective:'OUTCOME_ENGAGEMENT',spend:'80',actions:[{action_type:'${M}',value:'6'}]},
   {campaign_id:'c2',campaign_name:'[MSG] Promo',objective:'OUTCOME_ENGAGEMENT',spend:'40',actions:[{action_type:'${M}',value:'5'}]}],
 'act_1/insights|campaign|last_7d':[{campaign_id:'c1',spend:'350',actions:[{action_type:'${M}',value:'70'}]},
   {campaign_id:'c2',spend:'280',actions:[{action_type:'${M}',value:'40'}]}],
 'act_1/insights|ad|today':[
   {campaign_id:'c1',adset_name:'LAL 1%',ad_id:'a1',ad_name:'Video provador 02',spend:'45',actions:[{action_type:'${M}',value:'1'}]},
   {campaign_id:'c1',adset_name:'Aberto',ad_id:'a2',ad_name:'Carrossel promo',spend:'20',actions:[]},
   {campaign_id:'c1',adset_name:'Aberto',ad_id:'a3',ad_name:'Foto look',spend:'15',actions:[{action_type:'${M}',value:'5'}]}],
 'act_1/insights|ad|last_7d':[{campaign_id:'c1',ad_id:'a1',spend:'120',actions:[{action_type:'${M}',value:'20'}]},{campaign_id:'c1',ad_id:'a3',spend:'100',actions:[{action_type:'${M}',value:'25'}]}],
};
graph_=(p)=>R[p];
graphTodos_=(p,o)=>R[p+'|'+o.level+'|'+o.date_preset]||[];
const r=verificarConta_({nome:'Lovini',id:'1',tipo:'Automático',diasMin:2,saldoMin:0,custoMax:0,pctAcima:0.4},{gastoSemResultado:30,gastoMinAvaliar:20});
r.alertas.forEach(a=>console.log('---',a.tipo,'\\n'+a.texto));
`;
eval(code);
