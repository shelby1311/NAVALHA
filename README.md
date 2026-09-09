# Navalha

Marketplace de agendamento entre **clientes** e **barbeiros**: o cliente encontra barbearias online perto dele e agenda um horário gratuitamente; o barbeiro administra fila, serviços/preços e financeiro em um painel próprio.

Este README serve dois propósitos:
1. Documentar o projeto (stack, arquitetura, modelo de dados, regras de negócio, rotas de API) para qualquer pessoa (ou IA) que abrir o repositório do zero.
2. Registrar **o que já foi corrigido** e **o que ainda falta** (seção [Pendências](#pendências--o-que-falta)), para retomar o trabalho numa próxima sessão sem perder contexto.

> ⚠️ **Leia isto antes de mexer no código:** este projeto usa uma versão do Next.js com breaking changes relevantes em relação ao que qualquer IA/desenvolvedor "sabe de cor" (treino). Antes de codificar, leia o guia relevante em `node_modules/next/dist/docs/` (rode `pnpm install` primeiro se a pasta não existir). Isso está documentado em `AGENTS.md`/`CLAUDE.md` na raiz do repo — **siga essas instruções sempre**.

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js **16.3.3** (App Router, Route Handlers) — versão customizada, ver aviso acima |
| UI | React 19, Tailwind CSS 4, `lucide-react`, `class-variance-authority`, `@base-ui/react` |
| Banco de dados | PostgreSQL (qualquer provedor: Neon, Supabase, Vercel Postgres) |
| ORM | Drizzle ORM (`drizzle-orm` + `drizzle-kit`) |
| Autenticação | `better-auth` (email/senha) com adapter Drizzle |
| Gerenciador de pacotes | `pnpm` (workspace único) |
| Deploy alvo | Vercel (ver `VERCEL_URL`/`V0_RUNTIME_URL` em `lib/auth.ts`) |

---

## Estrutura de pastas

```
app/
  page.tsx                     # página única (SPA-like): alterna client/barbeiro no client-side
  cadastro/page.tsx            # criação de conta (escolhe papel client/barbeiro)
  entrar/page.tsx              # login
  api/
    auth/[...all]/route.ts     # catch-all do better-auth (sign-up, sign-in, sessão...)
    bookings/route.ts          # POST — cliente cria um agendamento
    barber/bookings/route.ts        # GET  — barbeiro lista os próprios agendamentos
    barber/bookings/[id]/route.ts   # PATCH — barbeiro muda o status de um agendamento
    barber/services/route.ts        # GET/POST — barbeiro lista/cria serviços
    barber/services/[id]/route.ts   # PATCH — barbeiro edita um serviço
    barbers/search/route.ts         # GET — busca pública de barbeiros (cliente)
    barbers/[id]/services/route.ts  # GET — serviços ativos de um barbeiro (público)
    finance/entries/route.ts        # GET/POST — lançamentos financeiros do barbeiro
    profile/route.ts                # GET/PATCH — perfil do usuário autenticado
    profile/preferences/route.ts    # PATCH — tema/notificações/status online

components/
  navalha/booking-modal.tsx    # modal de agendamento (cliente escolhe serviço + horário)
  navalha/settings-panel.tsx   # painel de configurações do perfil (usado por client e barbeiro)
  ui/button.tsx                # componente shadcn

lib/
  schema.ts                    # schema Drizzle (única fonte de verdade do banco)
  db.ts                        # pool de conexão Postgres + instância Drizzle
  auth.ts                      # configuração do better-auth (campos extras de usuário, etc.)
  auth-api.ts                  # client-side: chama os endpoints REST do better-auth
  authz.ts                     # requireUser / requireRole — autenticação separada de autorização
  business-hours.ts            # valida um horário contra o expediente do barbeiro
  contracts.ts                 # tipos compartilhados front/back + helpers (ex.: centsToMoney)
  api-client.ts                # client-side: wrapper de fetch para as rotas /api/*
  profile.ts                   # toProfile() — normaliza a linha do banco para UserProfile
  domain/
    agendamento.ts              # classe Agendamento — máquina de estados do booking

drizzle/
  0000_*.sql, 0001_*.sql, 0002_*.sql   # migrações, nessa ordem
  meta/                                 # snapshots internos do drizzle-kit (não editar à mão)

drizzle.config.ts              # aponta lib/schema.ts -> drizzle/, lê DATABASE_URL

pnpm-workspace.yaml            # allowBuilds (esbuild habilitado) + minimumReleaseAgeExclude (@next/*, next)
```

---

## Modelo de dados (`lib/schema.ts`)

### Tabelas do better-auth (não renomear colunas sem revalidar)
- **`user`** — também guarda o perfil de domínio da Navalha:
  - `role` (`'client' | 'barber'`), `phone`, `avatarUrl`, `businessName`, `city`, `neighborhood`
  - `theme`, `notifications`, `isOnline`
  - `openingHours` (`json`, nullable) — horário de funcionamento por dia da semana: `{ mon: { open: "09:00", close: "19:00", active: true }, ... }`. **Ainda sem UI para o barbeiro preencher isso** (ver [Pendências](#pendências--o-que-falta)).
- **`session`**, **`account`**, **`verification`** — geridas pelo better-auth, não mexer manualmente.

### Tabelas de domínio
- **`barberService`** — serviços do barbeiro (`name`, `priceCents`, `durationMinutes`, `active`).
- **`booking`** — agendamento (`clientId`, `barberId`, `serviceId`, `scheduledAt`, `status`).
  - Índice único parcial `booking_barber_slot_unique` em `(barberId, scheduledAt) WHERE status <> 'cancelled'` — impede, **no nível do banco**, dois agendamentos ativos do mesmo barbeiro no mesmo horário exato (à prova de corrida entre requisições simultâneas).
- **`financialEntry`** — lançamento financeiro (`type: income|expense`, `category`, `description`, `amountCents`, `entryDate`, `isRecurring`).
  - `bookingId` (nullable, FK para `booking`, `onDelete: set null`) — vincula uma receita automática ao agendamento que a gerou.
  - Índice único parcial em `bookingId` (quando não nulo) — **um agendamento nunca gera mais de uma receita**.
  - `CHECK (amount_cents > 0)` — nunca existe lançamento com valor zero ou negativo (reforça a validação da API).

---

## Autenticação vs. autorização (`lib/authz.ts`)

- **`requireUser(request)`** — só confirma *quem* é o usuário (sessão válida via `better-auth`). Retorna `{ user }` ou uma `NextResponse` 401.
- **`requireRole(request, role)`** — usa `requireUser` por baixo e além disso verifica `user.role === role`, retornando 403 se não bater.

Toda rota exclusiva de barbeiro (`/api/barber/**`, `/api/finance/entries`) usa `requireRole(request, 'barber')`. Rotas de autoatendimento (`/api/profile*`) usam só `requireUser`, pois qualquer papel pode editar o próprio perfil. Rotas de descoberta pública (`/api/barbers/search`, `/api/barbers/[id]/services`) não exigem sessão.

Padrão de uso em uma rota:
```ts
const auth = await requireRole(request, 'barber')
if (isResponse(auth)) return auth   // já é a resposta de erro (401/403) pronta
const { user } = auth               // TS sabe que aqui é { user: SessionUser }
```

---

## Regras de negócio

### Máquina de estados do agendamento (`lib/domain/agendamento.ts`)

```
requested  -> confirmed | cancelled
confirmed  -> waiting   | cancelled
waiting    -> in_service| cancelled
in_service -> completed | cancelled
completed  -> cancelled      # estorno/undo — remove a receita gerada
cancelled  -> (terminal, nenhuma transição)
```

A classe `Agendamento` é a **única fonte de verdade** dessa sequência — usada pela rota `PATCH /api/barber/bookings/[id]`. Qualquer transição fora dessa tabela retorna `409`.

No front-end (`app/page.tsx`, função `actionsFor`), os botões de ação do barbeiro seguem exatamente essa sequência: Confirmar → Colocar na fila → Iniciar → Concluir, com Cancelar disponível em qualquer estado não-terminal.

### Criação de agendamento (`POST /api/bookings`)

Dentro de uma transação, nesta ordem:
1. Usuário autenticado (`requireUser`).
2. Payload válido e `scheduledAt` no futuro.
3. `barberId` existe e tem `role = 'barber'`.
4. `serviceId` pertence a esse `barberId` (evita agendar um serviço de outro barbeiro).
5. Serviço está `active`.
6. Horário dentro do expediente (`estaDentroDoHorario`, permissivo se o barbeiro não configurou `openingHours`).
7. Não sobrepõe outro agendamento ativo do mesmo barbeiro (considera a duração do serviço).
8. Insere; se ainda assim colidir por corrida, o índice único do banco rejeita e a API traduz para `409`.

### Financeiro

- Toda transição **para** `completed` gera um `financialEntry` (`type: income`) vinculado ao `bookingId`.
- Toda transição de `completed` **para** `cancelled` remove esse `financialEntry` (estorno).
- Lançamentos manuais (`POST /api/finance/entries`) e preços de serviço exigem valores inteiros `> 0`.

---

## Rotas de API

| Rota | Método | Quem pode chamar | O que faz |
|---|---|---|---|
| `/api/auth/[...all]` | GET/POST | público | catch-all do better-auth (sign-up, sign-in, sessão, logout) |
| `/api/bookings` | POST | qualquer usuário autenticado | cliente cria um agendamento (validações da seção acima) |
| `/api/barber/bookings` | GET | `role=barber` (dono) | lista os agendamentos do barbeiro logado |
| `/api/barber/bookings/[id]` | PATCH | `role=barber` (dono do agendamento) | muda o status (máquina de estados) |
| `/api/barber/services` | GET/POST | `role=barber` (dono) | lista/cria serviços do barbeiro logado |
| `/api/barber/services/[id]` | PATCH | `role=barber` (dono) | edita nome/preço/duração/ativo de um serviço |
| `/api/barbers/search` | GET | público | busca barbeiros por `city`/`neighborhood`/`onlyOnline` |
| `/api/barbers/[id]/services` | GET | público | lista serviços **ativos** de um barbeiro (para o cliente agendar) |
| `/api/finance/entries` | GET/POST | `role=barber` (dono) | lista/cria lançamentos financeiros |
| `/api/profile` | GET/PATCH | qualquer autenticado | lê/edita o próprio perfil |
| `/api/profile/preferences` | PATCH | qualquer autenticado | tema, notificações, status online |

---

## Como rodar localmente

1. **Instalar dependências:**
   ```
   pnpm install
   ```
   > O `pnpm-workspace.yaml` já declara `allowBuilds` com os valores corretos (o `esbuild` é permitido, pois é necessário para o Next.js/drizzle-kit; `@prisma/client` e `better-sqlite3` ficam desabilitados por não serem usados). Se, ainda assim, um terminal não-interativo travar num `ERR_PNPM_IGNORED_BUILDS` pedindo `pnpm approve-builds`, rode o binário direto: `./node_modules/.bin/next dev`, `./node_modules/.bin/drizzle-kit generate`, `./node_modules/.bin/next build`, `./node_modules/.bin/tsc --noEmit`.

2. **Configurar ambiente:** copie `.env.example` para `.env.local` e preencha:
   - `DATABASE_URL` — Postgres (Neon/Supabase/Vercel Postgres, gratuito).
   - `BETTER_AUTH_SECRET` — gerar com `openssl rand -base64 32`.
   - `BETTER_AUTH_URL` — `http://localhost:3000` em dev.

3. **Aplicar schema no banco:**
   ```
   pnpm db:migrate     # aplica as migrações em drizzle/*.sql
   # ou, em prototipagem:
   pnpm db:push        # sincroniza o schema direto, sem gerar migração
   ```

4. **Rodar o dev server:**
   ```
   pnpm dev
   ```

5. **Depois de alterar `lib/schema.ts`:**
   ```
   pnpm db:generate    # gera uma nova migração em drizzle/
   ```
   Sempre revise o SQL gerado antes de aplicar em produção.

---

## Estado atual do projeto

O pedido original tinha 9 itens, divididos em duas fases (ordem definida pelo usuário: agendamento/segurança/financeiro primeiro, depois tempo real/localização/upload/POO).

### ✅ Fase 1 — concluída e verificada (type-check + `next build` passando)

1. **Agendamentos**: dupla marcação, serviço-pertence-ao-barbeiro, serviço ativo e horário de funcionamento — todos validados em `POST /api/bookings`.
2. **Status**: sequência correta via `lib/domain/agendamento.ts`, transições inválidas bloqueadas.
3. **Financeiro**: sem valores negativos/zero, receita gerada uma única vez por agendamento, estorno automático ao desfazer um `completed`.
4. **Segurança**: `lib/authz.ts` separa autenticação de autorização; toda rota de barbeiro checa `role`; validações de entrada reforçadas em perfil/serviços/financeiro.
8. **Dado de demonstração**: `demoProfile` removido de `lib/contracts.ts`; `app/page.tsx` depende só da sessão real e esconde a aba "Minha barbearia" para quem não é barbeiro.

> **Revalidado nesta sessão** (dependências instaladas via `corepack pnpm install`): `tsc --noEmit` e `next build` passam sem erros, e o build gera todas as 14 rotas esperadas. Os únicos avisos no build vêm do Better Auth (`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` ausentes), que são esperados sem um `.env.local` — não são erros de código.

### ⏳ Não testado ponta a ponta

Este ambiente de desenvolvimento **não tinha `DATABASE_URL` configurado** durante a Fase 1 — a verificação foi só por tipo/build + revisão lógica (reconfirmada nesta sessão). Antes de considerar a Fase 1 100% fechada, alguém precisa:
- Configurar um Postgres real (`.env.local`), rodar `pnpm db:migrate`.
- Testar manualmente: tentar marcar dois agendamentos no mesmo horário (deve dar 409), tentar pular um status (deve dar 409), cancelar um agendamento `completed` e confirmar que a receita some do financeiro, e confirmar que um usuário `client` autenticado toma 403 ao chamar rotas `/api/barber/*` diretamente.

---

## Pendências / O que falta

### Loose end da Fase 1 (recomendado fechar antes ou junto da Fase 2)

- **Falta UI para o barbeiro configurar `openingHours`.** A coluna existe no banco e a validação (`lib/business-hours.ts`) existe na API, mas hoje **nenhuma tela grava esse campo** — então na prática a checagem de horário de funcionamento fica sempre permissiva (nunca bloqueia nada). Precisa de um editor simples (dia da semana × abre/fecha/ativo) em `components/navalha/settings-panel.tsx`, salvando via `PATCH /api/profile` (o endpoint precisa ganhar suporte a esse campo — hoje só aceita `name/phone/avatarUrl/city/neighborhood`).

### Fase 2 (ordem sugerida pelo usuário: depois da Fase 1)

Decisões já validadas com o usuário nesta rodada de planejamento — **não precisa perguntar de novo**, só implementar:

1. **Tempo real → Polling curto.** `BarberHome` em `app/page.tsx` deve re-buscar `bookings`/`finances` a cada poucos segundos (ex.: 5s), pausando quando a aba fica invisível (`document.visibilitychange`). Sem infraestrutura nova.

2. **Localização real → Geocodificação automática (Nominatim) + geolocalização do navegador.**
   - Adicionar `latitude`/`longitude` (nullable) em `user`.
   - `lib/geocode.ts` (novo): ao salvar endereço do barbeiro em `PATCH /api/profile`, geocodificar via `https://nominatim.openstreetmap.org/search` (definir um `User-Agent` descritivo, respeitar rate limit — é um serviço gratuito sem chave). Se falhar, deixar lat/lng nulos (barbeiro só não entra na ordenação por distância).
   - `app/api/barbers/search/route.ts`: aceitar `lat`/`lng` (da geolocalização do navegador do cliente) e `q` (busca textual por nome/cidade/bairro direto no banco, com `ILIKE`); ordenar por distância (Haversine em JS, dataset pequeno, sem precisar de PostGIS) quando houver coordenadas.
   - `ClientHome` (`app/page.tsx`): usar `navigator.geolocation.getCurrentPosition` com fallback gracioso se o usuário negar permissão; mostrar distância real em vez do texto fixo atual.

3. **Upload de foto real → Vercel Blob.**
   - Adicionar dependência `@vercel/blob`.
   - Nova rota `app/api/profile/avatar/route.ts` (POST multipart/form-data): `requireUser`, validar tipo (`image/jpeg|png|webp`) e tamanho (≤5MB), `put()` no Blob com chave única, atualizar `user.avatarUrl` com a URL permanente.
   - `components/navalha/settings-panel.tsx`: hoje `chooseAvatar` grava a `blob:` URL do preview **diretamente no perfil** (`save()` manda `avatarUrl: preview` pro backend) — isso é o bug a corrigir. Precisa guardar o `File` bruto no estado, usar `URL.createObjectURL` só para o preview visual, e no `save()` fazer upload real do arquivo (se houver um novo) antes de persistir a URL definitiva.
   - Requer que o usuário crie um Blob Store no painel da Vercel e configure `BLOB_READ_WRITE_TOKEN` (adicionar ao `.env.example`).

4. **POO completa → `lib/domain/`.**
   - `Usuario` (classe abstrata) → `Cliente` e `Barbeiro` (herança).
   - `Servico` — encapsula preço/duração, nunca permite valores inválidos (setters validam).
   - `Financeiro` — `registrarReceita(agendamento)` / `estornar(agendamentoId)` / `saldoDoMes()`, reaproveitando a `Agendamento` já criada na Fase 1.
   - Polimorfismo: um método abstrato tipo `permissoes(): string[]` sobrescrito de forma diferente em `Cliente` (`['agendar']`) e `Barbeiro` (`['gerenciar_servicos', 'gerenciar_financeiro', ...]`).
   - Refatorar as rotas para delegar a essas classes em vez de regra solta em route handlers (a `Agendamento` da Fase 1 já está pronta para ser reaproveitada aqui).

---

## Notas para quem (ou qual IA) retomar o projeto

- Este README é a fonte de verdade sobre o que existe e o que falta — **atualize-o** conforme cada item da seção de pendências for implementado (mova de "Fase 2" para "Fase 1 concluída" ou remova o loose end).
- Antes de propor uma abordagem para os itens de Fase 2, **as decisões de arquitetura já foram validadas com o usuário** (ver acima) — não é necessário perguntar de novo qual storage/tempo real/geolocalização usar, a menos que o usuário peça para reconsiderar.
- Sempre rodar `./node_modules/.bin/tsc --noEmit` e `./node_modules/.bin/next build` antes de reportar qualquer mudança como concluída.
- Lembrar do aviso no topo deste arquivo: este Next.js tem breaking changes vs. o conhecimento de treino de qualquer LLM — conferir `node_modules/next/dist/docs/` antes de usar uma API que "parece familiar".
