# Roteiro do app

Público: só a equipe da agência (sem cobrança, sem várias empresas).

Protótipo clicável (dados de exemplo): https://claude.ai/artifact/W1cnoV9VBHqLVhj6Fx3rGu

## Como o app funciona (decidido com o Gustavo em 11/11/2026)

- **Agenda:** cada gestor vê os avisos do dia em três horários, **07:00, 12:00 e 16:00**, com navegação pela semana.
- **Verificação:** o sistema consulta o Meta **de hora em hora**, mas só dispara os avisos nos três horários (junta o que achou desde o horário anterior).
- **Alertas:** saldo acabando, custo por resultado alto (venda, mensagem, lead) e gasto do dia acima do orçamento diário. "Conta com problema" e "gasto sem resultado": decidir depois.
- **Resolvido:** o gestor marca cada aviso como resolvido. Se resolveu, aquela conta não recebe o mesmo tipo de aviso de novo nos horários seguintes do mesmo dia.
- **Notificação no celular:** o gestor vê os avisos no app e recebe notificação no celular nos horários (push do app instalado na tela inicial; Telegram como alternativa).
- **Papéis:**
  - **Administrador:** controle total (pessoas, papéis, equipes, contas, configurações).
  - **Head:** manda na equipe dele (cada gestor pertence a um único head), distribui as contas entre os gestores, vê as pendências da equipe por cima e o detalhe ao clicar no gestor. Não recebe avisos.
  - **Gestor:** recebe e resolve os avisos das contas pelas quais é responsável.
- **Visual:** seguir a identidade visual da agência (Canva).

## Etapas

| Etapa | O que entra |
|---|---|
| 1. Login com Facebook ✅ | Entrar com o Facebook, token de 60 dias guardado no servidor, lista de contas |
| 2. Pessoas, equipes e contas | Tabelas de pessoas (papel, head), contas (gestor responsável) e configurações; telas de Pessoas, Distribuir contas e Configurações; RLS por papel |
| 3. Verificação e avisos | Checagem de hora em hora (Supabase Cron), regras portadas do `.gs` com testes, tabela de avisos com horário e status (pendente/resolvido) |
| 4. Agenda e visão do head | Agenda do gestor (semana + 07/12/16h), cartões por gestor para o head, visão geral do administrador |
| 5. Notificação no celular | App instalável (PWA) com push nos três horários |
| 6. Desligar a planilha | Rodar em paralelo, comparar e desativar o gatilho do Apps Script |

## Decisões em aberto
- "Conta com problema" e "gasto sem resultado" entram ou não.
- Token da verificação automática: o do login (vence em 60 dias) ou token de usuário do sistema da BM (não expira).
- Contas da Lovini continuam com erro #200 até a BM autorizar o app.
