import { db, secretKey, saltRounds } from "./common";

const bookSlot = async (parkingId, userId) => {
    try {

        const slotCount = await db.query("SELECT vacant from Parking_lot where parkingID=$1", [parkingId])
        if(slotCount == 0) return {"status": 404, "msg": "No slots available!"}

        await db.query("INSERT INTO BookedSlots(parkingId,userId) values($1,$2)", [
          parkingId,
          userId,
        ]);

        const data = await db.query("SELECT * FROM BookedSlots where parkingID=$1 AND userID=$2",[
            parkingId,
            userId
        ])

        return {"status": 200, "msg": "Slot booked!", "data": data.rows}
      } catch (err) {
        return {"status": 400, "msg": "Unable to book slot", "err": err}
      }
}

const getSlots = async () => {
    try{
        const data = await db.query("SELECT * FROM Parking_lot")
        return {"status": 200, "data": data.rows}
    }catch(err){
        return {"status": 500, "msg": err}
    }
}

const getSlotsByLocation = async (locationID) => {
    try{
        const data = db.query("SELECT * FROM Parking_lot WHERE location_id = ($1)", [locationID])
        return {"status": 200, "data": data.rows}
    }catch(err){
        return {"status": 500, "msg": err}
    }
}

const updateSlot = async (req) => {
    try{
        const data = await db.query("UPDATE Parking_lot SET available_slots=$1 isOpen=$2 WHERE id=$3", 
            [req.body.available_slots, req.body.isOpen, req.body.pslotId])
        return {"status": 201, "data": data.rows}
    }catch(err){
        return {"status": 500, "msg": err}
    }
}

const createSlot = async(req) => {
    try{
        const data = await db.query("INSERT INTO Parking_lot VALUES($1, $2, $3, $4, $5)", 
        [req.body.lot_name, req.body.location_id, req.body.total_slots, 
        req.body.vacant_slots, req.body.total_revenue])
        return {"status": 201, "data": data}
    }catch(err){
        return {"status": 500, "msg": err}
    }
}

module.exports = {bookSlot, getSlots, getSlotsByLocation, updateSlot, createSlot}