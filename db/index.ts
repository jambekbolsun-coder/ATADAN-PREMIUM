import { attachDatabasePool } from "@vercel/functions";
import { Pool, types, type PoolClient } from "pg";
import { POSTGRES_SCHEMA_SQL } from "./postgres-schema";

types.setTypeParser(types.builtins.INT8, Number);
types.setTypeParser(types.builtins.NUMERIC, Number);

type DbResult<T = Record<string, unknown>> = {
  results: T[];
  meta: { changes: number };
};

type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;
const globalDb = globalThis as typeof globalThis & { __atadanPool?: Pool };

function databaseUrl() {
  const value = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!value) throw new Error("DATABASE_URL is unavailable. Connect the Neon database to this project.");
  return value;
}

function pool() {
  if (!globalDb.__atadanPool) {
    globalDb.__atadanPool = new Pool({ connectionString: databaseUrl(), max: 8 });
    attachDatabasePool(globalDb.__atadanPool);
  }
  return globalDb.__atadanPool;
}

function translateSql(source: string) {
  let sql = source.replace(/`([^`]+)`/g, '"$1"');
  sql = sql.replace(/datetime\(\s*'now'\s*,\s*'-(\d+) days'\s*\)/gi, "(CURRENT_TIMESTAMP - INTERVAL '$1 days')");
  sql = sql.replace(/datetime\(\s*'now'\s*\)/gi, "CURRENT_TIMESTAMP");
  sql = sql.replace(/substr\(\s*([a-zA-Z0-9_.]+)\s*,\s*1\s*,\s*10\s*\)/gi, "to_char($1, 'YYYY-MM-DD')");
  sql = sql.replace(/json_extract\(\s*([a-zA-Z0-9_.]+)\s*,\s*'\$\.([a-zA-Z0-9_]+)'\s*\)/gi, "($1::jsonb ->> '$2')");
  sql = sql.replace(/([a-zA-Z0-9_.]+)\s+COLLATE\s+NOCASE/gi, "LOWER($1)");
  let parameter = 0;
  return sql.replace(/\?/g, () => `$${++parameter}`);
}

export class PreparedStatement {
  constructor(private readonly sql: string, private readonly values: unknown[] = []) {}

  bind(...values: unknown[]) {
    return new PreparedStatement(this.sql, values);
  }

  async execute<T = Record<string, unknown>>(client: Queryable = pool()): Promise<DbResult<T>> {
    const result = await client.query(translateSql(this.sql), this.values);
    return { results: result.rows as T[], meta: { changes: result.rowCount ?? 0 } };
  }

  async all<T = Record<string, unknown>>() {
    return this.execute<T>();
  }

  async first<T = Record<string, unknown>>() {
    const result = await this.execute<T>();
    return result.results[0] ?? null;
  }

  async run() {
    return this.execute();
  }
}

class AtadanDatabase {
  prepare(sql: string) {
    return new PreparedStatement(sql);
  }

  async batch(statements: PreparedStatement[]) {
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      const results = [];
      for (const statement of statements) results.push(await statement.execute(client));
      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

const database = new AtadanDatabase();
let initialized: Promise<void> | null = null;

export function getDb() {
  return database;
}

export function getRawDb() {
  return database;
}

export async function ensureDb() {
  if (initialized) return initialized;
  initialized = (async () => {
    const client = await pool().connect();
    try {
      await client.query("SELECT pg_advisory_lock(hashtext('atadan-schema-v1'))");
      await client.query(POSTGRES_SCHEMA_SQL);
    } finally {
      await client.query("SELECT pg_advisory_unlock(hashtext('atadan-schema-v1'))").catch(() => undefined);
      client.release();
    }
  })().catch((error) => {
    initialized = null;
    throw error;
  });
  return initialized;
}
