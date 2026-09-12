import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Client } = pg;

const pgClient = new Client({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.mnnjxbqyeuedisibwcjc',
  password: '#Atilio1975!',
  ssl: { rejectUnauthorized: false }
});

async function configureAndTest() {
  await pgClient.connect();

  // Permite select em storage.buckets
  await pgClient.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'buckets' AND schemaname = 'storage' AND policyname = 'Allow public select on buckets'
      ) THEN
        CREATE POLICY "Allow public select on buckets"
        ON storage.buckets FOR SELECT
        USING (true);
      END IF;
    END $$;
  `);

  await pgClient.end();

  // Agora testa com supabase-js
  const supabase = createClient(
    'https://mnnjxbqyeuedisibwcjc.supabase.co',
    'sb_publishable_7sDiKC9uh4Bl7v33vovDVg_ehGFMSPT'
  );

  console.log('Listando buckets via Supabase JS...');
  const { data: buckets, error: errBuckets } = await supabase.storage.listBuckets();
  console.log('Buckets:', buckets, 'Erro:', errBuckets);

  console.log('Testando upload no bucket comprovantes...');
  const testBuffer = Buffer.from('comprovante teste 123', 'utf-8');
  const fileName = `teste_${Date.now()}.txt`;
  const { data: upData, error: upError } = await supabase.storage
    .from('comprovantes')
    .upload(`testes/${fileName}`, testBuffer, {
      contentType: 'text/plain',
      upsert: true
    });

  if (upError) {
    console.error('❌ Erro no upload:', upError);
  } else {
    console.log('✅ Upload com sucesso:', upData);
    const { data: pubUrl } = supabase.storage
      .from('comprovantes')
      .getPublicUrl(`testes/${fileName}`);
    console.log('✅ URL pública gerada:', pubUrl.publicUrl);
  }
}

configureAndTest();
