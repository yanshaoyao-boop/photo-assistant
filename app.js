document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM 元素获取 ----
    const video = document.getElementById('camera-feed');
    const captureBtn = document.getElementById('capture-btn');
    const switchBtn = document.getElementById('camera-switch-btn');
    const gridToggleBtn = document.getElementById('grid-toggle-btn');
    const gridOverlay = document.getElementById('grid-overlay');

    const silhouetteOverlay = document.getElementById('silhouette-overlay');
    const silhouetteImage = document.getElementById('silhouette-image');
    const modeBtns = document.querySelectorAll('.mode-btn');

    const levelIndicator = document.getElementById('level-indicator');
    const levelLine = document.querySelector('.level-line');
    const levelText = document.querySelector('.level-text');
    const angleWarning = document.getElementById('angle-warning');

    const photoPreviewLayer = document.getElementById('photo-preview-layer');
    const photoPreview = document.getElementById('photo-preview');
    const retakeBtn = document.getElementById('retake-btn');
    const saveBtn = document.getElementById('save-btn');
    const canvas = document.getElementById('capture-canvas');
    const ctx = canvas.getContext('2d');

    // ---- 状态与变量 ----
    let currentStream = null;
    let facingMode = 'environment'; // 默认后置

    // Base64 SVGs to act as silhouettes
    // 全身：一个火柴人/简单的人体轮廓
    const svgFullBody = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" fill="none" stroke="white" stroke-width="2" stroke-dasharray="4" opacity="0.8"><ellipse cx="50" cy="30" rx="15" ry="20"/><path d="M50 50 v70 M50 70 L20 120 M50 70 L80 120 M50 120 L30 190 M50 120 L70 190"/></svg>`;
    // 半身：上半身轮廓
    const svgHalfBody = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" fill="none" stroke="white" stroke-width="2" stroke-dasharray="4" opacity="0.8"><ellipse cx="50" cy="50" rx="20" ry="25"/><path d="M50 75 v125 M50 90 L10 150 M50 90 L90 150"/></svg>`;
    // 特写：面部和肩膀
    const svgCloseUp = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" fill="none" stroke="white" stroke-width="2" stroke-dasharray="4" opacity="0.8"><ellipse cx="50" cy="80" rx="35" ry="45"/><path d="M15 125 q 35 20 70 0 q 10 50 -10 75 h-50 q -20 -25 -10 -75"/></svg>`;

    const silhouettes = {
        'full': svgFullBody,
        'half': svgHalfBody,
        'close': svgCloseUp
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

            // Wait for video to load metadata to setup canvas dimensions correctly
            video.onloadedmetadata = () => {
                video.play();
            };
            return true;
        } catch (err) {
            console.error('无法访问摄像头:', err);
            const errorLog = document.getElementById('error-log');
            if (errorLog) errorLog.innerText = '相机启动失败:\n' + err.name + ' ' + err.message;
            return false;
        }
    }

    switchBtn.addEventListener('click', () => {
        facingMode = facingMode === 'environment' ? 'user' : 'environment';
        initCamera();
    });

    // ---- UI 交互逻辑 ----

    // 九宫格切换
    gridToggleBtn.addEventListener('click', () => {
        gridOverlay.classList.toggle('hidden');
        gridToggleBtn.classList.toggle('active');
    });

    // 蒙版选择
    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 移除所有激活状态
            modeBtns.forEach(b => b.classList.remove('active'));
            // 激活当前
            e.target.classList.add('active');

            const mode = e.target.getAttribute('data-mode');

            if (mode === 'none') {
                silhouetteOverlay.classList.add('hidden');
            } else {
                silhouetteImage.src = silhouettes[mode];
                silhouetteOverlay.classList.remove('hidden');
            }
        });
    });

    // ---- 陀螺仪 / 传感器逻辑 (防短腿 + 水平仪) ----
    function handleOrientation(event) {
        // beta 是俯仰角: -180 到 180 (绕 x 轴)
        // gamma 是左右倾斜角: -90 到 90 (绕 y 轴)
        let pitch = event.beta;
        let roll = event.gamma;

        if (pitch === null || roll === null) return;

        // --- 水平仪逻辑 ---
        // 我们要避免画面歪斜，也就是关注 roll (左右倾斜角度)
        // 手机横排和竖拍可能会导致获取的值不同。这里假设默认竖屏拍摄。

        let tilt = roll; // 竖屏下，手机左右翻滚角度

        // 视觉呈现：画一条线。tilt接近0时，线变绿。
        levelLine.style.transform = `rotate(${tilt}deg)`;

        if (Math.abs(tilt) < 3) {
            levelLine.classList.add('aligned');
            levelLine.style.background = "#2ed573";
            levelText.textContent = "保持水平 - 完美！";
            levelText.style.color = "#2ed573";
        } else {
            levelLine.classList.remove('aligned');
            levelLine.style.background = "#ff4757";
            levelText.textContent = `偏歪 ${Math.abs(Math.round(tilt))}°`;
            levelText.style.color = "#ff4757";
        }

        // --- 俯拍小短腿警告 (全身照模式下适用) ---
        // 手机垂直拿时 beta 约 90。如果是俯拍（往下看），beta 会小于80甚至更低。
        const activeMode = document.querySelector('.mode-btn.active').getAttribute('data-mode');

        // 为了显腿长，一般来说应该稍微仰拍。如果beta < 75（往地下拍），警告！
        if ((activeMode === 'full' || activeMode === 'half') && pitch > 0 && pitch < 75) {
            angleWarning.classList.remove('hidden');
        } else {
            angleWarning.classList.add('hidden');
        }
    }

    // 申请传感器权限并监听 (iOS 13+ 需要用户行为触发)
    async function setupSensors() {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                } else {
                    console.log("传感器权限被拒绝");
                }
            } catch (e) {
                console.log("传感器权限请求出错: ", e);
            }
        } else {
            // 非 iOS 13+ 或不支持
            window.addEventListener('deviceorientation', handleOrientation);
        }
    }

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


    // ---- 拍照及下载逻辑 ----
    captureBtn.addEventListener('click', () => {
        // 设置Canvas长宽与视频帧长宽匹配
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // 将视频画面画入Canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 转为 data URL 显示到预览图
        const dataUrl = canvas.toDataURL('image/png');
        photoPreview.src = dataUrl;

        // 显示预览层
        photoPreviewLayer.classList.remove('hidden');
    });

    retakeBtn.addEventListener('click', () => {
        photoPreviewLayer.classList.add('hidden');
    });

    saveBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `老公视角_完美出片_${new Date().getTime()}.png`;
        link.href = photoPreview.src;
        link.click();
        photoPreviewLayer.classList.add('hidden');
        alert("照片已保存入相册/下载列表！");
    });

    // ---- 系统通过用户点击启动 ----
});
