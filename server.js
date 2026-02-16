import net from 'net';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, onDisconnect } from "firebase/database";

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyCv-psEkDV_yJ4KFcoF5OsN2nWi8rPzI7Q",
    authDomain: "chatrucoy.firebaseapp.com",
    databaseURL: "https://chatrucoy-default-rtdb.firebaseio.com",
    projectId: "chatrucoy"
};

const fbApp = initializeApp(firebaseConfig);
const db = getDatabase(fbApp);

// --- LÓGICA DO SERVIDOR RUCOY ---
const server = net.createServer((socket) => {
    const playerId = `player_${Math.floor(Math.random() * 9999)}`;
    console.log(`[${playerId}] Tentando conexão...`);

    // Quando o APK envia dados
    socket.on('data', (data) => {
        // O Rucoy envia pacotes em formato Buffer (Hexadecimal)
        // No 1.6.0, os primeiros bytes definem a ação
        const opcode = data[0]; 

        console.log(`[${playerId}] Enviou Opcode: ${opcode.toString(16)}`);

        // TRATAMENTO DE LOGIN (Exemplo Simplificado)
        if (opcode === 0x00 || opcode === 0x64) { 
            console.log(`[${playerId}] Login solicitado!`);
            
            // Pacote de "Welcome" (Boas-vindas) que o APK espera para entrar no mapa
            // Isso diz ao APK: "Pode entrar, você é o ID 1 na posição 100, 100"
            const welcomeBuffer = Buffer.from([0x01, 0x00, 0x01, 0x64, 0x64]); 
            socket.write(welcomeBuffer);

            // Cria no seu Firebase (para você ver no seu mapa 3D)
            set(ref(db, `players/${playerId}`), {
                online: true,
                x: 100,
                z: 100,
                skin: "knight"
            });
        }

        // TRATAMENTO DE MOVIMENTO
        if (opcode === 0x65) { // Supondo 0x65 como movimento no 1.6.0
            const x = data.readUInt16LE(1);
            const z = data.readUInt16LE(3);
            
            update(ref(db, `players/${playerId}`), { x, z });
        }
    });

    socket.on('error', (err) => console.log("Erro no socket:", err.message));
    
    socket.on('end', () => {
        console.log(`[${playerId}] Desconectou.`);
        update(ref(db, `players/${playerId}`), { online: false });
    });
});

// --- PORTA ---
// O Rucoy original costumava usar a 7171 ou 8080. 
// No Render, use process.env.PORT
const PORT = process.env.PORT || 7171;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`⚔️ Servidor RUCOY 1.6.0 ONLINE na porta ${PORT}`);
    console.log(`🔗 Aponte o APK para o IP do seu Render nesta porta.`);
});
