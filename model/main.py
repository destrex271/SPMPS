from flask import Flask, jsonify, request
import numpy as np
import cv2

from detect import get_lot_state, get_spots
from db import connect_db

app = Flask(__name__)

@app.route("/")
def hello_world():
    return "<p>Hello World!</p>"

@app.route("/lots/<lot_id>/available", methods=["PUT"])
def detect_slots(lot_id):

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

    #Can be a static file or path fetched using lot id
    mask = './mask.png'

    spots = get_spots(mask)
    available = get_lot_state(spots, frame)
    
    #update number of valid slots in the database for that lot id 
    try:
        conn = connect_db()

        with conn.cursor() as curr:
            curr.execute("UPDATE parking_lot SET vacant_slots = " + str(available) + " WHERE lot_id = " + str(lot_id))
            conn.commit()
    
        conn.close()
    except Exception as e:
        print(e)
        return jsonify({'error': "Unable to update database!"}), 500
    
    return jsonify({'available_slots': available}), 204
    

if __name__ == "__main__":
    app.run(host='0.0.0.0', port = 5000, debug=True)
