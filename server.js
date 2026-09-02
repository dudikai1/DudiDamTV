const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static('public'));

let waitingUser = null;

io.on('connection', (socket) => {
    socket.on('find-partner', () => {
        if (waitingUser && waitingUser.id !== socket.id) {
            const partner = waitingUser;
            waitingUser = null;

            socket.partner = partner;
            partner.partner = socket;

            socket.emit('peer-found', { initiator: true });
            partner.emit('peer-found', { initiator: false });
        } else {
            waitingUser = socket;
            socket.emit('waiting');
        }
    });

    socket.on('signal', (data) => {
        if (socket.partner) {
            socket.partner.emit('signal', data);
        }
    });

    socket.on('send-message', (msg) => {
        if (socket.partner) {
            socket.partner.emit('receive-message', msg);
        }
    });

    socket.on('disconnect', () => {
        if (waitingUser === socket) {
            waitingUser = null;
        }
        if (socket.partner) {
            socket.partner.emit('partner-disconnected');
            socket.partner.partner = null;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
