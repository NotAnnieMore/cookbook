# Cookbook

Cookbook é uma aplicação privada para guardar, consultar e cozinhar receitas em
conjunto. A experiência é desenhada primeiro para telemóvel e tablet, com uma
linguagem visual quente, editorial e assumidamente culinária.

## O que já funciona

- autenticação privada para contas criadas manualmente;
- coleção de receitas partilhada entre os membros da casa;
- criação manual com doses, tempo ativo, tempo total em horas/minutos, dificuldade, ingredientes e passos;
- edição protegida contra conflitos entre dispositivos;
- fotografia principal privada, com enquadramento 3:2 escolhido pelo utilizador,
  validação e otimização automática para WebP;
- caixote temporário com restauro de receitas;
- grupos de ingredientes e secções de preparação;
- ajuste temporário das quantidades ao número de pessoas;
- intervalos de quantidade e tamanho real de latas/embalagens;
- medidas europeias por defeito, conversões americanas e referências por ingrediente;
- importação de texto com preservação da fonte e preview editável obrigatório;
- importação segura de páginas públicas por URL, com Schema.org, fallback HTML e preview;
- adaptador TikTok via oEmbed, com separação automática de listas inline e grupos,
  remoção de emojis e limpeza de espaços repetidos;
- etiquetas e filtros combináveis;
- painéis de destaque na coleção e na receita com paleta adaptativa derivada da fotografia;
- autoria visível e favoritos individuais;
- pesquisa por receita, ingrediente, autor ou etiqueta, destaque aleatório e
  página completa de cada receita;
- sincronização em tempo real de receitas e favoritos;
- interface responsiva com navegação própria para telemóvel e tablet/desktop;
- Row Level Security e armazenamento privado preparados na Supabase.

## Stack

- Next.js 16 e React 19;
- TypeScript e Tailwind CSS 4;
- Supabase Auth, Postgres, Realtime e Storage;
- Zod para validação dos dados recebidos no servidor.

## Estrutura

```text
web/
├── src/app/          # páginas, rotas dinâmicas e Server Actions
├── src/components/   # interface reutilizável
├── src/lib/          # clientes Supabase e tipos de domínio
└── supabase/         # schema, políticas RLS, Realtime e Storage
```

Os ficheiros de contexto de produto e as referências visuais são material local
de trabalho e não fazem parte do repositório público.

## Configuração local

É necessário Node.js 20.9 ou superior e um projeto Supabase dedicado.

```powershell
cd web
npm install
Copy-Item .env.example .env.local
npm run dev
```

Preencher `.env.local` sem o adicionar ao Git:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

No SQL Editor da Supabase, executar pela ordem indicada:

1. `web/supabase/schemas/01_core.sql`
2. `web/supabase/schemas/02_storage.sql`
3. Criar manualmente os utilizadores em Authentication
4. Ajustar e executar `web/supabase/setup/01_household_ivo_ana.sql`

A aplicação fica disponível em `http://127.0.0.1:3000`.

## Verificação

```powershell
cd web
npm run lint
npm test
npm run build
```

## Próximas fases

- substituição da fotografia principal e galeria;
- adaptador dedicado para Instagram e extração multimodal de vídeos;
- extração estruturada com IA apenas como fallback;
- modo cozinha com gestos, progresso e temporizadores;
- backups exportáveis e recuperação testada.

## Deploy

Na Vercel, configurar `web` como **Root Directory**. As variáveis da Supabase
devem ser definidas diretamente nas Environment Variables do projeto e nunca
incluídas no repositório.
