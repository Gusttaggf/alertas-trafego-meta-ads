# App Alertas de Tráfego (Next.js + Supabase)

App da Agência Estrategista para a equipe de tráfego: agenda de avisos das contas do Meta e do Google Ads. A planilha (`../src/AlertasTrafego.gs`) continua funcionando enquanto o app é construído. O que já está pronto e o que vem depois: `ROADMAP.md`. Protótipo clicável: https://claude.ai/artifact/W1cnoV9VBHqLVhj6Fx3rGu

## O que já funciona

- **Login com Google** para todos. Quem entra pela primeira vez fica **aguardando acesso**. Os e-mails em `ADMIN_EMAILS` entram como administrador.
- **Pessoas:** o administrador define quem é head e quem é gestor (e de qual equipe). O head coloca quem está aguardando como gestor da equipe dele e pode tirar gestores da equipe.
- **Contas:** o administrador conecta o Meta (Facebook da conta mãe), importa as contas e passa cada uma para um head. O head escolhe o gestor.
- **Visão geral** (administrador), **Minha equipe** (head), **Minhas contas** (gestor), **Configurações** (horários e limites dos avisos).
- Tema claro, escuro ou automático, com a identidade visual da agência.

## Segurança

O navegador nunca lê o banco direto. Todo acesso passa pelo servidor (chave `service_role`), que confere as permissões em `src/lib/permissoes.ts` (testado em `tests/permissoes.test.ts`). As tabelas têm RLS ligado e nenhuma política para `anon`/`authenticated`.

## Configuração (uma vez)

### 1. Supabase
1. **SQL Editor:** rode, nesta ordem, `supabase/migrations/0001_meta_conexoes.sql` e `supabase/migrations/0002_pessoas_contas.sql`.
2. **Authentication > Sign In / Providers > Google:** ative e cole o *Client ID* e o *Client Secret* do passo 2. Copie a *Callback URL* (`https://SEU-PROJETO.supabase.co/auth/v1/callback`). Salve.
3. **Authentication > Sign In / Providers > Facebook:** pode desativar. O Facebook agora é conectado só pelo administrador, por dentro do app.
4. **Authentication > Configuração de URL:** *Site URL* = endereço do app. Em *Redirect URLs*, adicione `https://SEU-APP.vercel.app/auth/callback` (e `http://localhost:3000/auth/callback` para testes no computador).

### 2. Google Cloud (login com Google)
1. console.cloud.google.com, com o e-mail do Workspace da agência: crie um projeto (por exemplo, "Alertas de Tráfego").
2. **APIs e serviços > Tela de consentimento OAuth** (ou "Google Auth Platform"): tipo **Externo** (os gestores usam Gmail comum). Nome do app, e-mail de suporte e logo da agência. Escopos: só `email`, `profile` e `openid`, que não precisam de análise do Google. Publique o app (status "Em produção").
3. **Credenciais > Criar credenciais > ID do cliente OAuth > Aplicativo da Web.** Em *URIs de redirecionamento autorizados*, cole a Callback URL do Supabase. Copie o ID e a chave secreta para o Supabase (passo 1.2).

### 3. App do Meta "Alertas de Tráfego"
1. **Login do Facebook (para Empresas) > Configurações > URIs de redirecionamento do OAuth válidos:** adicione `https://SEU-APP.vercel.app/api/meta/retorno`. A Callback URL antiga do Supabase pode ficar ou sair.
2. O app pode continuar em modo de desenvolvimento: só o administrador conecta o Facebook, e ele já tem função no app.

### 4. Variáveis (Vercel ou `.env.local`)
Veja `.env.example`. Além das do Supabase e do Meta, preencha `ADMIN_EMAILS` com o seu e-mail do Google e `META_CONFIG_ID` com o ID da configuração do Login do Facebook para Empresas (`1140099635553058`).

### 5. Primeiro uso
1. Entre com o Google usando o e-mail de `ADMIN_EMAILS`: você cai na Visão geral como administrador.
2. **Contas > Conectar Meta**, depois **Importar contas do Meta**.
3. Peça para os heads e gestores entrarem com o Google. Eles aparecem em **Pessoas** como "aguardando acesso". Defina os heads; depois os heads colocam os gestores na equipe (ou você mesmo faz).
4. Em **Contas**, passe cada conta para um head; o head escolhe o gestor.

## Rodar e verificar
```bash
npm install
npm run dev          # http://localhost:3000
npm test             # regras de permissão e de saldo
npm run typecheck
npm run build
```
