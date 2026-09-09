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
  business-hours.ts            # janela de funcionamento do barbeiro (janelaDoDia/estaDentroDoHorario)
  geocode.ts                   # geocodeAddress() (Nominatim) + haversineKm() para busca por distância
  contracts.ts                 # tipos compartilhados front/back + helpers (ex.: centsToMoney)
  api-client.ts                # client-side: wrapper de fetch para as rotas /api/*
  profile.ts                   # toProfile() — normaliza a linha do banco para UserProfile
  business-hours.test.ts
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

### Horários disponíveis (`GET /api/barbers/[id]/availability`)

Recebe `serviceId` + `date` (`YYYY-MM-DD`) e devolve só horários **realmente livres**: parte da janela de funcionamento do dia (`janelaDoDia`, com `DEFAULT_OPENING_HOURS` para barbeiros que ainda não configuraram nada), gera uma grade de 15 em 15 min (`gerarHorariosDisponiveis`, em `lib/domain/disponibilidade.ts`), descarta horários no passado, descarta qualquer início cujo fim (considerando a duração do serviço) passe do fechamento, e descarta qualquer sobreposição com agendamentos ativos do barbeiro naquele dia. `BookingModal` usa essa rota (com um seletor de dia, 14 dias à frente) em vez de horários fixos.

### Criação de agendamento (`POST /api/bookings`)

Dentro de uma transação, nesta ordem:
1. Usuário autenticado (`requireUser`).
2. Payload válido e `scheduledAt` no futuro.
3. `pg_advisory_xact_lock(hashtext(barberId))` — serializa todas as tentativas de agendar com esse barbeiro, para a checagem de sobreposição abaixo não ter condição de corrida entre duas requisições concorrentes.
4. `barberId` existe e tem `role = 'barber'`.
5. `serviceId` pertence a esse `barberId` (evita agendar um serviço de outro barbeiro).
6. Serviço está `active`.
7. Horário dentro do expediente (`estaDentroDoHorario`, permissivo se o barbeiro não configurou `openingHours`).
8. Não sobrepõe outro agendamento ativo do mesmo barbeiro (considera a duração do serviço).
9. Insere; se ainda assim colidir por corrida, o índice único do banco rejeita e a API traduz para `409`.

Cliente cancela o próprio agendamento em `PATCH /api/bookings/[id]` (`{ status: 'cancelled' }`) — só permitido enquanto o status é `requested`/`confirmed` e faltar pelo menos 1h para o horário marcado; fora disso, `409`.

### Financeiro

- Toda transição **para** `completed` gera um `financialEntry` (`type: income`) vinculado ao `bookingId` — via `Financeiro.registrarReceita` (`lib/domain/financeiro.ts`).
- Toda transição de `completed` **para** `cancelled` remove esse `financialEntry` (estorno) — via `Financeiro.estornar`.
- Lançamentos manuais (`POST /api/finance/entries`, agora com UI na aba "Financeiro" do painel do barbeiro) e preços de serviço exigem valores inteiros `> 0`.
- A aba "Financeiro" filtra por período (hoje / 7 dias / mês) e mostra receita, despesa e saldo do período selecionado.

---

## Rotas de API

| Rota | Método | Quem pode chamar | O que faz |
|---|---|---|---|
| `/api/auth/[...all]` | GET/POST | público | catch-all do better-auth (sign-up, sign-in, sessão, logout) |
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

---

## Estado atual do projeto

O pedido original tinha 10 itens (ver ordem de desenvolvimento definida pelo usuário), em três rodadas de trabalho.

### ✅ Fase 1 — segurança, agendamento e financeiro básicos

1. **Agendamentos**: dupla marcação, serviço-pertence-ao-barbeiro, serviço ativo e horário de funcionamento — todos validados em `POST /api/bookings`.
2. **Status**: sequência correta via `lib/domain/agendamento.ts`, transições inválidas bloqueadas.
3. **Financeiro**: sem valores negativos/zero, receita gerada uma única vez por agendamento, estorno automático ao desfazer um `completed`.
4. **Segurança**: `lib/authz.ts` separa autenticação de autorização; toda rota de barbeiro checa `role`; validações de entrada reforçadas em perfil/serviços/financeiro.
5. **Dado de demonstração**: `demoProfile` removido de `lib/contracts.ts`; `app/page.tsx` depende só da sessão real e esconde a aba "Minha barbearia" para quem não é barbeiro.

### ✅ Fase 2 — plataforma de agendamento real (concluída e verificada: `tsc --noEmit` + `next build` + `pnpm test` passando)

1. **Horários reais**: `GET /api/barbers/[id]/availability` calcula horários livres a partir do expediente do barbeiro + duração do serviço + agendamentos existentes; nunca deixa passar do fechamento nem sobrepor. Editor de horário de funcionamento em `SettingsPanel` (era o loose end da Fase 1 — a coluna existia mas nada gravava). `BookingModal` usa slots reais em vez de horários fixos.
2. **Proteção contra conflito**: `pg_advisory_xact_lock` por barbeiro dentro da transação de `POST /api/bookings` — fecha a corrida em que dois clientes marcam horários que se sobrepõem (mas não são idênticos) ao mesmo tempo.
3. **Fila em tempo real**: `BarberHome` repete a busca de agendamentos/financeiro a cada 5s (hook `usePolling`), pausando quando a aba fica invisível. Agenda do dia e fila ordenadas cronologicamente.
4. **Área do cliente**: aba "Meus agendamentos" (`GET /api/bookings`, `PATCH /api/bookings/[id]`) com próximos agendamentos + histórico, e cancelamento respeitando as regras (só `requested`/`confirmed`, com ≥1h de antecedência).
5. **Painel do barbeiro**: edição inline de preço/duração de um serviço já criado; aba "Financeiro" com filtro por período e lançamento manual de receita/despesa.
6. **Upload real de foto**: `POST /api/profile/avatar` (Vercel Blob) — `SettingsPanel` faz upload do arquivo antes de persistir o perfil, em vez de gravar a `blob:` URL temporária.
7. **Busca/localização**: busca textual (`q`, ILIKE) por nome/cidade/bairro direto no banco; geocodificação automática (Nominatim) do endereço do barbeiro; ordenação por distância real via `navigator.geolocation` + Haversine.
8. **Financeiro completo**: aba dedicada com receita/despesa/saldo por período (hoje/7 dias/mês) e lançamento manual — antes só existia a API, sem nenhuma tela.
9. **POO**: `Usuario` (abstrata) → `Cliente`/`Barbeiro` com `permissoes()` polimórfico (usado de verdade em `toProfile()`); `Servico` encapsula preço/duração com setters que validam; `Financeiro` isola registrar/estornar receita, reaproveitando `Agendamento`.
10. **Testes**: `vitest` + 27 testes cobrindo a máquina de estados do agendamento, `business-hours`, `Servico`, `Usuario`/`Cliente`/`Barbeiro` e a geração de horários disponíveis.

> Build confirmado com `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/next build` (14 rotas de API + páginas) e `./node_modules/.bin/vitest run` (27/27) — dependências instaladas via `corepack pnpm install`.

### ⏳ Não testado ponta a ponta (precisa de infraestrutura externa)

Este ambiente de desenvolvimento **não tem `DATABASE_URL` configurado** — toda a verificação acima foi por tipo/build/testes unitários + revisão lógica, não testes de integração contra um Postgres real. Antes de considerar o projeto pronto para produção, alguém com acesso a essa infraestrutura precisa:
- Configurar um Postgres real (`.env.local`), rodar `pnpm db:migrate` (inclui a migração `0003` com `latitude`/`longitude`).
- Testar manualmente o que já valia da Fase 1 (dois agendamentos no mesmo horário → 409, pular um status → 409, cancelar `completed` → receita some do financeiro, `client` chamando `/api/barber/*` → 403).
- Testar os fluxos novos: `BookingModal` mostrando só horários realmente livres (inclusive não deixar escolher um horário que ultrapasse o fechamento); duas abas tentando marcar horários sobrepostos ao mesmo tempo (a segunda deve falhar com 409, não criar um agendamento sobreposto); cliente cancelando um agendamento com <1h de antecedência (deve dar 409); configurar `BLOB_READ_WRITE_TOKEN` e testar upload de foto de verdade; conceder permissão de localização no navegador e conferir se a distância mostrada bate com a geocodificação do Nominatim.

---

## Pendências / O que falta

Não há nenhum item pendente dos 10 originais — os itens acima estão implementados e verificados por tipo/build/testes. O que resta é infraestrutural, listado na seção anterior, e melhorias que não foram pedidas mas valeriam a pena numa próxima rodada:

- **Tempo real via WebSocket/SSE em vez de polling.** O polling de 5s (item 3) é simples e funciona, mas não escala bem com muitos barbeiros simultâneos nem é instantâneo. Trocar por Server-Sent Events ou um provedor de realtime (ex.: Supabase Realtime, Pusher) é a evolução natural, mas é uma mudança de infraestrutura maior — não implementada porque o usuário já havia validado "polling curto" como solução da Fase 2.
- **Testes de integração contra Postgres real** (o que a seção "Não testado ponta a ponta" pede) — os 27 testes atuais cobrem só lógica de domínio pura (sem banco), por não haver `DATABASE_URL` neste ambiente.
- **`Financeiro.saldoDoMes()`** e um `saldoDoMes` dedicado na classe não foram criados — o cálculo de saldo por período (item 8) hoje é feito direto em `app/page.tsx` a partir da lista de `FinancialEntry` já carregada (dataset pequeno de uma barbearia só; não valeria a complexidade de mover para uma rota de agregação no servidor ainda).

---

## Notas para quem (ou qual IA) retomar o projeto

- Este README é a fonte de verdade sobre o que existe e o que falta — **atualize-o** conforme novas mudanças forem implementadas.
- Sempre rodar `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/next build` e `./node_modules/.bin/vitest run` antes de reportar qualquer mudança como concluída.
- Lembrar do aviso no topo deste arquivo: este Next.js tem breaking changes vs. o conhecimento de treino de qualquer LLM — conferir `node_modules/next/dist/docs/` antes de usar uma API que "parece familiar".
