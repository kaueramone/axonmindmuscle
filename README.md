# AXON Mind-Muscle — MVP

Aplicação web de orientação e acompanhamento de treino de musculação.
Funciona no navegador e instala-se no ecrã inicial como uma aplicação (PWA).

> Entre a intenção e a contração existe um caminho mensurável.

---

## Estado atual

Fundação da plataforma e a primeira ferramenta de treino:

- Sistema de design completo, derivado do Manual de Marca (Agosto 2026)
- Autenticação: email + palavra-passe e Google, com confirmação de email e
  recuperação de acesso
- Gestão de utilizadores: perfil, calibração inicial, preferências, tema
- Dois mercados no mesmo produto: Portugal (pt-PT, EUR, MB WAY) e Brasil
  (pt-BR, BRL, Pix)
- Duas landing pages: uma para o público de resultado, outra para o público
  técnico
- Instalação no telemóvel e página de estado offline
- **Metrónomo visual** com registo de séries, catálogo de 74 exercícios e
  histórico de progresso por período
- **Painel de prontidão** que ajusta a prescrição do treino do dia

**Fora do âmbito desta fase** (por decisão da proposta): tutoriais,
Professor AXON, comunidade, pontos e pagamentos.
As entradas para estas ferramentas já existem na interface, marcadas
honestamente como em desenvolvimento.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Estilos | Tailwind CSS v4 com tokens semânticos próprios |
| Base de dados e autenticação | Supabase (Postgres 17, RLS ativo) |
| Alojamento | Vercel |
| Tipografia | Outfit, Jura, Geist Mono |

---

## Arranque local

```bash
npm install
cp .env.example .env.local   # preencher as chaves
npm run dev
```

Variáveis necessárias:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

Comandos úteis:

```bash
npm run build       # compilação de produção
npm run typecheck   # verificação de tipos
```

---

## Estrutura

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (marketing)/      páginas públicas: LP fitness e LP técnica
│   │   ├── (auth)/           entrar, criar conta, recuperar acesso
│   │   ├── (onboarding)/     calibração inicial em quatro passos
│   │   └── (app)/            área privada: hoje, treino, progresso, comunidade, perfil, conta
│   ├── auth/                 callback OAuth e confirmação de email
│   └── globals.css           sistema de design (tokens, escalas, materiais)
├── components/
│   ├── brand/                logo em SVG, extraído do manual de marca
│   ├── ui/                   primitivas: botão, campo, lista, segmentado, ícones
│   ├── marketing/            cabeçalho, rodapé, demonstrações
│   ├── app/                  barra de separadores, cabeçalho, formulários
│   ├── workout/              metrónomo, seletor de exercícios, sessão
│   └── theme.tsx             tema claro/escuro sem cintilação inicial
├── lib/
│   ├── i18n/                 locales, dicionários pt-PT e pt-BR, mercados
│   ├── supabase/             clientes browser/servidor/middleware e tipos
│   ├── auth/                 ações de servidor
│   ├── workout/              motor do metrónomo e fila local de séries
│   └── routes.ts             segmentos de rota com prefixo de idioma
└── proxy.ts                  negociação de idioma + sessão + guardas de acesso
```

---

## Idiomas e mercados

O idioma vive no URL: `/pt-pt/...` e `/pt-br/...`.

Na primeira visita o middleware escolhe o mercado a partir do país detetado
pela rede de distribuição e, em alternativa, do cabeçalho `Accept-Language`.
A escolha fica guardada num cookie e, para utilizadores autenticados,
também no perfil.

Cada mercado traz a sua moeda e o seu método de pagamento local, prontos
para a fase de subscrições.

Para acrescentar um idioma: criar o dicionário em
`src/lib/i18n/dictionaries/`, registá-lo em `src/lib/i18n/index.ts` e
adicionar o código a `locales` e `marketByLocale` em
`src/lib/i18n/config.ts`. O tipo `Dict` garante, em tempo de compilação,
que nenhuma chave fica por traduzir.

---

## Base de dados

```
profiles   perfil de cada utilizador (1:1 com auth.users), criado por gatilho
           no registo. RLS: cada utilizador só lê e altera a sua linha.
leads      captação de emails nas páginas públicas. Escrita anónima
           permitida, leitura apenas com a chave de serviço.
exercises  catálogo, com traduções em exercise_translations e a licença
           de cada registo. Leitura pública, escrita só pela chave de serviço.
workout_sessions / workout_sets
           registo de treino. RLS: cada utilizador só vê as suas.
workout_sets_local
           vista com a data de cada série no fuso do utilizador
           (profiles.timezone). Toda a agregação por período parte daqui —
           em UTC, um treino nocturno no Brasil contaria no dia seguinte.
           security_invoker mantém o RLS da tabela de origem.
training_sets_by_muscle() / training_daily_summary()
           agregações por período, ambas security invoker.
readiness_checkins
           um registo de prontidão por dia local, com a pontuação, o estado
           e os fatores que a determinaram, para a recomendação ser
           auditável mais tarde.
readiness_context()
           o que se deriva do histórico sem perguntar nada: médias pessoais
           de sono e batimento, dias seguidos de treino, carga da semana
           face à média e grupos treinados nas últimas 48 horas.
```

O gatilho `handle_new_user` lê `display_name`, `locale` e `market` dos
metadados do registo e cria o perfil correspondente.

---

## Design

O sistema segue as Human Interface Guidelines da Apple aplicadas à web:
materiais translúcidos com desfoque, linhas de um pixel, cantos generosos,
transições curtas com mola, tipografia em escala iOS e respeito pelas
safe areas do iPhone.

A paleta é a do manual de marca, exposta em tokens semânticos que existem
em versão clara e escura. O tema escuro é o predefinido — é a identidade
da marca — e o utilizador pode mudar para claro ou seguir o sistema.

A logo em `public/brand/` foi extraída do ficheiro vetorial do manual de
marca, sem redesenho. O traço usa `currentColor` e o impulso mantém sempre
o azul Sinapse `#307FE2`.

---

## Notas de configuração

**Google OAuth** — ativar o fornecedor Google no painel do Supabase
(Authentication → Providers) e acrescentar o URL de retorno
`https://<projeto>.supabase.co/auth/v1/callback` nas credenciais do Google
Cloud.

**URLs de redirecionamento** — no Supabase, em Authentication → URL
Configuration, o `Site URL` e a lista de `Redirect URLs` têm de incluir o
domínio de produção.

---

## Catálogo de exercícios

74 exercícios escritos de raiz, em pt-PT e pt-BR, curados para musculação.
Vivem em `public.exercises` com as traduções em `public.exercise_translations`.

**Porque não importámos do wger.** A hipótese foi avaliada e medida em
Agosto de 2026. A API do wger tem 863 exercícios, mas só 66 com tradução
portuguesa (7,6%) e nenhum em português do Brasil — e os que existem são
sobretudo cardio e calistenia, não musculação. Em troca, os dados são
CC-BY-SA 4.0: obrigariam a crédito visível e a manter a tabela de
exercícios da AXON disponível nos mesmos termos, de forma permanente.
A conta não compensava.

O esquema mantém as colunas `source`, `license` e `attribution` por linha,
por isso a decisão é reversível: uma importação futura pode conviver com o
catálogo próprio e o crédito aparece sozinho no seletor de exercícios
sempre que existirem registos de terceiros. O script de importação está no
histórico do git, no commit que o removeu.

---

## Painel de prontidão

Quatro perguntas — energia, qualidade do sono, horas dormidas e dores — mais
o batimento em repouso, que é opcional. Tudo o resto vem do histórico.

O modelo é uma **heurística ponderada**, não um marcador validado de
recuperação. A literatura sustenta que questionários subjetivos de bem-estar
acompanham a resposta à carga de treino; não sustenta que uma pontuação
calculada assim determine o que se deve levantar hoje. Por isso a interface
mostra sempre que fatores empurraram o resultado, o texto diz que é uma
recomendação e não um diagnóstico, e o painel nunca impede ninguém de
treinar.

Duas decisões que sustentam a honestidade do resultado:

- **A frequência cardíaca só entra com base pessoal.** 62 bpm não diz nada;
  62 quando a média de catorze dias são 54 diz. Sem cinco registos, o campo
  é ignorado no cálculo e a interface explica porquê.
- **O ajuste do histórico é pequeno de propósito.** Dias seguidos de treino
  e picos de carga movem a pontuação seis pontos, não trinta: são contexto,
  não devem dominar o que a pessoa está a sentir.

O resultado aterra em ação — a página de treino lê a prontidão do dia,
ajusta as repetições em reserva de partida, mostra a carga sugerida e avisa
quando o exercício escolhido usa um grupo dorido ou treinado há menos de 48
horas. Sem isso, o painel seria um horóscopo.

---

Desenvolvido por [kaueramone.dev](https://kaueramone.dev)

## Painel administrativo

Vive em `painel.<domínio>` e é servido pela mesma aplicação. Sem domínio
configurado, continua acessível em `/<locale>/painel`.

**Sessão própria.** Os cookies de autenticação do Supabase são gravados por
host, sem atributo `Domain`, portanto a sessão do site não atravessa para o
subdomínio — o painel vê um visitante anónimo por muito que a pessoa esteja
autenticada em `www`. Em vez de alargar o cookie a `.<domínio>`, que o tornaria
legível por qualquer subdomínio futuro e mexeria no caminho de autenticação de
todos os utilizadores, o painel tem o seu próprio login no seu próprio host.

No subdomínio só existem duas coisas: as rotas de autenticação e o painel.
Qualquer outro caminho — a raiz, um `/hoje` devolvido pelo OAuth, um link
antigo — é redirecionado para `/<locale>/painel`, em vez de dar 404. Quem
chega sem sessão vai ao login **deste** host e volta ao painel a seguir; quem
tem sessão mas não é administrador é enviado para o produto, no domínio
principal, com um redirecionamento absoluto.

Consequência prática: o login com Google feito a partir do painel volta a
`painel.<domínio>/auth/callback`, por isso `https://painel.<domínio>/**` tem
de estar na lista de *Redirect URLs* do Supabase.

**Controlo de acesso.** `profiles.role` (`member` | `admin`) decide quem entra.
São três camadas independentes:

1. `requireAdmin()` no layout do painel, executado no servidor a cada pedido —
   redireciona para o domínio principal quem não for administrador.
2. Políticas de RLS: escrita em `exercises` e `exercise_translations`, e leitura
   de todos os perfis e leads, só com `public.is_admin()`.
3. As métricas passam por funções `security definer` que começam por verificar
   `is_admin()`. Um membro comum que chame `/rest/v1/rpc/admin_overview` recebe
   zero linhas, não um erro.

O gatilho `guard_profile_role` impede que um utilizador autenticado altere o
próprio `role` — sem ele, a política `profiles_update_own` seria uma porta
aberta para qualquer pessoa se promover. A `service_role` continua a poder
nomear o primeiro administrador, senão não haveria forma de arrancar.

Para nomear alguém a partir do SQL editor do Supabase:

```sql
update public.profiles set role = 'admin' where id = '<uuid do utilizador>';
```

**O que o painel faz:** visão geral (utilizadores, ativos, treinos, séries,
volume, leads, prontidão, mercados), séries por dia nos últimos 30 dias,
exercícios mais usados, gestão do catálogo (criar, editar, ocultar, carregar
imagem ou vídeo, escrever a orientação nos dois idiomas) e gestão de papéis.

O painel está escrito em pt-PT fixo, sem passar pelo dicionário: é uma
retaguarda para o cliente, não uma superfície do produto.

## Conteúdo dos exercícios

`exercises` ganhou `media_url`, `media_type` (`image` | `video`), `created_by` e
`updated_at`. `exercise_translations` ganhou `procedure`, `breathing` e
`action_feel` — procedimento, respire e sentimento de acção.

A media vive no balde público `exercises` (leitura para toda a gente, escrita
só para administradores), até 25 MB, em JPG, PNG, WebP, GIF, MP4 ou WebM. O
caminho é `<id do exercício>/media.<ext>`, portanto substituir não deixa
ficheiros órfãos. GIFs animados são servidos com `<img>` em vez de
`next/image`, que perderia a animação.

A apresentação aparece no ecrã de configuração da série, antes de começar:
imagem ou vídeo, título e os três blocos, cada um só quando tem conteúdo.

## Cloudflare

### Domínio

1. Adiciona o domínio na Cloudflare e aponta os *nameservers* no registrador.
2. Na Vercel, em **Settings → Domains**, adiciona `<domínio>`,
   `www.<domínio>` e `painel.<domínio>`.
3. Na Cloudflare, cria os registos que a Vercel indicar — normalmente `A` para
   `76.76.21.21` na raiz e `CNAME` para `cname.vercel-dns.com` em `www` e
   `painel`. **Proxy status: DNS only (nuvem cinzenta).** Com o proxy laranja
   ligado sobre a Vercel acumulam-se duas CDNs e os certificados entram em
   conflito.
4. SSL/TLS na Cloudflare: modo **Full (strict)**.

Depois de o domínio responder, três sítios têm de mudar ao mesmo tempo — é o
desalinhamento entre eles que causa erros de redirecionamento no login:

- Vercel → variável `NEXT_PUBLIC_SITE_URL=https://<domínio>` (e novo *deploy*).
- Supabase → **Authentication → URL Configuration**: *Site URL* passa a
  `https://<domínio>`; em *Redirect URLs* acrescenta `https://<domínio>/**` e
  `https://painel.<domínio>/**`.
- Google Cloud Console → no cliente OAuth, *Authorized redirect URIs* mantém o
  callback do Supabase (`https://<projeto>.supabase.co/auth/v1/callback`) e
  *Authorized JavaScript origins* passa a incluir `https://<domínio>`.

### Turnstile

1. Cloudflare → **Turnstile → Add widget**. Domínios: `<domínio>` e
   `painel.<domínio>`. Modo *Managed*.
2. Copia a **Site Key** para a variável `NEXT_PUBLIC_TURNSTILE_SITE_KEY` na
   Vercel (e em `.env.local` para desenvolvimento).
3. Copia a **Secret Key** para o Supabase: **Authentication → Attack
   Protection → Enable CAPTCHA protection**, fornecedor *Turnstile*.

A verificação do token acontece no Supabase Auth, não na aplicação. É de
propósito: se fosse a aplicação a validar, alguém podia falar directamente com
o endpoint de autenticação do Supabase e saltar o desafio. A aplicação apenas
recusa cedo o formulário sem token, para poupar uma ida ao servidor.

O widget da Cloudflare injecta ele próprio o campo `cf-turnstile-response` no
contentor; não acrescentamos nenhum, senão haveria dois campos com o mesmo
nome no mesmo formulário.

**Nota para desenvolvimento:** depois de o CAPTCHA estar ligado no Supabase,
o login com palavra-passe deixa de funcionar sem um token válido, mesmo em
`localhost`. Põe `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no `.env.local` e acrescenta
`localhost` à lista de domínios do widget na Cloudflare.

Sem `NEXT_PUBLIC_TURNSTILE_SITE_KEY` definida, o widget não é desenhado e os
formulários funcionam como antes — o ambiente de desenvolvimento não precisa
de chaves.

Os tokens do Turnstile são de uso único: cada erro devolvido pelo servidor
repõe o widget, senão a segunda tentativa enviaria um token já gasto.
