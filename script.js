// Variable Global & State Aplikasi
let localStream = null;
let peer = null;
let activeCall = null;
let currentFilter = 'none';
let currentFrame = 'classic-white';
let capturedPhotos = [];

// DOM Elements
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const remoteVideoWrapper = document.getElementById('remote-video-wrapper');
const videoGrid = document.getElementById('video-grid');
const myPeerIdSpan = document.getElementById('my-peer-id');
const peerStatusBadge = document.getElementById('peer-status-badge');
const remoteIdInput = document.getElementById('remote-id-input');
const btnConnect = document.getElementById('btn-connect');
const connectionInfo = document.getElementById('connection-info');
const countdownOverlay = document.getElementById('countdown-overlay');
const btnCapture = document.getElementById('btn-capture');
const dragOverlay = document.getElementById('drag-overlay');
const photoCanvas = document.getElementById('photo-canvas');
const hiddenCanvas = document.getElementById('hidden-canvas');
const resultContainer = document.getElementById('result-container');

// Inisialisasi Aplikasi Saat Diumuat
window.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initLocalCamera();
    initPeerJS();
    setupEventListeners();
});

// 1. Inisialisasi Kamera Lokal
async function initLocalCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        localVideo.srcObject = localStream;
    } catch (err) {
        alert('Gagal mengakses kamera: ' + err.message);
    }
}

// 2. Inisialisasi PeerJS untuk Koneksi Video Jarak Jauh
function initPeerJS() {
// Membuat ID simpel dengan awalan 'booth-' diikuti 4 angka acak
const simpleId = 'booth-' + Math.floor(1000 + Math.random() * 9000);
peer = new Peer(simpleId);

    peer.on('open', (id) => {
        myPeerIdSpan.textContent = id;
        peerStatusBadge.textContent = 'Siap Terhubung';
    });

    peer.on('call', (call) => {
        // Menerima panggilan masuk otomatis
        call.answer(localStream);
        handleStreamConnection(call);
    });

    peer.on('error', (err) => {
        connectionInfo.textContent = 'Error koneksi: ' + err.type;
    });
}

// Menangani Aliran Stream Remote Video
function handleStreamConnection(call) {
    activeCall = call;
    call.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
        remoteVideoWrapper.classList.remove('hidden');
        videoGrid.classList.add('split-screen');
        peerStatusBadge.textContent = 'Terhubung';
        peerStatusBadge.classList.add('connected');
        connectionInfo.textContent = 'Terhubung dengan perangkat remote!';
    });

    call.on('close', () => {
        remoteVideoWrapper.classList.add('hidden');
        videoGrid.classList.remove('split-screen');
        peerStatusBadge.textContent = 'Terputus';
        peerStatusBadge.classList.remove('connected');
    });
}

// Setup Listener Event untuk Tombol & Input
function setupEventListeners() {
    // Tombol Salin ID
    document.getElementById('btn-copy-id').addEventListener('click', () => {
        navigator.clipboard.writeText(myPeerIdSpan.textContent);
        alert('ID Panggilan disalin!');
    });

    // Sambungkan ke Remote Peer
    btnConnect.addEventListener('click', () => {
        const remoteId = remoteIdInput.value.trim();
        if (!remoteId) return alert('Masukkan ID Teman terlebih dahulu!');
        connectionInfo.textContent = 'Menghubungkan...';
        const call = peer.call(remoteId, localStream);
        handleStreamConnection(call);
    });

    // Pilihan Filter Kamera
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            localVideo.style.filter = currentFilter;
            remoteVideo.style.filter = currentFilter;
        });
    });

    // Pilihan Bingkai
    document.querySelectorAll('.frame-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.frame-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFrame = e.target.dataset.frame;
        });
    });

    // Tambah Stiker Emoji
    document.querySelectorAll('.add-sticker-btn').forEach(btn => {
        btn.addEventListener('click', () => addDraggableSticker(btn.dataset.sticker));
    });

    // Tambah Stiker Teks Custom
    document.getElementById('btn-add-text-sticker').addEventListener('click', () => {
        const input = document.getElementById('sticker-text-input');
        if (input.value.trim()) {
            addDraggableSticker(input.value.trim());
            input.value = '';
        }
    });

    // Tombol Jepret Foto
    btnCapture.addEventListener('click', startPhotoboothSession);

    // Tombol Ulang & Download
    document.getElementById('btn-retake').addEventListener('click', () => {
        resultContainer.classList.add('hidden');
    });

    document.getElementById('btn-download').addEventListener('click', downloadPhotoStrip);
}

// 3. Logika Menambah Hiasan/Stiker Draggable
function addDraggableSticker(content) {
    const el = document.createElement('div');
    el.className = 'draggable-item';
    el.innerHTML = `<span>${content}</span> <button class="btn-remove-sticker">✕</button>`;
    
    // Posisi awal acak
    el.style.left = '40%';
    el.style.top = '40%';

    // Hapus Stiker
    el.querySelector('.btn-remove-sticker').addEventListener('click', () => el.remove());

    // Fitur Drag Element
    let isDragging = false;
    let offsetX, offsetY;

    el.addEventListener('mousedown', (e) => {
        if(e.target.classList.contains('btn-remove-sticker')) return;
        isDragging = true;
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        el.style.left = `${e.clientX - offsetX}px`;
        el.style.top = `${e.clientY - offsetY}px`;
    });

    window.addEventListener('mouseup', () => isDragging = false);

    dragOverlay.appendChild(el);
}

// 4. Proses Sesi Pengambilan Foto dengan Countdown Timer
async function startPhotoboothSession() {
    const poseCount = parseInt(document.getElementById('pose-count').value);
    const delay = parseInt(document.getElementById('timer-delay').value);
    capturedPhotos = [];

    btnCapture.disabled = true;

    for (let i = 0; i < poseCount; i++) {
        await runCountdown(delay);
        captureSingleFrame();
    }

    btnCapture.disabled = false;
    renderPhotoStrip();
}

function runCountdown(seconds) {
    return new Promise((resolve) => {
        countdownOverlay.classList.remove('hidden');
        let count = seconds;
        countdownOverlay.textContent = count;

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownOverlay.textContent = count;
            } else {
                clearInterval(interval);
                countdownOverlay.classList.add('hidden');
                resolve();
            }
        }, 1000);
    });
}

// 5. Menangkap Snapshot dari Video Live
function captureSingleFrame() {
    const ctx = hiddenCanvas.getContext('2d');
    const isSplit = !remoteVideoWrapper.classList.contains('hidden');

    hiddenCanvas.width = 1280;
    hiddenCanvas.height = 720;

    ctx.filter = currentFilter;

    if (!isSplit) {
        // Foto Lokal saja (Mirroring dikembalikan)
        ctx.translate(hiddenCanvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(localVideo, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
        // Split Screen (Foto Gabungan Jarak Jauh)
        const halfWidth = hiddenCanvas.width / 2;
        
        // Sisi Kiri (Lokal)
        ctx.save();
        ctx.translate(halfWidth, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(localVideo, 0, 0, halfWidth, hiddenCanvas.height);
        ctx.restore();

        // Sisi Kanan (Remote)
        ctx.save();
        ctx.translate(hiddenCanvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(remoteVideo, 0, 0, halfWidth, hiddenCanvas.height);
        ctx.restore();
    }

    capturedPhotos.push(hiddenCanvas.toDataURL('image/png'));
}

// 6. Menggambar Photo Strip Ke Canvas Utama
function renderPhotoStrip() {
    const ctx = photoCanvas.getContext('2d');
    const photoWidth = 600;
    const photoHeight = 400;
    const padding = 30;
    const headerHeight = 40;
    const footerHeight = 80;

    const totalPhotos = capturedPhotos.length;
    photoCanvas.width = photoWidth + (padding * 2);
    photoCanvas.height = headerHeight + (totalPhotos * photoHeight) + ((totalPhotos - 1) * padding) + footerHeight;

    // Warna Background Berdasarkan Frame
    if (currentFrame === 'charcoal-dark') {
        ctx.fillStyle = '#18181b';
    } else if (currentFrame === 'cream-vintage') {
        ctx.fillStyle = '#fef3c7';
    } else {
        ctx.fillStyle = '#ffffff'; // Classic White / Polaroid
    }
    ctx.fillRect(0, 0, photoCanvas.width, photoCanvas.height);

    // Render Semua Foto
    let loadedImages = 0;
    capturedPhotos.forEach((src, idx) => {
        const img = new Image();
        img.onload = () => {
            const yPos = headerHeight + (idx * (photoHeight + padding));
            ctx.drawImage(img, padding, yPos, photoWidth, photoHeight);
            
            loadedImages++;
            if (loadedImages === totalPhotos) {
                renderOverlayStickersAndFooter(ctx, photoCanvas.width, photoCanvas.height);
                resultContainer.classList.remove('hidden');
                resultContainer.scrollIntoView({ behavior: 'smooth' });
            }
        };
        img.src = src;
    });
}

// Menggambar Teks Footer & Hiasan ke Canvas
function renderOverlayStickersAndFooter(ctx, width, height) {
    // Teks Footer Minimalis
    ctx.fillStyle = (currentFrame === 'charcoal-dark') ? '#a1a1aa' : '#3f3f46';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    ctx.fillText(`MINIMALIST BOOTH  •  ${today}`, width / 2, height - 35);

    // Menggambar Hiasan/Stiker Draggable ke dalam Canvas
    const containerRect = document.querySelector('.viewfinder-container').getBoundingClientRect();
    const items = document.querySelectorAll('.draggable-item');

    items.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        const text = item.querySelector('span').textContent;

        // Proporsi skala relatif dari layar ke canvas
        const relX = (itemRect.left - containerRect.left) / containerRect.width;
        const relY = (itemRect.top - containerRect.top) / containerRect.height;

        const canvasX = relX * width;
        const canvasY = relY * height;

        ctx.font = '30px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(text, canvasX, canvasY);
    });
}

// 7. Unduh Hasil Canvas
function downloadPhotoStrip() {
    const link = document.createElement('a');
    link.download = `photobooth-${Date.now()}.png`;
    link.href = photoCanvas.toDataURL('image/png');
    link.click();
}
