# Publicar o Cookbook

Este guia publica a aplicação através do GitHub na Vercel e liga-lhe um
subdomínio gerido na OVHcloud. Nos exemplos é usado
`receitas.seudominio.pt`; substitui-o pelo endereço real.

## 1. Preparar o código

Na pasta `web`, confirmar que a versão de produção está saudável:

```powershell
cd web
npm install
npm run lint
npm test
npm run build
```

Depois, guardar as alterações num commit e enviá-las para a branch `main` do
repositório GitHub. A Vercel só recebe o que estiver efetivamente no GitHub.

Antes de continuar, confirmar também que os scripts SQL necessários foram
executados na Supabase e que `.env.local` não aparece nos ficheiros do commit.

## 2. Criar o projeto na Vercel

1. Entrar em [vercel.com](https://vercel.com/) com a conta GitHub.
2. Escolher **Add New → Project**.
3. Importar `NotAnnieMore/cookbook`.
4. Em **Root Directory**, escolher `web`.
5. Manter **Framework Preset: Next.js** e os comandos detetados automaticamente.
6. Antes do primeiro deploy, abrir **Environment Variables** e adicionar:

   | Nome | Valor | Ambiente |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Production e Preview |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave pública/publishable | Production e Preview |
   | `GEMINI_API_KEY` | chave privada do Google AI Studio | Production e Preview |

7. Confirmar que `GEMINI_API_KEY` não começa por `NEXT_PUBLIC_`.
8. Premir **Deploy** e esperar pelo endereço temporário `*.vercel.app`.

Se uma variável for alterada depois do deploy, criar um novo deployment para a
alteração entrar em vigor.

## 3. Testar o endereço da Vercel

Antes de ligar o domínio, testar no endereço `*.vercel.app`:

- login de Ivo e Ana;
- criar e editar uma receita;
- carregar e substituir uma fotografia;
- importar texto e uma ligação;
- favorito e atualização em tempo real em dois dispositivos;
- Modo Cozinhar e temporizadores;
- descarregar uma cópia de segurança.

## 4. Adicionar o subdomínio na Vercel

1. No projeto Vercel, abrir **Settings → Domains**.
2. Adicionar `receitas.seudominio.pt`.
3. A Vercel mostrará o registo DNS necessário. Para um subdomínio será
   normalmente um `CNAME`.
4. Copiar o destino mostrado pela Vercel exatamente como aparece. Não usar um
   destino encontrado noutro tutorial, porque a Vercel pode apresentar um valor
   específico para o projeto.

## 5. Criar o CNAME na OVHcloud

Não é necessário mover o domínio, contratar outro alojamento nem criar uma zona
DNS independente para o subdomínio.

1. Entrar no **OVHcloud Control Panel**.
2. Abrir **Web Cloud → Zonas DNS** e escolher `seudominio.pt`.
3. Procurar se já existe um registo com o subdomínio `receitas`.
4. Se existir um `A`, `AAAA` ou `CNAME` para esse mesmo nome, removê-lo apenas
   depois de confirmar que já não é usado. Dois destinos concorrentes impedem a
   configuração correta.
5. Escolher **Adicionar uma entrada → CNAME**.
6. Em **Subdomínio**, escrever apenas `receitas`.
7. Em **Destino**, colar o valor fornecido pela Vercel.
8. Manter o TTL predefinido e confirmar.

Não alterar os registos `MX`, SPF, DKIM ou outros registos do domínio principal;
eles podem estar a servir o email e não são necessários para esta ligação.

Se os servidores DNS ativos do domínio não forem da OVHcloud, o CNAME deve ser
criado no fornecedor que realmente gere esses servidores.

## 6. Esperar pela validação e HTTPS

Voltar a **Vercel → Settings → Domains**. Quando o DNS propagar, o domínio passa
a válido e a Vercel configura HTTPS. A atualização costuma ser rápida, mas a
propagação DNS pode demorar até 24 horas.

Abrir então:

```text
https://receitas.seudominio.pt
```

## 7. Atualizar os URLs na Supabase

Na Supabase, abrir **Authentication → URL Configuration**:

1. Definir **Site URL** como `https://receitas.seudominio.pt`.
2. Em **Redirect URLs**, adicionar:

```text
https://receitas.seudominio.pt/**
http://127.0.0.1:3000/**
http://localhost:3000/**
```

Para testar autenticação em previews da Vercel, pode também ser acrescentado o
padrão de preview indicado pela documentação da Supabase. Em produção, manter o
endereço final exato como `Site URL`.

## 8. Verificação final

- confirmar que HTTP redireciona para HTTPS;
- testar login e logout no subdomínio;
- abrir uma fotografia privada e uma receita em cada conta;
- testar em telemóvel a instalação da PWA;
- confirmar que nenhum segredo aparece no GitHub ou no código enviado ao browser;
- verificar **Vercel → Logs** depois dos primeiros testes.

## Referências oficiais

- [Deploy de repositórios Git na Vercel](https://vercel.com/docs/git)
- [Next.js na Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Configuração DNS na OVHcloud](https://help.ovhcloud.com/csm/en-gb-documentation-web-cloud-domains-dns-configuration?id=kb_browse_cat&kb_category=3733f35841f8fa104a4e42ace3ea4ea3&kb_id=e17b4f25551974502d4c6e78b7421955)
- [URLs de redirecionamento da Supabase](https://supabase.com/docs/guides/auth/redirect-urls)
