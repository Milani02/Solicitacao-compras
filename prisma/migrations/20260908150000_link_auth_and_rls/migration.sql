-- Liga profiles.id à tabela auth.users do Supabase (schema gerenciado pelo
-- Supabase, fora do controle de migrations do Prisma). Se o usuário for
-- removido do Supabase Auth, o profile correspondente é removido junto.
alter table "public"."profiles"
  add constraint "profiles_id_fkey"
  foreign key ("id") references "auth"."users"("id") on delete cascade;

-- Row Level Security: nega por padrão qualquer acesso via chaves anon/authenticated
-- (PostgREST/client-side). Toda a leitura e escrita de dados de negócio desta
-- aplicação passa pelo servidor Next.js, que conecta como role com privilégio
-- direto (Prisma) ou usa a service_role key (Supabase Admin API), ambos não
-- afetados por RLS. Nenhuma policy é criada propositalmente: o acesso público
-- direto ao banco deve permanecer bloqueado.
alter table "public"."profiles" enable row level security;
alter table "public"."setores" enable row level security;
alter table "public"."centros_custo" enable row level security;
alter table "public"."solicitacoes_compra" enable row level security;
alter table "public"."itens_solicitacao" enable row level security;
alter table "public"."fornecedores" enable row level security;
alter table "public"."cotacoes_item" enable row level security;
alter table "public"."historico_status" enable row level security;
alter table "public"."counters" enable row level security;
