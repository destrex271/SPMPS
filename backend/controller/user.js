import pg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { db } from "./common.js"; 

const secretKey = "secretkey";

const saltRounds = 10;


export const registerUser = async (username, password) => {
    // const username = req.body.username;
    // const password = req.body.password;
  
    try {
      const checkResult = await db.query(
        "SELECT * FROM users WHERE username = $1",
        [username],
      );
  
      if (checkResult.rows.length > 0) {
        return {"status":400 ,"err": "Username already exists. Try logging in."};
      } else {
        bcrypt.hash(password, saltRounds, async (err, hash) => {
          await db.query(
            "INSERT INTO users (username, password) VALUES ($1, $2)",
            [username, hash],
          );
          return {"status": 201, "msg": "User Created!"};
        });
      }
    } catch (err) {
      console.log(err);
      return {"status": 500, "err": err}
    }
};

export const loginUser = async (username, password) => {
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
                return {"status": 200, message: "Login Success!", token: token };
              } else {
                return {"status": 400, "message": "Invalid selection"}
              }
            }
          });
        } else {
          return {"status": 404, "err": "User not found"};
        }
      } catch (err) {
        return {"status": 500, "err": err}
      }
}

export const updateUser = async (username, oldPassword, newPassword) => {
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
}

export const authenticateToken = (req, res, next) => {
    const token = req.headers["authorization"];
    console.log(token);
    if (!token) return res.sendStatus(403);
  
    jwt.verify(token, secretKey, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

// module.exports = {registerUser, authenticateToken, loginUser, updateUser}