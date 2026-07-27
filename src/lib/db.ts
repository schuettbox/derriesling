import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Lazy-Initialisierung: Der Client wird erst beim ersten Query erstellt,
 * nicht beim Import. So bricht `next build` (Sammeln der Seitendaten) nicht
 * ab, wenn DATABASE_URL zur Build-Zeit fehlt — die Queries laufen ohnehin
 * erst zur Laufzeit (alle DB-Seiten sind dynamisch).
 */
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL fehlt. In der lokalen .env bzw. in den Vercel-Umgebungsvariablen setzen."
    );
  }
  const sql = neon(connectionString);
  _db = drizzle(sql, { schema });
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
