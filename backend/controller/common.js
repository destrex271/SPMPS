import pg from "pg";
export const db = new pg.Client({
    user: "postgres",
    password: "admin",
    port: 5432,
    host: "localhost",
    database: "spms",
  });
  
  db.connect();