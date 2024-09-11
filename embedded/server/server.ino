#include <LittleFS.h>

#include <WiFi.h>
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

// Handle showing connected devices
// void handle_ShowDevices(AsyncWebServerRequest *request) {
//   String deviceList = "<!DOCTYPE html><html>\n";
//   deviceList += "<head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, user-scalable=no\">\n";
//   deviceList += "<title>Connected Devices</title>\n";
//   deviceList += "<style>html { font-family: Helvetica; display: inline-block; margin: 0px auto; text-align: center;}\n";
//   deviceList += "body{margin-top: 50px;} h1 {color: #444444;margin: 50px auto 30px;} h3 {color: #444444;margin-bottom: 50px;}\n";
//   deviceList += "table {width: 100%; border-collapse: collapse; margin: 20px 0;}\n";
//   deviceList += "th, td {padding: 10px; text-align: left; border-bottom: 1px solid #ddd;}\n";
//   deviceList += "</style>\n";
//   deviceList += "</head>\n";
//   deviceList += "<body>\n";
//   deviceList += "<h1>Connected Devices</h1>\n";
//   deviceList += "<table>\n";
//   deviceList += "<tr><th>IP Address</th><th>Action</th></tr>\n";

//   // Display stored MAC addresses and IP addresses
//   for (const ConnectedDevice& device : connectedDevices) {
//     deviceList += "<tr><td>" + device.ipAddress + "</td><td><button ></button></td></tr>\n";
//   }

//   deviceList += "</table>\n";
//   deviceList += "</body>\n";
//   deviceList += "</html>\n";

//   request->send(200, "text/html", deviceList);
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
  deviceList += "    .then(response => response.text())\n";
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
