import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const secretKey = "secretkey";

const saltRounds = 10;
const db = new pg.Client({
  user: "postgres",
  password: "admin",
  port: 5432,
  host: "localhost",
  database: "spms",
});

db.connect();

const port = 3000;
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json("Welcome to SPMS");
});

app.post("/register", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username],
    );

    if (checkResult.rows.length > 0) {
      res.send("Username already exists. Try logging in.");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        await db.query(
          "INSERT INTO users (username, password) VALUES ($1, $2)",
          [username, hash],
        );
        res.json("User Created!");
      });
    }
  } catch (err) {
    console.log(err);
  }
});

const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];
  console.log(token);
  if (!token) return res.sendStatus(403);

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

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

      bcrypt.compare(loginPassword, storedHashedPassword, (err, match) => {
        if (err) {
          res.json(err);
        } else {
          if (match) {
            const token = jwt.sign({ username: user.username }, secretKey, {
              expiresIn: "1h",
            });
            res.json({ message: "Login Success!", token: token });
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

app.put("/update", authenticateToken, async (req, res) => {
  const username = req.body.username;
  const loginPassword = req.body.password;
  const newPassword = req.body.newPassword;

  try {
    const response = await db.query("SELECT * from users where username = $1", [
      username,
    ]);

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
          await db.query("UPDATE users SET password = $1 WHERE username = $2", [
            hash,
            username,
          ]);
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

app.post("/bookslot", authenticateToken, async (req, res) => {
  const parkingId = req.body.parkingId;
  const userId = req.body.userId;
  try {
    await db.query("INSERT INTO Parking_lot(parkingId,userId) values($1,$2)", [
      parkingId,
      userId,
    ]);
    res.json("Slot Booked!");
  } catch (err) {
    res.json(err);
  }
});

app.listen(port, () => {
  console.log("Server started on port " + port);
});


// ---------------------------------------------------------------------------

app.get("/get_all_slots", authenticateToken, async(req, res) => {
    await db.query("SELECT * FROM Parking_lot", (error, results) => {
        if(error){
            throw error
        }
        res.status(200).json(results.row)
    });
})

app.get("/get_slot_by_location", authenticateToken, async(req, res) => {
    await db.query("SELECT * FROM Parking_lot WHERE location_id = ($1)", 
        [req.body.locationId],
        (errors, results) =>{
            if(error) throw error
            res.status(200).json(results.row)
        }
    );
})

app.put("/updateslot", authenticateToken, async(req, res) => {
    await db.query("UPDATE Parking_lot SET available_slots=$1 isOpen=$2 WHERE id=$3", 
        [req.body.available_slots, req.body.isOpen, req.body.pslotId],
    (errors, results) =>{
        if(errors) res.status(500).json({"error": "Unable to update"});
        res.status(200).json({"msg": "Updated!"})
    })
})

app.post("/createslot", authenticateToken, async(req, res) => {
    await db.query("INSERT INTO Parking_lot VALUES($1, $2, $3, $4, $5, $6)", 
    [req.body.lot_id, req.body.lot_name, req.body.location_id, req.body.total_slots, 
    req.body.vacant_slots, req.body.total_revenue],
    (errors, results) => {
        if(errors) res.status(500).json({"error": "Unable to insert"})
    })
})
