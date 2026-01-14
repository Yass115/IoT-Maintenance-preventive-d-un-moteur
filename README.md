# IoT-Maintenance-preventive-d-un-moteur

L’objectif de ce projet est de prélever les données gyroscopiques et vibratoires issues d’un capteur inertiel afin de les analyser dans le domaine fréquentiel à l’aide d’une transformée de Fourier rapide (FFT). Ces informations seront corrélées avec des données auditives (signaux acoustiques) pour mettre en évidence des signatures fréquentielles caractéristiques du fonctionnement d’un moteur. Le couplage des vibrations mécaniques et du bruit émis permet d’identifier des anomalies telles que des déséquilibres, défauts de roulements ou phénomènes de résonance, offrant ainsi une approche de diagnostic prédictif et non invasif pour la surveillance de l’état des moteurs.

---

#  ESP32 MPU6050 MQTT Dashboard

Dashboard web en temps réel pour visualiser les données d’un **capteur MPU6050** connecté à un **ESP32**, avec communication **MQTT** et contrôle d’un **relais** via une interface web.

---

##  Fonctionnalités

*  Lecture en temps réel des données d’accélération (X, Y, Z)
*  Calcul de l’amplitude de l’accélération
*  Transmission des données via **MQTT**
*  Dashboard web en **temps réel (WebSocket)**
*  Historique des données (API REST)
*  Contrôle d’un relais (ON / OFF) depuis le navigateur
*  Architecture légère et réactive

---

## Architecture du projet



```
ESP32 + MPU6050 + Relais
     |
     |  MQTT (1883)
     v
Broker MQTT (Mosquitto)
     |
     |  MQTT (subscribe)
     v
Serveur Node.js (Express + WS)
  ʌ  |
  |  |  WebSocket / HTTP
  |  v
Navigateur Web (Dashboard)
```

---

## Technologies utilisées

### Matériel

* ESP32
* Capteur MPU6050
* Relais

### Logiciel

* Arduino IDE (ou PlateformIO)
* Node.js
* Express.js
* WebSocket (`ws`)
* MQTT (`mqtt`)
* HTML / CSS / JavaScript

---

## Structure du projet

```
.
├── esp32/
│   └── esp32_mpu6050_mqtt.ino
├── Vib_IOT/
│   └── server.js
│   └── public
          ├── index.html
          ├── style.css (vide)
          └── script.js
```

---

##  Installation & Configuration

### 1️ Broker MQTT

Installer Mosquitto :

```bash
sudo apt install mosquitto mosquitto-clients
```

Vérifier :

```bash
mosquitto_sub -h <IP_BROKER> -t esp32/mpu6050
```

---

### 2️ ESP32

Configurer le Wi-Fi et le broker MQTT dans le code :

```cpp
const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* mqtt_server = "BROKER_IP";
```

Téléverser le code sur l’ESP32.

---

### 3️ Serveur Node.js

```bash
cd server
npm install
node server.js
```

Accès :

```
http://localhost:3000
```

---

## API REST
L'API REST permet à deux applications de communiquer (échange des de données), il est basé sur le protocle HTTP (donc client/serveur)
### Récupérer l’historique

```
GET /data
```

Réponse :

```json
[
  {
    "timestamp": "2026-01-01T12:00:00Z",
    "ax": 0.12,
    "ay": -0.03,
    "az": 9.81,
    "amplitude": 9.82
  }
]
```

---

## Commandes MQTT (Relais)

### Topics

| Action            | Topic             | Payload |
| ----------------- | ----------------- | ------- |
| Activer relais    | `esp32/relay/cmd` | `ON`    |
| Désactiver relais | `esp32/relay/cmd` | `OFF`   |

---

## Données MQTT

### Topic

```
esp32/mpu6050
```

### Format

```json
{
  "ax": 0.123,
  "ay": -0.456,
  "az": 9.812
}
```


## Améliorations

* Authentification
* Stockage base de données (InfluxDB / MongoDB)
* Boitier dédié
* Modèle d'apprentissage automatique
* Module MAX9814 pour une meilleure interpretation

