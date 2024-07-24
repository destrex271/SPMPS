import express from "express"
import bodyParser from "body-parser"
import pg from "pg"
import bcrypt from "bcrypt"

const saltRounds = 10
const db = new pg.Client({
    user:"postgres",
    password:"admin",
    port:5432,
    host:"localhost",
    database:"spms"
})


db.connect()


const port = 3000
const app = express()

app.use(bodyParser.urlencoded({extended: true}))


app.get("/",(req,res)=>{
    res.json("/ route")
})

app.post("/register", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
  
    try {
      const checkResult = await db.query("SELECT * FROM users WHERE username = $1", [
        username,
      ]);
  
      if (checkResult.rows.length > 0) {
        res.send("Username already exists. Try logging in.");
      } else {
        bcrypt.hash(password, saltRounds, async (err, hash) => {
            await db.query(
              "INSERT INTO users (username, password) VALUES ($1, $2)",
              [username, hash]
            );
            res.json("User Created!");
        });
      }
    } catch (err) {
      console.log(err);
    }
  });


  app.post("/login", async (req, res) => {
    const username = req.body.username;
    const loginPassword = req.body.password;
  
    try {
      const result = await db.query("SELECT * FROM users WHERE username = $1", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;

        bcrypt.compare(loginPassword, storedHashedPassword, (err, result) => {
          if (err) {
            res.json(err)
          } else {
            if (result) {
              res.json("Login Success!");
            } else {
              res.json("Incorrect Password");
            }
          }
        });
      } else {
        res.send("User not found");
      }
    } catch (err) {
      res.send(err);
    }
  });


app.put("/update", async (req, res) => {
    const username = req.body.username;
    const loginPassword = req.body.password;
    const newPassword = req.body.newPassword;

    try {
        const response = await db.query("SELECT * from users where username = $1", [username]);

        if (response.rows.length === 0) {
            return res.status(404).json("User not found");
        }

        const storedHashedPassword = response.rows[0].password;

        bcrypt.compare(loginPassword, storedHashedPassword, async (err, result) => {
            if (err) {
                return res.status(500).json(err.message);
            }

            if (result) {
                bcrypt.hash(newPassword, 10, async (err, hash) => {
                    if (err) {
                        return res.status(500).json(err.message);
                    }
                    await db.query("UPDATE users SET password = $1 WHERE username = $2", [hash, username]);
                    res.json("Password Updated!");
                });
            } else {
                res.json("Incorrect Password");
            }
        });
    } catch (err) {
        res.status(500).json(err.message);
    }
});




app.listen(port,()=>{
    console.log("Server started on port "+port)
})