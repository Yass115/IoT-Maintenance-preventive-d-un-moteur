// -----------------------------------------------------
//  WebSocket vers Node.js
// -----------------------------------------------------
const ws = new WebSocket("ws://localhost:3000");

const sampleSize = 256;
let timeData = [];

// ---------------- TIME DOMAIN ----------------
const ctxTime = document.getElementById("chartTime").getContext("2d");
const chartTime = new Chart(ctxTime, {
    type: "line",
    data: {
        labels: Array(sampleSize).fill(""),
        datasets: [{
            label: "Amplitude",
            data: Array(sampleSize).fill(0),
            borderColor: "#4fa3ff",
            tension: 0.3
        }]
    },
    options: { animation: false }
});

// ---------------- FREQ DOMAIN ----------------
const ctxFreq = document.getElementById("chartFreq").getContext("2d");
const chartFreq = new Chart(ctxFreq, {
    type: "bar",
    data: {
        labels: Array(sampleSize/2).fill(""),
        datasets: [{
            label: "FFT",
            data: Array(sampleSize/2).fill(0),
            backgroundColor: "#4fa3ff"
        }]
    },
    options: { animation: false }
});

// ---------------- ANALYSE SPECTRALE ----------------
const analysisCtx = document.getElementById("fftAnalysisChart").getContext("2d");
const analysisChart = new Chart(analysisCtx, {
    type: "line",
    data: {
        labels: Array(sampleSize/2).fill(""),
        datasets: [{
            label: "FFT Analyse",
            borderColor: "#ffcc00",
            data: Array(sampleSize/2).fill(0)
        }]
    },
    options: { animation: false }
});

let knownPeaks = [];
const f_rot = 30; // RPM = 1800 moteur MCC école

function analyzeSpectrum(mag) {
    const list = document.getElementById("analysisList");
    list.innerHTML = "";

    const peaks = [];
    for (let i = 2; i < mag.length - 2; i++) {
        if (mag[i] > mag[i-1] && mag[i] > mag[i+1] && mag[i] > 0.1) {
            peaks.push({ index: i, value: mag[i] });
        }
    }

    const newPeaks = peaks.filter(
        p => !knownPeaks.some(k => Math.abs(k.index - p.index) < 2)
    );
    knownPeaks = peaks;

    analysisChart.data.datasets[0].data = mag;
    analysisChart.update();

    newPeaks.forEach(p => {
        const freq = p.index;
        let msg = "";

        if (Math.abs(freq - f_rot) < 2 && p.value > 0.25)
            msg = "⚠ Balourd probable (1× RPM)";
        else if (Math.abs(freq - 2*f_rot) < 2 && p.value > 0.20)
            msg = "⚠ Désalignement probable (2× RPM)";
        else if (freq > 200 && p.value > 0.1)
            msg = "⚠ Défaut de roulement probable";
        else if (freq >= 75 && freq <= 120 && p.value > 0.45)
            msg = "⚠ Résonance mécanique détectée";
        else
            msg = `Nouvelle ligne spectrale : ${freq} Hz`;

        const li = document.createElement("li");
        li.textContent = msg;
        list.appendChild(li);
    });
}

// -----------------------------------------------------
//  MACHINE HEALTH MODULE
// -----------------------------------------------------
let rmsWindow = [];

function updateMachineHealth(mag) {
    const health = document.getElementById("healthIndicator");
    const status = document.getElementById("healthStatusText");

    const rmsTxt = document.getElementById("rmsValue");
    const peakTxt = document.getElementById("peakFreq");
    const faultTxt = document.getElementById("faultType");

    // RMS
    const rms = Math.sqrt(mag.reduce((s,v)=>s+v*v,0)/mag.length);

    rmsWindow.push(rms);
    if (rmsWindow.length > 50) rmsWindow.shift();

    const rmsAvg = rmsWindow.reduce((a,b)=>a+b,0) / rmsWindow.length;
    rmsTxt.textContent = rmsAvg.toFixed(3);

    // Peak
    let peak = 0, freq = 0;
    for (let i = 0; i < mag.length; i++) {
        if (mag[i] > peak) { peak = mag[i]; freq = i; }
    }
    peakTxt.textContent = freq + " Hz";

    // Fault detection
    let fault = "Aucun";

    if (freq >= f_rot-2 && freq <= f_rot+2 && peak > 0.25)
        fault = "Balourd (1× RPM)";
    else if (freq >= 2*f_rot-2 && freq <= 2*f_rot+2 && peak > 0.20)
        fault = "Désalignement (2× RPM)";
    else if (freq > 200 && peak > 0.1)
        fault = "Roulement défectueux";
    else if (rmsAvg > 0.35)
        fault = "Frottement / lubrification insuffisante";

    faultTxt.textContent = fault;

    health.classList.remove("normal","warning","danger");

    if (fault === "Aucun") {
        health.classList.add("normal");
        status.textContent = "Normal";
    }
    else if (fault.includes("Balourd") || fault.includes("Désalignement")) {
        health.classList.add("warning");
        status.textContent = "Attention";
    }
    else {
        health.classList.add("danger");
        status.textContent = "Danger";
    }
}

// -----------------------------------------------------
//  Réception WebSocket
// -----------------------------------------------------
ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.type !== "mpu") return;

    const acc = data.acc;

    timeData.push(acc);
    if (timeData.length > sampleSize) timeData.shift();

    chartTime.data.datasets[0].data = [...timeData];
    chartTime.update();

    if (timeData.length === sampleSize) {
        const fft = new FFT(sampleSize);
        const inp = fft.createComplexArray();
        const out = fft.createComplexArray();

        for (let i = 0; i < sampleSize; i++) {
            inp[2*i] = timeData[i];
            inp[2*i+1] = 0;
        }

        fft.transform(out, inp);

        const mag = [];
        for (let i = 0; i < sampleSize/2; i++) {
            const re = out[2*i], im = out[2*i+1];
            mag.push(Math.sqrt(re*re + im*im));
        }

        chartFreq.data.datasets[0].data = mag;
        chartFreq.update();

        analyzeSpectrum(mag);
        updateMachineHealth(mag);
    }
};

// RELAIS
document.getElementById("relayOn").onclick = () =>
    ws.send(JSON.stringify({ cmd: "relay_on" }));

document.getElementById("relayOff").onclick = () =>
    ws.send(JSON.stringify({ cmd: "relay_off" }));

// NAVIGATION
const dashboardView = document.getElementById("dashboardView");
const analysisView = document.getElementById("analysisView");
const dataView = document.getElementById("dataView");

document.querySelectorAll(".menu li").forEach((item, index) => {
    item.addEventListener("click", () => {
        document.querySelectorAll(".menu li").forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        dashboardView.classList.add("hidden");
        analysisView.classList.add("hidden");
        dataView.classList.add("hidden");

        if (index === 0) dashboardView.classList.remove("hidden");
        if (index === 1) analysisView.classList.remove("hidden");
        if (index === 2) loadData().then(() => dataView.classList.remove("hidden"));
    });
});

// DATA VIEW
async function loadData() {
    const res = await fetch("/data");
    const rows = await res.json();

    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = "";

    rows.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${r.timestamp}</td>
            <td>${r.ax.toFixed(3)}</td>
            <td>${r.ay.toFixed(3)}</td>
            <td>${r.az.toFixed(3)}</td>
            <td>${r.amplitude.toFixed(3)}</td>
        `;
        tbody.appendChild(tr);
    });
}
