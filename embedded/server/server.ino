#include <LittleFS.h>

#include <WiFi.h>
#include <HTTPClient.h>
#include <base64.h>  // Ensure this library is included for base64 encoding
#include <ESPAsyncWebServer.h>
#include <vector>
#include "SPIFFS.h"

/* Put your SSID & Password */
const char* ssid = "ESP32";  // Enter SSID here
const char* password = "12345678";  // Enter Password here

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

  // Setup Storage
  if(!SPIFFS.begin(true)){
    Serial.println("An Error has occurred while mounting SPIFFS");
    return;
  }

  WiFi.begin("motoedge50fusion_1771", "yebt3925");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected to WiFi");

  // Initialize Soft AP
  // WiFi.softAP(ssid, password);
  WiFi.softAP(ssid);
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

  server.on("/capture_data", HTTP_GET, [](AsyncWebServerRequest *request){
     String base64Image = sendRequest_Capture("https://miro.medium.com/v2/resize:fit:1400/1*qre-gAVNTuazaUPvNw2w-Q.jpeg");
     Serial.println("Got image -> ");
     Serial.println(base64Image.length());
      if (base64Image.length() > 0) {
        sendImageToApi("{API_URL}", base64Image);
      }
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

void sendImageToApi(String uploadUrl, const String& base64Image) {
  HTTPClient http;
  http.begin(uploadUrl);
  http.addHeader("Content-Type", "application/json");

  String payload = "{\n";
  payload += "  \"contents\": [{\n";
  payload += "    \"parts\": [\n";
  payload += "      {\"text\": \"Conduct ANPR on the given image and just give me the License plate number.\"},\n";
  payload += "      {\"fileData\": {\n";
  payload += "        \"mimeType\": \"image/jpeg\",\n";
  payload += "        \"data\": \"" + base64Image + "\"\n";
  payload += "      }}\n";
  payload += "    ]\n";
  payload += "  }]\n";
  payload += "}\n";

  int httpResponseCode = http.POST(payload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Response code: " + String(httpResponseCode));
    Serial.println("Response: " + response);
  } else {
    Serial.println("Error code: " + String(httpResponseCode));
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
  deviceList += "    .then(response => response.json())\n";
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


String SendHTML() {
  String ptr = "<!DOCTYPE html><html>\n";
  ptr += "<head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, user-scalable=no\">\n";
  ptr += "<title>LED Control</title>\n";
  ptr += "<style>html { font-family: Helvetica; display: inline-block; margin: 0px auto; text-align: center;}\n";
  ptr += "body{margin-top: 50px;} h1 {color: #444444;margin: 50px auto 30px;} h3 {color: #444444;margin-bottom: 50px;}\n";
  ptr += ".button {display: block;width: 80px;background-color: #3498db;border: none;color: white;padding: 13px 30px;text-decoration: none;font-size: 25px;margin: 0px auto 35px;cursor: pointer;border-radius: 4px;}\n";
  ptr += ".button-on {background-color: #3498db;}\n";
  ptr += ".button-on:active {background-color: #2980b9;}\n";
  ptr += ".button-off {background-color: #34495e;}\n";
  ptr += ".button-off:active {background-color: #2c3e50;}\n";
  ptr += "p {font-size: 14px;color: #888;margin-bottom: 10px;}\n";
  ptr += "</style>\n";
  ptr += "</head>\n";
  ptr += "<body>\n";
  ptr += "<h1>ESP32 Web Server</h1>\n";
  ptr += "<h3>Using Access Point(AP) Mode</h3>\n";
  ptr += "</body>\n";
  ptr += "</html>\n";
  return ptr;
}
