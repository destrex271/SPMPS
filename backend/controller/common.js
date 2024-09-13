
import { neon } from '@neondatabase/serverless';

const db = neon('postgresql://capstone2024_owner:unDWCG8wVZ4N@ep-morning-wind-a6hz097f.us-west-2.aws.neon.tech/capstone2024?sslmode=require');

const pg_version = await db('SELECT version()');
console.log(pg_version)
export { db };
