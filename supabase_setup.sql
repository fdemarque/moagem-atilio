-- ==============================================================================
-- SCRIPT DE CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- PROJETO: MOAGEM ATÍLIO - CONTROLE DE MOVIMENTAÇÃO DE SACARIAS
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(100) NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Inserção de Usuários Iniciais (se ainda não existirem)
INSERT INTO usuarios (usuario, senha)
VALUES 
    ('pai', '#Atilio1975!'),
    ('backup', '#Atilio1975!')
ON CONFLICT (usuario) DO NOTHING;

-- 2. Tabela de Clientes (Permite cadastrar clientes sem movimentação inicial)
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) UNIQUE NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Movimentações de Sacaria
CREATE TABLE IF NOT EXISTS movimentacoes_sacaria (
    id SERIAL PRIMARY KEY,
    cliente VARCHAR(150) NOT NULL,
    tipo_movimentacao VARCHAR(3) NOT NULL CHECK (tipo_movimentacao IN ('IN', 'OUT')),
    tipo_sacaria VARCHAR(10) NOT NULL CHECK (tipo_sacaria IN ('normal', 'pequena')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
    documentos TEXT[] DEFAULT '{}',
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Índices recomendados para desempenho
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes (nome);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_cliente ON movimentacoes_sacaria (cliente);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_sacaria (data_movimentacao);

-- 4. Desativação de Row Level Security (RLS) conforme solicitado
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_sacaria DISABLE ROW LEVEL SECURITY;

-- 4. Criação do Bucket de Storage 'comprovantes' (Público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para upload e leitura pública do bucket comprovantes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Leitura publica de comprovantes'
    ) THEN
        CREATE POLICY "Leitura publica de comprovantes"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'comprovantes');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Upload publico de comprovantes'
    ) THEN
        CREATE POLICY "Upload publico de comprovantes"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'comprovantes');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Delete publico de comprovantes'
    ) THEN
        CREATE POLICY "Delete publico de comprovantes"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'comprovantes');
    END IF;
END $$;
