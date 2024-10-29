import { db } from './common.js'

  
  export const addVehicle = async (plateNumber, vehicleName, vehicleType, userid) => {
      console.log(vehicleName);
      try {
          const resp = await db("INSERT into vehicle values($1, $2, $3, $4)", [plateNumber, vehicleName, vehicleType, userid]);
          return { "status": 200, "msg": "Vehicle Added!", "data": resp };
      } catch (err) {
          console.error("Error adding vehicle: ", err);
          return { "status": 400, "msg": "Unable to add vehicle", "err": err };
      }
  };
  
export const getVehicles = async (userId) => {
    console.log("User ID:", userId);
  
    try {
      const vehicleData = await db("SELECT * FROM vehicle WHERE user_id = $1", [userId]);
      console.log("Vehicle Data:", vehicleData);
  
      if (vehicleData) {
        return {
          status: 200,
          msg: "Vehicles retrieved successfully!",
          data: vehicleData,
        };
      }
    } catch (err) {
      console.error("Database Error:", err);
      return {
        status: 500,
        msg: "Internal Server Error",
        err: err,
      };
    }
  };
  
  

export const bookSlot = async (parkingId, userId) => {
    try {

        const slotCount = await db("SELECT vacant from Parking_lot where parkingID=$1", [parkingId])
        if(slotCount == 0) return {"status": 404, "msg": "No slots available!"}

        await db("INSERT INTO BookedSlots(parkingId,userId) values($1,$2)", [
          parkingId,
          userId,
        ]);

        const data = await db("SELECT * FROM BookedSlots where parkingID=$1 AND userID=$2",[
            parkingId,
            userId
        ])

        return {"status": 200, "msg": "Slot booked!", "data": data}
      } catch (err) {
        return {"status": 400, "msg": "Unable to book slot", "err": err}
      }
}

export const getSlots = async () => {
    try{
        console.log("Getting data....")
        const data = await db("SELECT * FROM Parking_lot INNER JOIN PLocation ON Plocation.location_id = Parking_lot.location_id")
        console.log("got -> ", data)
        return {"status": 200, "data": data}
    }catch(err){
        return {"status": 500, "msg": err}
    }
}

export const getSlotsByLocation = async (pincode, latitude, longitude, radius) => {
    console.log(pincode, latitude, longitude, radius)
    try{
        if(!latitude || !longitude){
            let dt = await db("SELECT * FROM Plocation WHERE pincode=$1", [pincode]);
            return {"status": 200, "data": dt}
        }
        let longi = parseFloat(longitude)
        let lat = parseFloat(latitude)
        console.log("Getting data....")
        const dc = await db(`SELECT *, 
                             ST_Y(Plocation.geog::geometry) AS longitude,
                             ST_X(Plocation.geog::geometry) AS latitude,
                             ST_Distance(Plocation.geog, ST_MakePoint($3, $4)::geography) / 1000 AS distance_km
                      FROM Plocation 
                      WHERE pincode = $1 
                      AND ST_DWithin(Plocation.geog, ST_MakePoint($3, $4)::geography, $2);`, 
                      [pincode, radius, lat, longi]);
        console.log(dc)

        return {"status": 200, "data": dc}
    }catch(err){
        console.log(err)
        return {"status": 500, "msg": err}
    }
}

export const updateSlot = async (req) => {
    try{
        const data = await db("UPDATE PLocation SET available_slots=$1 isOpen=$2 WHERE location_id=$3", 
            [req.query.available_slots, req.query.isOpen, req.query.pslotId])
        return {"status": 201, "data": data}
    }catch(err){
        return {"status": 500, "msg": err}
    }
}

export const createSlot = async(req) => {
    try{
        const locd = await db("INSERT INTO Plocation(location_name, pincode, address, city, total_parking_lots, geog) VALUES($1, $2, $3, $4, $5, ST_MakePoint($6, $7)::geography)",
            [req.body.location_name, req.body.pincode, req.body.address, req.body.city, req.body.total_parking_lots, req.body.latitude, req.body.longitude]
        )

        console.log("Status: ", locd)
        return {"status": 201, "data": locd}
    }catch(err){
        console.log(err)
        return {"status": 500, "msg": err}
    }
}

// module.exports = {bookSlot, getSlots, getSlotsByLocation, updateSlot, createSlot}
