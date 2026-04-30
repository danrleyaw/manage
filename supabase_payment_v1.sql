-- ============================================================================
-- FUT MANAGER - PAGAMENTOS v1
-- Execute no SQL Editor do Supabase
-- ============================================================================

-- Adiciona coluna is_paid na tabela players
alter table public.players
  add column if not exists is_paid boolean not null default false;

-- ============================================================================
-- FIM
-- ============================================================================
