# Alertas de Tráfego - Meta Ads

Sistema de alertas para a equipe de gestão de tráfego do Gustavo. Uma conta mãe (token do Meta com acesso a todas as contas de anúncio) é verificada de hora em hora, e cada alerta vai por e-mail e/ou Telegram só para as pessoas responsáveis pela conta. Converse e escreva sempre em português do Brasil.

## Onde roda

- Planilha Google: "Alertas de Tráfego - Meta Ads"
  https://docs.google.com/spreadsheets/d/1o4O1bdO6nMx-MUDUZZn7SMAWYsGsNr8H5UBjvBC7T-E/edit
  (fica na conta gustavogoncalvesfarias@gmail.com; alertas por e-mail vão para gustavogoncalves.estrategista@gmail.com)
- Código: `src/AlertasTrafego.gs`, colado em Extensões > Apps Script dessa planilha (script vinculado, não é app da Web).
- Hoje a atualização é manual: o Gustavo apaga o código no editor do Apps Script, cola a versão nova e salva. Se quiser automatizar, dá para usar o `clasp` com o ID do script (Apps Script > Configurações do projeto).
- Tokens (Meta e bot do Telegram) ficam nas Propriedades do script, nunca na planilha nem no repositório.
- Token do Meta atual: gerado no Graph API Explorer com o app "Alertas de Tráfego" (ads_read), estendido para 60 dias no Access Token Debugger. Quando expirar, o script manda "Token inválido ou expirado" para quem marcou "Avisos do sistema".

## Estrutura da planilha (os índices de coluna estão nas constantes COL e EQ do código)

- **Como usar**: guia para o usuário.
- **Clientes**: A Cliente | B ID da conta | C Monitorar (Sim/Não) | D Responsáveis (nomes da aba Equipe separados por vírgula) | E Tipo de resultado (Automático/Mensagens/Compras/Leads/Cliques) | F Dias mínimos de saldo | G Saldo mínimo | H Custo máx. por resultado | I Alerta acima da média (%) | J Saldo atual* | K Gasto médio 7d* | L Dias de saldo restantes (fórmula ARRAYFORMULA em L2, separador `;` por causa do locale pt_BR) | M Gasto hoje* | N Última verificação* | O Situação*. (*preenchido pelo script). F–I vazias usam os padrões da aba Configurações.
- **Equipe**: A Nome | B Papel (Administrador/Líder master/Head/Gestor) | C E-mail | D Contas ("Só as dele" ou "Todas") | E Ativo | F–K caixinhas: Saldo acabando, Conta com problema, Custo acima do normal, Gasto sem resultado, Gasto acima do orçamento, Avisos do sistema | L Código de vínculo* | M Link do Telegram* | N Telegram chat ID* | O Vinculado em*.
- **Configurações**: rótulo na coluna A, valor na B (o script procura pelo texto do rótulo). Horário de alertas 7–23h, intervalo de repetição 6h, dias mínimos 2, custo +40% sobre a média de 7 dias, gasto mínimo R$ 20 para avaliar custo, R$ 30 sem resultado, margem de orçamento 0%, versão da API v23.0, nome do bot do Telegram.
- **Histórico de alertas**: Data e hora | Cliente | Tipo | Detalhe | Enviado para.

## Alertas implementados

1. Saldo acabando: pré-pago lê `funding_source_details.display_string` ("Saldo disponível (R$...)", type 20); com limite de gastos usa spend_cap - amount_spent. Cartão sem limite aparece como "Pagamento recorrente" (pedido do Gustavo).
2. Conta com problema: account_status diferente de 1.
3. Custo acima do normal / do máximo: por campanha, resultado escolhido pelo objetivo. Detalha até 3 criativos (anúncios) que mais puxam o custo, com conjunto e custo dos últimos 7 dias.
4. Gasto sem resultado: campanha gastou o valor configurado no dia sem resultado.
5. Gasto acima do orçamento: gasto de hoje acima do daily_budget da campanha (CBO) ou do conjunto (ABO).
6. Avisos do sistema: token expirado.

Destinatários de cada alerta = responsáveis da conta + quem está com Contas = "Todas", filtrado pelas caixinhas de cada pessoa. Telegram vincula por link `t.me/<bot>?start=<código>`, processado por getUpdates a cada 5 minutos.

## App (pasta `app/`, em construção)

**Gestor Estrategista**: app da Agência Estrategista para a equipe, com agenda de avisos (07h, 12h, 16h) das contas do Meta e do Google Ads. Next.js 16 (App Router, `src/proxy.ts` no lugar de middleware) + Supabase. Decisões do Gustavo e etapas em `app/ROADMAP.md`; configuração em `app/README.md`; protótipo em https://claude.ai/artifact/W1cnoV9VBHqLVhj6Fx3rGu (fonte em HTML único, refazer a partir do app quando mudar).

- Pronto: login com Google (novos ficam "aguardando acesso"; `ADMIN_EMAILS` vira administrador), papéis administrador/head/gestor, pessoas e equipes, distribuição de contas (admin → head → gestor), conexão do Meta só do administrador (`/api/meta/conectar` e `/api/meta/retorno`, token de 60 dias em `meta_conexoes`), importação das contas do Meta, configurações.
- Agenda (etapa 3/4): regras puras em `app/src/lib/regras.ts` (saldo, custo alto + criativos, gasto acima do diário, ruim há 2 semanas), horários em `app/src/lib/tempo.ts` (fuso SP), motor em `app/src/lib/verificacao.ts`. Tabelas `avisos` (um por conta+dia+chave; `visivel_em` = próximo horário; resolvido não volta no dia) e `inscricoes` (admin/head escolhem contas). `/api/verificar` é chamado de hora em hora pelo pg_cron do Supabase (`app/supabase/agendador.sql`) com `CRON_SECRET`; o botão "Verificar agora" mostra na hora (`horarioAtual`). Só Meta por enquanto; Google Ads e notificação no celular vêm depois.
- Segurança: o navegador não lê o banco. Todo acesso é pelo servidor com `service_role`, conferindo `src/lib/permissoes.ts`. Tabelas com RLS ligado e sem políticas. Ao criar tabela nova, siga o mesmo padrão (migração em `app/supabase/migrations/`).
- Cuidado com o cache de requisição do Next: duas leituras GET iguais na mesma renderização devolvem a mesma resposta. Depois de gravar, use o retorno da gravação (`.select()`), não uma leitura nova.
- Regras de saldo/status portadas em `app/src/lib/saldo.ts`: se mudar `lerSaldo_`/`valorDoTexto_` no `.gs`, mude lá também.
- Identidade visual (cores, fontes, logos) em `app/public/marca/`.
- Verificações: `cd app && npm test && npm run typecheck && npm run build`.

## Testes

`node tests/rota.js`, `tests/criativos.js`, `tests/orc.js`, `tests/run.js`: simulam a planilha e a API com dados falsos (sem rede). Rode todos antes de entregar uma versão nova e confira `node --check` no código.

## Pendências e ideias

- Contas da Lovini (1422830469231196 e 180387504) deram erro #200 de permissão: precisa autorizar a BM da Lovini ao gerar o token ou adicionar o app na BM.
- Bsy Oficial: conta de anúncio não encontrada, linha sem ID.
- Ideias combinadas para depois: resumo diário para Head/Líder master; WhatsApp (Z-API ou API oficial); token de usuário do sistema que não expira; passar o sistema para outros gestores; app em `app/` (Next.js + Supabase, ver ROADMAP).

## Ao mudar colunas

Inserir coluna na planilha muda os índices: atualize `COL`/`EQ` no código e avise o Gustavo para colar o código novo logo, senão a próxima verificação automática escreve nas colunas erradas.
