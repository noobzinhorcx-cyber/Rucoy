const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

let players = {};

io.on('connection', (socket) => {
    console.log('Player conectado: ' + socket.id);

    // Cria o player no servidor com os atributos do Rucoy
    players[socket.id] = {
        id: socket.id,
        x: 300, y: 300,
        hp: 100, lv: 1,
        skin: "knight"
    };

    // Envia lista atual para quem entrou
    socket.emit('currentPlayers', players);
    // Avisa os outros que alguém chegou
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Lógica de Movimento
    socket.on('playerMovement', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
