const fs=require('fs');
let code=fs.readFileSync(require('path').join(__dirname,'..','src','AlertasTrafego.gs'),'utf8');
const Utilities={formatDate:(d,tz,f)=>f==='H'?'14':'2026-11-08'};
const SpreadsheetApp={getActive:()=>({getSpreadsheetTimeZone:()=>'America/Sao_Paulo'})};
const PropertiesService={getScriptProperties:()=>({getProperty:()=> 'x'})};
code+=`
CONFIG_CACHE={versaoApi:'v23.0',diasMin:2,pctAcima:0.4,gastoMinAvaliar:20,gastoSemResultado:30};
const respostas={
 'act_1':{name:'X',account_status:3,is_prepay_account:true,funding_source_details:{display_string:'Saldo disponível (R$45,30 BRL)'}},
 'act_1/insights|today':[{campaign_id:'c1',campaign_name:'Msg',objective:'OUTCOME_ENGAGEMENT',spend:'60',actions:[{action_type:'onsite_conversion.messaging_conversation_started_7d',value:'5'}]},
   {campaign_id:'c2',campaign_name:'Venda',objective:'OUTCOME_SALES',spend:'35',actions:[{action_type:'link_click',value:'40'}]}],
 'act_1/insights|last_7d':[{campaign_id:'c1',spend:'280',actions:[{action_type:'onsite_conversion.messaging_conversation_started_7d',value:'56'}]},
   {campaign_id:'c2',spend:'70',actions:[{action_type:'omni_purchase',value:'2'}]}],
};
graph_=(p,params)=>respostas[p];
graphTodos_=(p,params)=>respostas[p+'|'+params.date_preset]||[];
const r=verificarConta_({nome:'Cliente X',id:'1',tipo:'Automático',diasMin:2,saldoMin:0,custoMax:0,pctAcima:0.4},CONFIG_CACHE);
console.log(JSON.stringify(r,null,1));
console.log(valorDoTexto_('Saldo disponível (R$1.234,56 BRL)'), valorDoTexto_('Available balance (R$1,234.56 BRL)'), brl_(1234.5), pct_('40%',0), pct_(0.4,0));
`;
eval(code);
