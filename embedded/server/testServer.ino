#include <LittleFS.h>

#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_task_wdt.h>
#include <base64.h>  // Ensure this library is included for base64 encoding
#include <ESPAsyncWebServer.h>
#include <vector>
#include "SPIFFS.h"

/* Put your SSID & Password */
const char* ssid = "ESP32";  // Enter SSID here
const char* password = "12345678";  // Enter Password here
const int gatewayLotId = 1;

/* Put IP Address details */
IPAddress local_ip(192,168,1,1);
IPAddress gateway(192,168,1,1);
IPAddress subnet(255,255,255,0);

// Create an AsyncWebServer object on port 80
AsyncWebServer server(80);

struct ConnectedDevice {
  String macAddress;
  String ipAddress;  // Will be updated when devices connect
};

std::vector<ConnectedDevice> connectedDevices;


void setup() {
  Serial.begin(115200);

  WiFi.begin("thisiswhat", "");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected to WiFi");

  // Register Parking Slot
  
  // Initialize Soft AP
  // WiFi.softAP(ssid, password);
  WiFi.softAP(ssid, password);
  WiFi.softAPConfig(local_ip, gateway, subnet);
  delay(100);

  // Define the event handler for when a station connects
  WiFi.onEvent(WiFiStationConnected, WiFiEvent_t::ARDUINO_EVENT_WIFI_AP_STAIPASSIGNED);

  // Serve the main page
  // server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
  //   request->send(200, "text/html", SendHTML());
  // });

  server.on("/style.css", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(SPIFFS, "/style.css", "text/css");
  });

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(SPIFFS, "/index.html", String(), false, processor);
  });

  server.on("/register_slot", HTTP_GET, [](AsyncWebServerRequest *request){
      String payload = "{\n";
      payload += "  \"location_name\": \"Parking slot\",\n";
      payload += "  \"pincode\": \"124567\",\n";
      payload += "  \"address\": \"any\",\n";
      payload += "  \"city\": \"1\",\n";
      payload += "  \"total_parking_lots\": \"1\",\n";
      payload += "  \"latitude\": \"30.3978\",\n";
      payload += "  \"longitude\": \"76.1135\",\n";
      payload += "  \"lot_name\": \"any\",\n";
      payload += "  \"total_slots\": \"1\",\n";
      payload += "  \"vacant_slots\": \"1\",\n";
      payload += "  \"total_revenue\": \"1\"\n";
      payload += "}\n";
      sendHTTPRequest(request, "https://spmps.onrender.com/createslot", payload);
  });

  server.on("/capture_data", HTTP_GET, [](AsyncWebServerRequest *request){
     String base64Image = sendRequest_Capture("https://miro.medium.com/v2/resize:fit:1400/1*qre-gAVNTuazaUPvNw2w-Q.jpeg");
     Serial.println("Got image -> ");
  });  

  // Serve the connected devices page
  server.on("/show_devices", HTTP_GET, [](AsyncWebServerRequest *request){
    handle_ShowDevices(request);
  });

  // Handle not found pages
  server.onNotFound([](AsyncWebServerRequest *request){
    request->send(404, "text/plain", "Not found");
  });

  // Start the server
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  // Nothing to do here
  Serial.println("Waiting.....");
  // const int numDevices = sizeof(connectedDevices) / sizeof(connectedDevices[0]);
  // if(numDevices > 0) Serial.println(numDevices);

  // TODO: Send Data to Slot detection API HERE
  String availableSlotsEndpoint = "https://spmps-1.onrender.com/lots/" + String(gatewayLotId) + "/available";

  // camera_fb_t * fb = NULL;
  
  // // Take a picture
  // fb = esp_camera_fb_get();  
  // if (!fb) {
  //   Serial.println("Camera capture failed");
  //   return;
  // }

  if (WiFi.status() == WL_CONNECTED) {
    // HTTPClient http;
    // http.begin(availableSlotsEndpoint);
    // http.addHeader("Content-Type", "multipart/form-data");

    // String boundary = "----ESP32Boundary";
    // String contentType = "multipart/form-data; boundary=" + boundary;
    // http.addHeader("Content-Type", contentType);

    // String body = "--" + boundary + "\r\n";
    // body += "Content-Disposition: form-data; name=\"frame\"; filename=\"image.jpg\"\r\n";
    // body += "Content-Type: image/jpeg\r\n\r\n";

    // int imageLen = fb->len;
    // int bodyLen = body.length() + imageLen + 6 + boundary.length() + 4;

    // http.addHeader("Content-Length", String(bodyLen));

    // WiFiClient * stream = http.getStreamPtr();
    // stream->print(body);
    // stream->write(fb->buf, fb->len);
    // stream->print("\r\n--" + boundary + "--\r\n");

    // int httpResponseCode = http.sendRequest("PUT", (uint8_t *)NULL, 0);
    // if (httpResponseCode > 0) {
    if (true) {
      // Serial.printf("PUT Response code: %d\n", httpResponseCode);

      // Read the response
      // String response = http.getString();
      // Serial.println("Response: " + response);

      // Parse the response (assuming it's a simple JSON with a field `slot_state`)
      // int slotState = response.toInt();  // Simplified, consider parsing full JSON for complex responses
      int slotState = -1;
      if (slotState > 0) {
        Serial.println("New car detected. Starting session...");
        startSession();
      } else if (slotState < 0) {
        Serial.println("Car left. Ending session...");
        endSession();
      } else {
        Serial.println("No change in slots.");
      }

    } else {
      Serial.print("Prob");
      // Serial.printf("Error on sending PUT: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    // http.end();
  }

  // esp_camera_fb_return(fb); 
}

void startSession(){
  for (const ConnectedDevice& device : connectedDevices) {
        String deviceIp = device.ipAddress;
        String captureUrl = "http://" + deviceIp + "/capture";
        Serial.println(captureUrl);

        if (WiFi.status() == WL_CONNECTED) {
            HTTPClient http;
            Serial.println("capturing ");
            http.begin(captureUrl);
            Serial.println(captureUrl);

            int httpResponseCode = http.GET();
            if (httpResponseCode > 0) {
                // Read the image from the response
                WiFiClient* stream = http.getStreamPtr();
                String imageData = "";
                while (stream->available()) {
                    imageData += (char)stream->read();
                }

                String uploadUrl = "https://spmps.onrender.com/upload"; // Replace with your Node.js API URL
                HTTPClient uploadHttp;
                uploadHttp.begin(uploadUrl);

                // Prepare the multipart/form-data content
                String boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"; // Random boundary
                String body = "--" + boundary + "\r\n";
                body += "Content-Disposition: form-data; name=\"image\"; filename=\"image_" + String(millis()) + ".jpg\"\r\n"; // Unique filename
                body += "Content-Type: image/jpeg\r\n\r\n"; // Content type
                body += imageData + "\r\n";
                body += "--" + boundary + "--\r\n";

                // Set the content type and content length
                uploadHttp.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
                uploadHttp.addHeader("Content-Length", String(body.length()));

                // Send the POST request
                int uploadResponseCode = uploadHttp.POST(body);

                if (uploadResponseCode > 0) {
                    Serial.print("Upload response code: ");
                    Serial.println(uploadResponseCode);
                } else {
                    Serial.print("Upload failed, error: ");
                    Serial.println(uploadHttp.errorToString(uploadResponseCode).c_str());
                }

                uploadHttp.end();

                // End
                Serial.print("Image received from device ");
                Serial.println(deviceIp);
                // Serial.println(imageData);
            } else {
                Serial.print("Error on GET from device ");
                Serial.println(deviceIp);
                Serial.println(httpResponseCode);
            }
            http.end();
        }
        // delay(1000);  // Delay between requests to avoid overloading
    }
}

// Function to collect image from each device
String collectImageFromDevice(String deviceIp) {
    HTTPClient http;
    String captureUrl = "http://" + deviceIp + "/capture";
    http.begin(captureUrl);
    int httpResponseCode = http.GET();

    if (httpResponseCode > 0) {
        WiFiClient* stream = http.getStreamPtr();
        String imageData = "";
        while (stream->available()) {
            imageData += (char)stream->read();
        }
        http.end();
        return imageData;  // Return the image data from the device
    } else {
        Serial.print("Error capturing image from device ");
        Serial.println(deviceIp);
        http.end();
        return "";
    }
}

// Function to send all collected images in one PUT request
// void sendImagesToServer(std::vector<String> images) {
//   String endSessionEndpoint = "https://spmps.onrender.com/endSession/"+String(gatewayLotId);
//     if (WiFi.status() == WL_CONNECTED) {
//         HTTPClient http;
//         http.begin(endSessionEndpoint);
//         Serial.println(endSessionEndpoint);
//         // Prepare the multipart/form-data content
//         String boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"; // Random boundary
//         String body = "";
//         for (int i = 0; i < images.size(); i++) {
//           String body = "--" + boundary + "\r\n";
//           body += "Content-Disposition: form-data; name=\"image\"; filename=\"image_" + String(millis()) + "_" + String(i) + ".jpg\"\r\n";
//           body += "Content-Type: image/jpeg\r\n\r\n";
//           body += images[i] + "\r\n";
//         }
//         // End boundary
//         Serial.println(body);
//         body += "--" + boundary + "--\r\n";
//         // Set headers
//         http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
//         http.addHeader("Content-Length", String(body.length()));

//         // Send the PUT request
//         int httpResponseCode = http.PUT(body);

//         if (httpResponseCode > 0) {
//             Serial.print("Server response code: ");
//             Serial.println(httpResponseCode);
//             String response = http.getString();
//             Serial.println("Response from server: ");
//             Serial.println(response);
//         } else {
//             Serial.print("Error sending images: ");
//             Serial.println(http.errorToString(httpResponseCode).c_str());
//         }

//         http.end();
//     }else{
//       Serial.println("No wifi");
//     }
// }

void sendImagesToServer(std::vector<String> images) {
    String endSessionEndpoint = "https://spmps.onrender.com/endSession/" + String(gatewayLotId);
    
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(endSessionEndpoint);
        Serial.println(endSessionEndpoint);

        // Set boundary for the multipart form-data
        String boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"; 
        String body = "";

        // Build the body with each image
        for (int i = 0; i < images.size(); i++) {
            body += "--" + boundary + "\r\n";
            body += "Content-Disposition: form-data; name=\"image\"; filename=\"image_" + String(millis()) + "_" + String(i) + ".jpg\"\r\n";
            body += "Content-Type: image/jpeg\r\n\r\n";
            body += images[i] + "\r\n";
        }

        // End boundary
        body += "--" + boundary + "--\r\n";

        // Set headers
        http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

        // Send the PUT request
        int httpResponseCode = http.PUT(body);

        if (httpResponseCode > 0) {
            Serial.print("Server response code: ");
            Serial.println(httpResponseCode);
            String response = http.getString();
            Serial.println("Response from server: ");
            Serial.println(response);
        } else {
            Serial.print("Error sending images: ");
            Serial.println(http.errorToString(httpResponseCode).c_str());
        }

        http.end();
    } else {
        Serial.println("No WiFi connection");
    }
}


// Function to capture images from all devices and send them
void endSession() {
    std::vector<String> images;

    // Collect images from all devices
    for (const ConnectedDevice& device : connectedDevices) {
        String imageData = collectImageFromDevice(device.ipAddress);
        if (!imageData.isEmpty()) {
            images.push_back(imageData);
        }
    }

    // Send all collected images in one request
    if (!images.empty()) {
        sendImagesToServer(images);
    } else {
        Serial.println("No images to send.");
    }
}


// Event handler for when a station connects
void WiFiStationConnected(WiFiEvent_t event, WiFiEventInfo_t info) {
  String macAddress = WiFi.macAddress();
  String ipAddress = IPAddress(info.got_ip.ip_info.ip.addr).toString();
  
  // Add the connected device to the list
  ConnectedDevice newDevice = {macAddress, ipAddress};
  connectedDevices.push_back(newDevice);

  Serial.println("Station connected IP Address = " + ipAddress);
  Serial.println("Station connected MAC Address = " + macAddress);
  Serial.println();
}

String processor(const String& var){
  Serial.println("PROCESSING!!!!");
  Serial.println(var);
  if(var == "STATE"){
    Serial.print("OKKKK");
    return "OKKK";
  }
  return "OK";
}

String sendRequest_Capture(String endpoint_url) {
  HTTPClient http;
  http.begin(endpoint_url);

  int httpResponseCode = http.GET();
  String base64Image = "";

  if (httpResponseCode == HTTP_CODE_OK) {
    WiFiClient* stream = http.getStreamPtr();
    String base64String = "";
    while (stream->available()) {
      uint8_t buffer[128];
      size_t bytesRead = stream->readBytes(buffer, sizeof(buffer));
      if (bytesRead == 0) {
        Serial.println("Error: Stream read failed.");
        break;
      }
      base64String += base64::encode(buffer, bytesRead);
    }
    base64Image = base64String;
    Serial.println("Image captured and base64 encoded");
  } else {
    Serial.println("Error: " + String(httpResponseCode));
  }

  http.end();
  return base64Image;
}

void sendHTTPRequest(AsyncWebServerRequest *request, String endpoint, String payload){
  HTTPClient http;
  http.begin(endpoint);
  http.addHeader("Content-Type", "application/json");
    esp_task_wdt_reset();
  int httpResponseCode = http.POST(payload);
    esp_task_wdt_reset();
  Serial.println("OKKKKKKKK Sending");

  if(httpResponseCode > 0){
    String response = http.getString();
    Serial.println("Response " + response);
    request->send(200, "text/html", response);
  }else{
    Serial.println("Error: " + String(httpResponseCode));
  }

  http.end();

}

// String sendRequest_Capture(String endpoint_url){
//   HTTPClient http;
//   http.begin(endpoint_url);

//   int httpResponseCode = http.GET();
//   String base64Image = "";

//   if (httpResponseCode == HTTP_CODE_OK) {
//     WiFiClient* stream = http.getStreamPtr();
//     String base64String = "";
//     while (stream->available()) {
//       uint8_t buffer[128];
//       size_t bytesRead = stream->readBytes(buffer, sizeof(buffer));
//       base64String += base64::encode(buffer, bytesRead);
//     }
//     base64Image = base64String;
//     Serial.println("Image captured and base64 encoded");
//   } else {
//     Serial.println("Error: " + String(httpResponseCode));
//   }

//   http.end();
//   return base64Image;
// }

// void sendImageToApi(String uploadUrl, const String& base64Image) {
//   HTTPClient http;
//   http.begin(uploadUrl);
//   http.addHeader("Content-Type", "application/json");

//   String payload = "{\n";
//   payload += "  \"contents\": [{\n";
//   payload += "    \"parts\": [\n";
//   payload += "      {\"text\": \"Conduct ANPR on the given image and just give me the License plate number.\"},\n";
//   payload += "      {\"inline_data\": {\n";
//   payload += "        \"mime_type\": \"image/png\",\n";
//   payload += "        \"data\": \"" + base64Image + "\"\n";
//   payload += "      }}\n";
//   payload += "    ]\n";
//   payload += "  }]\n";
//   payload += "}\n";

//   int httpResponseCode = http.POST(payload);

//   if (httpResponseCode > 0) {
//     String response = http.getString();
//     Serial.println("Response code: " + String(httpResponseCode));
//     Serial.println("Response: " + response);
//   } else {
//     Serial.println("Error code: " + String(httpResponseCode));
//   }

//   http.end();
// }

void handle_ShowDevices(AsyncWebServerRequest *request) {
  String deviceList = "<!DOCTYPE html><html>\n";
  deviceList += "<head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, user-scalable=no\">\n";
  deviceList += "<title>Connected Devices</title>\n";
  deviceList += "<style>html { font-family: Helvetica; display: inline-block; margin: 0px auto; text-align: center;}\n";
  deviceList += "body{margin-top: 50px;} h1 {color: #444444;margin: 50px auto 30px;} h3 {color: #444444;margin-bottom: 50px;}\n";
  deviceList += "table {width: 100%; border-collapse: collapse; margin: 20px 0;}\n";
  deviceList += "th, td {padding: 10px; text-align: left; border-bottom: 1px solid #ddd;}\n";
  deviceList += "</style>\n";
  deviceList += "<script>\n";
  deviceList += "function callCapture(ip) {\n";
  deviceList += "  fetch('http://' + ip + '/capture')\n";
  deviceList += "    .then(response => {console.log(response);return response;})\n";
  deviceList += "    .then(data => alert('Capture initiated for ' + ip));\n";
  deviceList += "}\n";
  deviceList += "</script>\n";
  deviceList += "</head>\n";
  deviceList += "<body>\n";
  deviceList += "<h1>Connected Devices</h1>\n";
  deviceList += "<table>\n";
  deviceList += "<tr><th>IP Address</th><th>Action</th></tr>\n";

  // Display stored MAC addresses and IP addresses
  for (const ConnectedDevice& device : connectedDevices) {
    deviceList += "<tr><td>" + device.ipAddress + "</td><td><button onclick=\"callCapture('" + device.ipAddress + "')\">Capture</button></td></tr>\n";
  }

  deviceList += "</table>\n";
  deviceList += "</body>\n";
  deviceList += "</html>\n";

  request->send(200, "text/html", deviceList);
}


// String SendHTML() {
//   String ptr = "<!DOCTYPE html><html>\n";
//   ptr += "<head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, user-scalable=no\">\n";
//   ptr += "<title>LED Control</title>\n";
//   ptr += "<style>html { font-family: Helvetica; display: inline-block; margin: 0px auto; text-align: center;}\n";
//   ptr += "body{margin-top: 50px;} h1 {color: #444444;margin: 50px auto 30px;} h3 {color: #444444;margin-bottom: 50px;}\n";
//   ptr += ".button {display: block;width: 80px;background-color: #3498db;border: none;color: white;padding: 13px 30px;text-decoration: none;font-size: 25px;margin: 0px auto 35px;cursor: pointer;border-radius: 4px;}\n";
//   ptr += ".button-on {background-color: #3498db;}\n";
//   ptr += ".button-on:active {background-color: #2980b9;}\n";
//   ptr += ".button-off {background-color: #34495e;}\n";
//   ptr += ".button-off:active {background-color: #2c3e50;}\n";
//   ptr += "p {font-size: 14px;color: #888;margin-bottom: 10px;}\n";
//   ptr += "</style>\n";
//   ptr += "</head>\n";
//   ptr += "<body>\n";
//   ptr += "<h1>ESP32 Web Server</h1>\n";
//   ptr += "<h3>Using Access Point(AP) Mode</h3>\n";
//   ptr += "</body>\n";
//   ptr += "</html>\n";
//   return ptr;
// }


// void setup(){
// }

// void loop(){}
