from fastapi import FastAPI
from req_types import GetRequestAuth, GetParkingSlotResponse
from controllers.parking_slot_controller import get_slot_status

app = FastAPI()

@app.get("/")
async def root():
    return "Welcome!"

@app.get("/get_slot_information")
async def get_parking_slots_data(request: GetRequestAuth):
    response = get_slot_status() 
    return response
