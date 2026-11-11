const fs=require('fs');
let code=fs.readFileSync(require('path').join(__dirname,'..','src','AlertasTrafego.gs'),'utf8');
const Utilities={formatDate:()=> '2026-11-10'};
const SpreadsheetApp={getActive:()=>({getSpreadsheetTimeZone:()=>'America/Sao_Paulo'})};
code+=`
const R={
 'act_1':{account_status:1,funding_source_details:{type:1}},
 'act_1/insights|campaign|today':[{campaign_id:'c1',campaign_name:'CBO',objective:'OUTCOME_SALES',spend:'65',actions:[]},{campaign_id:'c2',campaign_name:'ABO',objective:'OUTCOME_SALES',spend:'30',actions:[]}],
 'act_1/insights|campaign|last_7d':[],
 'act_1/campaigns|undefined|undefined':[{id:'c1',name:'[VENDAS] CBO',daily_budget:'5000'},{id:'c2',name:'[VENDAS] ABO'}],
 'act_1/adsets|undefined|undefined':[{id:'s1',name:'LAL',campaign_id:'c2',daily_budget:'2000'},{id:'s2',name:'Aberto',campaign_id:'c2',daily_budget:'2000'},{id:'s3',name:'x',campaign_id:'c1'}],
 'act_1/insights|adset|today':[{adset_id:'s1',spend:'24.5'},{adset_id:'s2',spend:'5.5'}],
};
graph_=(p)=>R[p];
graphTodos_=(p,o)=>R[p+'|'+o.level+'|'+o.date_preset]||[];
const r=verificarConta_({nome:'Teste',id:'1',tipo:'Automático',diasMin:2,saldoMin:0,custoMax:0,pctAcima:0.4},{gastoSemResultado:300,gastoMinAvaliar:20,margemOrcamento:0});
r.alertas.forEach(a=>console.log(a.cat,'|',a.texto));
`;
eval(code);
