# Gestor Estrategista (Next.js + Supabase)

App da Agência Estrategista para a equipe de tráfego, chamado **Gestor Estrategista**: agenda de avisos das contas do Meta e do Google Ads. A planilha (`../src/AlertasTrafego.gs`) continua funcionando enquanto o app é construído. O que já está pronto e o que vem depois: `ROADMAP.md`. Protótipo clicável: https://claude.ai/artifact/W1cnoV9VBHqLVhj6Fx3rGu

## O que já funciona

- **Login com Google** para todos. Quem entra pela primeira vez fica **aguardando acesso**. Os e-mails em `ADMIN_EMAILS` entram como administrador.
- **Pessoas:** o administrador define quem é head e quem é gestor (e de qual equipe). O head coloca quem está aguardando como gestor da equipe dele e pode tirar gestores da equipe.
- **Contas:** o administrador conecta o Meta (Facebook da conta mãe), importa as contas e passa cada uma para um head. O head escolhe o gestor.
- **Agenda de avisos:** semana + os três horários (07h, 12h, 16h). Avisos do Meta: saldo acabando, custo alto (com os criativos que puxam o custo), gasto acima do diário e ruim há 2 semanas (campanha, conjunto ou anúncio). Botão "Marcar como resolvido": resolvido não volta no mesmo dia.
- **Quem recebe:** o gestor recebe os avisos das contas dele. Administrador e head escolhem em **Contas > Receber avisos** quais contas acompanhar (o head, só as da equipe).
- **Verificação:** de hora em hora (agendador do Supabase chamando `/api/verificar`). O que é achado entre os horários aparece no próximo horário. O administrador tem o botão **Verificar agora** em Contas, que mostra os avisos na hora.
- **Visão geral** (administrador) e **Minha equipe** (head) com as pendências de cada gestor por tipo; clicando no gestor, a agenda dele. **Configurações** com horários e limites.
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
Gratuito: não precisa ativar faturamento nem a avaliação gratuita (se aparecer o convite, feche).

**2.1. Projeto**
1. console.cloud.google.com > seletor de projeto (no alto) > **Novo projeto**.
2. Nome: `Gestor Estrategista` (ID `gestor-estrategista`). Se aparecer uma organização, pode deixar a que vier. **Criar** e selecione o projeto.

**2.2. Tela de permissão** (o que a pessoa vê ao clicar em "Entrar com o Google")
1. Menu ☰ > **APIs e serviços > Tela de permissão OAuth** (ou **Google Auth Platform**) > **Primeiros passos**.
2. Nome do app: `Gestor Estrategista`. E-mail de suporte e de contato: o seu. **Público-alvo: Externo** (os gestores usam Gmail comum; "Interno" deixaria entrar só e-mails da organização). Aceite os termos > **Criar**.
3. Não envie logo por enquanto (logo exige verificação da marca).
4. **Versão de apresentação:** deixe o status em **Testando**. Em **Público-alvo > Usuários de teste > Adicionar usuários**, coloque o seu Gmail e o de quem vai testar (até 100). Só esses e-mails conseguem entrar; na entrada aparece um aviso de app em teste, é só clicar em **Continuar**.
5. **Para liberar para toda a equipe (depois):** com o app publicado na Vercel, preencha na página de **Branding** o endereço do app, a política de privacidade (página do app) e o domínio autorizado, e clique em **Publicar app**. Como o app só pede nome e e-mail, o Google não exige análise.

**2.3. Credenciais**
1. **Clientes > Criar cliente** (ou **Credenciais > Criar credenciais > ID do cliente OAuth**).
2. Tipo: **Aplicativo da Web**. Nome: `Gestor Estrategista Web`.
3. **URIs de redirecionamento autorizados > Adicionar URI**: cole a Callback URL do Supabase (Authentication > Sign In / Providers > Google), no formato `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
4. **Criar**. Copie e guarde o **ID do cliente** e a **Chave secreta do cliente** (a chave pode aparecer só uma vez). Eles vão no Supabase (passo 1.2).

### 3. App do Meta "Alertas de Tráfego"
1. **Login do Facebook (para Empresas) > Configurações > URIs de redirecionamento do OAuth válidos:** adicione `https://SEU-APP.vercel.app/api/meta/retorno`. A Callback URL antiga do Supabase pode ficar ou sair.
2. O app pode continuar em modo de desenvolvimento: só o administrador conecta o Facebook, e ele já tem função no app.

### 4. Variáveis (Vercel ou `.env.local`)
Veja `.env.example`. Além das do Supabase e do Meta, preencha `ADMIN_EMAILS` com o seu e-mail do Google e `META_CONFIG_ID` com o ID da configuração do Login do Facebook para Empresas (`1140099635553058`).

### 4b. Banco da agenda e agendador
1. **Supabase > SQL Editor:** rode `supabase/migrations/0003_agenda.sql`.
2. **Vercel > Settings > Environment Variables:** crie `CRON_SECRET` (tipo Secret) com uma senha longa e aleatória (por exemplo, gere em um gerador de senhas, 32+ caracteres, só letras e números). Faça **Redeploy**.
3. **Supabase > SQL Editor:** abra `supabase/agendador.sql`, troque o endereço do app e `COLE_AQUI_O_CRON_SECRET` pelo mesmo valor da Vercel, e rode. Ele liga as extensões `pg_cron` e `pg_net` e agenda a verificação para todo começo de hora.
4. Para conferir: `select status_code, content, created from net._http_response order by created desc limit 5;` deve mostrar `200` e um resumo como `{"contas":3,"novos":2,"erros":[]}`.

### 5. Primeiro uso
1. Entre com o Google usando o e-mail de `ADMIN_EMAILS`: você cai na Visão geral como administrador.
2. **Contas > Conectar Meta**, depois **Importar contas do Meta**.
3. Peça para os heads e gestores entrarem com o Google. Eles aparecem em **Pessoas** como "aguardando acesso". Defina os heads; depois os heads colocam os gestores na equipe (ou você mesmo faz).
4. Em **Contas**, passe cada conta para um head; o head escolhe o gestor. Marque **Receber avisos** nas contas que você quer acompanhar.
5. Clique em **Verificar agora** para ver os primeiros avisos na agenda.

## Rodar e verificar
```bash
npm install
npm run dev          # http://localhost:3000
npm test             # regras de permissão e de saldo
npm run typecheck
npm run build
```
