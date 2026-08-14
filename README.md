# AXON Mind-Muscle — MVP

Aplicação web de orientação e acompanhamento de treino de musculação.
Funciona no navegador e instala-se no ecrã inicial como uma aplicação (PWA).

> Entre a intenção e a contração existe um caminho mensurável.

---

## Estado atual

Esta fase entrega a **fundação da plataforma** — a base sobre a qual as
ferramentas de treino vão assentar:

- Sistema de design completo, derivado do Manual de Marca (Agosto 2026)
- Autenticação: email + palavra-passe e Google, com confirmação de email e
  recuperação de acesso
- Gestão de utilizadores: perfil, calibração inicial, preferências, tema
- Dois mercados no mesmo produto: Portugal (pt-PT, EUR, MB WAY) e Brasil
  (pt-BR, BRL, Pix)
- Duas landing pages: uma para o público de resultado, outra para o público
  técnico
- Instalação no telemóvel e página de estado offline

**Fora do âmbito desta fase** (por decisão da proposta): metrónomo visual,
painel de prontidão, tutoriais, Professor AXON, comunidade, pontos e
pagamentos. As entradas para estas ferramentas já existem na interface,
marcadas honestamente como em desenvolvimento.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 15 (App Router, React 19, TypeScript) |
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
│   │   └── (app)/            área privada: hoje, progresso, comunidade, perfil, conta
│   ├── auth/                 callback OAuth e confirmação de email
│   └── globals.css           sistema de design (tokens, escalas, materiais)
├── components/
│   ├── brand/                logo em SVG, extraído do manual de marca
│   ├── ui/                   primitivas: botão, campo, lista, segmentado, ícones
│   ├── marketing/            cabeçalho, rodapé, demonstrações
│   ├── app/                  barra de separadores, cabeçalho, formulários
│   └── theme.tsx             tema claro/escuro sem cintilação inicial
├── lib/
│   ├── i18n/                 locales, dicionários pt-PT e pt-BR, mercados
│   ├── supabase/             clientes browser/servidor/middleware e tipos
│   ├── auth/                 ações de servidor
│   └── routes.ts             segmentos de rota com prefixo de idioma
└── middleware.ts             negociação de idioma + sessão + guardas de acesso
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

Desenvolvido por [kaueramone.dev](https://kaueramone.dev)
