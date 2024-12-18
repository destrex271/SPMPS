import {db} from './common.js'

// export const createSession = async (req) => {
//     try{
//         const data = await db("INSERT INTO ParkingSession(vehicle_id, session_active, start_time, end_time, lot_id) VALUES($1, $2, $3, $4, $5)",
//             [req.body.vehicleNumber, req.body.sessionActive, Date.now()/1000, null, req.body.lot_id])
//         return {"status": 201, "data": data}
//     }catch(err){
//         return {"status": 500, "err": err}
//     }
// }


export const getUserFromVehicle = async (licNum) => {
    try{
      console.log(licNum)
      const res = await db("SELECT user_id FROM vehicle where plate_number=$1", [licNum])
      console.log(res)
      return res[0]['user_id']
    }catch (err) {
        return undefined
    }
}

export const createSession = async (req) => {
    try {
      const activeSession = await db(
        "SELECT * FROM parkingsession WHERE vehicle_id = $1 AND session_active = true",
        [req.body.vehicleNumber[0]] // Access the first element of the array
      );
  
      console.log(req.body);
      console.log('Num.....');    
  
      if (activeSession.length > 0) {
        console.log(`Vehicle ${req.body.vehicleNumber[0]} already has an active session.`);
        return { status: 409, message: "Session already active." }; // Conflict status
      }
  
      const vehicleId = req.body.vehicleNumber[0]; // Access the first element of the array
      const data = await db(
        "INSERT INTO parkingsession (vehicle_id, session_active, start_time, lot_id) VALUES ($1, $2, NOW(), $3)",
        [vehicleId, req.body.sessionActive, req.body.lot_id]
      );
  
      return { status: 201, message: "Session created." };
    } catch (err) {
      console.error(err); 
      return { status: 500, err: err }; // Return the error response
    }
  };
  

export const getSessionsForLot = async (lotId) => {
    try{
        const sessions = await db("SELECT plate_number FROM parkingsession INNER JOIN vehicle ON vehicle.plate_number = parkingsession.vehicle_id WHERE parkingsession.session_active=true AND lot_id=$1;", [lotId])
        return sessions
    }catch{
        return undefined
    }
}
  
export const endSession = async (plateNum) => {
    try {
        console.log("Sending!");

        // Set the end time for the session
        await db("UPDATE ParkingSession SET end_time = NOW() WHERE vehicle_id=$1", [plateNum]);

        // Query the start_time and end_time for the session
        const sessionData = await db(
            "SELECT start_time, end_time FROM ParkingSession WHERE vehicle_id=$1 AND session_active=$2", 
            [plateNum, true]
        );

        // if (sessionData.rows.length === 0) {
        //     throw new Error("Session not found or inactive.");
        // }

        const { start_time, end_time } = sessionData[0];

        // Deactivate the session
        await db("UPDATE ParkingSession SET session_active=$1 WHERE vehicle_id=$2", [false, plateNum]);

        // Calculate the difference in minutes
        const startTime = new Date(start_time);
        const endTime = new Date(end_time);
        const differenceInMinutes = (endTime - startTime) / (1000 * 60); // Convert ms to minutes

        return differenceInMinutes * 0.1;
    } catch (err) {
        console.log("ERROR", err);
        return -1;
    }
};


export const addMasterDevice = async(req) => {
    try{
        const data = await db("INSERT INTO MasterDevice VALUES($1, $2)",
    [req.body.masterMac, req.body.lotId])
        return {"status": 201, "data": data}
    }catch(err){
        return {"status": 500, "err": err}
    }
}


// module.exports = {createSession, endSession, addMasterDevice, addSlaveDevice}
