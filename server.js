const express = require("express");
const path = require("path");
const http = require("http");
const { type } = require("os");
const WebSocket = require("ws");

const app = express();
app.use(express.static("dist"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


app.use((req, res) => {
  res.sendFile(path.resolve("dist/index.html"));
});

let roundId, roundStatus, betStatus, betTime, showCounter;
const accelerationFactor = 1.01, timeout = 12;
const data = {
    type: "roundStarts",
    rId: roundId,
    rStatus: roundStatus,
    bStatus: betStatus,
    sCounter: showCounter,
    bTime: betTime,
    msg: ""
}

const GET_ROUND_ID = () => {
    //    TODO get  the data  from API set the values
    roundId = "12346-8765-43";
    roundStatus = true;
    betStatus = true;
    betTime = 7;
    showCounter = false;

    data.type = "roundStarts";
    data.rId = roundId;
    data.rStatus = roundStatus;
    data.bStatus = betStatus;
    data.sCounter = showCounter;
    data.bTime = betTime;

    BROADCAST(data);

    console.log("NEW ROUND ID FETCHED-------------------------")
    console.log(data);
};

const CHECK_ROUND_STATUS = () => {
    //    TODO  get the round status every second and,
    //  update roundStatus
    let x = GetRandomInteger(1500, 75000);

    setTimeout(() => {
        roundStatus = false;
    }, x);

    const intervalId = setInterval(() => {

        if (!roundStatus) {
            data.rStatus = roundStatus;
            data.type = "roundClosed";

            BROADCAST(data);
            console.log(data);

            clearInterval(intervalId);
            setTimeout(() => {
                console.log("waited 3 seconds");
                START_ROUND();
            }, 3000);

        }
    }, 1000);
};

function startExponentialCounter() {
    showCounter = true;
    let value = 1;
    let increment = 0.01;
    data.sCounter = showCounter;
    data.type = "updateShowCounter";
    BROADCAST(data);
    console.log(data);


    const intervalId = setInterval(() => {
        if (!roundStatus) {
            clearInterval(intervalId);
            showCounter = false;
            data.sCounter = showCounter;
            data.type = "updateShowCounter";
            BROADCAST(data);
            console.log(data);

            const counterData = {
                type: "updateCounter",
                val: value.toFixed(2)
            }
            BROADCAST(counterData);
            console.log(counterData);
        } else {
            value += increment;
            increment *= accelerationFactor;
            const counterData = {
                type: "updateCounter",
                val: value.toFixed(2),
                bStatus: betStatus
            }
            BROADCAST(counterData);
            console.log(counterData);
        }
    }, 100);
}

function START_ROUND() {
    GET_ROUND_ID();

    const intervalId = setInterval(() => {
        betTime -= 1;
        data.bTime = betTime;
        data.type = "updateBetTime";
        BROADCAST(data);
        // console.log(data);
        console.log("bet time 7 second");

        if (betTime === 0) {
            betStatus = false;
            data.bStatus = betStatus;
            data.type = "updateBetStatus";
            BROADCAST(data);
            console.log(data);
            clearInterval(intervalId);
            CHECK_ROUND_STATUS();

            // setTimeout(() => {
            startExponentialCounter();
            // console.log("waited 5 seconds");

            // }, 1000);
        }

    }, 1000);


}

START_ROUND();



wss.on("connection", (ws) => {
    console.log("client connected");
    ws.send(JSON.stringify({
        type: "system",
        message: data,
        timestamp: new Date().toISOString()
    }));

    ws.on("message", (message) => {
        const msg = message.toString();
        console.log("received:", JSON.parse(msg));
        data.type = "liveBet";
        data.msg = msg;
        BROADCAST(data);
    });

    ws.on("close", () => {
        console.log("client disconnected");
    });
});

function BROADCAST(d) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(d));
        }
    });
}

// ✅ Broadcast a message to all clients every second
setInterval(() => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0'); // 24-hour format
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const stime = {
        type: "updateTime",
        time: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
    }
    BROADCAST(stime);
}, 1000);

const port = 3000;
server.listen(port, () => {
    console.log("server is running on the port", port);
})

function GetRandomInteger(min, max) {
    min = Math.ceil(min);   // round up to ensure the lower bound is included
    max = Math.floor(max);  // round down to ensure the upper bound is included
    return Math.floor(Math.random() * (max - min + 1)) + min;
}