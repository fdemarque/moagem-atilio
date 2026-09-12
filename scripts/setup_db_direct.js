import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

// Senha do .env
const password = '#Atilio1975!';
const projectRef = 'mnnjxbqyeuedisibwcjc';

// Host direto do Supabase
const hosts = [
  `db.${projectRef}.supabase.co`,
  `aws-0-sa-east-1.pooler.supabase.com`,
  `aws-0-us-east-1.pooler.supabase.com`
];

async function tryConnect() {
  for (const host of hosts) {
    console.log(`Tentando conectar em ${host}:5432...`);
    const client = new Client({
      host,
      port: 5432,
      database: 'postgres',
      user: host.includes('pooler') ? `postgres.${projectRef}` : 'postgres',
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log(`✅ Conexão bem-sucedida com ${host}!`);

      // Lê e executa o script SQL
      const sql = fs.readFileSync('supabase_setup.sql', 'utf-8');
      console.log('Executando supabase_setup.sql...');
      await client.query(sql);
      console.log('✅ supabase_setup.sql executado com sucesso!');

      // Também adiciona explicitamente políticas permissivas caso RLS seja mantido por padrão pelo Supabase
      const permissiveSql = `
        ALTER TABLE IF EXISTS usuarios DISABLE ROW LEVEL SECURITY;
        ALTER TABLE IF EXISTS movimentacoes_sacaria DISABLE ROW LEVEL SECURITY;

        -- Garantir permissões de acesso aos roles anon e authenticated
        GRANT ALL ON TABLE usuarios TO anon, authenticated, service_role;
        GRANT ALL ON TABLE movimentacoes_sacaria TO anon, authenticated, service_role;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
      `;
      await client.query(permissiveSql);
      console.log('✅ Permissões e desativação de RLS aplicadas!');

      await client.end();
      return true;
    } catch (err) {
      console.error(`Falha ao conectar em ${host}:`, err.message);
      try { await client.end(); } catch (e) {}
    }
  }
  return false;
}

tryConnect().then(success => {
  if (success) {
    console.log('Banco de dados configurado com sucesso!');
    process.exit(0);
  } else {
    console.log('Não foi possível conectar diretamente ao Postgres.');
    process.exit(1);
  }
});
