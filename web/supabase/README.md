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

Num projeto que já tenha recebido os dois schemas antes da funcionalidade de
substituição de fotografias, executar também
`setup/02_shared_image_replacement.sql`. Este ajuste permite que Ivo ou Ana
substituam uma fotografia da coleção, mesmo quando foi o outro membro a enviá-la.

Num projeto Cookbook já existente, executar também
`setup/03_step_ingredients.sql`. Esta migração permite associar vários
ingredientes a cada passo sem alterar as receitas guardadas anteriormente.

Executar depois `setup/04_security_hardening.sql`. O script não altera receitas:
retira privilégios ao papel anónimo, volta a confirmar RLS em todas as tabelas e
garante que o bucket de fotografias permanece privado. As consultas finais devem
mostrar `rowsecurity = true` em todas as linhas e `public = false` no bucket.

A página **Mais → Segurança dos dados** permite descarregar uma cópia JSON dos
dados visíveis à conta autenticada, incluindo as fotografias em base64. O ficheiro
é privado e deve ser guardado fora do repositório.

Nunca colocar a secret key/service-role no browser nem em variáveis `NEXT_PUBLIC_*`.
