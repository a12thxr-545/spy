// --- (นี่คือ server.js ที่ถูกต้อง) ---
const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- ตัวแปรสถานะเกม ---
// เราจะเก็บ 'role' ใน 'players' array เลย
let players = []; // { id, name, role }
let gamePrompt = '';
let potentialLeaders = []; // คิวสำหรับ ID

// ฟังก์ชันสุ่ม
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// เมื่อมีคนเชื่อมต่อเข้ามา
io.on('connection', (socket) => {
    console.log('ผู้เล่นเชื่อมต่อ:', socket.id);

    // 1. เมื่อผู้เล่น "ล็อกอิน" ด้วยชื่อ
    socket.on('joinGame', (name) => {
        // เพิ่มผู้เล่นใหม่
        const newPlayer = { id: socket.id, name: name, role: null };
        players.push(newPlayer);
        
        // เพิ่มไปในคิวหัวหน้า
        potentialLeaders.push(socket.id); 
        console.log('ผู้เล่นเข้าร่วม:', name);

        io.emit('updatePlayerList', players);
    });

    // 2. เมื่อมีคนกด "เริ่มเกม"
    socket.on('startGame', () => {
        if (players.length < 3) {
            socket.emit('error', 'ต้องมีอย่างน้อย 3 คน');
            return;
        }

        // 1. ตรวจสอบคิวหัวหน้า
        if (potentialLeaders.length === 0) {
            console.log("คิวหัวหน้าว่าง! เริ่มต้นรอบใหม่");
            potentialLeaders = players.map(p => p.id);
            shuffleArray(potentialLeaders);
        }

        // 2. เลือกหัวหน้า
        const leaderId = potentialLeaders.shift(); // ดึงคนแรกออก
        console.log("หัวหน้ารอบนี้:", leaderId);

        // 3. เลือกสปาย
        const potentialSpies = players.filter(p => p.id !== leaderId);
        shuffleArray(potentialSpies); // สุ่มผู้เล่นที่เหลือ
        const spyId = potentialSpies[0].id; // เลือกสปาย 1 คน
        console.log("สปายรอบนี้:", spyId);

        // 4. แจกจ่ายบทบาท และ *บันทึกบทบาท* ลงใน 'players' array
        players.forEach(player => {
            if (player.id === leaderId) {
                player.role = 'Leader';
            } else if (player.id === spyId) {
                player.role = 'Spy';
            } else {
                player.role = 'Player';
            }
            // ส่งบทบาทไปให้ "เฉพาะ" คนนั้นๆ
            io.to(player.id).emit('yourRole', player.role);
        });

        // 5. บอกให้ Leader ตั้งโจทย์
        io.to(leaderId).emit('requestPrompt');
    });

    // 3. เมื่อ Leader ส่งโจทย์
    socket.on('submitPrompt', (prompt) => {
        gamePrompt = prompt;

        // ตอนนี้เราสามารถวนลูปและเช็ค 'player.role' ได้เลย
        players.forEach(player => {
            if (player.role === 'Spy') {
                io.to(player.id).emit('gameData', { type: 'Spy' });
            } else if (player.role) { // (เช็คว่ามีบทบาทแล้ว)
                io.to(player.id).emit('gameData', { type: 'Prompt', prompt: gamePrompt });
            }
        });

        io.emit('gameStarted');
    });

    // 4. เมื่อผู้เล่นตัดการเชื่อมต่อ
    socket.on('disconnect', () => {
        console.log('ผู้เล่นตัดการเชื่อมต่อ:', socket.id);
        
        // ลบออกจากคิวหัวหน้าด้วย
        potentialLeaders = potentialLeaders.filter(id => id !== socket.id);
        
        // ลบออกจากลิสต์ผู้เล่น
        players = players.filter(player => player.id !== socket.id);
        
        // อัปเดตรายชื่อให้คนที่เหลือ
        io.emit('updatePlayerList', players);
    });
});

// รันเซิร์ฟเวอร์
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`เซิร์ฟเวอร์กำลังทำงานที่ http://localhost:${PORT}`);
});