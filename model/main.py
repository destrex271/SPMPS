import os
from flask import Flask, jsonify, request
import numpy as np
import cv2

from detect import get_lot_state, get_spots
from db import DB

app = Flask(__name__)
db = DB()

def get_current_slots_for_ploc(ploc_id) -> int:
    res = db.executeSQL("SELECT available_slots FROM plocation WHERE location_id=" + str(ploc_id) + ";")
    print(res)
    return res[0][0]

@app.route("/")
def hello_world():
    return "<p>Hello World!</p>"

@app.route("/lots/<lot_id>/available", methods=["PUT"])
def detect_slots(lot_id):

    print("Started")
    cur_val = get_current_slots_for_ploc(lot_id)
    print("Available slots before processing:", cur_val)

    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'} 

    if 'frame' not in request.files:
        print("Frame not sent")
        return jsonify({'error': 'Please send frame for processing!'}), 400
        
    frame = request.files['frame']

    if '.' not in frame.filename and frame.filename.rsplit('.', 1)[1].lower() not in ALLOWED_EXTENSIONS:
        print("Invalid frame")
        return jsonify({'error': 'Incorrect frame format!'}), 400
    
    frame_bytes = np.frombuffer(frame.read(), np.uint8)
    frame = cv2.imdecode(frame_bytes, cv2.IMREAD_COLOR)

    #Can be a static file or path fetched using lot id, todo
    mask = 'samples/mask.jpg'

    spots = get_spots(mask)
    available = get_lot_state(spots, frame)
    print(spots, available)
    
    # if > 0 -> New Car
    # if == 0 -> No Change
    # if < 0 -> Car Left

    #update number of valid slots in the database for that lot id 
    try:
        print("Available slots after processing", available)
        db.executeSQL(f"UPDATE plocation SET available_slots={available} WHERE location_id={lot_id};")
        print("Ended")
        return str(available - cur_val)
    except Exception as e:
        print(e)
        return jsonify({'error': "Unable to update database!"}), 500
    
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  
    app.run(host='0.0.0.0', port=port, debug=True)

