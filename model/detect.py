import pickle
import matplotlib.pyplot as plt
from skimage.transform import resize
import numpy as np
import cv2


def get_lot_state(spots, frame):
    available = 0

    for i in range(len(spots)):
        x, y, w, h = spots[i]
        spot_crop = frame[y:y + h, x:x + w, :]
        available += detect_occupancy(spot_crop)

    return available


def detect_occupancy(spot_bgr):
    MODEL = pickle.load(open("model.p", "rb"))

    flat_data = []
    img_resized = resize(spot_bgr, (15, 15, 3))
    flat_data.append(img_resized.flatten())
    flat_data = np.array(flat_data)

    y_output = MODEL.predict(flat_data)

    if y_output == 0:
        return 1
    else:
        return 0
    

def get_spots(MASK):
    
    if type(MASK) == str:
        MASK = cv2.imread(MASK, 0)

    _, thresholded = cv2.threshold(MASK, 127, 255, cv2.THRESH_BINARY)

    contours, _ = cv2.findContours(thresholded, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    spots = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        spots.append((x, y, w, h))

    return spots


def calc_diff(im1, im2):
    return np.abs(np.mean(im1) - np.mean(im2))


if __name__ == "__main__":

    cap = cv2.VideoCapture('samples/clip3.mp4')
    spots = get_spots("samples/mask.jpg")

    spots_status = [None for j in spots]
    diffs = [None for j in spots]

    previous_frame = None

    frame_number = 0
    step = 30

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    output_video = 'samples/thapar_parking_lot2.mp4'
    fourcc = cv2.VideoWriter_fourcc(*'mpv4')  
    out = cv2.VideoWriter(output_video, fourcc, fps, (frame_width, frame_height))

    while True:
        _, frame = cap.read()

        if frame is None: 
            break

        if frame_number % step == 0:

            # if frame_number == 300:
            #     cv2.imwrite("frame.jpg", frame)

            if previous_frame is None:
                arr_ = range(len(spots))
            else:
                for spot_indx, spot in enumerate(spots):
                    x1, y1, w, h = spot

                    spot_crop = frame[y1:y1 + h, x1:x1 + w, :]

                    diffs[spot_indx] = calc_diff(spot_crop, previous_frame[y1:y1 + h, x1:x1 + w, :])

                arr_ = [j for j in np.argsort(diffs) if diffs[j] / np.amax(diffs) > 0.4]
    
            for spot_indx in arr_:
                spot = spots[spot_indx]
                x1, y1, w, h = spot

                spot_crop = frame[y1:y1 + h, x1:x1 + w, :]

                spot_status = detect_occupancy(spot_crop)

                spots_status[spot_indx] = spot_status

            previous_frame = frame.copy()

        for spot_indx, spot in enumerate(spots):
            spot_status = spots_status[spot_indx]
            x1, y1, w, h = spots[spot_indx]

            if spot_status:
                frame = cv2.rectangle(frame, (x1, y1), (x1 + w, y1 + h), (0, 255, 0), 2)
            else:
                frame = cv2.rectangle(frame, (x1, y1), (x1 + w, y1 + h), (0, 0, 255), 2)

        cv2.rectangle(frame, (120, 20), (240, 45), (0, 0, 0), -1)
        cv2.putText(frame, 'Available spots: {} / {}'.format(str(sum(spots_status)), str(len(spots_status))), (130, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1)

        cv2.namedWindow('frame', cv2.WINDOW_NORMAL)
        cv2.imshow('frame', frame)

        out.write(frame)
        if cv2.waitKey(25) & 0xFF == ord('q'):
            break

        frame_number += 1

    cap.release()
    out.release()
    cv2.destroyAllWindows()
