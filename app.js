document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM 元素获取 ----
    const video = document.getElementById('camera-feed');
    const captureBtn = document.getElementById('capture-btn');
    const switchBtn = document.getElementById('camera-switch-btn');
    const gridToggleBtn = document.getElementById('grid-toggle-btn');
    const gridOverlay = document.getElementById('grid-overlay');

    const silhouetteOverlay = document.getElementById('silhouette-overlay');
    const silhouetteSvg = document.getElementById('silhouette-svg');
    const modeBtns = document.querySelectorAll('.mode-btn');

    const levelLine = document.querySelector('.level-line');
    const levelText = document.querySelector('.level-text');
    const angleWarning = document.getElementById('angle-warning');

    const photoPreviewLayer = document.getElementById('photo-preview-layer');
    const photoPreview = document.getElementById('photo-preview');
    const retakeBtn = document.getElementById('retake-btn');
    const saveBtn = document.getElementById('save-btn');
    const canvas = document.getElementById('capture-canvas');
    const ctx = canvas.getContext('2d');

    const filterDrawer = document.getElementById('filter-drawer');
    const toggleFilterBtn = document.getElementById('toggle-filter-btn');
    const filterOpts = document.querySelectorAll('.filter-opt');
    const zoomControls = document.getElementById('zoom-controls');
    const zoomBtns = document.querySelectorAll('.zoom-btn');
    const poseTip = document.getElementById('pose-tip');
    const timerBtn = document.getElementById('timer-btn');
    const timerDisplay = document.getElementById('timer-display');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownNumber = document.getElementById('countdown-number');
    const shutterFlash = document.getElementById('shutter-flash');
    const tipsRefreshBtn = document.getElementById('tips-refresh-btn');

    // ---- 状态与变量 ----
    let currentStream = null;
    let currentTrack = null;
    let facingMode = 'environment';
    let currentFilter = 'none';
    let timerSeconds = 0; // 0 = 无倒计时

    // ---- 姿势指导语库 ----
    const poseTips = {
        'full': [
            "稍微仰拍，脚贴近画面底部，显腿长",
            "让她一只脚微微向前迈半步，身体微侧",
            "假装往前走，不经意回头看你",
            "站在台阶上，你蹲下从下往上拍",
            "背对你走几步，然后自然回头",
            "一只手自然下垂，一只手轻扶帽沿或发梢",
            "侧身站，眼睛看向远方，露出侧脸轮廓",
            "让她走向你，每步稍慢，抓拍自然步伐"
        ],
        'half': [
            "让她自然回头，眼神不看镜头",
            "用手轻轻拨一下头发，抓那个瞬间",
            "手托下巴，微微歪头，看向窗外",
            "闭上眼深呼吸，表情放松自然",
            "假装看手机笑一下，你抓拍侧脸",
            "双手捧着咖啡杯或花束，低头微笑",
            "坐下来侧身，双手撑在身后",
            "靠在墙上，一只手插口袋，看向远处"
        ],
        'close': [
            "用手托腮或挡脸，避免面部僵硬",
            "把花或树叶举到脸旁边当道具",
            "闭眼假装闻花香，等她微笑再拍",
            "用围巾或领口遮住下半脸，只露眼睛",
            "双手比心放在脸旁，俏皮一点",
            "趴在桌面上，双手交叉垫在下巴下",
            "戴上墨镜，嘴角微微上扬",
            "逆光时让阳光打在头发上，形成光晕"
        ]
    };

    // ---- 精美女性剪影 SVG ----
    const silhouetteSVGs = {
        'full': `
            <g stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-dasharray="6 3" fill="none">
                <!-- 头部 -->
                <ellipse cx="100" cy="60" rx="22" ry="28"/>
                <!-- 长发 -->
                <path d="M78 55 Q70 80 75 110"/>
                <path d="M122 55 Q130 80 125 110"/>
                <!-- 脖子 -->
                <path d="M93 88 L93 105"/>
                <path d="M107 88 L107 105"/>
                <!-- 肩膀和上身 -->
                <path d="M93 105 Q60 110 55 130"/>
                <path d="M107 105 Q140 110 145 130"/>
                <!-- 身体曲线 -->
                <path d="M55 130 Q58 180 65 210 Q70 240 68 270"/>
                <path d="M145 130 Q142 180 135 210 Q130 240 132 270"/>
                <!-- 裙摆 -->
                <path d="M68 270 Q60 320 45 380"/>
                <path d="M132 270 Q140 320 155 380"/>
                <path d="M68 270 Q90 290 100 380"/>
                <path d="M132 270 Q110 290 100 380"/>
                <!-- 腿 -->
                <path d="M75 380 L70 460"/>
                <path d="M125 380 L130 460"/>
                <!-- 手臂 -->
                <path d="M55 130 Q40 170 45 210"/>
                <path d="M145 130 Q155 155 150 180"/>
            </g>`,
        'half': `
            <g stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-dasharray="6 3" fill="none" transform="translate(0, 60)">
                <!-- 头部 -->
                <ellipse cx="100" cy="80" rx="28" ry="35"/>
                <!-- 长发 -->
                <path d="M72 75 Q62 110 68 160"/>
                <path d="M128 75 Q138 110 132 160"/>
                <!-- 脖子 -->
                <path d="M90 115 L90 135"/>
                <path d="M110 115 L110 135"/>
                <!-- 肩膀 -->
                <path d="M90 135 Q50 140 35 165"/>
                <path d="M110 135 Q150 140 165 165"/>
                <!-- 身体 -->
                <path d="M35 165 Q40 230 50 300"/>
                <path d="M165 165 Q160 230 150 300"/>
                <!-- 手臂 -->
                <path d="M35 165 Q20 210 30 260"/>
                <path d="M165 165 Q175 195 165 230"/>
                <!-- 手指 (托腮姿势) -->
                <path d="M165 230 Q155 220 140 200 Q130 180 120 170"/>
            </g>`,
        'close': `
            <g stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-dasharray="6 3" fill="none" transform="translate(0, 50)">
                <!-- 脸部轮廓 -->
                <ellipse cx="100" cy="150" rx="50" ry="65"/>
                <!-- 长发 -->
                <path d="M50 140 Q35 170 40 240"/>
                <path d="M150 140 Q165 170 160 240"/>
                <path d="M55 120 Q45 100 55 80 Q70 60 100 55 Q130 60 145 80 Q155 100 145 120"/>
                <!-- 肩膀 -->
                <path d="M60 210 Q40 225 15 250"/>
                <path d="M140 210 Q160 225 185 250"/>
                <!-- 上身区域 -->
                <path d="M15 250 Q20 310 30 380"/>
                <path d="M185 250 Q180 310 170 380"/>
                <!-- 手臂(托腮) -->
                <path d="M15 250 Q10 280 20 320"/>
                <path d="M185 250 Q170 260 155 240 Q140 220 130 200"/>
            </g>`
    };

    // ---- 摄像头逻辑 ----
    async function initCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            currentStream = stream;
            video.srcObject = stream;

            // 处理变焦能力
            const track = stream.getVideoTracks()[0];
            currentTrack = track;
            const capabilities = track.getCapabilities ? track.getCapabilities() : null;
            if (capabilities && capabilities.zoom) {
                zoomControls.classList.remove('hidden');
            } else {
                zoomControls.classList.add('hidden');
            }

            video.onloadedmetadata = () => { video.play(); };
            return true;
        } catch (err) {
            console.error('无法访问摄像头:', err);
            const errorLog = document.getElementById('error-log');
            if (errorLog) errorLog.innerText = '相机启动失败:\n' + err.name + ' ' + err.message;
            return false;
        }
    }

    // 翻转镜头
    switchBtn.addEventListener('click', () => {
        facingMode = facingMode === 'environment' ? 'user' : 'environment';
        initCamera();
    });

    // ---- 九宫格切换 ----
    gridToggleBtn.addEventListener('click', () => {
        gridOverlay.classList.toggle('hidden');
        gridToggleBtn.classList.toggle('active');
    });

    // ---- 蒙版与Pose选择 ----
    function showRandomTip(mode) {
        if (poseTips[mode]) {
            const tips = poseTips[mode];
            const randomTip = tips[Math.floor(Math.random() * tips.length)];
            poseTip.querySelector('span').innerText = "💡 " + randomTip;
            poseTip.classList.remove('hidden');
            // 重新触发动画
            poseTip.style.animation = 'none';
            poseTip.offsetHeight; // 强制回流
            poseTip.style.animation = '';
        } else {
            poseTip.classList.add('hidden');
        }
    }

    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const mode = e.target.getAttribute('data-mode');

            // 蒙版显示
            if (mode === 'none') {
                silhouetteOverlay.classList.add('hidden');
                poseTip.classList.add('hidden');
            } else {
                silhouetteSvg.innerHTML = silhouetteSVGs[mode] || '';
                silhouetteOverlay.classList.remove('hidden');
                showRandomTip(mode);
            }
        });
    });

    // 刷新提示语
    tipsRefreshBtn.addEventListener('click', () => {
        const activeMode = document.querySelector('.mode-btn.active').getAttribute('data-mode');
        if (activeMode !== 'none') {
            showRandomTip(activeMode);
        }
    });

    // ---- 滤镜 ----
    toggleFilterBtn.addEventListener('click', () => {
        filterDrawer.classList.toggle('hidden');
    });

    filterOpts.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterOpts.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            video.style.filter = currentFilter === 'none' ? '' : currentFilter;
        });
    });

    // ---- 变焦控制 ----
    zoomBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            zoomBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            if (currentTrack && currentTrack.applyConstraints) {
                const zoomValue = Number(e.target.getAttribute('data-zoom'));
                try {
                    await currentTrack.applyConstraints({ advanced: [{ zoom: zoomValue }] });
                } catch (err) {
                    console.log('变焦失败或不被支持', err);
                }
            }
        });
    });

    // ---- 倒计时自拍 ----
    const timerOptions = [0, 3, 5, 10];
    let timerIndex = 0;

    timerBtn.addEventListener('click', () => {
        timerIndex = (timerIndex + 1) % timerOptions.length;
        timerSeconds = timerOptions[timerIndex];
        if (timerSeconds === 0) {
            timerBtn.textContent = '⏱️';
            timerBtn.classList.remove('active');
            timerDisplay.classList.add('hidden');
        } else {
            timerBtn.textContent = timerSeconds + 's';
            timerBtn.classList.add('active');
            timerDisplay.textContent = '⏱️ ' + timerSeconds + '秒后拍照';
            timerDisplay.classList.remove('hidden');
        }
    });

    function runCountdown(seconds) {
        return new Promise(resolve => {
            countdownOverlay.classList.remove('hidden');
            let remaining = seconds;

            function tick() {
                countdownNumber.textContent = remaining;
                // 重新触发动画
                countdownNumber.style.animation = 'none';
                countdownNumber.offsetHeight;
                countdownNumber.style.animation = '';

                if (remaining <= 0) {
                    countdownOverlay.classList.add('hidden');
                    resolve();
                    return;
                }
                remaining--;
                setTimeout(tick, 1000);
            }
            tick();
        });
    }

    // ---- 陀螺仪 / 传感器逻辑 ----
    function handleOrientation(event) {
        let pitch = event.beta;
        let roll = event.gamma;
        if (pitch === null || roll === null) return;

        let tilt = roll;
        levelLine.style.transform = `rotate(${tilt}deg)`;

        if (Math.abs(tilt) < 3) {
            levelLine.classList.add('aligned');
            levelLine.style.background = "#2ed573";
            levelText.textContent = "✓ 水平完美";
            levelText.style.color = "#2ed573";
        } else {
            levelLine.classList.remove('aligned');
            levelLine.style.background = "#ff4757";
            levelText.textContent = `偏歪 ${Math.abs(Math.round(tilt))}°`;
            levelText.style.color = "#ff4757";
        }

        const activeMode = document.querySelector('.mode-btn.active').getAttribute('data-mode');
        if ((activeMode === 'full' || activeMode === 'half') && pitch > 0 && pitch < 75) {
            angleWarning.classList.remove('hidden');
        } else {
            angleWarning.classList.add('hidden');
        }
    }

    async function setupSensors() {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                }
            } catch (e) {
                console.log("传感器权限请求出错: ", e);
            }
        } else {
            window.addEventListener('deviceorientation', handleOrientation);
        }
    }

    // ---- 启动授权 ----
    const startBtn = document.getElementById('start-btn');
    const startScreen = document.getElementById('start-screen');

    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            const errorLog = document.getElementById('error-log');
            errorLog.innerText = "正在请求摄像头权限...";
            await setupSensors();
            const camReady = await initCamera();
            if (camReady) {
                startScreen.style.display = 'none';
            }
        });
    }

    // ---- 快门效果 & 拍照逻辑 ----
    function triggerShutter() {
        // 震动反馈
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        // 闪光效果
        shutterFlash.classList.remove('hidden');
        setTimeout(() => shutterFlash.classList.add('hidden'), 350);
    }

    function takePhoto() {
        triggerShutter();

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (currentFilter !== 'none') {
            ctx.filter = currentFilter;
        } else {
            ctx.filter = 'none';
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        photoPreview.src = dataUrl;
        photoPreviewLayer.classList.remove('hidden');
    }

    captureBtn.addEventListener('click', async () => {
        if (timerSeconds > 0) {
            await runCountdown(timerSeconds);
        }
        takePhoto();
    });

    retakeBtn.addEventListener('click', () => {
        photoPreviewLayer.classList.add('hidden');
    });

    saveBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `完美出片_${new Date().getTime()}.jpg`;
        link.href = photoPreview.src;
        link.click();
        photoPreviewLayer.classList.add('hidden');
    });
});
