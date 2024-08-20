const db = new pg.Client({
    user: "postgres",
    password: "admin",
    port: 5432,
    host: "localhost",
    database: "spms",
});

db.connect();

const secretKey = "secretkey";

const saltRounds = 10;

module.exports = {db, secretKey, saltRounds}