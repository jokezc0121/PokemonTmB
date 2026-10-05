alter table public.usuario add column if not exists pokemon_favorito_id bigint;

do $$ begin
  alter table public.usuario add constraint usuario_pokemon_favorito_fk
    foreign key (pokemon_favorito_id) references public.pokemon(id) on delete set null;
exception when duplicate_object then null; end $$;
