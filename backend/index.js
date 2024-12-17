import express from "express";
import bodyParser from "body-parser";
import { createServer } from 'http';
import { loginUser, registerUser, updateUser, authenticateToken, loginUserWithEmail } from "./controller/user.js";
import { bookSlot, getSlots, getSlotsByLocation, updateSlot, createSlot,addVehicle,getVehicles} from "./controller/parking.js";
import {createSession, endSession, getSessionsForLot, getUserFromVehicle} from './controller/devices.js'
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
import {Server} from 'socket.io'
import { db } from "./controller/common.js";

const userSockets = new Map();

const upload = multer({ dest: 'uploads/' })

const secretKey = "secretkey";

const saltRounds = 10

const port = 3000;
const app = express();
const httpL = createServer(app)

const socketIO = new Server(httpL, { cors: { origin: '*' } })
socketIO.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  console.log(`⚡: ${socket.id} ${userId} user just connected`);
  
  // Check if the user already has sockets stored
  if (userSockets.has(userId)) {
      // If so, add this new socket ID to the array
      userSockets.get(userId).push(socket.id);
  } else {
      // Otherwise, create a new array with this socket ID
      userSockets.set(userId, [socket.id]);
  }

  console.log("Queryyy", socket.handshake.query);

  socket.on('disconnect', () => {
      console.log(`Socket ${socket.id} disconnected`);

      // Remove the socket from the user's socket array
      const userSocketArray = userSockets.get(userId);
      if (userSocketArray) {
          const updatedSockets = userSocketArray.filter(id => id !== socket.id);
          if (updatedSockets.length > 0) {
              userSockets.set(userId, updatedSockets); // Update with remaining sockets
          } else {
              userSockets.delete(userId); // Remove user if no sockets remain
          }
      }
  });
});

const sendNotification = (targetUserId, title, messageBody, amt) => {
  const targetSockets = userSockets.get(targetUserId); // Get the array of socket IDs for the target user

  if (targetSockets && targetSockets.length > 0) {
      const message = {
          title: title,
          body: messageBody,
          amt: amt
      };

      // Emit the notification to all connected sockets for the user
      targetSockets.forEach(socketId => {
          socketIO.to(socketId).emit('notification', JSON.stringify(message));
          console.log(`Notification sent to ${targetUserId} on socket ${socketId}:`, JSON.stringify(message));
      });
  } else {
      console.log(`User ${targetUserId} is not connected.`);
  }
};


const sendVideoFeed = (targetUserId, title, messageBody, imagePath) => {
  const targetSockets = userSockets.get(targetUserId); // Get the array of socket IDs for the target user

  let imageData = null;
  try {
      // Read the image file and encode it as a Base64 string
      const imageBuffer = fs.readFileSync(imagePath);
      imageData = `data:image/${getImageType(imagePath)};base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
      console.error(`Error reading image file: ${error.message}`);
      imageData = null;
  }

  if (targetSockets && targetSockets.length > 0) {
      const message = {
          title: title,
          body: messageBody,
          image: imageData
      };

      // Emit the notification to all connected sockets for the user
      targetSockets.forEach(socketId => {
          socketIO.to(socketId).emit('videofeed', JSON.stringify(message));
          console.log(`Video feed sent to ${targetUserId} on socket ${socketId}:`, JSON.stringify(message));
      });
  } else {
      console.log(`User ${targetUserId} is not connected.`);
  }
};

const getImageType = (imagePath) => {
  const extension = imagePath.split('.').pop().toLowerCase();
  return extension === 'jpg' ? 'jpeg' : extension; // Use 'jpeg' for 'jpg' files
};

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

// app.listen(port, () => {
//   console.log("Server started on port " + port);
// });


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


app.post('/vid_monitor', async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const image = req.files.image; // Ensure 'image' matches the form field name
  const uploadPath = path.join("uploads", `${Date.now()} - ${image.name}`); // Add timestamp for uniqueness

  console.log(uploadPath);

  image.mv(uploadPath, async (err) => {
    if (err) {
      return res.status(500).send(err);
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    try {
      // Call ANPR function to get license number
      const data = await PromptGemini(__dirname + "/" + uploadPath);
      const licenseNumber = data; // Assuming PromptGemini returns the license number

      console.log("Registering", licenseNumber);

      for(const licNum of licenseNumber){
        const userId = await getUserFromVehicle(licNum) 
        console.log(userId, __dirname + "/" + uploadPath)
        sendVideoFeed(userId, "Session started for "+ licenseNumber, `Session has been started for your vehicle at parking location: #ADD LOCATION`, __dirname + "/" + uploadPath)
      }

      console.log("Removing image from local storage");
      fs.rm(uploadPath, () => {
        console.log("Removed image successfully");
      });
      return res.status(201).json({ message: "Sent Video Feed"});
    } catch (err) {
      console.error("Error processing the request:", err);
      return res.status(500).json({ message: "Error processing request", err });
    }
  });
});

// ANPR API
app.post('/upload', async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const image = req.files.image; // Ensure 'image' matches the form field name
  const uploadPath = path.join("uploads", `${Date.now()} - ${image.name}`); // Add timestamp for uniqueness

  console.log(uploadPath);

  image.mv(uploadPath, async (err) => {
    if (err) {
      return res.status(500).send(err);
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    try {
      // Call ANPR function to get license number
      const data = await PromptGemini(__dirname + "/" + uploadPath);
      const licenseNumber = data; // Assuming PromptGemini returns the license number

      console.log("Registering", licenseNumber);

      for(const licNum of licenseNumber){
        const userId = await getUserFromVehicle(licNum) 
        console.log(userId, __dirname + "/" + uploadPath)
        sendVideoFeed(userId, "Session started for "+ licenseNumber, `Session has been started for your vehicle at parking location: #ADD LOCATION`, __dirname + "/" + uploadPath)
      }

      // Prepare request object to simulate API call
      const sessionRequest = {
        body: {
          vehicleNumber: licenseNumber,
          sessionActive: true,
          lot_id: req.body.lot_id || 1  // Assuming lot_id is provided in the request, fallback to default lot_id if missing
        }
      };

      // Start the parking session by creating an entry in ParkingSession
      const sessionResponse = await createSession(sessionRequest);

      if (sessionResponse.status === 409) {
        return res.status(409).json({ message: "Active session already exists", data: sessionResponse });
      }else if(sessionResponse.status == 500){
          return res.status(500).json({message: "Car not registered!", err: sessionResponse})
      }

      console.log("Session created:", sessionResponse);

      // Clean up image after processing
      console.log("Removing image from local storage");
      fs.rm(uploadPath, () => {
        console.log("Removed image successfully");
      });

      for(const licNum of licenseNumber){
        const userId = await getUserFromVehicle(licNum) 
        console.log(userId)

        sendNotification(userId, "Session started for "+ licenseNumber, `Session has been started for your vehicle at parking location: #ADD LOCATION`, null)
      }
      return res.status(201).json({ message: "Session created", data: sessionResponse });
    } catch (err) {
      console.error("Error processing the request:", err);
      return res.status(500).json({ message: "Error processing request", err });
    }
  });
});


app.put('/endSession/:lot_id', async (req, res) => {
  const lotId = req.params.lot_id;  // Extract lot_id from the URL

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const uploadedImages = req.files; // Get all the uploaded images
  const licenseNumbers = []; // Array to store the detected license numbers

  // Ensure 'uploadedImages' is an array of files, even if only one image is uploaded
  const imageFiles = Array.isArray(uploadedImages.image) ? uploadedImages.image : [uploadedImages.image];

  for (const image of imageFiles) {
    const uploadPath = path.join("uploads", `${Date.now()}-${image.name}`); // Unique filename for each image

    console.log("Saving image to: ", uploadPath);

    // Save each image to the server
    try {
      await image.mv(uploadPath); // Move the image to the upload folder

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      // Call ANPR function to get the license number from the image
      const data = await PromptGemini(__dirname + "/" + uploadPath);
      console.log("LIC NUMS:", data)
      for(const dt of data){
        licenseNumbers.push(dt); // Add the license number to the list
      }

    } catch (err) {
      console.error("Error processing the request for image:", image.name, err);
      return res.sendStatus(500)
    }
  }

  console.log("Saved Images! Doing ANPR")
  try {
    // Get all car plates with active sessions for the given lot
    const activeSessions = await getSessionsForLot(lotId);
    console.log("Active sessions:", activeSessions);

    // Find sessions that are not in the list of detected license numbers
    const endedSessions = [] 
    
    for (var i = 0; i < activeSessions.length; i++) {
      let sessionPlateNumber = activeSessions[i]['plate_number'];

      // If licenseNumbers is empty, all sessions are considered ended
      if (licenseNumbers.length == 0) {
        endedSessions.push(sessionPlateNumber);
      } else {
        // Check if session plate number is not in licenseNumbers
        let found = false;
        for (var j = 0; j < licenseNumbers.length; j++) {
          if (sessionPlateNumber === licenseNumbers[j]) {
            found = true;
            break;
          }
        }
        if (!found) {
          endedSessions.push(sessionPlateNumber);
        }
      }
    }

    console.log("ending sessions for -> ", endedSessions)

    // End sessions for cars that are no longer in the lot
    for (const plate of endedSessions) {
      console.log(`Ending session for license plate: ${plate}`);
      const resp = await endSession(plate);  // Call the function to end the session
      if(resp == -1){
        res.send().json({"message": "unable to end session", err: resp})
      }
      
      // Fetch User for this car and send notification to end session
      let user_id = await getUserFromVehicle(plate)
      console.log(`Bill for ${user_id} -> ${resp}`)
      sendNotification(user_id, "Session Ended", "Session for your vehicle " + plate + " has ended. Tap to pay -> Rs. " + resp, resp)
    }

    // Return the list of detected license numbers and the ended sessions
    res.sendStatus(200)

  } catch (err) {
    console.error("Error retrieving sessions or ending sessions:", err);
    return res.status(500).json({ message: "Error ending sessions", error: err });
  }
});

app.post("/addvehicle", async(req, res) => {
  console.log(req.body);
  const plateNumber = req.body.plateNumber;
  const vehicleName = req.body.vehicleName;
  const vehicleType = req.body.vehicleType;
  const userid = req.body.userId;


  const resp = await addVehicle(plateNumber, vehicleName, vehicleType, userid);
  res.json(resp);
});

app.post("/getvehicle", async (req, res) => {
  console.log("Request Body:", req.body);
  const { userId } = req.body;

  const response = await getVehicles(userId);
  res.json(response);
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


app.post("/send_notif", async(req, res) => {
  sendNotification(req.body.userId, "Title", "Hello", 200)
  res.sendStatus(200)
})


httpL.listen(port)
