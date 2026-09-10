# Cookbook Web

Interface web/PWA do Cookbook, construída com Next.js, React, TypeScript e Tailwind CSS.

## Comandos

```powershell
npm install
npm run dev
npm run lint
npm test
npm run build
```

O servidor de desenvolvimento usa `http://127.0.0.1:3000` por defeito.

## Estado

A primeira fatia funcional está ligada à coleção partilhada na Supabase:

- layout responsivo para telemóvel e tablet/desktop;
- navegação inferior e sidebar;
- pesquisa por nome, ingrediente, autor ou etiqueta e filtros combináveis;
- criação manual com doses, tempos, ingredientes e passos;
- edição com aviso Realtime e controlo de versão no servidor;
- fotografia principal no Storage privado, validada e convertida para WebP;
- caixote temporário e restauro;
- grupos de ingredientes e secções de preparação;
- escala visual de doses com apresentação métrica legível;
- intervalos como `2–3` e embalagens como `1 lata de 397 g`;
- conversões de medidas americanas com preservação dos valores originais;
- etiquetas partilhadas e filtros por favorito, duração, dificuldade e etiqueta;
- importação de texto com parser determinístico, rate limit e preview obrigatório;
- importação por URL com proteção SSRF, limites de rede, Schema.org, fallback HTML e preview obrigatório;
- importação TikTok por oEmbed, limpeza de links de partilha e parsing de listas inline com emojis, grupos e hashtags;
- cartões de destaque na coleção e no detalhe com cor complementar escolhida a partir da fotografia;
- skeletons de navegação e de análise de imagem, sem flashes da paleta provisória;
- leitura completa de cada receita;
- favoritos individuais persistidos;
- escolha aleatória;
- bottom sheet de criação/importação;
- paleta, hierarquia e acessibilidade base.

O projeto Supabase está ligado e a primeira camada de autenticação está implementada:

- login privado por email e palavra-passe, sem registo público;
- sessões Supabase em cookies com renovação através do Proxy do Next.js;
- redirecionamento obrigatório para `/login` quando não existe uma sessão válida;
- identificação do perfil ativo e logout;
- schema com RLS, Realtime e Storage privado preparado no projeto remoto;
- atualização em tempo real da coleção e dos favoritos entre Ivo e Ana.

A próxima fase é o adaptador dedicado para Instagram e a extração multimodal dos
vídeos. A IA será usada como fallback quando a legenda, os dados estruturados e
o HTML não forem suficientes.

O contexto completo encontra-se em `../Cookbook_Project_Context/`.
