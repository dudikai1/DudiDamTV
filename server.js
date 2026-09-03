const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

let onlineUsers = 0;
let waitingUser = null;

io.on('connection', (socket) => {
    onlineUsers++;
    io.emit('update-user-count', onlineUsers);

    socket.on('find-partner', () => {
        if (waitingUser && waitingUser !== socket.id) {
            io.to(waitingUser).emit('matched', socket.id);
            socket.emit('matched', waitingUser);
            waitingUser = null;
        } else {
            waitingUser = socket.id;
            socket.emit('no-users-yet');
        }
    });

    socket.on('disconnect', () => {
        onlineUsers = Math.max(0, onlineUsers - 1);
        io.emit('update-user-count', onlineUsers);
        
        if (waitingUser === socket.id) {
            waitingUser = null;
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
