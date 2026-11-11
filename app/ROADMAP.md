# Roteiro do app

Público: só a equipe do Gustavo (um time, sem cobrança, sem várias empresas).

| Etapa | O que entra | Substitui na planilha |
|---|---|---|
| 1. Login com Facebook ✅ | Entrar com o Facebook, token de 60 dias guardado no servidor, lista de contas com situação e saldo | Menu "Salvar token do Meta" |
| 2. Clientes e equipe | Tabelas `clientes`, `equipe`, `configuracoes` no Supabase; telas de cadastro; importar contas do Meta; migrar os dados atuais da planilha | Abas Clientes, Equipe e Configurações |
| 3. Verificação de hora em hora | Portar `verificarConta_`, orçamentos e criativos para TypeScript (com os testes de `../tests`); rodar por Supabase Cron + Edge Function ou Vercel Cron; gravar `historico_alertas` | Gatilho do Apps Script e aba Histórico |
| 4. Envio | E-mail (Resend ou similar) e Telegram com vínculo por `t.me/<bot>?start=<código>` via webhook (no lugar do getUpdates de 5 em 5 min) | `enviarPara_`, `processarVinculos_` |
| 5. Painel | Saldo, gasto médio 7d, dias restantes, gasto de hoje e situação por conta; histórico filtrável | Colunas J–O de Clientes |
| 6. Desligar a planilha | Rodar os dois em paralelo alguns dias, comparar alertas, desativar o gatilho do Apps Script | — |

## Decisões em aberto
- **Qual token a verificação automática usa?** Opção simples: o token da "conta mãe" (o Facebook do Gustavo) salvo no login, que vence em 60 dias e avisa antes. Opção definitiva: token de usuário do sistema da BM, que não expira.
- **Quem pode entrar:** hoje, quem é Testador no app do Meta. Na etapa 2, ligar o login à aba Equipe (só entra quem está cadastrado e ativo; papel define o que vê).
- **Lovini:** as contas 1422830469231196 e 180387504 continuam com erro #200 até a BM da Lovini autorizar o app.
