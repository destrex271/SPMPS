import {db} from './common.js'

export const createSession = async (req) => {
    try{
        const data = await db("INSERT INTO ParkingSession(vehicle_id, session_active, start_time, end_time, lot_id) VALUES($1, $2, $3, $4, $5)",
            [req.body.vehicleNumber, req.body.sessionActive, Date.now()/1000, null, req.body.lot_id])
        return {"status": 201, "data": data}
    }catch(err){
        return {"status": 500, "err": err}
    }
}

export const endSession = async (req) => {
    try{
        const data = await db("UPDATE ParkingSession SET session_active = $1, end_time = $2 WHERE session_id=$3", 
            [req.body.sessionActive, req.body.endTime, req.body.sessionId])
        return {"status": 301, "data": data}
    }catch(err){
        return {"status": 500, "err": err}
    }
}

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