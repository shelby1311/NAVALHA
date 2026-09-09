# Navalha.app — Guia de Desenvolvimento para Sócios

Este documento orienta como trabalhar no projeto **Navalha** (marketplace de agendamento para barbearias), incluindo como rodar localmente, como funciona o deploy automático e boas práticas de segurança.

---

## 1. Visão geral do projeto

| Item | Valor |
|------|-------|
| **Stack** | Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript |
| **Banco de dados** | PostgreSQL (Supabase) via Drizzle ORM |
| **Autenticação** | better-auth (e-mail/senha) |
| **Gerenciador de pacotes** | pnpm |
| **Hospedagem / Deploy** | Vercel (produção) |
| **Repositório** | GitHub `shelby1311/NAVALHA` (branch `main`) |
| **URL de produção** | https://navalha-flax.vercel.app |

---

## 2. Pré-requisitos

- **Node.js** (versão compatível com Next.js 16)
- **pnpm** — se não estiver no PATH do Windows, use `corepack pnpm`
- Acesso ao repositório GitHub (como colaborador)
- Acesso aos projetos **Supabase** e **Vercel** (para configurar variáveis de ambiente)

---

## 3. Configurando o ambiente local

### 3.1 Clonar o repositório

```bash
git clone https://github.com/shelby1311/NAVALHA.git
cd NAVALHA
```

### 3.2 Instalar dependências

```bash
pnpm install
```

> **Windows sem pnpm no PATH:** use `corepack pnpm install`.

### 3.3 Configurar as variáveis de ambiente

1. O arquivo `.env.local` **não é commitado** (contém credenciais de produção).
2. O sócio recebe o arquivo `.env.shared.local` por **canal privado** (WhatsApp/e-mail/gerenciador de senhas).
3. Renomeie para `.env.local` na raiz do projeto:

   - **Windows (cmd):** `ren .env.shared.local .env.local`
   - **PowerShell:** `Rename-Item .env.shared.local .env.local`
   - **macOS/Linux:** `mv .env.shared.local .env.local`

4. O arquivo deve conter:

```env
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"
```

### 3.4 Rodar o servidor de desenvolvimento

```bash
pnpm dev
```

Acesse **http://localhost:3000**.

---

## 4. Como funciona o deploy automático (IMPORTANTE)

A Vercel está conectada ao repositório GitHub com a **Production Branch = `main`**.

### Regra de ouro

> **O deploy só acontece quando você faz `push` para a branch `main` no GitHub.**

- **`git commit`** → salva localmente. **NÃO** dispara deploy.
- **`git push origin main`** → envia ao GitHub. **DISPARA** o deploy automático de produção.

### Fluxo de trabalho diário

```bash
# 1. Ver o que mudou
git status

# 2. Preparar as mudanças
git add .

# 3. Criar o commit (salva localmente — sem deploy ainda)
git commit -m "descrição da mudança"

# 4. Enviar para o GitHub (dispara o deploy automático na Vercel)
git push origin main
```

### Sobre branches

- **Branch `main`** → deploy de **produção** (site oficial).
- **Outras branches** (ex.: `feature-x`) → deploy de **Preview** (URL temporária, não afeta produção).

### Acompanhar o deploy

Após o push, o deploy leva **1–3 minutos**. Acompanhe o status em:

- **Vercel** → projeto NAVALHA → aba **Deployments**.

---

## 5. Migrações de banco de dados

Quando houver mudança no schema (`lib/schema.ts`), gere e aplique a migração:

```bash
# Gerar a migração
pnpm db:generate

# Aplicar no banco (local)
pnpm db:migrate
```

> ⚠️ Em produção, as migrações precisam ser aplicadas no banco do Supabase. Combine com o time antes de alterar o schema.

---

## 6. Segurança (LEIA COM ATENÇÃO)

### Nunca commitar segredos

Os arquivos abaixo contêm credenciais de produção e **NÃO devem ser commitados**:

- `.env.local`
- `.env.shared.local`

Eles já estão no `.gitignore` (regra `.env*.local`). **Não force** o commit deles com `git add -f`.

### Compartilhar credenciais

- Envie `.env.shared.local` **apenas por canal privado**.
- **Nunca** cole credenciais em issues, PRs, chats públicos ou no README.

### Se uma credencial vazar

1. Gere um novo `BETTER_AUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
2. Troque a senha do banco no painel do Supabase.
3. Atualize as variáveis na **Vercel** (Settings → Environment Variables).
4. Atualize o `.env.local` de todos os desenvolvedores.

---

## 7. Variáveis de ambiente (referência)

| Variável | Descrição | Local | Produção |
|----------|-----------|-------|----------|
| `DATABASE_URL` | Connection string do PostgreSQL | Supabase | Supabase |
| `BETTER_AUTH_SECRET` | Segredo que assina sessões | valor local | valor de produção |
| `BETTER_AUTH_URL` | URL base da aplicação | `http://localhost:3000` | `https://navalha-flax.vercel.app` |

> As variáveis de **produção** são configuradas na Vercel (Settings → Environment Variables), não no `.env.local`.

---

## 8. Comandos úteis

```bash
pnpm dev          # servidor de desenvolvimento
pnpm build        # build de produção (testa antes do deploy)
pnpm start        # roda o build localmente
pnpm db:generate  # gera migração do schema
pnpm db:migrate   # aplica migração no banco
```

---

## 9. Dúvidas frequentes

**"Fiz commit mas o site não mudou."**
Você fez apenas `git commit` (local). Faça `git push origin main` para disparar o deploy.

**"O deploy falhou na Vercel."**
Veja o log em Deployments → clique no deployment com erro. Os erros mais comuns são de variáveis de ambiente ou de migração de banco.

**"Posso commitar o `.env.local`?"**
**Não.** Ele contém credenciais de produção e está no `.gitignore`.
