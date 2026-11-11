# Roteiro do Gestor Estrategista

Público: só a equipe da agência (sem cobrança, sem várias empresas).

Protótipo clicável (dados de exemplo): https://claude.ai/artifact/W1cnoV9VBHqLVhj6Fx3rGu

## Como o app funciona (decidido com o Gustavo em 11/11/2026)

- **Agenda:** cada gestor vê os avisos do dia em três horários, **07:00, 12:00 e 16:00**, com navegação pela semana.
- **Verificação:** o sistema consulta o Meta **de hora em hora**, mas só dispara os avisos nos três horários (junta o que achou desde o horário anterior).
- **Alertas:** saldo acabando, custo por resultado alto (venda, mensagem, lead) e gasto do dia acima do orçamento diário.
- **Ruim há 2 semanas:** analisa campanhas, conjuntos e anúncios. Avisa quando o custo por resultado ficou acima da média da conta (padrão +40%) **nas duas últimas semanas**, contando só o que gastou o mínimo no período (padrão R$ 150). Aparece uma vez por dia, no horário das 07:00, com o custo de cada semana. Critério a confirmar com o Gustavo. "Conta com problema" e "gasto sem resultado": decidir depois.
- **Resolvido:** o gestor marca cada aviso como resolvido. Se resolveu, aquela conta não recebe o mesmo tipo de aviso de novo nos horários seguintes do mesmo dia.
- **Notificação no celular:** o gestor vê os avisos no app e recebe notificação no celular nos horários (push do app instalado na tela inicial; Telegram como alternativa).
- **Contas de anúncio:** só o **administrador** conecta a conta que enxerga todas as contas de anúncio (conta mãe). Ele passa cada conta para um **head**; o head escolhe o **gestor** da equipe dele (o administrador também pode escolher). Se o gestor muda de equipe, as contas dele vão junto. Os demais só entram no app, sem conectar nada.
- **Google Ads:** além do Meta. O administrador conecta a **conta de administrador (MCC)** do Google Ads, que enxerga todas as contas. Os mesmos avisos valem para as duas plataformas, e cada aviso mostra de qual plataforma é (no Google: campanha, grupo de anúncios e anúncio). Saldo no Google: contas com pagamento manual (pré-pago) ou orçamento da conta. Gasto acima do diário no Google tem tolerância própria (padrão 100%), porque o Google pode gastar até 2x o diário num dia e compensa no mês.
- **Login e conexões (decidido em 11/11/2026):** todos entram com **Google** (administrador e heads no Google Workspace da agência, gestores com Gmail comum). O **Meta** é conectado só pelo administrador (Facebook da conta mãe). O **Google Ads** vem do **login de cada pessoa** (administrador, head ou gestor): ao entrar, a pessoa autoriza o app a ler o Google Ads e todas as contas que o e-mail acessa aparecem em Contas, com a indicação de quem tem acesso. Se várias pessoas acessam a mesma conta, qualquer conexão serve. Como há Gmail comum, o app precisa da análise do Google para a permissão do Google Ads; até sair, funciona com o aviso "app não verificado" (limite de 100 pessoas).
- **Acesso e papéis:** quem entra pela primeira vez fica **aguardando acesso**. O **administrador** define quem é head, quem é gestor (e em qual equipe) ou tira o acesso. O **head** coloca pessoas aguardando como **gestores da equipe dele** e pode tirá-las da equipe; não cria heads. Se um head deixa de ser head, a equipe e as contas dele ficam sem head.
- **Papéis:**
  - **Administrador:** controle total (pessoas, papéis, equipes, contas, configurações).
  - **Head:** manda na equipe dele (cada gestor pertence a um único head), distribui as contas entre os gestores, vê as pendências da equipe por cima e o detalhe ao clicar no gestor. Não recebe avisos.
  - **Gestor:** recebe e resolve os avisos das contas pelas quais é responsável.
- **Tema:** claro, escuro ou automático (segue o aparelho), escolhido por cada pessoa.
- **Visual:** identidade da Agência Estrategista (Canva), aplicada no protótipo. Cores, fontes e logos em `public/marca/`.

## Etapas

| Etapa | O que entra |
|---|---|
| 1. Login com Facebook ✅ | Entrar com o Facebook, token de 60 dias guardado no servidor, lista de contas |
| 1b. Login com Google ✅ | Login com Google; conexão do Meta é botão só do administrador (token de 60 dias) |
| 2. Pessoas, equipes e contas ✅ | Tabelas de pessoas (papel, head), contas (gestor responsável) e configurações; telas de Pessoas, Distribuir contas e Configurações; RLS por papel |
| 3. Verificação e avisos ✅ | Checagem de hora em hora (Supabase Cron), regras portadas do `.gs` com testes, tabela de avisos com horário e status (pendente/resolvido) |
| 4. Agenda e visão do head ✅ | Agenda do gestor (semana + 07/12/16h), cartões por gestor para o head, visão geral do administrador |
| 4b. Google Ads | Conexão com a conta de administrador (MCC), importação das contas e os mesmos avisos usando a API do Google Ads |
| 5. Notificação no celular | App instalável (PWA) com push nos três horários |
| 6. Desligar a planilha | Rodar em paralelo, comparar e desativar o gatilho do Apps Script |

## O que o Google Ads exige (fazer antes da etapa 4b)
- **Token de desenvolvedor:** na conta de administrador (MCC) do Google Ads, em Administrador > Central de API. O Google analisa o pedido e pode levar alguns dias.
- **Projeto no Google Cloud** com a Google Ads API ativada e um cliente OAuth (ID e chave secreta) para o administrador conectar a conta.

## Situação atual: versão de apresentação
O Gustavo está montando o app nas contas pessoais dele (Gmail, Supabase, Vercel, Google Cloud, app do Meta) para apresentar à agência. Se aprovado, passa tudo para o administrador da agência:
- **Google Cloud:** adicionar o administrador como Proprietário do projeto (IAM) ou ele cria um cliente OAuth próprio e troca ID e chave secreta no Supabase.
- **Supabase e Vercel:** convidar o administrador e transferir a propriedade.
- **Meta:** administrador do app "Alertas de Tráfego" ou reconectar o Meta pelo botão do app com o Facebook dele.
- **`ADMIN_EMAILS`:** trocar para o e-mail dele.

## Decisões em aberto
- "Conta com problema" e "gasto sem resultado" entram ou não.
- Token da verificação automática: o do login (vence em 60 dias) ou token de usuário do sistema da BM (não expira).
- Contas da Lovini continuam com erro #200 até a BM autorizar o app.
