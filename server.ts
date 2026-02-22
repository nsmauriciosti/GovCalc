import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import db from "./db";
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
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Initialize DB with seed data if empty
  const logradouroCount = db.prepare('SELECT COUNT(*) as count FROM logradouros').get() as { count: number };
  if (logradouroCount.count === 0) {
    console.log("Seeding logradouros...");
    const insert = db.prepare('INSERT INTO logradouros (codigo, nome, sequencia, vu_pvg) VALUES (@codigo, @nome, @sequencia, @vu_pvg)');
    const insertMany = db.transaction((logs) => {
      for (const log of logs) insert.run(log);
    });
    insertMany(MOCK_LOGRADOUROS);
  }

  const configCount = db.prepare('SELECT COUNT(*) as count FROM config').get() as { count: number };
  if (configCount.count === 0) {
    console.log("Seeding config...");
    const insert = db.prepare('INSERT INTO config (key, value) VALUES (?, ?)');
    insert.run('crValor', String(CR_VALOR));
    insert.run('aiEnabled', 'false');
    insert.run('faviconUrl', '/favicon.ico');
  }

  const factorsCount = db.prepare('SELECT COUNT(*) as count FROM factors').get() as { count: number };
  if (factorsCount.count === 0) {
    console.log("Seeding factors...");
    const insert = db.prepare('INSERT INTO factors (type, label, value, multiplier) VALUES (@type, @label, @value, @multiplier)');
    const insertMany = db.transaction((type, items) => {
      for (const item of items) insert.run({ ...item, type });
    });
    
    insertMany('situacaoQuadra', SITUACAO_QUADRA);
    insertMany('topografia', TOPOGRAFIA);
    insertMany('pedologia', PEDOLOGIA);
    insertMany('pavimentacao', PAVIMENTACAO);
    insertMany('melhoramentos', MELHORAMENTOS);
    insertMany('tipoOcupacao', TIPO_OCUPACAO);
    insertMany('padraoConstrutivo', PADRAO_CONSTRUTIVO);
    insertMany('elementoConstrutivo', ELEMENTO_CONSTRUTIVO);
    insertMany('condominioVertical', CONDOMINIO_VERTICAL);
  }

  // API Routes
  app.get("/api/init", (req, res) => {
    try {
      const configRows = db.prepare('SELECT * FROM config').all() as { key: string, value: string }[];
      const configMap: any = {};
      configRows.forEach(row => {
        configMap[row.key] = row.key === 'crValor' ? parseFloat(row.value) : 
                             row.key === 'aiEnabled' ? row.value === 'true' : row.value;
      });

      const factors = db.prepare('SELECT * FROM factors').all() as any[];
      const factorsMap: any = {};
      
      // Group factors by type
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

  app.get("/api/logradouros", (req, res) => {
    try {
      const { q } = req.query;
      if (!q || String(q).length < 2) return res.json([]);
      
      const term = String(q).trim();
      // Simple LIKE search for SQLite (in MySQL would be similar)
      const logs = db.prepare(`
        SELECT * FROM logradouros 
        WHERE nome LIKE ? OR codigo LIKE ? 
        LIMIT 50
      `).all(`%${term}%`, `%${term}%`);
      
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.post("/api/admin/config", (req, res) => {
    try {
      const { crValor, aiEnabled, faviconUrl } = req.body;
      const update = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
      if (crValor !== undefined) update.run('crValor', String(crValor));
      if (aiEnabled !== undefined) update.run('aiEnabled', String(aiEnabled));
      if (faviconUrl !== undefined) update.run('faviconUrl', String(faviconUrl));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Update failed" });
    }
  });

  app.post("/api/admin/factors", (req, res) => {
    try {
      const { type, factors } = req.body;
      // Replace all factors of a type
      const deleteStmt = db.prepare('DELETE FROM factors WHERE type = ?');
      const insertStmt = db.prepare('INSERT INTO factors (type, label, value, multiplier) VALUES (@type, @label, @value, @multiplier)');
      
      const replaceFactors = db.transaction(() => {
        deleteStmt.run(type);
        for (const f of factors) insertStmt.run({ ...f, type });
      });
      
      replaceFactors();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Update failed" });
    }
  });

  app.post("/api/admin/logradouros/import", (req, res) => {
    try {
      const { logradouros } = req.body; // Expects array of logradouros
      if (!Array.isArray(logradouros)) throw new Error("Invalid data");

      const insert = db.prepare('INSERT INTO logradouros (codigo, nome, sequencia, vu_pvg) VALUES (@codigo, @nome, @sequencia, @vu_pvg)');
      const deleteAll = db.prepare('DELETE FROM logradouros'); // Optional: clear before import? Or append? usually replace for PVG updates.
      
      // Let's assume full replacement for "Importação PVG"
      const importTx = db.transaction(() => {
        deleteAll.run();
        for (const log of logradouros) insert.run(log);
      });

      importTx();
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
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
