const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const mqtt = require("mqtt");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let dataLog = [];

const client = mqtt.connect("mqtt://192.168.129.9:1883");

client.on("connect", () => {
    console.log("MQTT connecté");
    client.subscribe("esp32/mpu6050");
});

client.on("message", (topic, msg) => {
    if (topic !== "esp32/mpu6050") return;

    const d = JSON.parse(msg);
    const acc = Math.sqrt(d.ax*d.ax + d.ay*d.ay + d.az*d.az);

    const entry = {
        timestamp: new Date().toISOString(),
        ax: d.ax,
        ay: d.ay,
        az: d.az,
        amplitude: acc
    };

    dataLog.push(entry);
    if (dataLog.length > 5000) dataLog.shift();

    const wsData = JSON.stringify({
        type: "mpu",
        acc: acc,
        ax: d.ax,
        ay: d.ay,
        az: d.az
    });

    wss.clients.forEach(c => c.send(wsData));
});

wss.on("connection", (ws) => {
    ws.on("message", msg => {
        const data = JSON.parse(msg);

        if (data.cmd === "relay_on")
            client.publish("esp32/relay/cmd", "ON");

        if (data.cmd === "relay_off")
            client.publish("esp32/relay/cmd", "OFF");
    });
});

// API DataFrame
app.get("/data", (req, res) => {
    res.json(dataLog);
});

server.listen(3000, () => {
    console.log("Dashboard → http://localhost:3000");
});
