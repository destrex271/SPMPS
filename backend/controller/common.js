
import { neon } from '@neondatabase/serverless';

import { config } from 'dotenv';

config()

console.log()

const db = neon(process.env.connection_string)
const pg_version = await db('SELECT version()');
console.log(pg_version)
export { db };
