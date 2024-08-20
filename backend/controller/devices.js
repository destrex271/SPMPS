import { db, secretKey, saltRounds } from "./common";

const createSession = async (req) => {
    try{
        const data = await db.query("INSERT INTO ParkingSession(vehicle_id, session_active, start_time, end_time, lot_id) VALUES($1, $2, $3, $4, $5)",
            [req.body.vehicleNumber, req.body.sessionActive, Date.now()/1000, null, req.body.lot_id])
        return {"status": 201, "data": data.rows}
    }catch(err){
        return {"status": 500, "err": err}
    }
}

const endSession = async (req) => {
    try{
        const data = await db.query("UPDATE ParkingSession SET session_active = $1, end_time = $2 WHERE session_id=$3", 
            [req.body.sessionActive, req.body.endTime, req.body.sessionId])
        return {"status": 301, "data": data.rows}
    }catch(err){
        return {"status": 500, "err": err}
    }
}

const addMasterDevice = async(req) => {
    try{
        const data = await db.query("INSERT INTO MasterDevice VALUES($1, $2)",
    [req.body.masterMac, req.body.lotId])
        return {"status": 201, "data": data.rows}
    }catch(err){
        return {"status": 500, "err": err}
    }
}

const addSlaveDevice = async(req) => {
    try{
        const data = await db.query("INSERT INTO SlaveDevice VALUES($1, $2)",
            [req.body.slave_mac, req.body.master_mac])
        return {"status": 201, "data": data.rows}
    }catch(err){
        return {"err": err, "status": 500}
    }
}


module.exports = {createSession, endSession, addMasterDevice, addSlaveDevice}