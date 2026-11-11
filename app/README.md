# App Alertas de Tráfego (Next.js + Supabase)

Versão em aplicativo do sistema da planilha, para uso da equipe. A planilha (`../src/AlertasTrafego.gs`) continua funcionando enquanto o app é construído.

**Etapa 1 (esta):** entrar com o Facebook, guardar o acesso ao Meta com segurança e listar as contas de anúncio com situação e saldo (mesma regra da planilha: pré-pago, limite de gastos ou "Pagamento recorrente").

## Como funciona o login

1. A pessoa clica em **Entrar com o Facebook** e aceita a permissão `ads_read`.
2. O Supabase cria a sessão; na volta (`/auth/callback`) o servidor troca o token curto do Facebook por um de ~60 dias e grava na tabela `meta_conexoes`.
3. Essa tabela tem RLS ligado e nenhuma política: só o servidor (chave `service_role`) lê o token. Nada vai para o navegador.
4. Quando o token vencer, a tela de contas pede para sair e entrar de novo.

## Configuração (uma vez)

### 1. Supabase
1. Crie um projeto em supabase.com.
2. **SQL Editor**: rode `supabase/migrations/0001_meta_conexoes.sql`.
3. **Authentication > Sign In / Providers > Facebook**: ative e cole o App ID e a Chave secreta do app do Meta. Copie a *Callback URL* (`https://SEU-PROJETO.supabase.co/auth/v1/callback`).
4. **Authentication > URL Configuration**: Site URL = endereço do app; em Redirect URLs adicione `http://localhost:3000/auth/callback` e `https://SEU-APP.vercel.app/auth/callback`.

### 2. App do Meta "Alertas de Tráfego" (o mesmo do token da planilha)
1. developers.facebook.com > seu app > **Adicionar produto > Login do Facebook**.
2. Em **URIs de redirecionamento do OAuth válidos**, cole a Callback URL do Supabase.
3. Se o app for do tipo Empresa e só oferecer **Login do Facebook para Empresas**: crie uma configuração com *Token de acesso do usuário* e a permissão `ads_read`, e coloque o ID dela em `NEXT_PUBLIC_META_CONFIG_ID`.
4. Uso só da equipe: deixe o app em **modo de desenvolvimento** e adicione cada pessoa em **Funções do app > Testadores** (ela precisa aceitar o convite). Assim não precisa de Análise do App da Meta. Quem não tem função no app não consegue entrar.

### 3. Rodar no computador
```bash
cd app
cp .env.example .env.local   # preencha os valores
npm install
npm run dev                  # http://localhost:3000
```

### 4. Publicar (Vercel)
Importe o repositório na Vercel com **Root Directory = `app`** e cadastre as mesmas variáveis do `.env.local`.

## Verificações
```bash
npm test           # regras de saldo/status portadas da planilha
npm run typecheck
npm run build
```

## Próximas etapas
Veja `ROADMAP.md`.
