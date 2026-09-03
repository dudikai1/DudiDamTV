const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

let waitingUser = null;

io.on('connection', (socket) => {
    console.log('משתמש התחבר:', socket.id);

    socket.on('find-partner', () => {
        if (waitingUser && waitingUser.id !== socket.id) {
            const partner = waitingUser;
            waitingUser = null;

            socket.partnerId = partner.id;
            partner.partnerId = socket.id;

            socket.emit('matched', { initiator: true, partnerId: partner.id });
            partner.emit('matched', { initiator: false, partnerId: socket.id });
            console.log(`נוצר חיבור בין ${socket.id} ל-${partner.id}`);
        } else {
            waitingUser = socket;
            socket.emit('waiting');
            console.log('משתמש ממתין:', socket.id);
        }
    });

    socket.on('offer', (data) => {
        io.to(data.target).emit('offer', { offer: data.offer, sender: socket.id });
    });

    socket.on('answer', (data) => {
        io.to(data.target).emit('answer', { answer: data.answer, sender: socket.id });
    });

    socket.on('ice-candidate', (data) => {
        io.to(data.target).emit('ice-candidate', { candidate: data.candidate, sender: socket.id });
    });

    socket.on('skip', () => {
        disconnectPartner(socket);
        waitingUser = socket;
        socket.emit('waiting');
    });

    socket.on('disconnect', () => {
        console.log('משתמש התנתק:', socket.id);
        if (waitingUser === socket) {
            waitingUser = null;
        }
        disconnectPartner(socket);
    });
});

function disconnectPartner(socket) {
    if (socket.partnerId) {
        const partner = io.sockets.sockets.get(socket.partnerId);
        if (partner) {
            partner.partnerId = null;
            partner.emit('partner-disconnected');
        }
        socket.partnerId = null;
    }
}

server.listen(PORT, () => {
    console.log(`השרת רץ בפורט ${PORT}`);
});
