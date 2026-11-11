/**
 * ALERTAS DE TRÁFEGO - META ADS
 * Verifica as contas de anúncio listadas na aba "Clientes" e avisa a equipe
 * (aba "Equipe") por e-mail e/ou Telegram. Cada pessoa recebe só os alertas
 * das contas em que está na coluna "Responsáveis". Avisa quando:
 *   - o saldo está perto de acabar (pré-pago ou limite de gastos);
 *   - o custo por resultado de uma campanha hoje está acima da média dos últimos 7 dias;
 *   - o custo por resultado passou do máximo definido para o cliente;
 *   - uma campanha gastou sem trazer nenhum resultado no dia;
 *   - o gasto do dia passou do orçamento diário da campanha ou do conjunto;
 *   - a conta saiu do status "Ativa" (pagamento pendente, desativada etc.).
 *
 * Como instalar: Extensões > Apps Script > cole este código > Salvar.
 * Depois use o menu "Alertas de Tráfego" que aparece na planilha.
 */

// ---------------- Estrutura da planilha ----------------
const ABA_CLIENTES = 'Clientes';
const ABA_CONFIG = 'Configurações';
const ABA_HISTORICO = 'Histórico de alertas';
const ABA_EQUIPE = 'Equipe';

// Colunas da aba Equipe (1 = A)
const EQ = {
  nome: 1, papel: 2, email: 3, contas: 4, ativo: 5,
  saldo: 6, conta: 7, custo: 8, resultado: 9, orcamento: 10, sistema: 11, // caixinhas: quais avisos a pessoa recebe
  codigo: 12, link: 13, chat: 14, vinculadoEm: 15,
};
const CATEGORIAS = ['saldo', 'conta', 'custo', 'resultado', 'orcamento', 'sistema'];

// Colunas da aba Clientes (1 = A)
const COL = {
  cliente: 1,       // A
  idConta: 2,       // B
  monitorar: 3,     // C
  responsaveis: 4,  // D  (nomes da aba Equipe, separados por vírgula)
  tipoResultado: 5, // E
  diasMin: 6,       // F
  saldoMin: 7,      // G
  custoMax: 8,      // H
  pctAcima: 9,      // I
  saldoAtual: 10,   // J  (preenchido pelo script)
  gastoMedio: 11,   // K  (preenchido pelo script)
  diasRestantes: 12,// L  (fórmula da planilha)
  gastoHoje: 13,    // M  (preenchido pelo script)
  ultimaVerif: 14,  // N  (preenchido pelo script)
  situacao: 15,     // O  (preenchido pelo script)
};

// Tipos de resultado e as ações do Meta que contam como resultado
const TIPOS_RESULTADO = {
  'Mensagens': ['onsite_conversion.messaging_conversation_started_7d'],
  'Compras': ['omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'purchase', 'onsite_web_purchase'],
  'Leads': ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead'],
  'Cliques': ['link_click'],
};

// No modo "Automático", qual resultado procurar conforme o objetivo da campanha
const RESULTADO_POR_OBJETIVO = {
  OUTCOME_ENGAGEMENT: ['Mensagens'],
  MESSAGES: ['Mensagens'],
  OUTCOME_SALES: ['Compras', 'Mensagens'],
  CONVERSIONS: ['Compras', 'Mensagens'],
  PRODUCT_CATALOG_SALES: ['Compras'],
  OUTCOME_LEADS: ['Leads', 'Mensagens'],
  LEAD_GENERATION: ['Leads'],
  OUTCOME_TRAFFIC: ['Cliques'],
  LINK_CLICKS: ['Cliques'],
};

const STATUS_CONTA = {
  1: 'Ativa', 2: 'Desativada', 3: 'Pagamento pendente', 7: 'Em análise de risco',
  8: 'Pagamento pendente de liquidação', 9: 'Em período de carência', 100: 'Encerramento pendente',
  101: 'Encerrada', 201: 'Ativa (qualquer)', 202: 'Encerrada (qualquer)',
};

let CONFIG_CACHE = null;

// ---------------- Menu ----------------
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Alertas de Tráfego')
    .addItem('1. Salvar token do Meta', 'salvarTokenMeta')
    .addItem('2. Salvar token do bot do Telegram', 'salvarTokenTelegram')
    .addItem('3. Gerar links de vínculo do Telegram', 'gerarLinksTelegram')
    .addItem('4. Processar vínculos do Telegram agora', 'processarVinculosAgora')
    .addItem('5. Enviar mensagem de teste para a equipe', 'enviarTeste')
    .addSeparator()
    .addItem('Verificar agora', 'verificarAgora')
    .addItem('Ativar verificação automática', 'ativarAutomatico')
    .addItem('Desativar verificação automática', 'desativarAutomatico')
    .addSeparator()
    .addItem('Importar contas de anúncio novas', 'importarContas')
    .addToUi();
}

function salvarTokenMeta() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Token do Meta', 'Cole o token de acesso da conta mãe (a que enxerga todas as contas de anúncio):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const token = r.getResponseText().trim();
  if (!token) return;
  PropertiesService.getScriptProperties().setProperty('META_TOKEN', token);
  try {
    const me = graph_('me', { fields: 'name' });
    ui.alert('Token salvo e funcionando. Conectado como: ' + me.name);
  } catch (e) {
    ui.alert('O token foi salvo, mas o teste falhou: ' + e.message);
  }
}

function salvarTokenTelegram() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Token do bot do Telegram', 'Cole o token que o @BotFather enviou (ex.: 123456:ABC...). Deixe vazio para não usar Telegram.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const token = r.getResponseText().trim();
  const props = PropertiesService.getScriptProperties();
  if (!token) { props.deleteProperty('TELEGRAM_TOKEN'); ui.alert('Telegram desativado.'); return; }
  const resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getMe', { muteHttpExceptions: true });
  const json = JSON.parse(resp.getContentText());
  if (!json.ok) { ui.alert('Esse token não funcionou no Telegram: ' + (json.description || resp.getResponseCode())); return; }
  props.setProperty('TELEGRAM_TOKEN', token);
  escreverConfig_('Telegram: nome do bot', json.result.username);
  gerarCodigos_();
  ui.alert('Bot @' + json.result.username + ' conectado. Os links de vínculo de cada pessoa estão na aba Equipe.');
}

function gerarLinksTelegram() {
  const n = gerarCodigos_();
  SpreadsheetApp.getUi().alert(config_().botNome
    ? 'Links atualizados na aba Equipe (' + n + ' novo(s)). Envie para cada pessoa o link dela: basta abrir e tocar em "Iniciar".'
    : 'Salve primeiro o token do bot (item 2 do menu).');
}

function processarVinculosAgora() {
  const n = processarVinculos_();
  SpreadsheetApp.getUi().alert(n + ' pessoa(s) vinculada(s) agora. Confira a coluna "Telegram (chat ID)" na aba Equipe.');
}

function processarVinculosAuto() { processarVinculos_(); }

function enviarTeste() {
  const equipe = lerEquipe_().filter(m => m.ativo);
  if (!equipe.length) { SpreadsheetApp.getUi().alert('Nenhuma pessoa ativa na aba Equipe.'); return; }
  const resumo = equipe.map(m => {
    const canais = enviarPara_(m, 'Teste dos Alertas de Tráfego',
      ['Olá, ' + esc_(m.nome) + '! Se você recebeu esta mensagem, os alertas das suas contas vão chegar aqui.']);
    return m.nome + ': ' + (canais.length ? canais.join(' e ') : 'nenhum canal configurado');
  });
  SpreadsheetApp.getUi().alert('Teste enviado.\n\n' + resumo.join('\n'));
}

function ativarAutomatico() {
  desativarAutomatico_();
  ScriptApp.newTrigger('verificarAutomatico').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('processarVinculosAuto').timeBased().everyMinutes(5).create();
  SpreadsheetApp.getUi().alert('Verificação automática ativada: as contas são verificadas de hora em hora e os vínculos do Telegram a cada 5 minutos, mesmo com o computador desligado.');
}

function desativarAutomatico() {
  desativarAutomatico_();
  SpreadsheetApp.getUi().alert('Verificação automática desativada.');
}

function desativarAutomatico_() {
  ScriptApp.getProjectTriggers()
    .filter(t => ['verificarAutomatico', 'processarVinculosAuto'].indexOf(t.getHandlerFunction()) >= 0)
    .forEach(t => ScriptApp.deleteTrigger(t));
}

// ---------------- Equipe e Telegram ----------------
function lerEquipe_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(ABA_EQUIPE);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, EQ.vinculadoEm).getValues()
    .map((l, i) => ({
      linha: i + 2,
      nome: String(l[EQ.nome - 1]).trim(),
      papel: String(l[EQ.papel - 1]).trim(),
      email: String(l[EQ.email - 1]).trim(),
      todasContas: /^todas/i.test(String(l[EQ.contas - 1]).trim()),
      recebe: CATEGORIAS.filter(c => l[EQ[c] - 1] === true || String(l[EQ[c] - 1]).toUpperCase() === 'TRUE'),
      ativo: String(l[EQ.ativo - 1]).trim().toLowerCase() !== 'não',
      codigo: String(l[EQ.codigo - 1]).trim(),
      chat: String(l[EQ.chat - 1]).trim(),
    }))
    .filter(m => m.nome);
}

/** Cria código e link de vínculo para quem ainda não tem. Retorna quantos foram criados. */
function gerarCodigos_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(ABA_EQUIPE);
  const bot = config_().botNome;
  let novos = 0;
  lerEquipe_().forEach(m => {
    let codigo = m.codigo;
    if (!codigo) {
      const base = m.nome.split(/\s+/)[0].normalize('NFD').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12) || 'EQUIPE';
      codigo = base + Math.floor(100 + Math.random() * 900);
      sh.getRange(m.linha, EQ.codigo).setValue(codigo);
      novos++;
    }
    if (bot) sh.getRange(m.linha, EQ.link).setValue('https://t.me/' + bot + '?start=' + codigo);
  });
  return novos;
}

/** Lê as mensagens recebidas pelo bot e liga o Telegram de cada pessoa ao seu código. */
function processarVinculos_() {
  const tok = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  if (!tok) return 0;
  const props = PropertiesService.getScriptProperties();
  const offset = Number(props.getProperty('TELEGRAM_OFFSET') || 0);
  const resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + tok + '/getUpdates?timeout=0&offset=' + offset, { muteHttpExceptions: true });
  const json = JSON.parse(resp.getContentText());
  const updates = json.result || [];
  if (!updates.length) return 0;

  const sh = SpreadsheetApp.getActive().getSheetByName(ABA_EQUIPE);
  const equipe = lerEquipe_();
  let vinculados = 0;
  updates.forEach(u => {
    const msg = u.message;
    if (!msg || !msg.text || !msg.chat) return;
    const m = msg.text.trim().match(/^\/(?:start|vincular)(?:@\S+)?\s+(\S+)/i);
    if (!m) {
      responderTelegram_(tok, msg.chat.id, 'Olá! Para receber os alertas, abra o link de vínculo que o seu gestor enviou.');
      return;
    }
    const pessoa = equipe.filter(p => p.codigo && p.codigo.toUpperCase() === m[1].toUpperCase())[0];
    if (!pessoa) {
      responderTelegram_(tok, msg.chat.id, 'Código não encontrado. Confira o link com o seu gestor.');
      return;
    }
    sh.getRange(pessoa.linha, EQ.chat, 1, 2).setValues([[String(msg.chat.id), new Date()]]);
    responderTelegram_(tok, msg.chat.id, 'Pronto, ' + pessoa.nome + '! Você vai receber aqui os alertas das contas em que é responsável.');
    vinculados++;
  });
  props.setProperty('TELEGRAM_OFFSET', String(updates[updates.length - 1].update_id + 1));
  return vinculados;
}

function responderTelegram_(tok, chatId, texto) {
  UrlFetchApp.fetch('https://api.telegram.org/bot' + tok + '/sendMessage', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ chat_id: chatId, text: texto }),
  });
}

// ---------------- Verificação ----------------
function verificarAgora() {
  const r = verificar_(true);
  SpreadsheetApp.getActive().toast(r.alertas + ' alerta(s) encontrados, ' + r.enviados + ' enviados. Veja a coluna "Situação".', 'Alertas de Tráfego', 8);
}

function verificarAutomatico() {
  const cfg = config_();
  const hora = Number(Utilities.formatDate(new Date(), fuso_(), 'H'));
  const dentroDoHorario = hora >= cfg.horaInicio && hora <= cfg.horaFim;
  verificar_(dentroDoHorario);
}

/**
 * Percorre os clientes, atualiza a planilha e envia os alertas novos.
 * @param {boolean} podeEnviar se false, só atualiza a planilha (horário de silêncio).
 */
function verificar_(podeEnviar) {
  const cfg = config_();
  const sh = SpreadsheetApp.getActive().getSheetByName(ABA_CLIENTES);
  const ultima = ultimaLinhaClientes_(sh);
  if (ultima < 2) return { alertas: 0, enviados: 0 };
  const linhas = sh.getRange(2, 1, ultima - 1, COL.situacao).getValues();
  const todos = [];
  let erroToken = null;
  const equipe = lerEquipe_();
  const porNome = {};
  equipe.forEach(m => { porNome[m.nome.toLowerCase()] = m; });

  linhas.forEach((l, i) => {
    const linhaPlanilha = i + 2;
    const id = String(l[COL.idConta - 1]).replace(/^act_/, '').replace(/\D/g, '');
    const monitorar = String(l[COL.monitorar - 1]).trim().toLowerCase() === 'sim';
    if (!id || !monitorar) return;

    const cliente = {
      nome: String(l[COL.cliente - 1]) || id,
      id: id,
      tipo: String(l[COL.tipoResultado - 1] || 'Automático'),
      diasMin: num_(l[COL.diasMin - 1], cfg.diasMin),
      saldoMin: num_(l[COL.saldoMin - 1], 0),
      custoMax: num_(l[COL.custoMax - 1], 0),
      pctAcima: pct_(l[COL.pctAcima - 1], cfg.pctAcima),
    };
    const nomesResp = String(l[COL.responsaveis - 1]).split(/[,;]/).map(n => n.trim()).filter(n => n);
    const responsaveis = nomesResp.map(n => porNome[n.toLowerCase()]).filter(m => m);
    // Quem acompanha todas as contas (ex.: Head, Líder master) também entra na lista
    const destinatarios = responsaveis.concat(equipe.filter(m => m.todasContas && responsaveis.indexOf(m) < 0));
    const naoEncontrados = nomesResp.filter(n => !porNome[n.toLowerCase()]);
    let obs = '';
    if (!nomesResp.length) obs = equipe.some(m => m.todasContas && m.ativo) ? ' | sem responsável (só quem acompanha todas as contas é avisado)' : ' | sem responsável (ninguém é avisado)';
    else if (naoEncontrados.length) obs = ' | não está na aba Equipe: ' + naoEncontrados.join(', ');

    try {
      const r = verificarConta_(cliente, cfg);
      r.alertas.forEach(a => { a.para = destinatarios; });
      todos.push.apply(todos, r.alertas);
      sh.getRange(linhaPlanilha, COL.saldoAtual, 1, 2).setValues([[r.saldo === null ? 'Pagamento recorrente' : r.saldo, r.gastoMedio]]);
      sh.getRange(linhaPlanilha, COL.saldoAtual).setNote(r.diagnostico);
      sh.getRange(linhaPlanilha, COL.gastoHoje, 1, 3).setValues([[r.gastoHoje, new Date(),
        (r.alertas.length ? r.alertas.length + ' alerta(s): ' + r.alertas.map(a => a.tipo).join(', ') : 'OK') + obs]]);
    } catch (e) {
      if (e.code === 190) erroToken = e.message;
      sh.getRange(linhaPlanilha, COL.ultimaVerif, 1, 2).setValues([[new Date(), 'Erro: ' + e.message + obs]]);
    }
  });

  if (erroToken) {
    todos.push({ chave: 'token', cat: 'sistema', para: equipe, cliente: 'Conexão com o Meta', tipo: 'Token inválido ou expirado',
      texto: 'O token do Meta parou de funcionar (' + erroToken + '). Gere um novo e salve pelo menu "1. Salvar token do Meta".' });
  }

  // Monta a fila de cada pessoa, sem repetir o mesmo alerta dentro do intervalo definido
  const props = PropertiesService.getScriptProperties();
  const agora = Date.now();
  const intervaloMs = cfg.intervaloHoras * 3600 * 1000;
  const fila = {}; // nome -> { membro, alertas: [] }
  todos.forEach(a => {
    (a.para || []).forEach(m => {
      if (!m.ativo) return;
      if (m.recebe.indexOf(a.cat) < 0) return;
      const chave = 'alerta|' + a.chave + '|' + m.nome;
      if (agora - Number(props.getProperty(chave) || 0) < intervaloMs) return;
      if (!fila[m.nome]) fila[m.nome] = { membro: m, alertas: [] };
      fila[m.nome].alertas.push(a);
    });
  });

  let enviados = 0;
  const entregues = {}; // alerta -> nomes que receberam
  if (podeEnviar) {
    Object.keys(fila).forEach(nome => {
      const item = fila[nome];
      const linhasMsg = item.alertas.map(a => '<b>' + esc_(a.cliente) + '</b> | ' + esc_(a.tipo) + '\n' + esc_(a.texto));
      const canais = enviarPara_(item.membro, 'Alertas de Tráfego: ' + item.alertas.length + ' aviso(s)', linhasMsg);
      if (!canais.length) return;
      item.alertas.forEach(a => {
        props.setProperty('alerta|' + a.chave + '|' + nome, String(agora));
        (entregues[a.chave] = entregues[a.chave] || { alerta: a, nomes: [] }).nomes.push(nome + ' (' + canais.join(' e ') + ')');
      });
      enviados += item.alertas.length;
    });
    registrarHistorico_(Object.keys(entregues).map(k => entregues[k]));
  }
  limparChavesAntigas_();
  return { alertas: todos.length, enviados: enviados };
}

function verificarConta_(cliente, cfg) {
  const act = 'act_' + cliente.id;
  const conta = graph_(act, { fields: 'name,account_status,currency,amount_spent,spend_cap,balance,is_prepay_account,funding_source_details{id,display_string,type}' });
  const camposInsights = 'campaign_id,campaign_name,objective,spend,actions';
  const hoje = indexarPorCampanha_(graphTodos_(act + '/insights', { level: 'campaign', date_preset: 'today', fields: camposInsights, limit: 200 }));
  const semana = indexarPorCampanha_(graphTodos_(act + '/insights', { level: 'campaign', date_preset: 'last_7d', fields: camposInsights, limit: 200 }));

  const alertas = [];
  const dia = Utilities.formatDate(new Date(), fuso_(), 'yyyy-MM-dd');

  // Status da conta
  if (Number(conta.account_status) !== 1) {
    const st = STATUS_CONTA[conta.account_status] || ('código ' + conta.account_status);
    alertas.push({ chave: cliente.id + '|status|' + conta.account_status, cliente: cliente.nome, cat: 'conta', tipo: 'Conta com problema',
      texto: 'Status da conta: ' + st + '. Os anúncios podem estar parados.' });
  }

  // Gasto de hoje e média dos últimos 7 dias (sem contar hoje)
  let gastoHoje = 0, gasto7d = 0;
  Object.keys(hoje).forEach(k => gastoHoje += Number(hoje[k].spend || 0));
  Object.keys(semana).forEach(k => gasto7d += Number(semana[k].spend || 0));
  const gastoMedio = gasto7d / 7;

  // Saldo
  const saldoInfo = lerSaldo_(conta);
  const saldo = saldoInfo ? saldoInfo.valor : null;
  if (saldo !== null) {
    const diasRest = gastoMedio > 0 ? saldo / gastoMedio : null;
    const pouco = (diasRest !== null && diasRest < cliente.diasMin) || (cliente.saldoMin > 0 && saldo < cliente.saldoMin);
    if (pouco) {
      alertas.push({ chave: cliente.id + '|saldo', cliente: cliente.nome, cat: 'saldo', tipo: 'Saldo acabando',
        texto: saldoInfo.tipo + ': ' + brl_(saldo) +
          (diasRest !== null ? ' (dá para ~' + diasRest.toFixed(1).replace('.', ',') + ' dia(s) no ritmo de ' + brl_(gastoMedio) + '/dia)' : '') + '.' });
    }
  }

  // Custo por campanha
  const sinalizadas = []; // campanhas com problema, para detalhar os criativos depois
  Object.keys(hoje).forEach(cid => {
    const h = hoje[cid];
    const s = semana[cid];
    const gH = Number(h.spend || 0);
    const at = escolherAcao_(cliente.tipo, h, s);
    if (!at) return;
    const rH = contar_(h.actions, at.acao);
    const gS = s ? Number(s.spend || 0) : 0;
    const rS = s ? contar_(s.actions, at.acao) : 0;
    const cprH = rH > 0 ? gH / rH : null;
    const cprS = rS > 0 ? gS / rS : null;
    const nome = h.campaign_name || cid;
    let alerta = null;

    if (rH === 0 && gH >= cfg.gastoSemResultado) {
      alerta = { chave: cliente.id + '|semres|' + cid + '|' + dia, cliente: cliente.nome, cat: 'resultado', tipo: 'Gasto sem resultado',
        texto: 'Campanha "' + nome + '" gastou ' + brl_(gH) + ' hoje e não teve nenhum resultado (' + at.rotulo.toLowerCase() + ').' };
    } else if (cprH !== null && gH >= cfg.gastoMinAvaliar) {
      if (cprS !== null && cprH > cprS * (1 + cliente.pctAcima)) {
        const pctReal = Math.round((cprH / cprS - 1) * 100);
        alerta = { chave: cliente.id + '|media|' + cid + '|' + dia, cliente: cliente.nome, cat: 'custo', tipo: 'Custo acima do normal',
          texto: 'Campanha "' + nome + '": custo por ' + at.singular + ' hoje está em ' + brl_(cprH) + ', ' + pctReal +
            '% acima da média dos últimos 7 dias (' + brl_(cprS) + '). Gasto hoje: ' + brl_(gH) + ', ' + rH + ' resultado(s).' };
      } else if (cliente.custoMax > 0 && cprH > cliente.custoMax) {
        alerta = { chave: cliente.id + '|max|' + cid + '|' + dia, cliente: cliente.nome, cat: 'custo', tipo: 'Custo acima do máximo',
          texto: 'Campanha "' + nome + '": custo por ' + at.singular + ' hoje está em ' + brl_(cprH) + ', acima do máximo definido (' + brl_(cliente.custoMax) + ').' };
      }
    }
    if (alerta) {
      alertas.push(alerta);
      // Referência de custo: média da campanha nos 7 dias; sem histórico, usa o máximo do cliente
      sinalizadas.push({ cid: cid, at: at, ref: cprS || cliente.custoMax || cprH, alerta: alerta });
    }
  });

  // Gasto do dia acima do orçamento diário (campanha CBO ou conjunto ABO)
  try { verificarOrcamentos_(act, hoje, cliente, cfg, dia).forEach(a => alertas.push(a)); }
  catch (e) { console.error('Orçamento falhou em ' + cliente.nome + ': ' + e.message); }

  // Detalha quais criativos (anúncios) estão puxando o custo para cima
  if (sinalizadas.length) {
    try { detalharCriativos_(act, sinalizadas, cliente, cfg); }
    catch (e) { console.error('Detalhe de criativos falhou em ' + cliente.nome + ': ' + e.message); }
  }

  return { alertas: alertas, saldo: saldo, gastoMedio: gastoMedio, gastoHoje: gastoHoje, diagnostico: diagnosticoSaldo_(conta) };
}

/**
 * Compara o gasto de hoje com o orçamento diário das campanhas e conjuntos ativos.
 * Orçamentos vêm em centavos; orçamento total (vitalício) é ignorado.
 */
function verificarOrcamentos_(act, hojeCampanhas, cliente, cfg, dia) {
  const alertas = [];
  const ativo = JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]);
  const margem = 1 + cfg.margemOrcamento;
  const pct = (g, o) => Math.round((g / o - 1) * 100);

  // Campanhas com orçamento na campanha (CBO)
  const campanhas = graphTodos_(act + '/campaigns', { fields: 'id,name,daily_budget', filtering: ativo, limit: 200 });
  const nomeCampanha = {};
  campanhas.forEach(c => {
    nomeCampanha[c.id] = c.name;
    const orc = Number(c.daily_budget || 0) / 100;
    if (!orc) return;
    const gasto = hojeCampanhas[c.id] ? Number(hojeCampanhas[c.id].spend || 0) : 0;
    if (gasto > orc * margem) {
      alertas.push({ chave: cliente.id + '|orc|c' + c.id + '|' + dia, cliente: cliente.nome, cat: 'orcamento', tipo: 'Gasto acima do orçamento',
        texto: 'Campanha "' + c.name + '" já gastou ' + brl_(gasto) + ' hoje, acima do orçamento diário de ' + brl_(orc) + ' (+' + pct(gasto, orc) + '%).' });
    }
  });

  // Conjuntos com orçamento no conjunto (ABO)
  const conjuntos = graphTodos_(act + '/adsets', { fields: 'id,name,campaign_id,daily_budget', filtering: ativo, limit: 500 })
    .filter(c => Number(c.daily_budget || 0) > 0);
  if (conjuntos.length) {
    const gastoConjunto = {};
    graphTodos_(act + '/insights', { level: 'adset', date_preset: 'today', fields: 'adset_id,spend', limit: 500 })
      .forEach(x => { gastoConjunto[x.adset_id] = Number(x.spend || 0); });
    conjuntos.forEach(c => {
      const orc = Number(c.daily_budget) / 100;
      const gasto = gastoConjunto[c.id] || 0;
      if (gasto > orc * margem) {
        alertas.push({ chave: cliente.id + '|orc|a' + c.id + '|' + dia, cliente: cliente.nome, cat: 'orcamento', tipo: 'Gasto acima do orçamento',
          texto: 'Conjunto "' + c.name + '"' + (nomeCampanha[c.campaign_id] ? ' (campanha "' + nomeCampanha[c.campaign_id] + '")' : '') +
            ' já gastou ' + brl_(gasto) + ' hoje, acima do orçamento diário de ' + brl_(orc) + ' (+' + pct(gasto, orc) + '%).' });
      }
    });
  }
  return alertas;
}

/**
 * Para cada campanha com problema, olha os anúncios dela hoje e nos últimos 7 dias
 * e acrescenta ao alerta os criativos que mais estão encarecendo o resultado.
 */
function detalharCriativos_(act, sinalizadas, cliente, cfg) {
  const ids = sinalizadas.map(x => x.cid);
  const filtro = JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: ids }]);
  const campos = 'campaign_id,adset_name,ad_id,ad_name,spend,actions';
  const hojeAds = graphTodos_(act + '/insights', { level: 'ad', date_preset: 'today', fields: campos, filtering: filtro, limit: 500 });
  const semanaAds = {};
  graphTodos_(act + '/insights', { level: 'ad', date_preset: 'last_7d', fields: campos, filtering: filtro, limit: 500 })
    .forEach(a => { semanaAds[a.ad_id] = a; });

  sinalizadas.forEach(sx => {
    const anuncios = hojeAds.filter(a => a.campaign_id === sx.cid && Number(a.spend || 0) > 0);
    if (!anuncios.length) return;
    const ruins = [];
    anuncios.forEach(a => {
      const g = Number(a.spend || 0);
      const r = contar_(a.actions, sx.at.acao);
      const s7 = semanaAds[a.ad_id];
      const r7 = s7 ? contar_(s7.actions, sx.at.acao) : 0;
      const cpr7 = r7 > 0 ? Number(s7.spend || 0) / r7 : null;
      const cpr = r > 0 ? g / r : null;
      const limite = sx.ref * (1 + cliente.pctAcima);
      const semResultado = r === 0 && g >= Math.max(10, sx.ref);
      const caro = cpr !== null && cpr > limite;
      if (!semResultado && !caro) return;
      // Quanto esse anúncio gastou além do que seria normal para os resultados que trouxe
      const excesso = g - r * sx.ref;
      ruins.push({ nome: a.ad_name || a.ad_id, conjunto: a.adset_name || '', g: g, r: r, cpr: cpr, cpr7: cpr7, excesso: excesso });
    });

    let detalhe;
    if (!ruins.length) {
      detalhe = '\nNenhum criativo isolado se destaca: o custo subiu de forma parecida em todos os anúncios da campanha (pode ser público, leilão ou horário).';
    } else {
      ruins.sort((x, y) => y.excesso - x.excesso);
      const top = ruins.slice(0, 3);
      detalhe = '\nCriativos com custo alto:' + top.map(x => {
        let linha = '\n• "' + x.nome + '"' + (x.conjunto ? ' (conjunto "' + x.conjunto + '")' : '') + ': ' + brl_(x.g) + ' gastos hoje, ';
        if (x.r === 0) linha += 'nenhum resultado';
        else linha += x.r + ' ' + (x.r === 1 ? sx.at.singular : PLURAL[sx.at.rotulo]) + ' (' + brl_(x.cpr) + ' cada)';
        if (x.cpr7 !== null) linha += '; nos últimos 7 dias saía a ' + brl_(x.cpr7);
        return linha;
      }).join('');
      if (ruins.length > top.length) detalhe += '\n+ ' + (ruins.length - top.length) + ' outro(s) anúncio(s) com custo alto.';
    }
    sx.alerta.texto += detalhe;
  });
}

// ---------------- Regras auxiliares ----------------
function lerSaldo_(conta) {
  const fsd = conta.funding_source_details || {};
  const texto = String(fsd.display_string || '');
  // Pré-pago: o Meta descreve o saldo em texto ("Saldo disponível (R$ 50,00 BRL)").
  // Algumas contas PIX/boleto não vêm marcadas como pré-pagas, então olhamos o texto também.
  const pareceSaldo = /saldo|balance|dispon/i.test(texto) || Number(fsd.type) === 20;
  if ((conta.is_prepay_account || pareceSaldo) && texto) {
    const v = valorDoTexto_(texto);
    if (v !== null) return { valor: v, tipo: 'Saldo pré-pago' };
  }
  const limite = Number(conta.spend_cap || 0);
  if (limite > 0) {
    return { valor: (limite - Number(conta.amount_spent || 0)) / 100, tipo: 'Limite de gastos restante' };
  }
  return null; // conta no cartão, sem limite de gastos: não há saldo para acabar
}

/** Resumo do que o Meta devolveu sobre pagamento, gravado como nota na célula do saldo. */
function diagnosticoSaldo_(conta) {
  const fsd = conta.funding_source_details || {};
  return 'Dados de pagamento devolvidos pelo Meta (' + Utilities.formatDate(new Date(), fuso_(), 'dd/MM HH:mm') + '):\n' +
    'Pré-pago: ' + (conta.is_prepay_account ? 'sim' : 'não') + '\n' +
    'Forma de pagamento: ' + (fsd.display_string || '(não informado)') + ' | tipo ' + (fsd.type || '-') + '\n' +
    'Limite de gastos: ' + (conta.spend_cap || '0') + ' | Gasto total: ' + (conta.amount_spent || '0') + ' | balance: ' + (conta.balance || '0');
}

/** Lê um valor como "Saldo disponível (R$1.234,56 BRL)". */
function valorDoTexto_(txt) {
  txt = String(txt);
  const aposRS = txt.indexOf('R$') >= 0 ? txt.slice(txt.indexOf('R$') + 2) : txt;
  const m = aposRS.match(/-?\d[\d.,]*/);
  if (!m) return null;
  let s = m[0];
  if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}

function escolherAcao_(tipoCliente, hoje, semana) {
  let tipos;
  if (TIPOS_RESULTADO[tipoCliente]) tipos = [tipoCliente];
  else tipos = RESULTADO_POR_OBJETIVO[hoje.objective] || ['Mensagens', 'Compras', 'Leads', 'Cliques'];
  const fontes = [semana && semana.actions, hoje.actions];
  for (const fonte of fontes) {
    if (!fonte) continue;
    for (const t of tipos) {
      for (const acao of TIPOS_RESULTADO[t]) {
        if (contar_(fonte, acao) > 0) return { acao: acao, rotulo: t, singular: SINGULAR[t] };
      }
    }
  }
  return null;
}
const SINGULAR = { 'Mensagens': 'conversa', 'Compras': 'compra', 'Leads': 'lead', 'Cliques': 'clique' };
const PLURAL = { 'Mensagens': 'conversas', 'Compras': 'compras', 'Leads': 'leads', 'Cliques': 'cliques' };

function contar_(actions, tipo) {
  if (!actions) return 0;
  const a = actions.filter(x => x.action_type === tipo)[0];
  return a ? Number(a.value || 0) : 0;
}

function indexarPorCampanha_(lista) {
  const mapa = {};
  lista.forEach(c => { mapa[c.campaign_id] = c; });
  return mapa;
}

// ---------------- Meta Graph API ----------------
function graph_(caminho, params) {
  const token = PropertiesService.getScriptProperties().getProperty('META_TOKEN');
  if (!token) throw new Error('Token do Meta não configurado (menu Alertas de Tráfego > 1).');
  params = Object.assign({}, params || {}, { access_token: token });
  const qs = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
  return buscarJson_('https://graph.facebook.com/' + config_().versaoApi + '/' + caminho + '?' + qs);
}

function graphTodos_(caminho, params) {
  let json = graph_(caminho, params);
  let dados = json.data || [];
  let paginas = 0;
  while (json.paging && json.paging.next && paginas < 20) {
    json = buscarJson_(json.paging.next);
    dados = dados.concat(json.data || []);
    paginas++;
  }
  return dados;
}

function buscarJson_(url) {
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  let json;
  try { json = JSON.parse(resp.getContentText()); }
  catch (e) { throw new Error('Resposta inválida do Meta (HTTP ' + resp.getResponseCode() + ')'); }
  if (json.error) {
    const e = new Error(json.error.error_user_msg || json.error.message);
    e.code = json.error.code;
    throw e;
  }
  return json;
}

function importarContas() {
  const sh = SpreadsheetApp.getActive().getSheetByName(ABA_CLIENTES);
  const ultima = ultimaLinhaClientes_(sh);
  const existentes = ultima > 1
    ? sh.getRange(2, COL.idConta, ultima - 1, 1).getValues().map(r => String(r[0]).replace(/\D/g, ''))
    : [];
  const contas = graphTodos_('me/adaccounts', { fields: 'name,account_id', limit: 200 });
  const novas = contas.filter(c => existentes.indexOf(String(c.account_id)) < 0)
    .map(c => [c.name, "'" + c.account_id, 'Não', '', 'Automático']);
  if (novas.length) sh.getRange(ultima + 1, 1, novas.length, 5).setValues(novas);
  SpreadsheetApp.getUi().alert(novas.length + ' conta(s) nova(s) adicionada(s) com "Monitorar = Não". Mude para "Sim" nas que quiser acompanhar.');
}

// ---------------- Envio ----------------
/** Envia para uma pessoa da equipe por todos os canais dela. Retorna os canais que funcionaram. */
function enviarPara_(membro, assunto, linhas) {
  const canais = [];
  if (membro.email) {
    try {
      const html = linhas.map(l => '<p>' + l.replace(/\n/g, '<br>') + '</p>').join('');
      MailApp.sendEmail({ to: membro.email, subject: assunto, htmlBody: html + '<p style="color:#888">Enviado pela planilha Alertas de Tráfego.</p>' });
      canais.push('e-mail');
    } catch (e) { console.error('E-mail para ' + membro.nome + ' falhou: ' + e.message); }
  }
  const tok = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
  if (tok && membro.chat) {
    try {
      const blocos = [];
      let atual = '<b>' + esc_(assunto) + '</b>';
      linhas.forEach(l => {
        if ((atual + '\n\n' + l).length > 3800) { blocos.push(atual); atual = l; }
        else atual += '\n\n' + l;
      });
      blocos.push(atual);
      let ok = true;
      blocos.forEach(texto => {
        const r = UrlFetchApp.fetch('https://api.telegram.org/bot' + tok + '/sendMessage', {
          method: 'post', contentType: 'application/json', muteHttpExceptions: true,
          payload: JSON.stringify({ chat_id: membro.chat, text: texto, parse_mode: 'HTML', disable_web_page_preview: true }),
        });
        if (r.getResponseCode() !== 200) { ok = false; console.error('Telegram para ' + membro.nome + ': ' + r.getContentText()); }
      });
      if (ok) canais.push('Telegram');
    } catch (e) { console.error('Telegram falhou: ' + e.message); }
  }
  return canais;
}

function registrarHistorico_(itens) {
  const sh = SpreadsheetApp.getActive().getSheetByName(ABA_HISTORICO);
  if (!sh || !itens.length) return;
  const agora = new Date();
  const linhas = itens.map(i => [agora, i.alerta.cliente, i.alerta.tipo, i.alerta.texto, i.nomes.join(', ')]);
  sh.getRange(sh.getLastRow() + 1, 1, linhas.length, 5).setValues(linhas);
}

function limparChavesAntigas_() {
  const props = PropertiesService.getScriptProperties();
  const todas = props.getProperties();
  const limite = Date.now() - 3 * 24 * 3600 * 1000;
  Object.keys(todas).forEach(k => {
    if (k.indexOf('alerta|') === 0 && Number(todas[k]) < limite) props.deleteProperty(k);
  });
}

// ---------------- Configurações ----------------
function config_() {
  if (CONFIG_CACHE) return CONFIG_CACHE;
  const sh = SpreadsheetApp.getActive().getSheetByName(ABA_CONFIG);
  const mapa = {};
  sh.getRange(1, 1, sh.getLastRow(), 2).getValues().forEach(r => { if (r[0]) mapa[String(r[0]).trim()] = r[1]; });
  CONFIG_CACHE = {
    botNome: String(mapa['Telegram: nome do bot'] || '').trim().replace(/^@/, ''),
    versaoApi: String(mapa['Versão da API do Meta'] || 'v23.0').trim(),
    horaInicio: num_(mapa['Início dos alertas (hora)'], 7),
    horaFim: num_(mapa['Fim dos alertas (hora)'], 23),
    diasMin: num_(mapa['Dias mínimos de saldo'], 2),
    pctAcima: pct_(mapa['Custo acima da média de 7 dias'], 0.4),
    gastoMinAvaliar: num_(mapa['Gasto mínimo no dia para avaliar o custo (R$)'], 20),
    gastoSemResultado: num_(mapa['Gasto sem nenhum resultado para alertar (R$)'], 30),
    intervaloHoras: num_(mapa['Intervalo entre alertas repetidos (horas)'], 6),
    margemOrcamento: pct_(mapa['Margem acima do orçamento diário para avisar'], 0),
  };
  return CONFIG_CACHE;
}

function escreverConfig_(rotulo, valor) {
  const sh = SpreadsheetApp.getActive().getSheetByName(ABA_CONFIG);
  const vals = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === rotulo) { sh.getRange(i + 1, 2).setValue(valor); CONFIG_CACHE = null; return; }
  }
}

/** Última linha preenchida na coluna Cliente (a fórmula da coluna K não conta). */
function ultimaLinhaClientes_(sh) {
  const vals = sh.getRange(1, COL.cliente, sh.getMaxRows(), 1).getValues();
  for (let i = vals.length - 1; i >= 0; i--) if (String(vals[i][0]).trim() !== '') return i + 1;
  return 1;
}

function fuso_() { return SpreadsheetApp.getActive().getSpreadsheetTimeZone(); }

function num_(v, padrao) {
  if (v === '' || v === null || v === undefined) return padrao;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(',', '.'));
  return isNaN(n) ? padrao : n;
}

/** Aceita 40%, 0,4 ou 40 e devolve 0.4. */
function pct_(v, padrao) {
  const n = num_(v, padrao);
  return n > 1 ? n / 100 : n;
}

function brl_(v) {
  const partes = Math.abs(v).toFixed(2).split('.');
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (v < 0 ? '-' : '') + 'R$ ' + partes[0] + ',' + partes[1];
}

function esc_(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
