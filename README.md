# Alertas de Tráfego - Meta Ads

Planilha Google + Apps Script que verifica as contas de anúncio do Meta de hora em hora e avisa a equipe por e-mail e Telegram quando:

- o saldo está acabando;
- a conta sai do status Ativa;
- o custo por resultado sobe acima do normal (com os criativos responsáveis);
- uma campanha gasta sem resultado;
- o gasto do dia passa do orçamento diário da campanha ou do conjunto.

Cada pessoa recebe só os alertas das contas em que é responsável e só os tipos que marcou na aba Equipe.

## Instalação

1. Na planilha, Extensões > Apps Script: cole `src/AlertasTrafego.gs` e salve.
2. Recarregue a planilha e use o menu **Alertas de Tráfego**: salvar token do Meta, (opcional) token do bot do Telegram, testar e ativar a verificação automática.

Detalhes do projeto e decisões tomadas: veja `CLAUDE.md`.

## Testes

```
node tests/rota.js
node tests/criativos.js
node tests/orc.js
node tests/run.js
```
