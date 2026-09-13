const { Client } = require('pg');

async function fixDb() {
  const client = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.mnnjxbqyeuedisibwcjc',
    password: '#Atilio1975!',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to DB');

  // 1. Criar tabela clientes se não existir
  await client.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(150) UNIQUE NOT NULL,
      criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes (nome);
  `);
  console.log('1. Tabela clientes verificada.');

  // 2. Desativar RLS
  await client.query(`
    ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
    ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
    ALTER TABLE movimentacoes_sacaria DISABLE ROW LEVEL SECURITY;
  `);
  console.log('2. RLS desativado.');

  // 3. Criar políticas públicas permissivas
  await client.query(`
    DROP POLICY IF EXISTS "Permitir tudo em usuarios" ON usuarios;
    CREATE POLICY "Permitir tudo em usuarios" ON usuarios FOR ALL TO public USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Permitir tudo em clientes" ON clientes;
    CREATE POLICY "Permitir tudo em clientes" ON clientes FOR ALL TO public USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Permitir tudo em movimentacoes_sacaria" ON movimentacoes_sacaria;
    CREATE POLICY "Permitir tudo em movimentacoes_sacaria" ON movimentacoes_sacaria FOR ALL TO public USING (true) WITH CHECK (true);
  `);
  console.log('3. Políticas públicas criadas.');

  // 4. Inserir/Atualizar usuarios
  await client.query(`
    INSERT INTO usuarios (usuario, senha)
    VALUES 
      ('atilio', '#Atilio1975!'),
      ('pai', '#Atilio1975!'),
      ('backup', '#Atilio1975!')
    ON CONFLICT (usuario) DO UPDATE SET senha = EXCLUDED.senha;
  `);
  console.log('4. Usuários atualizados.');

  const resUsers = await client.query('SELECT id, usuario, senha FROM usuarios');
  console.log('Usuários no banco:', resUsers.rows);

  const resTables = await client.query(`
    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'
  `);
  console.log('Tabelas públicas:', resTables.rows);

  await client.end();
}

fixDb().catch(e => {
  console.error('Erro ao corrigir banco:', e);
  process.exit(1);
});
