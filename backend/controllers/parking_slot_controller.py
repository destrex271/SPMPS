from req_types import GetParkingSlotResponse


def get_slot_status():
    status = GetParkingSlotResponse
    status.vacant_count = 0
    status.occupied_count = 0
    status.slot_status = {}
    return status

