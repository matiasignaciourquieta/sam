import { Pool } from 'pg';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;

let poolConfig: ConstructorParameters<typeof Pool>[0];

if (databaseUrl) {
  const esRailway = databaseUrl.includes('railway') || databaseUrl.includes('rlwy.net');
  poolConfig = {
    connectionString: databaseUrl,
    ssl: esRailway ? { rejectUnauthorized: false } : false,
  };
} else {
  const host     = process.env.DB_HOST;
  const port     = process.env.DB_PORT;
  const user     = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !user || !database) {
    console.error('ERROR: define DATABASE_URL o las variables DB_HOST, DB_USER y DB_NAME en .env');
    process.exit(1);
  }

  const esRailway = host.includes('railway') || host.includes('rlwy.net');
  poolConfig = {
    host,
    port:     parseInt(port ?? '5432', 10),
    user,
    password,
    database,
    ssl: esRailway ? { rejectUnauthorized: false } : false,
  };
}

export const db = new Pool(poolConfig);

db.on('error', (err) => {
  console.error('Error inesperado en pool PostgreSQL:', err.message);
});
