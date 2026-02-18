const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let orders = [];

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Send existing orders to newly connected client
    socket.emit("ordersUpdate", orders);

    // ==========================
    // NEW ORDER FROM CUSTOMER
    // ==========================
    socket.on("newOrder", (order) => {

        if (!order || !order.id) return;

        order.status = "Pending";
        order.assignedTo = null;

        orders.push(order);

        console.log("New order received:", order);

        // Send updated orders to everyone (employee terminals)
        io.emit("ordersUpdate", orders);
    });

    // ==========================
    // EMPLOYEE CLAIMS ORDER
    // ==========================
    socket.on("claimOrder", ({ id, employee }) => {

        const order = orders.find(o => o.id === id);
        if (!order) return;

        if (order.status === "Pending") {
            order.status = "Preparing";
            order.assignedTo = employee;

            io.emit("ordersUpdate", orders);

            // Notify customer
            io.emit("statusUpdate", {
                id: order.id,
                status: order.status
            });

        } else {
            socket.emit("claimFailed", 
                `Order already taken by ${order.assignedTo}`
            );
        }
    });

    // ==========================
    // COMPLETE ORDER
    // ==========================
    socket.on("completeOrder", ({ id }) => {

        const order = orders.find(o => o.id === id);
        if (!order) return;

        order.status = "Completed";

        io.emit("ordersUpdate", orders);

        // Notify customer
        io.emit("statusUpdate", {
            id: order.id,
            status: order.status
        });
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });

});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
