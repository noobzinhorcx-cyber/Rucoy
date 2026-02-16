import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import net from 'net';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, remove, onValue } from "firebase/database";

// --- 1. CONFIGURAÇÃO DO FIREBASE ---
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
console.log("🔥 Firebase conectado!");

// --- 2. PREPARANDO O SERVIDOR WEB (Express) ---
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// Pasta pública para o seu site 3D
app.use(express.static('public'));

// --- 3. A ROTA MÁGICA (Isso faz o APK funcionar) ---
// O APK vai acessar: https://rucoy-h3ld.onrender.com/server_list.json
app.get('/server_list.json', (req, res) => {
    console.log("📱 APK solicitou a lista de servidores!");
    
    // O APK espera receber um JSON (lista) com os dados do servidor
    res.json([
        {
            "name": "Servidor 3D H3LD", // O nome que aparece na tela inicial
            "version": "1.6.0",         // Importante bater com a versão do APK
            "ip": "rucoy-h3ld.onrender.com", // Seu endereço
            "port": 80,                 // Porta 80 é a porta padrão da web (Render)
            "language": "en"
        }
    ]);
});

// --- 4. SERVIDOR DE JOGO (TCP - Para o APK) ---
// O Render redireciona o tráfego da porta 80 para a porta interna do app
const tcpServer = net.createServer((socket) => {
    const tempId = `APK_${Math.floor(Math.random() * 9999)}`;
    const ip = socket.remoteAddress;

    // Filtro simples para ignorar bots de hospedagem (Opcional)
    if (ip && ip.includes('74.220.')) {
        socket.destroy();
        return;
    }

    console.log(`⚔️ [NOVO JOGADOR] ${tempId} conectou via APK!`);

    // Cria o boneco no Firebase para aparecer no site 3D
    set(ref(db, `players/${tempId}`), {
        x: 0,
        z: 0,
        action: "idle",
        platform: "android"
    });

    socket.on('data', (data) => {
        // AQUI CHEGAM OS DADOS DO JOGO (Movimento, ataque, etc)
        // O servidor recebe em Hexadecimal
        const hex = data.toString('hex');
        console.log(`📩 [${tempId}]: ${hex}`);

        // Exemplo: Se receber dados, move o boneco um pouco (só para testar visualmente)
        update(ref(db, `players/${tempId}`), {
            lastSeen: Date.now()
        });
    });

    socket.on('end', () => {
        console.log(`👋 [SAIU] ${tempId} desconectou.`);
        remove(ref(db, `players/${tempId}`));
    });
    
    socket.on('error', (err) => console.log(`Erro no socket ${tempId}:`, err.message));
});

// --- 5. SOCKET.IO (Para o Site 3D) ---
io.on('connection', (socket) => {
    console.log(`🌐 Visitante no Site 3D: ${socket.id}`);
});

// Sincroniza Firebase -> Site 3D
onValue(ref(db, 'players'), (snapshot) => {
    const players = snapshot.val();
    io.emit('updatePlayers', players);
});

// --- 6. INICIAR TUDO ---
const PORT = process.env.PORT || 3000;

// O Render exige que o servidor HTTP escute na porta definida
httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor WEB rodando na porta ${PORT}`);
    console.log(`🔗 Link para o APK: https://rucoy-h3ld.onrender.com/server_list.json`);
});

// Tentamos escutar na mesma porta para capturar tráfego TCP (Gambiarra para Render)
// Nota: Em produção real, você separaria as portas, mas o Render só libera uma.
httpServer.on('upgrade', (req, socket, head) => {
    console.log("Upgrade de conexão solicitado (WebSocket/TCP)");
});
