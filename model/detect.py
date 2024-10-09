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

    connected_components = cv2.connectedComponentsWithStats(MASK, 4, cv2.CV_32S)
    (totalLabels, _, values, _) = connected_components

    spots = []
    coef = 1
    for i in range(1, totalLabels):

        x1 = int(values[i, cv2.CC_STAT_LEFT] * coef)
        y1 = int(values[i, cv2.CC_STAT_TOP] * coef)
        w = int(values[i, cv2.CC_STAT_WIDTH] * coef)
        h = int(values[i, cv2.CC_STAT_HEIGHT] * coef)

        spots.append([x1, y1, w, h])

    return spots


def calc_diff(im1, im2):
    return np.abs(np.mean(im1) - np.mean(im2))


if __name__ == "__main__":

    cap = cv2.VideoCapture('./clip.mp4')
    spots = get_spots("./mask.png")

    spots_status = [None for j in spots]
    diffs = [None for j in spots]

    previous_frame = None

    frame_number = 0
    step = 30

    while True:
        _, frame = cap.read()

        if frame is None: 
            break

        if frame_number % step == 0:

            if frame_number == 300:
                cv2.imwrite("frame2.jpg", frame)

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

        cv2.rectangle(frame, (80, 20), (550, 80), (0, 0, 0), -1)
        cv2.putText(frame, 'Available spots: {} / {}'.format(str(sum(spots_status)), str(len(spots_status))), (100, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        cv2.namedWindow('frame', cv2.WINDOW_NORMAL)
        cv2.imshow('frame', frame)
        if cv2.waitKey(25) & 0xFF == ord('q'):
            break

        frame_number += 1

    cap.release()
    cv2.destroyAllWindows()
