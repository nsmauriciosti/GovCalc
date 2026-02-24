import db from './db';
import { supabase } from './supabaseClient';

async function migrate() {
  console.log('Starting migration to Supabase...');

  // 1. Migrate logradouros
  const logradouros = db.prepare('SELECT * FROM logradouros').all() as any[];
  if (logradouros.length > 0) {
    console.log(`Migrating ${logradouros.length} logradouros...`);
    const { error } = await supabase.from('logradouros').upsert(
      logradouros.map(l => ({
        codigo: l.codigo,
        nome: l.nome,
        sequencia: l.sequencia,
        vu_pvg: l.vu_pvg
      })),
      { onConflict: 'codigo' } // Assuming codigo is unique
    );
    if (error) console.error('Error migrating logradouros:', error);
  }

  // 2. Migrate config
  const configs = db.prepare('SELECT * FROM config').all() as any[];
  if (configs.length > 0) {
    console.log(`Migrating ${configs.length} configs...`);
    const { error } = await supabase.from('config').upsert(
      configs.map(c => ({
        key: c.key,
        value: c.value
      })),
      { onConflict: 'key' }
    );
    if (error) console.error('Error migrating config:', error);
  }

  // 3. Migrate factors
  const factors = db.prepare('SELECT * FROM factors').all() as any[];
  if (factors.length > 0) {
    console.log(`Migrating ${factors.length} factors...`);
    const { error } = await supabase.from('factors').upsert(
      factors.map(f => ({
        type: f.type,
        label: f.label,
        value: f.value,
        multiplier: f.multiplier
      }))
    );
    if (error) console.error('Error migrating factors:', error);
  }

  console.log('Migration finished.');
}

migrate();
