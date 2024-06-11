# Request Body types go here
from pydantic import BaseModel

class GetRequestAuth(BaseModel):
    authToken: str
    pagination: bool | None = False

class GetParkingSlotResponse(BaseModel):
    slot_status: dict
    vacant_count: int
    occupied_count: int
