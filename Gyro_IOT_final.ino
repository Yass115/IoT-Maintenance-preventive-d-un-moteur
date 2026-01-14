#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <MPU6050_light.h>


// WIFI & MQTT CONFIG

const char* ssid = " ";
const char* password = " ";

const char* mqtt_server = " ";
WiFiClient espClient;
PubSubClient client(espClient);


// MPU6050

MPU6050 mpu(Wire);
unsigned long timer = 0;


// RELAY PIN

#define RELAY_PIN 5   // Représente le relais


// MQTT CALLBACK

void callback(char* topic, byte* message, unsigned int length) {

  String payload;
  for (int i = 0; i < length; i++) {
    payload += (char)message[i];
  }

  Serial.print("Commande reçue MQTT: ");
  Serial.println(payload);

  if (String(topic) == "esp32/relay/cmd") {

    if (payload == "ON") {
      digitalWrite(RELAY_PIN, HIGH);
      Serial.println("Relais ACTIVÉ !");
    }

    if (payload == "OFF") {
      digitalWrite(RELAY_PIN, LOW);
      Serial.println("Relais DÉSACTIVÉ !");
    }
  }
}


//  CONNECTION WIFI

void setup_wifi() {
  delay(100);
  Serial.println();
  Serial.print("Connexion à ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);
  Serial.println(WiFi.status()); // j'ai eu un soucis de communication entre l'esp32 et l'ordi via mqtt


  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connecté !");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}


// MQTT RECONNECTION

void reconnect() {
  while (!client.connected()) {
    Serial.print("Connexion MQTT...");
    
    if (client.connect("ESP32_MPU6050")) {
      Serial.println(" Connecté !");
      
      client.subscribe("esp32/relay/cmd");
      Serial.println("Souscription : esp32/relay/cmd");

    } else {
      Serial.print("Échec : ");
      Serial.println(client.state());
      Serial.println("Nouvel essai dans 5s...");
      delay(5000);
    }
  }
}


void setup() {
  Serial.begin(115200);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);

  Wire.begin();
  mpu.begin();
  mpu.calcOffsets();   // Calibrer au démarrage

  Serial.println("MPU6050 prêt.");
}


// LOOP

void loop() {
  
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  mpu.update();

  if (millis() - timer > 100) { // Envoie toutes les 100 ms (10 Hz)
    timer = millis();

    // Lire les accélérations
    float ax = mpu.getAccX();
    float ay = mpu.getAccY();
    float az = mpu.getAccZ();

    // Création du JSON envoyé au dashboard
    String json = "{";
    json += "\"ax\":" + String(ax, 3) + ",";
    json += "\"ay\":" + String(ay, 3) + ",";
    json += "\"az\":" + String(az, 3);
    json += "}";

    client.publish("esp32/mpu6050", json.c_str());

    Serial.print("Données envoyées: ");
    Serial.println(json);
  }
}
