import express from "express";
import bodyParser from "body-parser";
import { loginUser, registerUser, updateUser, authenticateToken, loginUserWithEmail } from "./controller/user.js";
import { bookSlot, getSlots, getSlotsByLocation, updateSlot, createSlot} from "./controller/parking.js";
import {createSession, endSession} from './controller/devices.js'
import swaggerUi from 'swagger-ui-express'
import swaggerFile from './swagger_output.json' with {type: 'json'};
import cors from 'cors'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import fileUpload from "express-fileupload";
import path from "path";
import multer from "multer";
import { PromptGemini } from "./controller/anpr.js";

import { fileURLToPath } from 'url';

const upload = multer({ dest: 'uploads/' })

const secretKey = "secretkey";

const saltRounds = 10

const port = 3000;
const app = express();

app.use(fileUpload());
app.use(cors())
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerFile))

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json())


app.get("/", (req, res) => {
  res.json("Welcome to SPMS");
});

// const authenticateToken = (req, res, next) => {
//   const token = req.headers["authorization"];
//   console.log(token);
//   if (!token) return res.sendStatus(403);
//
//   jwt.verify(token, secretKey, (err, user) => {
//     console.log(err)
//     if (err) return res.sendStatus(403);
//     console.log(req)
//     req.user = user;
//     next();
//   });
// };

// User APIs
app.post("/register", async (req, res) => {
  console.log(req.body)
  console.log(req)
  const username = req.body.username;
  const password = req.body.password;
  const first_name = req.body.first_name;
  const last_name = req.body.last_name;
  const mobile_number = req.body.mobile_number;
  console.log(username, password, first_name, last_name, mobile_number)
  const response = await registerUser(username, password, first_name, last_name, mobile_number)
  res.json(response)
});

app.post("/login", async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const loginPassword = req.body.password;
  let data
  if(username != undefined){
    data = await loginUser(username, loginPassword)
  }else{
    data = await loginUserWithEmail(email, loginPassword)
  }
  res.json(data)
});

app.put("/update", authenticateToken, async (req, res) => {
  try {
    const { username, password: loginPassword, newPassword } = req.body;
    
    if (!username || !loginPassword || !newPassword) {
      return res.status(400).json({ status: 400, message: "Missing required fields" });
    }

    console.log("Updating user:", username);

    // Call the updateUser function and handle the response
    const data = await updateUser(username, loginPassword, newPassword);
    
    console.log("Update result:", data);
    
    // Send the response back to the client
    res.status(data.status).json(data);
  } catch (err) {
    console.error("Error processing update request:", err);
    res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
});

app.post("/bookslot", authenticateToken, async (req, res) => {
  const parkingId = req.body.parkingId;
  const userId = req.body.userId;
  const data = await bookSlot(parkingId, userId)
  res.json(data)
});

app.listen(port, () => {
  console.log("Server started on port " + port);
});


// ---------------------------------------------------------------------------

app.get("/get_all_slots", authenticateToken, async(req, res) => {
    const data = await getSlots();
    res.json(data)
})

// app.get("/get_slot_by_location", authenticateToken, async(req, res) => {
app.get("/get_slot_by_location", async(req, res) => {
    const data = await getSlotsByLocation(req.query.pincode, req.query.latitude, req.query.longitude, req.query.radius)
    res.json(data)
})

app.put("/updateslot", authenticateToken, async(req, res) => {
    const data = await updateSlot(req)
    res.json(data)
})

app.post("/createslot", async(req, res) => {
    const data = await createSlot(req)
    res.json(data)
})
const __dirname = "uploads"
// ANPR API
app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
  }
  
  const image = req.files.image; // Ensure 'image' matches the form field name
  const uploadPath = path.join("uploads", `${Date.now()} - ${image.name}`); // Add timestamp for uniqueness

  console.log(uploadPath)
  
  image.mv(uploadPath, async (err) => {
      if (err) {
          return res.status(500).send(err);
      }
    
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      // PromptGemini(__dirname + "/" + uploadPath)
      const data = await PromptGemini(__dirname+"/"+uploadPath)
      console.log("registering ", data)
      console.log("Removing image from local storage")
      fs.rm(uploadPath, () => {
        console.log("Removed image sucessfully")
      })
      return res.json(data).status(201)
  });
});


// -----------------------------------
// Parking Session APIs

app.post("/createSession", authenticateToken, async(req, res) => {
    const data = await createSession(req)
    res.json(data)
})


app.put("/endSession", authenticateToken, async(req, res) => {

    const data = await endSession(req)
    res.json(data)
})


// -----------------------------------

app.post("/addedMasterDevice", authenticateToken, async(req, res) => {
    const data = await addMasterDevice(req)
    res.json(data)
})


app.post("/addedSlaveDevice", authenticateToken, async(req, res) => {
  const data = await addSlaveDevice(req)
  res.json(data)
})
