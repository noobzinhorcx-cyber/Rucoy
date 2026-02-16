import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import net from 'net';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, update, remove, onValue, set } from "firebase/database";

// --- 1. CONFIGURAÇÃO FIREBASE ---
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

// Inicializa o Firebase apenas se não houver apps rodando
const fbApp = initializeApp(firebaseConfig);
const db = getDatabase(fbApp);

// --- 2. SERVIDOR WEB (Express + Socket.io) ---
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(express.static('public'));

// --- 3. ROTA PARA O APK ACHAR O SERVIDOR ---
app.get('/server_list.json', (req, res) => {
    console.log(`📱 [APK] Solicitou lista de servidores (IP: ${req.ip})`);
    res.json([
        {
            "name": "SERVIDOR H3LD 3D",
            "version": "1.6.0",
            "ip": "rucoy-h3ld.onrender.com", 
            "port": 80, 
            "language": "en"
        }
    ]);
});

// --- 4. SERVIDOR TCP (O Jogo Real) ---
// Tenta rodar na porta 7171 internamente
const tcpServer = net.createServer((socket) => {
    const playerId = `PL_${Math.floor(Math.random() * 9000) + 1000}`;
    console.log(`⚔️ [CONEXÃO TCP] ${playerId} conectou!`);

    // !!! TRUQUE PARA DESTRAVAR O "CONNECTING..." !!!
    // Envia um pacote vazio ou de boas-vindas para o cliente responder
    try {
        const welcomePacket = Buffer.from([0x00, 0x01]); // Exemplo simples
        socket.write(welcomePacket);
    } catch (e) {
        console.log("Erro ao enviar boas-vindas TCP");
    }

    socket.on('data', (data) => {
        const hex = data.toString('hex');
        console.log(`📩 [${playerId}]: ${hex}`);

        // Atualiza posição no Firebase para o site 3D ver
        update(ref(db, `players/${playerId}`), {
            online: true,
            lastAction: hex,
            timestamp: Date.now()
        });
    });

    socket.on('end', () => {
        console.log(`👋 [SAIU] ${playerId} desconectou.`);
        remove(ref(db, `players/${playerId}`));
    });

    socket.on('error', (err) => {
        // Ignora erros de desconexão forçada
        if (err.code !== 'ECONNRESET') {
            console.log(`❌ Erro TCP: ${err.message}`);
        }
    });
});

// --- 5. SINCRONIZAÇÃO COM SITE 3D ---
io.on('connection', (socket) => {
    console.log(`🌐 Site 3D conectado: ${socket.id}`);
});

onValue(ref(db, 'players'), (snapshot) => {
    io.emit('updatePlayers', snapshot.val());
});

// --- 6. INICIAR TUDO ---
const PORT = process.env.PORT || 3000;

// Inicia o servidor Web
httpServer.listen(PORT, () => {
    console.log(`✅ WEB SERVER ONLINE na porta ${PORT}`);
});

// Tenta iniciar o servidor TCP (Porta 7171)
// Nota: No Render Free, isso roda internamente.
try {
    tcpServer.listen(7171, '0.0.0.0', () => {
        console.log(`🛡️ TCP SERVER ONLINE na porta 7171`);
    });
} catch (e) {
    console.log("⚠️ Não foi possível abrir porta 7171 (Isso é normal no Render Free)");
      }
