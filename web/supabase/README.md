# Supabase

O schema declarativo encontra-se em `schemas/` e será a fonte de verdade.

Depois de criar o projeto remoto:

1. copiar `.env.example` para `.env.local` e preencher as duas variáveis públicas;
2. num projeto vazio, executar `schemas/01_core.sql` no SQL Editor;
3. executar `schemas/02_storage.sql` no SQL Editor;
4. desativar registo público e criar manualmente os utilizadores Ivo e Ana;
5. editar os dois emails e executar `setup/01_household_ivo_ana.sql`;
6. confirmar que a consulta final devolve os membros Ana e Ivo;
7. antes de produção, configurar a Supabase CLI e transformar os schemas em migrations versionadas.

Nunca colocar a secret key/service-role no browser nem em variáveis `NEXT_PUBLIC_*`.
