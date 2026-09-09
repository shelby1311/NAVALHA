# Navalha

Marketplace de agendamento entre **clientes** e **barbeiros**: o cliente encontra barbearias online perto dele e agenda um horário gratuitamente; o barbeiro administra fila, serviços/preços e financeiro em um painel próprio.

Este README serve dois propósitos:
1. Documentar o projeto (stack, arquitetura, modelo de dados, regras de negócio, rotas de API) para qualquer pessoa (ou IA) que abrir o repositório do zero.
2. Registrar **o que já foi implementado**, **o que tem teste automatizado** e **o que ainda depende de infraestrutura real** (seção [Estado atual do projeto](#estado-atual-do-projeto) e [Auditoria técnica](#auditoria-técnica--o-que-foi-encontrado-e-corrigido)), para retomar o trabalho numa próxima sessão sem perder contexto.

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
    auth/[...all]/route.ts     # catch-all do better-auth (sign-in, sessão, logout...)
    auth/signup/route.ts       # POST — wrapper sobre o sign-up do better-auth (ver seção Autenticação)
    bookings/route.ts               # GET — cliente lista os próprios agendamentos · POST — cria um agendamento
    bookings/[id]/route.ts          # PATCH — cliente cancela o próprio agendamento (regras no corpo do arquivo)
    barber/bookings/route.ts        # GET  — barbeiro lista os próprios agendamentos
    barber/bookings/[id]/route.ts   # PATCH — barbeiro muda o status de um agendamento
    barber/services/route.ts        # GET/POST — barbeiro lista/cria serviços
    barber/services/[id]/route.ts   # PATCH — barbeiro edita um serviço
    barbers/search/route.ts         # GET — busca pública de barbeiros (nome/cidade/bairro + distância)
    barbers/[id]/services/route.ts  # GET — serviços ativos de um barbeiro (público)
    barbers/[id]/availability/route.ts # GET — horários realmente livres de um barbeiro num dia
    finance/entries/route.ts        # GET/POST — lançamentos financeiros do barbeiro
    profile/route.ts                # GET/PATCH — perfil do usuário autenticado
    profile/avatar/route.ts         # POST — upload da foto de perfil (Vercel Blob)
    profile/preferences/route.ts    # PATCH — tema/notificações/status online

components/
  navalha/booking-modal.tsx    # modal de agendamento (cliente escolhe serviço, dia e horário real)
  navalha/settings-panel.tsx   # painel de configurações do perfil (foto, dados, horário de funcionamento)
  ui/button.tsx                # componente shadcn

lib/
  schema.ts                    # schema Drizzle (única fonte de verdade do banco)
  db.ts                        # pool de conexão Postgres + instância Drizzle
  auth.ts                      # configuração do better-auth (campos extras de usuário, etc.)
  auth-api.ts                  # client-side: chama os endpoints REST do better-auth
  authz.ts                     # requireUser / requireRole — autenticação separada de autorização
  business-hours.ts            # janela de funcionamento do barbeiro (janelaDoDia/estaDentroDoHorario/terminaDentroDoHorario)
  timezone.ts                  # fuso fixo do negócio (America/Sao_Paulo) — independente do fuso do processo Node
  geocode.ts                   # geocodeAddress() (Nominatim) + haversineKm() para busca por distância
  contracts.ts                 # tipos compartilhados front/back + helpers (ex.: centsToMoney)
  api-client.ts                # client-side: wrapper de fetch para as rotas /api/*
  profile.ts                   # toProfile() — normaliza a linha do banco para UserProfile
  business-hours.test.ts
  timezone.test.ts
  domain/
    agendamento.ts              # classe Agendamento — máquina de estados do booking
    agendamento.test.ts
    disponibilidade.ts          # gerarHorariosDisponiveis() — função pura usada pela rota de availability
    disponibilidade.test.ts
    servico.ts                  # classe Servico — encapsula preço/duração (setters validam)
    servico.test.ts
    financeiro.ts                # classe Financeiro — registrarReceita/estornar
    usuario.ts                  # Usuario (abstrata) → Cliente/Barbeiro — permissoes() por papel
    usuario.test.ts

drizzle/
  0000_*.sql .. 0003_*.sql     # migrações, nessa ordem
  meta/                                 # snapshots internos do drizzle-kit (não editar à mão)

tests/
  integration/
    booking-concurrency.test.ts # roda contra Postgres real (ver seção Testes de integração)

docker-compose.yml              # Postgres descartável (porta 5433) só para tests/integration
vitest.config.ts                # testes unitários (pnpm test) — exclui tests/integration
vitest.integration.config.ts    # testes de integração (pnpm test:integration)
drizzle.config.ts              # aponta lib/schema.ts -> drizzle/, lê DATABASE_URL

pnpm-workspace.yaml            # allowBuilds (esbuild habilitado) + minimumReleaseAgeExclude (@next/*, next)
```

---

## Modelo de dados (`lib/schema.ts`)

### Tabelas do better-auth (não renomear colunas sem revalidar)
- **`user`** — também guarda o perfil de domínio da Navalha:
  - `role` (`'client' | 'barber'`), `phone`, `avatarUrl`, `businessName`, `city`, `neighborhood`
  - `theme`, `notifications`, `isOnline`
  - `openingHours` (`json`, nullable) — horário de funcionamento por dia da semana: `{ mon: { open: "09:00", close: "19:00", active: true }, ... }`. Editável pelo barbeiro em `SettingsPanel`; usado tanto para validar `POST /api/bookings` quanto para gerar os horários de `GET /api/barbers/[id]/availability`.
  - `latitude`/`longitude` (`double precision`, nullable) — geocodificados automaticamente a partir de `city`/`neighborhood` (ver `lib/geocode.ts`); nulos até o barbeiro salvar um endereço ou se a geocodificação falhar.
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

### Cadastro (`app/api/auth/signup/route.ts`) e por que `role` não é `input: true`

`role` em `lib/auth.ts` é **`input: false`** — de propósito. O better-auth expõe automaticamente `POST /api/auth/update-user` (dentro do catch-all `/api/auth/[...all]`), que aceita qualquer `additionalField` com `input: true` vindo direto do corpo da requisição, sem diferenciar "criar conta" de "atualizar depois". Com `role: { input: true }` (como estava antes de uma auditoria de segurança), **qualquer cliente autenticado podia virar barbeiro** com um simples `POST /api/auth/update-user { "role": "barber" }`, ganhando acesso a `/api/barber/*` e `/api/finance/*` sem passar por nenhuma validação da aplicação.

Como `role` não pode mais ser setado via better-auth (nem no sign-up, nem depois), o cadastro passou a ter uma rota própria: `app/api/auth/signup/route.ts` chama `auth.api.signUpEmail()` (API server-side do better-auth, criando a conta com `role` default `'client'`) e, só então, grava `role`/`businessName`/`city`/`neighborhood` com um `UPDATE` direto no banco — fora do alcance do gate de campos do better-auth. `lib/auth-api.ts` (client-side) chama essa rota nova em vez de `/api/auth/sign-up/email` diretamente; `cadastro/page.tsx` não mudou.

**Se um dia precisar adicionar outro `additionalField` sensível** (que não deveria ser auto-editável pelo usuário via `update-user`), aplique o mesmo padrão: `input: false` em `lib/auth.ts` + escrita direta no banco na rota que legitimamente precisa setá-lo.

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

### Fuso horário (`lib/timezone.ts`)

Todo cálculo de "que dia da semana"/"que hora" um agendamento cai usa `America/Sao_Paulo` **fixo** (`BUSINESS_UTC_OFFSET_MINUTES = -180`), nunca o fuso do processo Node que roda o servidor. Isso importa de verdade: em produção (Vercel, por exemplo, roda funções serverless em UTC por padrão), interpretar "09:00–19:00" configurado pelo barbeiro usando `date.getHours()`/`date.getDay()` locais leria isso como 09:00–19:00 **UTC**, ou seja, 06:00–16:00 em Brasília — horários errados por 3h em toda a aplicação. `partesNoFusoDoNegocio`/`dataNoFusoDoNegocio`/`inicioDoDiaNoFuso` decompõem/reconstroem instantes UTC nesse fuso de forma determinística, independente de onde o servidor roda.

> O Brasil não observa mais horário de verão desde 2019 (lei nacional), então o offset fixo de -180min é exato hoje. Se isso mudar, é o único lugar do código a ajustar.

### Horários disponíveis (`GET /api/barbers/[id]/availability`)

Recebe `serviceId` + `date` (`YYYY-MM-DD`) e devolve só horários **realmente livres**: parte da janela de funcionamento do dia (`janelaDoDia`, com `DEFAULT_OPENING_HOURS` para barbeiros que ainda não configuraram nada), gera uma grade de 15 em 15 min a partir da meia-noite **no fuso do negócio** (`gerarHorariosDisponiveis`, em `lib/domain/disponibilidade.ts`), descarta horários no passado, descarta qualquer início cujo fim (considerando a duração do serviço) passe do fechamento, e descarta qualquer sobreposição com agendamentos ativos do barbeiro naquele dia. `BookingModal` usa essa rota (com um seletor de dia, 14 dias à frente) em vez de horários fixos.

### Criação de agendamento (`POST /api/bookings`)

Dentro de uma transação, nesta ordem:
1. Usuário autenticado (`requireUser`).
2. Payload válido e `scheduledAt` no futuro.
3. `pg_advisory_xact_lock(hashtext(barberId))` — serializa todas as tentativas de agendar com esse barbeiro, para a checagem de sobreposição abaixo não ter condição de corrida entre duas requisições concorrentes. **Só o índice único de horário exato não bastava** (dois horários que só se *sobrepõem*, sem serem idênticos, passavam pela checagem de leitura antes de qualquer um inserir).
4. `barberId` existe e tem `role = 'barber'`.
5. `serviceId` pertence a esse `barberId` (evita agendar um serviço de outro barbeiro).
6. Serviço está `active`.
7. Início dentro do expediente (`estaDentroDoHorario`, permissivo se o barbeiro não configurou `openingHours`).
8. **Fim** dentro do expediente (`terminaDentroDoHorario`) — checagem separada da anterior: sem ela, um serviço longo podia começar minutos antes do fechamento e terminar bem depois, aceito pela API (a tela de disponibilidade já escondia esses horários do cliente, mas a API em si não revalidava o fim, só o início).
9. Não sobrepõe outro agendamento ativo do mesmo barbeiro (considera a duração do serviço).
10. Insere; se ainda assim colidir por corrida, o índice único do banco rejeita e a API traduz para `409`.

Cliente cancela o próprio agendamento em `PATCH /api/bookings/[id]` (`{ status: 'cancelled' }`) — só permitido enquanto o status é `requested`/`confirmed` e faltar pelo menos 1h para o horário marcado; fora disso, `409`.

### Financeiro

- Toda transição **para** `completed` gera um `financialEntry` (`type: income`) vinculado ao `bookingId` — via `Financeiro.registrarReceita` (`lib/domain/financeiro.ts`).
- Toda transição de `completed` **para** `cancelled` remove esse `financialEntry` (estorno) — via `Financeiro.estornar`.
- Lançamentos manuais (`POST /api/finance/entries`, agora com UI na aba "Financeiro" do painel do barbeiro) e preços de serviço exigem valores inteiros `> 0`.
- A aba "Financeiro" filtra por período (hoje / 7 dias / mês) e mostra receita, despesa e saldo do período selecionado.
- `GET /api/bookings` (histórico do cliente) mostra `financialEntry.amountCents` — o valor **de fato cobrado**, congelado no momento da conclusão — para agendamentos que já geraram receita, e só cai para o preço atual do serviço quando ainda não há lançamento (agendamento não concluído). Sem isso, um reajuste de preço faria o histórico do cliente mostrar retroativamente um valor que ele nunca pagou.

---

## Rotas de API

| Rota | Método | Quem pode chamar | O que faz |
|---|---|---|---|
| `/api/auth/[...all]` | GET/POST | público | catch-all do better-auth (sign-in, sessão, logout) |
| `/api/auth/signup` | POST | público | cria a conta (wrapper sobre o sign-up do better-auth) e grava `role`/dados de barbeiro |
| `/api/bookings` | GET | qualquer usuário autenticado | cliente lista os próprios agendamentos (barbeiro, serviço, preço, status) |
| `/api/bookings` | POST | qualquer usuário autenticado | cliente cria um agendamento (validações da seção acima) |
| `/api/bookings/[id]` | PATCH | dono do agendamento (cliente) | cancela o próprio agendamento, respeitando as regras |
| `/api/barber/bookings` | GET | `role=barber` (dono) | lista os agendamentos do barbeiro logado |
| `/api/barber/bookings/[id]` | PATCH | `role=barber` (dono do agendamento) | muda o status (máquina de estados) |
| `/api/barber/services` | GET/POST | `role=barber` (dono) | lista/cria serviços do barbeiro logado |
| `/api/barber/services/[id]` | PATCH | `role=barber` (dono) | edita nome/preço/duração/ativo de um serviço |
| `/api/barbers/search` | GET | público | busca por `q` (nome/cidade/bairro, ILIKE) + `onlyOnline`; ordena por distância se `lat`/`lng` forem informados |
| `/api/barbers/[id]/services` | GET | público | lista serviços **ativos** de um barbeiro (para o cliente agendar) |
| `/api/barbers/[id]/availability` | GET | público | horários realmente livres de um barbeiro num dia, para um `serviceId` |
| `/api/finance/entries` | GET/POST | `role=barber` (dono) | lista/cria lançamentos financeiros |
| `/api/profile` | GET/PATCH | qualquer autenticado | lê/edita o próprio perfil (inclui `openingHours`, geocodifica endereço do barbeiro) |
| `/api/profile/avatar` | POST | qualquer autenticado | upload da foto de perfil (multipart, Vercel Blob) |
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

6. **Rodar os testes (não precisa de banco — só lógica de domínio pura):**
   ```
   pnpm test           # vitest run
   ```

7. **Upload de foto de perfil (opcional):** crie um Blob Store no painel da Vercel (Storage → Blob) e preencha `BLOB_READ_WRITE_TOKEN` no `.env.local`. Sem isso, o resto do app funciona normalmente — só o upload de avatar falha com um erro tratado na UI.

8. **Testes de integração (opcional, contra Postgres real — ver [seção dedicada](#testes-de-integração-contra-postgresql-real)):**
   ```
   docker compose up -d
   DATABASE_URL=postgresql://navalha:navalha@localhost:5433/navalha_test pnpm db:migrate
   DATABASE_URL=postgresql://navalha:navalha@localhost:5433/navalha_test pnpm test:integration
   ```

---

## Estado atual do projeto

O pedido original tinha 10 itens de produto (agendamento/segurança/financeiro, depois tempo real/localização/upload/POO/testes) e passou por uma auditoria técnica completa depois de implementado, focada em segurança, integridade de dados e produção. Esta seção reflete o estado real — só marca algo como "implementado" o que existe em código, e só como "testado" o que tem teste automatizado rodando.

### ✅ Implementado

**Produto (10 itens originais):**
1. Horários reais disponíveis (`GET /api/barbers/[id]/availability`) + editor de expediente do barbeiro.
2. Proteção contra conflito de horário (`pg_advisory_xact_lock` por barbeiro).
3. Fila/agenda em tempo real via polling de 5s (`usePolling`), pausando com a aba invisível.
4. Área "Meus agendamentos" do cliente (próximos + histórico + cancelamento com regra de antecedência).
5. Painel do barbeiro: agenda ordenada, edição inline de preço/duração de serviço.
6. Upload real de foto de perfil (Vercel Blob).
7. Busca por nome/cidade/bairro (ILIKE) + geocodificação (Nominatim) + distância real (GPS + Haversine).
8. Financeiro completo: receita/despesa/saldo por período, lançamento manual.
9. POO: `Usuario`/`Cliente`/`Barbeiro`, `Servico`, `Financeiro`, `Agendamento` — usadas de verdade pelas rotas, não só declaradas.
10. Testes automatizados (`vitest`).

**Correções da auditoria técnica (ver [seção dedicada](#auditoria-técnica--o-que-foi-encontrado-e-corrigido) com problema/impacto/correção de cada uma):**
- Fechada uma escalação de privilégio (`role` via `/api/auth/update-user` do better-auth).
- Todo o cálculo de expediente/disponibilidade passou a usar o fuso do negócio (`America/Sao_Paulo`) em vez do fuso do processo Node.
- `POST /api/bookings` passou a validar também o **fim** do serviço contra o expediente (só o início era checado).
- Histórico do cliente mostra o preço realmente cobrado (`financial_entry`), não o preço atual do serviço.
- Timeout no Nominatim, escape de wildcards ILIKE, proteção contra duplo clique em dois formulários do painel do barbeiro.

### ✅ Testado (automatizado)

- **36 testes unitários** (`pnpm test`, sem banco): máquina de estados do agendamento, `business-hours` (incluindo fuso horário e `terminaDentroDoHorario`), `lib/timezone.ts`, `Servico`, `Usuario`/`Cliente`/`Barbeiro`, geração de horários disponíveis.
- **2 testes de integração** (`tests/integration/booking-concurrency.test.ts`, contra Postgres real): duas requisições concorrentes para horários sobrepostos → só uma cria o agendamento; cancelar libera o horário para outro cliente. **Escritos e revisados, mas nunca executados neste ambiente** (sem docker/`DATABASE_URL` disponível aqui) — ver checklist de produção abaixo.

### ⏳ Não testado (depende de infraestrutura externa)

Nada disto foi validado neste ambiente por falta de acesso à infraestrutura real:
- **Postgres real**: migrações (`pnpm db:migrate`), os 2 testes de integração escritos, e o restante da matriz de cenários da auditoria (lista completa na seção de auditoria, item "Agendamentos").
- **Vercel Blob**: upload de avatar de verdade (precisa de `BLOB_READ_WRITE_TOKEN`).
- **Nominatim**: geocodificação de endereço real (o timeout/tratamento de erro foi revisado no código, mas nunca chamou a API de verdade).
- **Navegador real**: permissão de GPS negada/concedida, responsividade mobile, teclado/leitor de tela.
- **better-auth em produção**: `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` reais, e o fluxo completo de sign-up → sessão → primeira chamada autenticada com um `BETTER_AUTH_SECRET` que não seja o default de desenvolvimento.

### 🚧 Antes do primeiro cliente real

Ver o [checklist de produção](#checklist-de-produção) completo. Os pontos que mais importam agora: rodar os testes de integração contra um Postgres real (valida a proteção de concorrência, que é o único mecanismo que nenhum teste unitário consegue provar), testar manualmente a lista de cenários de agendamento da auditoria, e configurar `BETTER_AUTH_SECRET`/`BLOB_READ_WRITE_TOKEN` reais antes de qualquer deploy.

---

## Auditoria técnica — o que foi encontrado e corrigido

Auditoria completa da arquitetura (rotas, domínio, banco, autorização, UX, performance) depois dos 10 itens de produto implementados. Cada problema abaixo foi corrigido, testado (quando possível sem infraestrutura externa) e commitado separadamente — ver `git log` para o diff exato de cada um.

| Severidade | Problema | Impacto | Correção |
|---|---|---|---|
| 🔴 Crítico | `role` tinha `input: true` em `lib/auth.ts` — o better-auth expõe `POST /api/auth/update-user` aceitando qualquer campo `input:true`, sem diferenciar criação de atualização | Qualquer `client` autenticado virava `barber` com um POST direto, acessando `/api/barber/*` e `/api/finance/*` sem nenhuma validação nossa | `role` agora é `input:false`; nova rota `app/api/auth/signup` cria a conta e grava `role` com update direto no banco, fora do alcance do better-auth |
| 🟠 Alto | Expediente/disponibilidade calculados com `date.getDay()`/`getHours()` — dependem do fuso do **processo Node**, não do fuso real da barbearia | Em produção (runtime em UTC), "09:00–19:00" seria lido como 06:00–16:00 em Brasília — horários errados por 3h | `lib/timezone.ts` fixa `America/Sao_Paulo` e decompõe/reconstrói instantes nesse fuso, independente de onde o servidor roda |
| 🟠 Alto | `POST /api/bookings` validava só o **início** do agendamento contra o expediente | Um serviço longo podia começar minutos antes do fechamento e terminar bem depois — aceito pela API mesmo a UI não oferecendo esse horário | Nova `terminaDentroDoHorario()` valida o fim também, na criação do agendamento |
| 🟡 Médio | Histórico do cliente (`GET /api/bookings`) sempre mostrava o preço **atual** do serviço | Um reajuste de preço fazia o histórico mostrar retroativamente um valor que o cliente nunca pagou | Usa `financial_entry.amountCents` (congelado na conclusão) quando existe, com fallback pro preço atual só para agendamentos ainda não concluídos |
| 🟢 Baixo | `geocodeAddress()` sem timeout | Nominatim lento/travado prenderia `PATCH /api/profile` até o limite da plataforma | `AbortSignal.timeout(5000)` |
| 🟢 Baixo | Busca ILIKE não escapava `%`/`_`/`\` do texto digitado | Não é SQL injection (ILIKE já é parametrizado), mas "100%" ou "a_b" combinavam qualquer coisa | `escapeLikePattern()` antes de montar o padrão |
| 🟢 Baixo | `addService`/`addFinanceEntry` sem proteção contra duplo clique | Em rede lenta, dois cliques podiam criar serviço/lançamento duplicado | Estado `submitting` + botão desabilitado, mesmo padrão já usado em `BookingModal` |

**Verificado e sem problema** (itens do escopo da auditoria que foram checados e estavam corretos):
- **Timestamps no Postgres**: `lib/schema.ts` usa `timestamp` sem timezone, e o mapper do Drizzle (`mapToDriverValue`/`mapFromDriverValue`) já normaliza para UTC na escrita e na leitura — não depende do fuso da máquina rodando o Postgres nem do processo Node. **Não mexer nisso** (não trocar por `timestamptz` sem entender essa normalização primeiro).
- **IDOR**: barbeiro A não acessa/edita serviço, agendamento ou financeiro de barbeiro B; cliente A não cancela agendamento de cliente B — todas as rotas escopam por `auth.user.id` no `WHERE`, confirmado lendo cada rota.
- **Migrations vs. schema**: `drizzle-kit generate` não detectou nenhuma diferença entre `lib/schema.ts` e as migrations existentes — um Postgres novo, rodando as 4 migrations em ordem, fica idêntico ao schema atual.
- **Geocoding**: só roda quando `city`/`neighborhood` realmente mudam (não a cada `PATCH /api/profile`).
- **Cliente também pode criar agendamento como comprador em `POST /api/bookings`** mesmo sendo `role=barber` — decisão de produto, não bug (um barbeiro pode legitimamente ser cliente de outro).

---

## Testes de integração contra PostgreSQL real

Os 36 testes de `pnpm test` cobrem só lógica de domínio pura (sem banco). Duas coisas — a proteção de concorrência (`pg_advisory_xact_lock`) e as constraints do banco (índices únicos, FKs, checks) — só podem ser provadas de verdade contra um Postgres real, daí `tests/integration/`.

```
docker compose up -d                                                                  # sobe um Postgres descartável na porta 5433
DATABASE_URL=postgresql://navalha:navalha@localhost:5433/navalha_test pnpm db:migrate  # aplica as 4 migrations
DATABASE_URL=postgresql://navalha:navalha@localhost:5433/navalha_test pnpm test:integration
```

Sem `DATABASE_URL` definido, `pnpm test:integration` **pula** os testes (não falha) — e eles nunca entram em `pnpm test`/CI por padrão. **Isto não foi executado neste ambiente** (sem docker disponível) — o arquivo foi escrito e revisado, mas precisa rodar contra Postgres real antes de virar prova de que a proteção de concorrência funciona.

Cenários cobertos hoje: duas requisições concorrentes para horários sobrepostos (só uma deve criar o agendamento) e cancelamento liberando o horário. Cenários da auditoria que ainda **não** têm teste de integração automatizado (testar manualmente até alguém escrever):
- Dois clientes tentando exatamente o mesmo horário (índice único de banco).
- Serviços com durações diferentes se sobrepondo parcialmente.
- Agendamento confirmado bloqueando horário; cancelado liberando (parcialmente coberto).
- Estorno de receita ao cancelar um `completed`, e que não duplica (índice único em `financial_entry.booking_id`).
- `client` chamando `/api/barber/*` diretamente → 403.

---

## Checklist de produção

Antes de considerar o Navalha pronto para os primeiros usuários reais:

- [ ] PostgreSQL real configurado (`DATABASE_URL` de produção)
- [ ] Migrations executadas (`pnpm db:migrate`)
- [ ] Build funcionando (`pnpm build` / `next build`) — ✅ verificado neste ambiente
- [ ] TypeScript funcionando (`pnpm exec tsc --noEmit`) — ✅ verificado neste ambiente
- [ ] Testes unitários passando (`pnpm test`) — ✅ 43/43 neste ambiente
- [ ] Testes de integração passando contra Postgres real (`pnpm test:integration`) — ⏳ escritos, não executados (sem infra aqui)
- [ ] APIs testadas manualmente ponta a ponta (não só por tipo/lógica)
- [ ] Autorização testada (matriz de IDOR da auditoria, manualmente contra sessões reais)
- [ ] Agendamento testado (os 11 cenários da auditoria, manualmente ou via testes de integração adicionais)
- [ ] Concorrência testada (rodar o teste de integração de verdade, considerar também um teste de carga simples)
- [ ] Financeiro testado (receita/despesa/estorno/duplicidade, manualmente)
- [ ] Upload de avatar testado com `BLOB_READ_WRITE_TOKEN` real
- [ ] Geocoding testado com endereços reais (Nominatim)
- [ ] GPS testado (permissão concedida e negada, em um navegador de verdade)
- [ ] Mobile testado (responsividade, teclado virtual, toque)
- [ ] Desktop testado
- [ ] Variáveis de ambiente de produção configuradas (`BETTER_AUTH_SECRET` gerado de verdade, não o default de dev; `BETTER_AUTH_URL` = domínio real)
- [ ] Secrets protegidos (nada de `.env.local`/tokens commitado — `.gitignore` já cobre isso, conferir antes do primeiro push)
- [ ] Dados demo removidos ou claramente separados — ✅ já não existe `demoProfile` no código
- [ ] Erros tratados de forma consistente (revisado nesta auditoria; sem um APM/Sentry configurado ainda)
- [ ] Logs funcionando (hoje só `console`/logs padrão da Vercel — sem observabilidade estruturada)
- [ ] Backup do banco definido (depende do provedor escolhido — Neon/Supabase/Vercel Postgres têm backup automático nos planos pagos; confirmar antes de ir ao ar)
- [ ] Política de privacidade definida
- [ ] Termos de uso definidos
- [ ] Processo de suporte definido

**Recomendação desta auditoria:** o código está em bom estado — a vulnerabilidade crítica encontrada foi corrigida, a lógica de agendamento/financeiro foi revisada e os bugs reais encontrados foram corrigidos, com 36 testes automatizados passando. **Mas o projeto não pode ser chamado de "pronto para produção" enquanto os itens marcados ⏳ acima não forem executados contra infraestrutura real** — em especial os testes de integração (a única prova de que a proteção de concorrência funciona de verdade) e um teste manual ponta a ponta com Postgres, Blob e Nominatim reais. Nada aqui é bloqueante de código; é validação que só existe rodando o sistema de verdade.

---

## Notas para quem (ou qual IA) retomar o projeto

- Este README é a fonte de verdade sobre o que existe e o que falta — **atualize-o** conforme novas mudanças forem implementadas.
- Sempre rodar `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/next build` e `./node_modules/.bin/vitest run` antes de reportar qualquer mudança como concluída.
- Lembrar do aviso no topo deste arquivo: este Next.js tem breaking changes vs. o conhecimento de treino de qualquer LLM — conferir `node_modules/next/dist/docs/` antes de usar uma API que "parece familiar".
