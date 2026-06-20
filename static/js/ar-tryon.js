/**
 * ==========================================================================
 * LIPSTICK Luxe - MODULAR AR TRY-ON MANAGER
 * Handles secure WebRTC cameras, MediaPipe FaceMesh, and professional Canvas lip shaders.
 * Optimized for mobile iOS/Android Safari & Chrome.
 * ==========================================================================
 */

class ARTryOnManager {
    constructor(config = {}) {
        this.videoId = config.videoId || 'ar-video';
        this.canvasId = config.canvasId || 'ar-canvas';
        this.statusBadgeId = config.statusBadgeId || 'ar-status-badge';
        this.modelSelectId = config.modelSelectId || 'ar-model-select';
        this.viewportId = config.viewportId || 'ar-viewport';
        
        this.video = document.getElementById(this.videoId);
        this.canvas = document.getElementById(this.canvasId);
        this.statusBadge = document.getElementById(this.statusBadgeId);
        this.viewport = null;
        
        if (!this.video || !this.canvas) {
            console.error("ARTryOnManager error: Video or Canvas element not found.");
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.faceMesh = null;
        this.stream = null;
        
        // State variables
        this.isCameraOn = false;
        this.isProcessingFrame = false;
        this.isCompareOn = false;
        
        this.activeProduct = null;
        this.intensity = 50; // default 50%
        this.blendMode = 'multiply';
        this.modelMode = 'camera'; // camera, model1, model2, model3
        
        // Landmark indices for lip contour
        this.outerIndices = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
        this.innerIndices = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
        
        // Static model coordinates for fallback/offline testing
        this.faceChartCoords = {
            head: [
                {x: 320, y: 70}, {x: 450, y: 110}, {x: 490, y: 220}, {x: 460, y: 350},
                {x: 320, y: 430}, {x: 180, y: 350}, {x: 150, y: 220}, {x: 190, y: 110}
            ],
            leftEye: [{x: 235, y: 175}, {x: 265, y: 165}, {x: 295, y: 175}, {x: 265, y: 185}],
            rightEye: [{x: 345, y: 175}, {x: 375, y: 165}, {x: 405, y: 175}, {x: 375, y: 185}],
            nose: [{x: 320, y: 185}, {x: 310, y: 250}, {x: 330, y: 250}],
            outerLips: [
                {x: 250, y: 315}, {x: 285, y: 298}, {x: 305, y: 296}, {x: 320, y: 303},
                {x: 335, y: 296}, {x: 355, y: 298}, {x: 390, y: 315}, {x: 360, y: 338},
                {x: 340, y: 352}, {x: 320, y: 356}, {x: 300, y: 352}, {x: 280, y: 338}
            ],
            innerLips: [
                {x: 270, y: 317}, {x: 295, y: 311}, {x: 320, y: 317}, {x: 345, y: 311},
                {x: 370, y: 317}, {x: 345, y: 329}, {x: 320, y: 331}, {x: 295, y: 329}
            ]
        };
        
        this.setupDefaultState();
    }
    setupDefaultState() {
        this.drawInitialCanvas();
    }
    
    getViewport() {
        if (!this.viewport) {
            this.viewport = document.getElementById(this.viewportId) || document.querySelector('.ar-viewport');
        }
        return this.viewport;
    }
    
    // Helper to dynamically load external scripts
    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                console.log(`Loaded script: ${src}`);
                resolve();
            };
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }

    // MediaPipe initialization with dynamic on-demand script loading
    async initMediaPipe() {
        if (this.faceMesh) return;
        
        // Show loading state in the status badge
        if (this.statusBadge) {
            this.statusBadge.innerText = "ĐANG TẢI MÔ HÌNH AI...";
            this.statusBadge.className = "ar-status-badge active loading";
        }
        
        let localBase = "/static/js/mediapipe";
        
        try {
            if (typeof FaceMesh === 'undefined') {
                // Load MediaPipe FaceMesh locally if not preloaded
                try {
                    await this.loadScript(`${localBase}/face_mesh.js`);
                } catch (localErr) {
                    console.warn("Failed to load local FaceMesh, trying CDN fallback...", localErr);
                    localBase = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4";
                    await this.loadScript(`${localBase}/face_mesh.js`);
                }
            }
            
            if (typeof FaceMesh === 'undefined') {
                throw new Error("MediaPipe FaceMesh object is not defined after script load.");
            }
            
            this.faceMesh = new FaceMesh({
                locateFile: (file) => `${localBase}/${file}?v=2.6.0`
            });
            
            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: false, // Disabling refineLandmarks stops WebGL context crashes on iOS Safari
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            this.faceMesh.onResults((results) => this.onFaceMeshResults(results));
            console.log("MediaPipe FaceMesh initialized successfully using:", localBase);
        } catch (err) {
            console.error("Failed to load or initialize MediaPipe FaceMesh:", err);
            const errDetail = err.message || String(err);
            if (this.statusBadge) {
                this.statusBadge.innerText = `LỖI TẢI AI: ${errDetail.substring(0, 20).toUpperCase()}`;
                this.statusBadge.className = "ar-status-badge active error";
            }
            if (typeof showToast === 'function') {
                showToast(`Không thể tải mô hình AI: ${errDetail}. Vui lòng kiểm tra kết nối.`, "error", 8000);
            }
            throw err;
        }
    }
    
    async startCamera() {
        // Secure context check
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            let errMsg = "Không thể mở camera. ";
            if (!window.isSecureContext) {
                errMsg += "AR yêu cầu kết nối bảo mật HTTPS khi test trên điện thoại di động.";
            } else {
                errMsg += "Vui lòng cấp quyền camera cho trình duyệt hoặc thử lại.";
            }
            if (typeof showToast === 'function') showToast(errMsg, 'error', 7000);
            this.fallbackToModel();
            return;
        }
        
        try {
            // Apply iOS specific autoplay elements
            this.video.setAttribute('playsinline', 'true');
            this.video.setAttribute('muted', 'true');
            this.video.muted = true;
            
            // 1. Get user media IMMEDIATELY to preserve user gesture context on iOS Safari
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: "user"
                },
                audio: false
            });
            
            this.video.srcObject = this.stream;
            await this.video.play();
            
            this.isCameraOn = true;
            this.isProcessingFrame = false;
            
            // Start native loop (it will safely wait for faceMesh to be ready)
            this.runFrameLoop();
            
            const btnCam = document.getElementById('btn-ar-camera');
            if (btnCam) btnCam.classList.add('active');
            
            this.updatePromptState();
            
            // 2. Load MediaPipe AFTER camera is acquired (prevents NotAllowedError on iOS)
            try {
                await this.initMediaPipe();
                if (this.statusBadge && this.isCameraOn) {
                    this.statusBadge.innerText = "CAMERA HOẠT ĐỘNG";
                    this.statusBadge.className = "ar-status-badge active";
                }
            } catch (e) {
                this.stopCamera();
                this.fallbackToModel();
            }
            
        } catch (err) {
            console.error("Camera acquisition failed:", err);
            if (typeof showToast === 'function') {
                showToast("Không thể khởi động camera. Đang chuyển sang ảnh người mẫu...", 'warning');
            }
            this.fallbackToModel();
        }
    }
    
    stopCamera() {
        this.isCameraOn = false;
        const viewport = this.getViewport();
        if (viewport) {
            viewport.classList.remove('scanning');
            viewport.style.aspectRatio = '4/3';
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.video) this.video.srcObject = null;
        
        if (this.statusBadge) {
            const selectVal = document.getElementById(this.modelSelectId)?.value || 'camera';
            if (selectVal === 'camera') {
                this.statusBadge.innerText = "CAMERA TẮT";
                this.statusBadge.className = "ar-status-badge";
                this.drawInitialCanvas();
            } else {
                this.statusBadge.innerText = "MODEL PHOTO";
                this.statusBadge.className = "ar-status-badge active";
                this.drawModelTryOn();
            }
        }
        
        const btnCam = document.getElementById('btn-ar-camera');
        if (btnCam) btnCam.classList.remove('active');
        
        this.updatePromptState();
    }
    
    fallbackToModel() {
        const select = document.getElementById(this.modelSelectId);
        if (select) {
            select.value = 'model1';
            select.dispatchEvent(new Event('change'));
        }
    }
    
    // Draw raw camera feed mirrored onto canvas immediately (UX optimization)
    drawRawCameraFrame() {
        if (!this.ctx || !this.video) return;
        
        const imgWidth = this.video.videoWidth || 640;
        const imgHeight = this.video.videoHeight || 480;
        
        if (this.canvas.width !== imgWidth || this.canvas.height !== imgHeight) {
            this.canvas.width = imgWidth;
            this.canvas.height = imgHeight;
            const viewport = this.getViewport();
            if (viewport) {
                viewport.style.aspectRatio = `${imgWidth}/${imgHeight}`;
            }
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw mirrored camera frame
        this.ctx.save();
        this.ctx.translate(this.canvas.width, 0);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        
        // Draw loading overlay if faceMesh is still initializing
        if (!this.faceMesh) {
            const viewport = this.getViewport();
            if (viewport) viewport.classList.add('scanning');
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.font = "bold 14px sans-serif";
            this.ctx.fillStyle = "var(--accent-gold)";
            this.ctx.textAlign = "center";
            this.ctx.fillText("ĐANG TẢI MÔ HÌNH AI...", this.canvas.width / 2, this.canvas.height / 2);
        }
    }
    
    // Core frame processing loop
    runFrameLoop() {
        const self = this;
        async function loop() {
            if (!self.isCameraOn) return;
            
            // Auto-play rescue: if browser pauses the video, resume it immediately
            if (self.video.paused) {
                self.video.play().catch(e => console.warn("Auto-play rescue failed:", e));
            }
            
            if (!self.isProcessingFrame && self.video.readyState >= 2 && !self.video.paused) {
                self.isProcessingFrame = true;
                
                // Safety timeout to prevent permanent freezing on mobile browsers if FaceMesh hangs
                const timeoutId = setTimeout(() => {
                    if (self.isProcessingFrame) {
                        console.warn("FaceMesh processing timed out. Resetting flag.");
                        self.isProcessingFrame = false;
                    }
                }, 500);
                
                if (self.faceMesh) {
                    self.faceMesh.send({ image: self.video })
                        .then(() => {
                            clearTimeout(timeoutId);
                            self.isProcessingFrame = false;
                        })
                        .catch((err) => {
                            clearTimeout(timeoutId);
                            console.error("FaceMesh processing error:", err);
                            self.isProcessingFrame = false;
                        });
                } else {
                    clearTimeout(timeoutId);
                    self.drawRawCameraFrame(); // Draw raw camera immediately while AI is loading
                    self.isProcessingFrame = false;
                }
            }
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    }
    
    onFaceMeshResults(results) {
        if (!this.isCameraOn || !this.ctx) return;
        
        if (results.image) {
            const imgWidth = results.image.width || results.image.videoWidth || 640;
            const imgHeight = results.image.height || results.image.videoHeight || 480;
            
            if (this.canvas.width !== imgWidth || this.canvas.height !== imgHeight) {
                this.canvas.width = imgWidth;
                this.canvas.height = imgHeight;
                const viewport = this.getViewport();
                if (viewport) {
                    viewport.style.aspectRatio = `${imgWidth}/${imgHeight}`;
                }
            }
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 1. Draw mirrored camera frame
        this.ctx.save();
        this.ctx.translate(this.canvas.width, 0);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        
        // 2. Track and draw lipstick overlay
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const viewport = this.getViewport();
            if (viewport) viewport.classList.remove('scanning');
            const landmarks = results.multiFaceLandmarks[0];
            
            if (this.activeProduct) {
                const opacityVal = this.intensity / 100;
                const hex = this.activeProduct.hex_code;
                
                // Map coordinates with mirroring
                const outerPoints = this.outerIndices.map(idx => {
                    const pt = landmarks[idx];
                    return { x: (1 - pt.x) * this.canvas.width, y: pt.y * this.canvas.height };
                });
                
                const innerPoints = this.innerIndices.map(idx => {
                    const pt = landmarks[idx];
                    return { x: (1 - pt.x) * this.canvas.width, y: pt.y * this.canvas.height };
                });
                
                this.drawLipOverlay(this.ctx, outerPoints, innerPoints, hex, opacityVal, this.blendMode, this.isCompareOn);
            }
        } else {
            // Keep scanline active
            const viewport = this.getViewport();
            if (viewport) viewport.classList.add('scanning');
            this.ctx.fillStyle = 'rgba(216, 75, 99, 0.1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.font = "bold 13px sans-serif";
            this.ctx.fillStyle = "var(--accent-gold)";
            this.ctx.textAlign = "center";
            this.ctx.fillText("ĐANG XÁC ĐỊNH KHUÔN MẶT ĐỂ THỬ SON...", this.canvas.width / 2, this.canvas.height / 2);
        }
        
        // Draw comparison divider line
        if (this.isCompareOn) {
            this.ctx.strokeStyle = 'var(--accent-gold)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width / 2, 0);
            this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
            this.ctx.stroke();
        }
    }
    
    drawInitialCanvas() {
        if (!this.ctx) return;
        if (this.canvas.width !== 640 || this.canvas.height !== 480) {
            this.canvas.width = 640;
            this.canvas.height = 480;
        }
        const viewport = this.getViewport();
        if (viewport) {
            viewport.style.aspectRatio = '4/3';
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#110a0c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.strokeStyle = 'rgba(229,176,131,0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(320, 240, 110, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.font = "italic 15px 'Outfit', sans-serif";
        this.ctx.fillStyle = 'var(--text-muted)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("Bật Camera WebRTC hoặc Chọn Người Mẫu để thử màu son ảo", 320, 240);
    }
    
    drawModelTryOn() {
        if (!this.ctx) return;
        if (this.canvas.width !== 640 || this.canvas.height !== 480) {
            this.canvas.width = 640;
            this.canvas.height = 480;
        }
        const viewport = this.getViewport();
        if (viewport) {
            viewport.style.aspectRatio = '4/3';
        }
        const select = document.getElementById(this.modelSelectId);
        const model = select ? select.value : 'model1';
        if (model === 'camera') return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        let bgColor = '#fff6f6';
        let lineOutlineColor = '#ebc7c7';
        let lineFeatureColor = '#8c5f5f';
        
        if (model === 'model2') {
            bgColor = '#e6c2a6';
            lineOutlineColor = '#c79c81';
            lineFeatureColor = '#6d4534';
        } else if (model === 'model3') {
            bgColor = '#6e4537';
            lineOutlineColor = '#573327';
            lineFeatureColor = '#f5dfd5';
        }
        
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Head outline
        this.ctx.strokeStyle = lineOutlineColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        const hd = this.faceChartCoords.head;
        this.ctx.moveTo(hd[0].x, hd[0].y);
        for (let i = 1; i < hd.length; i++) this.ctx.lineTo(hd[i].x, hd[i].y);
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Eyes & Nose
        this.ctx.strokeStyle = lineFeatureColor;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(this.faceChartCoords.leftEye[0].x, this.faceChartCoords.leftEye[0].y);
        for (let i = 1; i < 4; i++) this.ctx.lineTo(this.faceChartCoords.leftEye[i].x, this.faceChartCoords.leftEye[i].y);
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.fillStyle = lineFeatureColor;
        this.ctx.beginPath();
        this.ctx.arc(265, 175, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = lineFeatureColor;
        this.ctx.beginPath();
        this.ctx.moveTo(this.faceChartCoords.rightEye[0].x, this.faceChartCoords.rightEye[0].y);
        for (let i = 1; i < 4; i++) this.ctx.lineTo(this.faceChartCoords.rightEye[i].x, this.faceChartCoords.rightEye[i].y);
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(375, 175, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.faceChartCoords.nose[0].x, this.faceChartCoords.nose[0].y);
        this.ctx.lineTo(this.faceChartCoords.nose[1].x, this.faceChartCoords.nose[1].y);
        this.ctx.lineTo(this.faceChartCoords.nose[2].x, this.faceChartCoords.nose[2].y);
        this.ctx.stroke();
        
        // Draw Lips Swatch Overlay
        if (this.activeProduct) {
            const opacityVal = this.intensity / 100;
            const hex = this.activeProduct.hex_code;
            this.drawLipOverlay(this.ctx, this.faceChartCoords.outerLips, this.faceChartCoords.innerLips, hex, opacityVal, this.blendMode, this.isCompareOn);
        }
        
        // Draw Lips outline guide
        this.ctx.strokeStyle = lineFeatureColor;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.faceChartCoords.outerLips[0].x, this.faceChartCoords.outerLips[0].y);
        for (let i = 1; i < this.faceChartCoords.outerLips.length; i++) this.ctx.lineTo(this.faceChartCoords.outerLips[i].x, this.faceChartCoords.outerLips[i].y);
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Draw comparison divider
        if (this.isCompareOn) {
            this.ctx.strokeStyle = 'var(--accent-gold)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width / 2, 0);
            this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
            this.ctx.stroke();
        }
    }
    
    // Advanced Lipstick shader overlay logic (feathered borders, specular gloss shines, glitters)
    drawLipOverlay(ctx, outerPoints, innerPoints, hexColor, opacity, blendMode, isCompare = false) {
        if (!ctx || outerPoints.length === 0 || innerPoints.length === 0) return;
        
        // Defensive input validation for hex colors
        if (!hexColor || typeof hexColor !== 'string' || hexColor.charAt(0) !== '#') {
            hexColor = '#ff0000'; // fallback red
        }
        
        const r = parseInt(hexColor.slice(1, 3), 16) || 0;
        const g = parseInt(hexColor.slice(3, 5), 16) || 0;
        const b = parseInt(hexColor.slice(5, 7), 16) || 0;
        
        ctx.save();
        
        // 1. Clip for side-by-side comparison if enabled
        if (isCompare) {
            ctx.beginPath();
            ctx.rect(ctx.canvas.width / 2, 0, ctx.canvas.width / 2, ctx.canvas.height);
            ctx.clip();
        }
        
        // 2. Base Lipstick layer with soft feathered edges
        ctx.filter = 'blur(1.2px)';
        ctx.globalCompositeOperation = blendMode === 'multiply' ? 'multiply' : 'source-over';
        
        ctx.beginPath();
        ctx.moveTo(outerPoints[0].x, outerPoints[0].y);
        for (let i = 1; i < outerPoints.length; i++) {
            ctx.lineTo(outerPoints[i].x, outerPoints[i].y);
        }
        ctx.closePath();
        
        ctx.moveTo(innerPoints[0].x, innerPoints[0].y);
        for (let i = 1; i < innerPoints.length; i++) {
            ctx.lineTo(innerPoints[i].x, innerPoints[i].y);
        }
        ctx.closePath();
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.fill('evenodd');
        
        // Reset filter
        ctx.filter = 'none';
        
        // 3. Texture overlay: Specular glossy reflections
        if (blendMode === 'soft-light' || blendMode === 'color') {
            ctx.globalCompositeOperation = 'screen';
            
            // Find bounding box of lips
            let minX = ctx.canvas.width, maxX = 0, minY = ctx.canvas.height, maxY = 0;
            outerPoints.forEach(pt => {
                if (pt.x < minX) minX = pt.x;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.y > maxY) maxY = pt.y;
            });
            const w = maxX - minX;
            const h = maxY - minY;
            const cx = minX + w / 2;
            const cy = minY + h / 2;
            
            ctx.save();
            ctx.filter = 'blur(4px)';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            
            ctx.beginPath();
            // Lower lip highlight: vertical oval shape
            ctx.ellipse(cx, cy + h * 0.15, w * 0.08, h * 0.2, 0, 0, Math.PI * 2);
            // Upper lip peaks highlights
            ctx.ellipse(cx - w * 0.15, cy - h * 0.15, w * 0.04, h * 0.08, Math.PI / 12, 0, Math.PI * 2);
            ctx.ellipse(cx + w * 0.15, cy - h * 0.15, w * 0.04, h * 0.08, -Math.PI / 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // 4. Texture overlay: Glitter / Metallic sparkles
        if (blendMode === 'glitter') {
            ctx.save();
            
            // Clip to the lip shape
            ctx.beginPath();
            ctx.moveTo(outerPoints[0].x, outerPoints[0].y);
            for (let i = 1; i < outerPoints.length; i++) ctx.lineTo(outerPoints[i].x, outerPoints[i].y);
            ctx.closePath();
            ctx.moveTo(innerPoints[0].x, innerPoints[0].y);
            for (let i = 1; i < innerPoints.length; i++) ctx.lineTo(innerPoints[i].x, innerPoints[i].y);
            ctx.closePath();
            ctx.clip('evenodd');
            
            let minX = ctx.canvas.width, maxX = 0, minY = ctx.canvas.height, maxY = 0;
            outerPoints.forEach(pt => {
                if (pt.x < minX) minX = pt.x;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.y > maxY) maxY = pt.y;
            });
            
            // Generate random gold & white sparks
            const sparkles = 35;
            for (let i = 0; i < sparkles; i++) {
                const rx = minX + Math.random() * (maxX - minX);
                const ry = minY + Math.random() * (maxY - minY);
                
                ctx.beginPath();
                ctx.arc(rx, ry, 0.6 + Math.random() * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = Math.random() > 0.45 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 215, 0, 0.85)';
                ctx.fill();
            }
            
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    updatePromptState() {
        const prompt = document.getElementById('ar-camera-prompt');
        const select = document.getElementById(this.modelSelectId);
        if (!prompt) return;
        
        const isCameraMode = select ? select.value === 'camera' : true;
        if (isCameraMode && !this.isCameraOn) {
            prompt.classList.remove('hidden');
        } else {
            prompt.classList.add('hidden');
        }
    }
    
    setProduct(product) {
        this.activeProduct = product;
        if (this.isCameraOn) {
            // Live video updates on FaceMesh trigger automatically
        } else {
            this.drawModelTryOn();
        }
    }
    
    setIntensity(val) {
        this.intensity = val;
        if (!this.isCameraOn) this.drawModelTryOn();
    }
    
    setBlendMode(mode) {
        this.blendMode = mode;
        if (!this.isCameraOn) this.drawModelTryOn();
    }
    
    setModelMode(mode) {
        this.modelMode = mode;
        const btnCam = document.getElementById('btn-ar-camera');
        
        if (mode === 'camera') {
            if (btnCam) btnCam.disabled = false;
            this.stopCamera();
        } else {
            if (btnCam) btnCam.disabled = true;
            this.stopCamera(); // Stop camera first, then draw static model
            this.drawModelTryOn();
        }
    }
    
    toggleCompare() {
        this.isCompareOn = !this.isCompareOn;
        const btnComp = document.getElementById('btn-ar-compare');
        if (btnComp) btnComp.classList.toggle('active', this.isCompareOn);
        
        if (!this.isCameraOn) {
            this.drawModelTryOn();
        }
    }
    
    capturePhoto() {
        if (!this.activeProduct) return;
        
        // Visual flash overlay feedback
        const flash = document.getElementById('ar-flash-overlay');
        if (flash) {
            flash.classList.add('active');
            setTimeout(() => {
                flash.classList.remove('active');
            }, 100);
        }
        
        const link = document.createElement('a');
        link.download = `tryon_lipstick_${this.activeProduct.shade_name}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
        
        if (typeof showToast === 'function') {
            showToast("Đã chụp và lưu ảnh thử son của bạn vào thiết bị!", "success");
        }
    }
}

// Global initialization helper
if (document.getElementById('details-product-id')) {
    window.arManager = new ARTryOnManager();
}
