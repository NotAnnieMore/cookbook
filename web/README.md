# Cookbook Web

Interface web/PWA do Cookbook, construída com Next.js, React, TypeScript e Tailwind CSS.

## Comandos

```powershell
npm install
npm run dev
npm run lint
npm run build
```

O servidor de desenvolvimento usa `http://127.0.0.1:3000` por defeito.

## Estado

A primeira fatia funcional está ligada à coleção partilhada na Supabase:

- layout responsivo para telemóvel e tablet/desktop;
- navegação inferior e sidebar;
- pesquisa sobre receitas reais;
- criação manual com doses, tempos, ingredientes e passos;
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

A importação por website, TikTok, Instagram e texto continua marcada como a próxima
fase. A IA será usada como fallback quando a extração estruturada não for suficiente.

O contexto completo encontra-se em `../Cookbook_Project_Context/`.
