// --- เชื่อมต่อกับเซิร์ฟเวอร์ (Socket.IO จัดการให้) ---
const socket = io();

// --- ดึง Element จาก HTML ---
const screens = document.querySelectorAll('.screen');
const loginScreen = document.getElementById('login-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const roleScreen = document.getElementById('role-screen');
const leaderPromptScreen = document.getElementById('leader-prompt-screen');
const gameScreen = document.getElementById('game-screen');

const joinBtn = document.getElementById('join-btn');
const nameInput = document.getElementById('name-input');
const playerList = document.getElementById('player-list');
const startGameBtn = document.getElementById('start-game-btn');
const lobbyError = document.getElementById('lobby-error');
const roleDisplay = document.getElementById('role-display');
const roleWaitMsg = document.getElementById('role-wait-msg');
const promptInput = document.getElementById('prompt-input');
const submitPromptBtn = document.getElementById('submit-prompt-btn');

// --- ฟังก์ชันสลับหน้าจอ ---
function showScreen(screenId) {
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// --- การทำงานของ Client (กดปุ่ม) ---

// 1. กดปุ่ม "เข้าร่วมเกม"
joinBtn.addEventListener('click', () => {
    const name = nameInput.value;
    if (name.trim()) {
        socket.emit('joinGame', name); // ส่งชื่อไปให้เซิร์ฟเวอร์
        showScreen('lobby-screen');
    }
});

// 2. กดปุ่ม "เริ่มเกม" (ส่งคำสั่งไปที่เซิร์ฟเวอร์)
startGameBtn.addEventListener('click', () => {
    socket.emit('startGame');
    lobbyError.textContent = ''; // เคลียร์ error
});

// 3. Leader กด "ยืนยันโจทย์"
submitPromptBtn.addEventListener('click', () => {
    const prompt = promptInput.value;
    if (prompt.trim()) {
        socket.emit('submitPrompt', prompt); // ส่งโจทย์ไปให้เซิร์ฟเวอร์
        showScreen('role-screen'); // กลับไปซ่อนหน้าตัวเอง (รอเกมเริ่ม)
        roleWaitMsg.textContent = 'ส่งโจทย์แล้ว... รอทุกคนรับทราบ...';
    }
});


// --- รับข้อมูลจากเซิร์ฟเวอร์ (Socket.IO) ---

// A. เมื่อรายชื่อผู้เล่นอัปเดต
socket.on('updatePlayerList', (players) => {
    playerList.innerHTML = ''; // เคลียร์ลิสต์เก่า
    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name;
        playerList.appendChild(li);
    });
});

// B. เมื่อได้รับบทบาท (เซิร์ฟเวอร์ส่งมาให้เราคนเดียว)
socket.on('yourRole', (role) => {
    roleDisplay.textContent = role;
    showScreen('role-screen');

    if (role === 'Leader') {
        roleWaitMsg.textContent = 'คุณคือ Leader, กำลังรอส่งไปหน้าตั้งโจทย์...';
    } else {
        roleWaitMsg.textContent = 'รอ Leader เป็นคนตั้งโจทย์...';
    }
});

// C. เมื่อเซิร์ฟเวอร์ "ขอ" โจทย์ (สำหรับ Leader เท่านั้น)
socket.on('requestPrompt', () => {
    showScreen('leader-prompt-screen');
});

// D. เมื่อได้รับข้อมูลเกม (โจทย์ หรือ สปาย)
socket.on('gameData', (data) => {
    showScreen('game-screen');
    if (data.type === 'Spy') {
        // ถ้าเราเป็นสปาย
        document.getElementById('prompt-display-area').style.display = 'none';
        document.getElementById('spy-prompt-area').style.display = 'block';
    } else {
        // ถ้าเราเห็นโจทย์
        document.getElementById('prompt-display-area').style.display = 'block';
        document.getElementById('spy-prompt-area').style.display = 'none';
        document.getElementById('prompt-display-text').textContent = data.prompt;
    }
});

// E. เมื่อเกมเริ่ม (ทุกคนพร้อม)
socket.on('gameStarted', () => {
    console.log('Game has officially started!');
    // (หน้าจอจะเปลี่ยนไปที่ 'game-screen' จากข้อ D อยู่แล้ว)
});

// F. เมื่อเกิด Error
socket.on('error', (message) => {
    lobbyError.textContent = message; // แสดง Error ที่หน้า Lobby
});