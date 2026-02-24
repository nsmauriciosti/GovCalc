import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import { supabase } from "./supabaseClient";
import path from "path";
import { fileURLToPath } from "url";
import { 
  CR_VALOR, 
  SITUACAO_QUADRA, 
  TOPOGRAFIA, 
  PEDOLOGIA, 
  PAVIMENTACAO, 
  MELHORAMENTOS, 
  TIPO_OCUPACAO, 
  PADRAO_CONSTRUTIVO, 
  ELEMENTO_CONSTRUTIVO, 
  CONDOMINIO_VERTICAL 
} from "./constants";
import { MOCK_LOGRADOUROS } from "./dataService";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3002;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Initialize Supabase with seed data if empty
  const { count: logradouroCount, error: logError } = await supabase.from('logradouros').select('*', { count: 'exact', head: true });
  if (logError) {
    console.error("Error checking logradouros table:", logError.message);
  } else if (logradouroCount === 0) {
    console.log("Seeding logradouros to Supabase...");
    await supabase.from('logradouros').insert(MOCK_LOGRADOUROS);
  }

  const { count: configCount, error: configCheckError } = await supabase.from('config').select('*', { count: 'exact', head: true });
  if (configCheckError) {
    console.error("Error checking config table:", configCheckError.message);
  } else if (configCount === 0) {
    console.log("Seeding config to Supabase...");
    await supabase.from('config').insert([
      { key: 'crValor', value: String(CR_VALOR) },
      { key: 'aiEnabled', value: 'false' },
      { key: 'faviconUrl', value: '/favicon.ico' }
    ]);
  }

  const { count: factorsCount, error: factorsCheckError } = await supabase.from('factors').select('*', { count: 'exact', head: true });
  if (factorsCheckError) {
    console.error("Error checking factors table:", factorsCheckError.message);
  } else if (factorsCount === 0) {
    console.log("Seeding factors to Supabase...");
    const allFactors = [
      ...SITUACAO_QUADRA.map(f => ({ ...f, type: 'situacaoQuadra' })),
      ...TOPOGRAFIA.map(f => ({ ...f, type: 'topografia' })),
      ...PEDOLOGIA.map(f => ({ ...f, type: 'pedologia' })),
      ...PAVIMENTACAO.map(f => ({ ...f, type: 'pavimentacao' })),
      ...MELHORAMENTOS.map(f => ({ ...f, type: 'melhoramentos' })),
      ...TIPO_OCUPACAO.map(f => ({ ...f, type: 'tipoOcupacao' })),
      ...PADRAO_CONSTRUTIVO.map(f => ({ ...f, type: 'padraoConstrutivo' })),
      ...ELEMENTO_CONSTRUTIVO.map(f => ({ ...f, type: 'elementoConstrutivo' })),
      ...CONDOMINIO_VERTICAL.map(f => ({ ...f, type: 'condominioVertical' })),
    ];
    await supabase.from('factors').insert(allFactors);
  }

  const { error: imoveisError } = await supabase.from('imoveis').select('*', { count: 'exact', head: true });
  if (imoveisError) {
    console.error("Error checking imoveis table:", imoveisError.message);
  }

  // API Routes
  app.get("/api/init", async (req, res) => {
    try {
      const { data: configRows, error: configError } = await supabase.from('config').select('*');
      if (configError) throw configError;

      const configMap: any = {};
      configRows.forEach(row => {
        configMap[row.key] = row.key === 'crValor' ? parseFloat(row.value) : 
                             row.key === 'aiEnabled' ? row.value === 'true' : row.value;
      });

      const { data: factors, error: factorsError } = await supabase.from('factors').select('*');
      if (factorsError) throw factorsError;

      const factorsMap: any = {};
      factors.forEach(f => {
        if (!factorsMap[f.type]) factorsMap[f.type] = [];
        factorsMap[f.type].push({ label: f.label, value: f.value, multiplier: f.multiplier });
      });

      res.json({
        config: {
          ...configMap,
          ...factorsMap
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to load config" });
    }
  });

  app.get("/api/logradouros", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || String(q).length < 2) return res.json([]);
      
      const term = String(q).trim();
      const { data: logs, error } = await supabase
        .from('logradouros')
        .select('*')
        .or(`nome.ilike.%${term}%,codigo.ilike.%${term}%`)
        .limit(50);
      
      if (error) throw error;
      res.json(logs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.post("/api/admin/config", async (req, res) => {
    try {
      const { crValor, aiEnabled, faviconUrl } = req.body;
      const updates = [];
      if (crValor !== undefined) updates.push({ key: 'crValor', value: String(crValor) });
      if (aiEnabled !== undefined) updates.push({ key: 'aiEnabled', value: String(aiEnabled) });
      if (faviconUrl !== undefined) updates.push({ key: 'faviconUrl', value: String(faviconUrl) });
      
      const { error } = await supabase.from('config').upsert(updates);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Update failed" });
    }
  });

  app.post("/api/admin/factors", async (req, res) => {
    try {
      const { type, factors } = req.body;
      // Delete existing factors of this type
      const { error: deleteError } = await supabase.from('factors').delete().eq('type', type);
      if (deleteError) throw deleteError;

      // Insert new factors
      const { error: insertError } = await supabase.from('factors').insert(
        factors.map((f: any) => ({ ...f, type }))
      );
      if (insertError) throw insertError;

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Update failed" });
    }
  });

  app.get("/api/imoveis", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || String(q).length < 3) return res.json([]);
      
      const term = String(q).trim();
      const { data: imoveis, error } = await supabase
        .from('imoveis')
        .select('*')
        .or(`inscricao.ilike.%${term}%,m_nome.ilike.%${term}%`)
        .limit(20);
      
      if (error) throw error;
      res.json(imoveis);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.post("/api/admin/imoveis/import", async (req, res) => {
    try {
      const { imoveis } = req.body;
      if (!Array.isArray(imoveis)) throw new Error("Invalid data");

      // We use upsert to avoid duplicates if they import multiple times
      const { error } = await supabase.from('imoveis').upsert(imoveis, { onConflict: 'inscricao' });
      if (error) throw error;

      res.json({ success: true, count: imoveis.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Import failed" });
    }
  });

  app.post("/api/admin/logradouros/import", async (req, res) => {
    try {
      const { logradouros } = req.body;
      if (!Array.isArray(logradouros)) throw new Error("Invalid data");

      // Replace all logradouros
      const { error: deleteError } = await supabase.from('logradouros').delete().neq('id', 0); // Delete all
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase.from('logradouros').insert(logradouros);
      if (insertError) throw insertError;

      res.json({ success: true, count: logradouros.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Import failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    app.use(express.static(path.resolve(__dirname, "dist")));
    
    // Handle SPA fallback
    app.use((req, res) => {
      if (req.path.startsWith('/api')) return res.status(404).json({error: 'Not found'});
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
