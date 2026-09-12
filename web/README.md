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
- apresentação progressiva em grupos de 12 cartões; as fotografias privadas dos
  grupos seguintes só recebem URLs assinados quando se aproximam do ecrã;
- criação manual com doses, tempo ativo e tempo total em escrita natural (`6h`,
  `4h 30min` ou `45min`), ingredientes e passos;
- edição com aviso Realtime e controlo de versão no servidor;
- fotografia principal substituível no Storage privado, com recorte 3:2 escolhido
  antes do upload, validação e conversão para WebP;
- galeria privada por receita com até 12 fotografias, recorte 3:2, compressão,
  navegação por swipe, ampliação e remoção confirmada;
- avaliações individuais de 1 a 5 com edição, remoção, feedback do Chef Pitéu e
  sincronização em tempo real, sem média conjunta;
- caixote temporário e restauro;
- grupos de ingredientes e secções de preparação;
- escala visual de doses por números inteiros de pessoas, de uma em uma, com
  apresentação métrica legível;
- intervalos como `2–3` e embalagens como `1 lata de 397 g`;
- conversões de medidas americanas com preservação dos valores originais;
- referência portuguesa de 200 ml por pacote de natas, mantendo a medida original;
- etiquetas partilhadas e filtros por favorito, duração, dificuldade e etiqueta;
- favoritos sem refresh integral, com coração preenchido e reação temporária do
  Chef Pitéu apenas depois da confirmação da Supabase;
- importação de texto com parser determinístico, rate limit e preview obrigatório;
- importação por URL com proteção SSRF, limites de rede, Schema.org, fallback HTML e preview obrigatório;
- fallback com Gemini 3.5 Flash-Lite na importação por URL e por texto para
  organizar conteúdo difícil e traduzir receitas estrangeiras para PT-PT;
- auditoria opcional com Gemini no preview, acionada manualmente e sem modificar
  ou guardar automaticamente os dados extraídos;
- tradução assistida limitada aos campos textuais, preservando quantidades,
  unidades e origem; respostas com números sem correspondência na fonte são
  rejeitadas antes do preview;
- importação TikTok por oEmbed, limpeza de links de partilha, parsing de listas inline,
  grupos e hashtags, remoção de emojis, normalização de espaços e capitalização
  dos ingredientes e passos;
- preview parcial com os ingredientes encontrados quando a descrição pública não
  contém preparação, deixando um passo vazio para completar manualmente;
- importação Instagram para posts e reels, com limpeza do link, leitura dos
  metadados públicos e fallback assistido para colar a descrição;
- fallback final por URL Context do Gemini para páginas públicas e OCR explícito
  de até quatro capturas JPEG/PNG/WebP; as imagens são verificadas pelo conteúdo,
  limitadas a 8 MB no total, enviadas ao Gemini e nunca persistidas pelo Cookbook;
- indicação visual do método de captação e da contribuição da IA em cada preview;
- vocabulário determinístico alargado para títulos e verbos culinários comuns,
  marcadores copiados de redes sociais, embalagens/saquetas, fatias e medidas
  europeias em centilitros/decilitros;
- cartões de destaque com dimensões estáveis e cor complementar escolhida a partir da fotografia;
- skeletons de navegação e de análise de imagem, sem flashes da paleta provisória;
- leitura completa de cada receita;
- Modo Cozinhar opcional com seletor de receita, checklist local, passos grandes,
  progresso persistido no dispositivo, swipe, vários temporizadores por passo,
  avisos visuais/notificações, ingredientes em bottom sheet e Screen Wake Lock
  quando suportado;
- Modo Cozinhar ajustado à altura do dispositivo, com cartão estável e controlos
  de navegação sempre visíveis; só o interior de passos longos tem deslocamento;
- duração dos temporizadores escrita de forma natural no formulário (`10min`,
  `1h` ou `1h 30min`), com contagem baseada numa hora final para continuar certa
  quando o navegador limita a atividade em segundo plano, opção de parar todos
  ao terminar e limpeza automática da sessão concluída;
- seleção opcional dos ingredientes usados em cada passo e respetivo painel
  contextual no Modo Cozinhar, sem retirar o acesso à lista completa;
- favoritos individuais persistidos;
- página Descoberta com escolha aleatória geral ou temática por favoritas,
  receitas rápidas, fáceis e etiquetas existentes, com botão e swipe;
- bottom sheet de criação/importação;
- PWA base com manifesto, ícones do Cookbook, ação de instalação e experiência
  standalone; o service worker guarda apenas assets públicos e estáticos;
- paleta, hierarquia e acessibilidade base.

O projeto Supabase está ligado e a primeira camada de autenticação está implementada:

- login privado por email e palavra-passe, sem registo público;
- sessões Supabase em cookies com renovação através do Proxy do Next.js;
- redirecionamento obrigatório para `/login` quando não existe uma sessão válida;
- identificação do perfil ativo e logout;
- schema com RLS, Realtime e Storage privado preparado no projeto remoto;
- atualização em tempo real da coleção e dos favoritos entre Ivo e Ana.

A leitura do texto visível em capturas já está disponível como fallback explícito.
A eventual transcrição do áudio ou envio de vídeos completos permanece posterior.

O contexto completo encontra-se em `../Cookbook_Project_Context/`.
