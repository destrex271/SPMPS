import pg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { db } from "./common.js"; 

const secretKey = "secretkey";

const saltRounds = 10;

export const registerUser = async (username, password, first_name, last_name, mob_no) => { 
    try {
      const checkResult = await db(
        `SELECT * FROM vehicleowner WHERE username = '${username}'`,
      );
      console.log(checkResult)
  
      if (checkResult.length > 0) {
        return {"status":400 ,"err": "Username already exists. Try logging in."};
      } else {
        bcrypt.hash(password, saltRounds, async (err, hash) => {
          const resj = await db(
            `INSERT INTO vehicleowner (username, passwd, first_name, last_name, mobile_number) VALUES ('${username}', '${hash}', '${first_name}', '${last_name}', '${mob_no}')`,
          );
          console.log(resj)
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
      // Fetch the user from the database
      const result = await db("SELECT * FROM vehicleowner WHERE username = $1", [username]);
      
      if (result.length > 0) {
          const user = result[0];
          const storedHashedPassword = user.passwd;

          // Compare passwords
          const match = await bcrypt.compare(password, storedHashedPassword);
          
          if (match) {
              // Generate a JWT token
              const token = jwt.sign({ username: user.username }, secretKey, { expiresIn: "1h" });
              console.log(user)
              return { status: 200, username: user['username'], message: "Login Success!", token, first_name: user['first_name'], last_name: user['last_name'], mob_no: user['mobile_number']};
          } else {
              return { status: 400, message: "Invalid password" };
          }
      } else {
          return { status: 404, message: "User not found" };
      }
  } catch (err) {
      console.error("Error during login:", err);
      return { status: 500, message: "Internal Server Error" };
  }
};

export const loginUserWithEmail = async (email, password) => {
  try {
      // Fetch the user from the database
      const result = await db("SELECT * FROM vehicleowner WHERE email = $1", [email]);
      
      if (result.length > 0) {
          const user = result[0];
          const storedHashedPassword = user.passwd;

          // Compare passwords
          const match = await bcrypt.compare(password, storedHashedPassword);
          
          if (match) {
              // Generate a JWT token
              const token = jwt.sign({ username: user.username }, secretKey, { expiresIn: "1h" });
              return { status: 200, message: "Login Success!", token, first_name: user['first_name'], last_name: user['last_name'], mob_no: user['mobile_number']};
          } else {
              return { status: 400, message: "Invalid password" };
          }
      } else {
          return { status: 404, message: "User not found" };
      }
  } catch (err) {
      console.error("Error during login:", err);
      return { status: 500, message: "Internal Server Error" };
  }
};


export const updateUser = async (username, oldPassword, newPassword) => {
  try {
      // Fetch user from the database
      const response = await db("SELECT * FROM vehicleowner WHERE username = $1", [username]);
      
      if (response.length === 0) {
          return { status: 404, message: "User not found" };
      }
      
      const storedHashedPassword = response[0].passwd;
      
      // Verify the old password
      const isMatch = await bcrypt.compare(oldPassword, storedHashedPassword);
      
      if (isMatch) {
          // Hash the new password
          const newHashedPassword = await bcrypt.hash(newPassword, 10);
          console.log(newHashedPassword)
          // Update the password in the database
          await db("UPDATE vehicleowner SET passwd = $1 WHERE username = $2", [newHashedPassword, username]);
          
          return { status: 200, message: "Password Updated!" };
      } else {
          return { status: 400, message: "Incorrect old password" };
      }
  } catch (err) {
      console.error("Error updating user:", err);
      return { status: 500, message: "Internal Server Error" };
  }
};

export const authenticateToken = (req, res, next) => {
  // Extract the token from the Authorization header
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  console.log("Token received:", token);

  if (!token) return res.sendStatus(401); // Unauthorized if no token is provided

  // Verify the token
  jwt.verify(token, secretKey, (err, user) => {
      if (err) {
          console.log("Token verification error:", err);
          return res.sendStatus(403); // Forbidden if the token is invalid
      }

      req.user = user; // Attach the decoded user information to the request
      next(); // Proceed to the next middleware or route handler
  });
};

// module.exports = {registerUser, authenticateToken, loginUser, updateUser}
