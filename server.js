import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import net from 'net';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, update, remove, onValue } from "firebase/database";

// --- CONFIGURAÇÃO FIREBASE (Sua conta chatrucoy) ---
const firebaseConfig = {
  apiKey: "AIzaSyCv-psEkDV_yJ4KFcoF5OsN2nWi8rPzI7Q",
  authDomain: "chatrucoy.firebaseapp.com",
  databaseURL: "https://chatrucoy-default-rtdb.firebaseio.com",
  projectId: "chatrucoy",
  storageBucket: "chatrucoy.firebasestorage.app",
  messagingSenderId: "817576008362",
  appId: "1:817576008362:web:278e7f989b244add384ed3",
  measurementId: "G-C4C057R7WL"
};

const fbApp = initializeApp(firebaseConfig);
const db = getDatabase(fbApp);

// --- SERVIDOR WEB ---
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(express.static('public'));

// Rota que o seu APK modificado acessa para mostrar o servidor na lista
app.get('/server_list.json', (req, res) => {
    console.log(`📱 [APK] Buscando lista...`);
    res.json([
        {
            "name": "RUCOY 3D H3LD",
            "ip": "rucoy-h3ld.onrender.com",
            "port": 80,
            "location": "Brasil"
        }
    ]);
});

// --- SERVIDOR DE JOGO (TCP) ---
const tcpServer = net.createServer((socket) => {
    const playerId = `PL_${Math.floor(Math.random() * 8999) + 1000}`;
    console.log(`⚔️ [CONEXÃO TCP] ${playerId} entrou.`);

    socket.on('data', (data) => {
        const hex = data.toString('hex');
        console.log(`📩 [${playerId}] PACOTE: ${hex}`);

        // Resposta para tentar destravar o "Connecting" do APK
        const response = Buffer.from("000f00010000000000000000000000", "hex");
        socket.write(response);

        // Envia para o Firebase para o seu Site 3D atualizar em tempo real
        update(ref(db, `players/${playerId}`), {
            online: true,
            hex: hex,
            x: 10,
            z: 10,
            lastUpdate: Date.now()
        });
    });

    socket.on('end', () => {
        console.log(`👋 [DESCONECTADO] ${playerId}`);
        remove(ref(db, `players/${playerId}`));
    });

    socket.on('error', () => {});
});

// --- INTEGRAÇÃO SITE 3D ---
io.on('connection', (socket) => {
    console.log(`🌐 Site 3D Conectado: ${socket.id}`);
});

onValue(ref(db, 'players'), (snapshot) => {
    io.emit('updatePlayers', snapshot.val());
});

// --- INICIALIZAÇÃO ---
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`✅ SERVIDOR WEB/API ONLINE NA PORTA ${PORT}`);
});

tcpServer.listen(7171, '0.0.0.0', () => {
    console.log(`🛡️  ESCUTANDO PORTA TCP 7171`);
});
