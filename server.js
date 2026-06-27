const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' directory
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a specific room based on the QR code session ID
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // Receive data from Device 2 and forward it to Device 1 in the same room
    socket.on('send-data', (data) => {
        // data contains { roomId, type: 'text'|'url', content: '...' }
        socket.to(data.roomId).emit('receive-data', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});