/**
 * ==========================================================================
 * LIPSTICK Luxe - DYNAMIC JAVASCRIPT CONTROLLER (KLTN PHÙNG TÔ HẢO)
 * Standard multi-page Flask integration with robust routing and error prevention
 * Optimized AR Frame Rates & Real-world Product Images
 * ==========================================================================
 */

// Active page detection
const isHomePage = !!document.getElementById('featured-products-grid');
const isShopPage = !!document.getElementById('shop-product-grid');
const isProductPage = !!document.getElementById('details-product-id');
const isCartPage = !!document.getElementById('cart-items-body');
const isProfilePage = !!document.getElementById('auth-panel-wrapper') || !!document.getElementById('user-workspace-wrapper');
const isAdminPage = !!document.getElementById('admin-orders-section');

// Global Dataset cache
let lipstickDataset = [];
let filteredDataset = [];
let activeUser = { logged_in: false, username: 'GUEST', role: 'guest' };

// Color mapping for color family dots
const COLOR_FAMILY_HEX_MAP = {
    "Đỏ": "#d6223a",
    "Hồng": "#ea6b8c",
    "Cam": "#f26622",
    "San Hô": "#fa8f6e",
    "Nude": "#cfa898",
    "Đỏ Đất / Gạch": "#ab3a2c",
    "Mận / Berry": "#801d2c"
};

// ==========================================================================
// 1. DYNAMIC SVG CASING RENDERER (WOW UI FEATURE - FALLBACK SAFETY NET)
// ==========================================================================

function getLipstickSvg(hexCode) {
    const adjustBrightness = (hex, percent) => {
        let R = parseInt(hex.substring(1, 3), 16);
        let G = parseInt(hex.substring(3, 5), 16);
        let B = parseInt(hex.substring(5, 7), 16);

        R = parseInt(R * (100 + percent) / 100);
        G = parseInt(G * (100 + percent) / 100);
        B = parseInt(B * (100 + percent) / 100);

        R = Math.min(255, Math.max(0, R));
        G = Math.min(255, Math.max(0, G));
        B = Math.min(255, Math.max(0, B));

        return `#${R.toString(16).padStart(2, '0')}${G.toString(16).padStart(2, '0')}${B.toString(16).padStart(2, '0')}`;
    };

    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" style="width: 100%; height: 100%;">
        <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#b8860b"/>
                <stop offset="50%" stop-color="#ffd700"/>
                <stop offset="100%" stop-color="#8b6508"/>
            </linearGradient>
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#151515"/>
                <stop offset="50%" stop-color="#3a3a3a"/>
                <stop offset="100%" stop-color="#090909"/>
            </linearGradient>
            <linearGradient id="bulletGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="${hexCode}"/>
                <stop offset="30%" stop-color="${adjustBrightness(hexCode, 35)}"/>
                <stop offset="70%" stop-color="${hexCode}"/>
                <stop offset="100%" stop-color="${adjustBrightness(hexCode, -45)}"/>
            </linearGradient>
        </defs>
        <!-- Shadow Base -->
        <ellipse cx="50" cy="140" rx="30" ry="7" fill="rgba(0,0,0,0.6)"/>
        <!-- Outer Cap/Casing -->
        <rect x="28" y="75" width="44" height="60" rx="4" fill="url(#bodyGrad)" stroke="#1f1f1f" stroke-width="1"/>
        <rect x="28" y="75" width="44" height="7" fill="url(#goldGrad)"/>
        <!-- Inner Gold Metal Core -->
        <rect x="33" y="42" width="34" height="35" fill="url(#goldGrad)"/>
        <!-- Colored Bullet -->
        <path d="M 35 42 
                 L 35 24 
                 Q 35 14, 50 8 
                 Q 65 14, 65 24 
                 L 65 42 Z" fill="url(#bulletGrad)"/>
        <!-- Slanted Bullet Cut -->
        <path d="M 35 24 
                 Q 50 18, 65 24 
                 Q 50 28, 35 24 Z" fill="rgba(255,255,255,0.2)"/>
    </svg>
    `;
}

// Helper to render a lipstick product card html (with real photo display & vector fallback)
function getProductCardHtml(product, showMatchScore = false) {
    let priceTierText = "Bình dân";
    let priceClass = "price-affordable";
    if (product.price_tier === "Premium") { priceTierText = "Trung cấp"; priceClass = "price-premium"; }
    else if (product.price_tier === "Luxury") { priceTierText = "Cao cấp"; priceClass = "price-luxury"; }
    else if (product.price_tier === "Ultra-Luxury") { priceTierText = "Siêu cao cấp"; priceClass = "price-ultraluxury"; }

    const dotColor = COLOR_FAMILY_HEX_MAP[product.color_family] || "#ffffff";
    const casingSvg = getLipstickSvg(product.hex_code);
    const imgSrc = product.original_image_url || product.image_base64 || '/static/images/swatch_fallback.svg';
    
    return `
    <div class="product-card" id="card-${product.id}">
        <span class="badge-price ${priceClass}">${priceTierText}</span>
        ${showMatchScore && product.match_score ? `<span class="badge-price price-luxury" style="left: auto; right: 15px; background: rgba(229,176,131,0.15); border-color: var(--accent-gold); color: var(--accent-gold);">Match: ${product.match_score}</span>` : ''}
        <div class="card-img-box" style="position: relative; height: 220px; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 15px;">
            <img src="${imgSrc}" alt="${product.brand} ${product.shade_name}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px;" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div class="fallback-vector-casing" style="display: none; width: 110px; height: 140px; margin: 0 auto;">
                ${casingSvg}
            </div>
            <div class="card-color-overlay" style="background-color: ${product.hex_code};" title="Mã màu Hex: ${product.hex_code}"></div>
        </div>
        <div class="card-info">
            <span class="card-brand">${product.brand}</span>
            <h3 class="card-name">${product.product_name}</h3>
            <div class="card-meta-row">
                <span class="card-shade-name">${product.shade_name}</span>
                <span class="card-color-family">
                    <span class="family-dot" style="background-color: ${dotColor};"></span>
                    ${product.color_family}
                </span>
            </div>
        </div>
        <div style="display: flex; border-top: 1px solid var(--border-glass); margin-top: auto;">
            <a href="/product/${product.id}" class="card-action-btn" style="flex-grow: 1; text-decoration: none; border-right: 1px solid var(--border-glass); display: flex; align-items: center; justify-content: center;">
                CHI TIẾT
            </a>
            <button class="card-action-btn" onclick="quickAddToCart(${product.id})" style="flex-grow: 1; border: none; background: rgba(229, 176, 131, 0.05); color: var(--accent-gold);">
                MUA NGAY
            </button>
        </div>
    </div>
    `;
}

// ==========================================================================
// 2. SHOPPING CART LOCAL STORAGE MANAGER
// ==========================================================================

function getCart() {
    try {
        return JSON.parse(localStorage.getItem('lipstick_cart')) || [];
    } catch {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem('lipstick_cart', JSON.stringify(cart));
    updateCartCountBadge();
}

function quickAddToCart(productId) {
    fetch(`/api/lipsticks/${productId}`)
        .then(res => res.json())
        .then(product => {
            if (product.error) return;
            addToCart(product, 1);
        });
}

function addToCart(product, qty) {
    let cart = getCart();
    let existing = cart.find(x => x.id === product.id);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({
            id: product.id,
            brand: product.brand,
            product_name: product.product_name,
            shade_name: product.shade_name,
            hex_code: product.hex_code,
            price_tier: product.price_tier,
            quantity: qty
        });
    }
    saveCart(cart);
    alert(`Đã thêm "${product.brand} ${product.product_name} (${product.shade_name})" vào giỏ hàng thành công!`);
}

function updateCartCountBadge() {
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        const cart = getCart();
        const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountEl.innerText = totalQty;
    }
}

// ==========================================================================
// 3. COMMON USER SESSION MANAGER
// ==========================================================================

async function syncUserSession() {
    try {
        const response = await fetch('/api/auth/session');
        const sessionData = await response.json();
        
        const usernameEl = document.getElementById('navbar-username');
        const dotEl = document.getElementById('user-status-dot');
        const adminNavEl = document.getElementById('admin-nav-item');
        
        if (sessionData.logged_in) {
            activeUser = sessionData;
            if (usernameEl) usernameEl.innerText = sessionData.username.toUpperCase();
            if (dotEl) dotEl.style.backgroundColor = '#4caf50';
            if (adminNavEl) {
                adminNavEl.style.display = sessionData.role === 'admin' ? 'block' : 'none';
            }
        } else {
            activeUser = { logged_in: false, username: 'GUEST', role: 'guest' };
            if (usernameEl) usernameEl.innerText = 'GUEST';
            if (dotEl) dotEl.style.backgroundColor = '#ff9800';
            if (adminNavEl) adminNavEl.style.display = 'none';
        }
    } catch(e) {
        console.error("Session sync failed:", e);
    }
}

// ==========================================================================
// 4. MAIN PAGE CONTROLLERS
// ==========================================================================

// --- A. HOME PAGE ---
async function initHomePage() {
    await syncUserSession();
    
    const heroBox = document.getElementById('hero-lipstick-casing');
    if (heroBox) {
        // Load real Dior 999 image as hero image
        heroBox.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                <img src="https://www.dior.com/dw/image/v2/BBDV_PRD/on/demandware.static/-/Sites-master_deparment_store/default/dw83ab35d9/assets/Y0996452/Y0996452_C099600999_E01.jpg?sw=800&sh=800&sm=fit" alt="Dior Rouge Dior 999" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div class="fallback-vector-casing" style="display: none; width: 160px; height: 240px; margin: 0 auto;">
                    ${getLipstickSvg('#D21F3C')}
                </div>
            </div>
        `;
    }
    
    try {
        const res = await fetch('/api/lipsticks');
        lipstickDataset = await res.json();
        
        const featuredGrid = document.getElementById('featured-products-grid');
        if (featuredGrid) {
            const premiumItems = lipstickDataset.filter(x => x.price_tier !== 'Affordable').slice(0, 8);
            featuredGrid.innerHTML = premiumItems.map(p => getProductCardHtml(p)).join('');
        }
        
        const recRes = await fetch(`/api/recommendations`);
        const recs = await recRes.json();
        
        const recPanel = document.getElementById('home-recommendations-panel');
        const recGrid = document.getElementById('home-recommendations-grid');
        
        if (recs && recs.length > 0 && recPanel && recGrid) {
            recPanel.style.display = 'block';
            recGrid.innerHTML = recs.map(p => getProductCardHtml(p, true)).join('');
        }
    } catch(e) {
        console.error("Home initialization failed:", e);
    }
}

// --- B. SHOP CATALOG PAGE ---
async function initShopPage() {
    await syncUserSession();
    
    const searchInput = document.getElementById('search-input');
    const brandFilter = document.getElementById('brand-filter');
    const colorFilter = document.getElementById('color-filter');
    const priceFilter = document.getElementById('price-filter');
    const shopSort = document.getElementById('shop-sort');
    const resetBtn = document.getElementById('btn-reset-filters');
    const shopGrid = document.getElementById('shop-product-grid');
    
    try {
        const res = await fetch('/api/lipsticks');
        lipstickDataset = await res.json();
        filteredDataset = [...lipstickDataset];
        
        renderShop();
    } catch (e) {
        console.error("Shop initialization failed:", e);
    }
    
    function renderShop() {
        if (!shopGrid) return;
        shopGrid.innerHTML = '';
        
        if (filteredDataset.length === 0) {
            shopGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: var(--text-muted);">
                    Không tìm thấy sản phẩm nào phù hợp với bộ lọc.
                </div>
            `;
            return;
        }
        
        shopGrid.innerHTML = filteredDataset.map(p => getProductCardHtml(p)).join('');
    }
    
    function applyShopFilters() {
        const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const brandVal = brandFilter ? brandFilter.value : '';
        const colorVal = colorFilter ? colorFilter.value : '';
        const priceVal = priceFilter ? priceFilter.value : '';
        const sortVal = shopSort ? shopSort.value : '';
        
        filteredDataset = lipstickDataset.filter(p => {
            const matchesSearch = !searchVal || 
                p.brand.toLowerCase().includes(searchVal) ||
                p.product_name.toLowerCase().includes(searchVal) ||
                p.shade_name.toLowerCase().includes(searchVal);
            const matchesBrand = !brandVal || p.brand === brandVal;
            const matchesColor = !colorVal || p.color_family === colorVal;
            const matchesPrice = !priceVal || p.price_tier === priceVal;
            
            return matchesSearch && matchesBrand && matchesColor && matchesPrice;
        });
        
        if (sortVal) {
            const priceMap = { 'Affordable': 150000, 'Premium': 450000, 'Luxury': 950000, 'Ultra-Luxury': 1600000 };
            filteredDataset.sort((a, b) => {
                const valA = priceMap[a.price_tier] || 0;
                const valB = priceMap[b.price_tier] || 0;
                return sortVal === 'asc' ? valA - valB : valB - valA;
            });
        }
        
        renderShop();
    }
    
    if (searchInput) searchInput.addEventListener('input', applyShopFilters);
    if (brandFilter) brandFilter.addEventListener('change', applyShopFilters);
    if (colorFilter) colorFilter.addEventListener('change', applyShopFilters);
    if (priceFilter) priceFilter.addEventListener('change', applyShopFilters);
    if (shopSort) shopSort.addEventListener('change', applyShopFilters);
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (brandFilter) brandFilter.value = '';
            if (colorFilter) colorFilter.value = '';
            if (priceFilter) priceFilter.value = '';
            if (shopSort) shopSort.value = '';
            filteredDataset = [...lipstickDataset];
            renderShop();
        });
    }
}

// --- C. PRODUCT DETAIL & AR VIRTUAL TRY-ON PAGE ---
async function initProductPage() {
    await syncUserSession();
    
    const productIdInput = document.getElementById('details-product-id');
    if (!productIdInput) return;
    const productId = parseInt(productIdInput.value);
    
    let activeProduct = null;
    
    try {
        const res = await fetch(`/api/lipsticks/${productId}`);
        activeProduct = await res.json();
        if (activeProduct.error) {
            window.location.href = '/shop';
            return;
        }
        
        logInteraction('view_lipstick', productId, "Viewed detail page");
        
        // Fill product detail image container with real photo & vector casing fallback
        const imgBox = document.getElementById('details-lipstick-image-box');
        if (imgBox) {
            const casingSvg = getLipstickSvg(activeProduct.hex_code);
            imgBox.innerHTML = `
                <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow:hidden;">
                    <img src="${activeProduct.original_image_url}" alt="${activeProduct.brand}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: var(--radius-lg);" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div class="fallback-vector-casing" style="display: none; width: 180px; height: 260px; margin: 0 auto;">
                        ${casingSvg}
                    </div>
                </div>
            `;
        }
        
        const brandEl = document.getElementById('details-brand');
        if (brandEl) brandEl.innerText = activeProduct.brand.toUpperCase();
        
        const nameEl = document.getElementById('details-name');
        if (nameEl) nameEl.innerText = activeProduct.product_name;
        
        const shadeEl = document.getElementById('details-shade');
        if (shadeEl) shadeEl.innerText = activeProduct.shade_name;
        
        const priceBadge = document.getElementById('details-price-badge');
        if (priceBadge) {
            let priceText = "Bình dân";
            let priceClass = "price-affordable";
            if (activeProduct.price_tier === 'Premium') { priceText = 'Trung cấp'; priceClass = 'price-premium'; }
            else if (activeProduct.price_tier === 'Luxury') { priceText = 'Cao cấp'; priceClass = 'price-luxury'; }
            else if (activeProduct.price_tier === 'Ultra-Luxury') { priceText = 'Siêu cao cấp'; priceClass = 'price-ultraluxury'; }
            
            priceBadge.innerText = priceText;
            priceBadge.className = `badge-price ${priceClass}`;
        }
        
        const previewCircle = document.getElementById('details-color-preview');
        if (previewCircle) previewCircle.style.backgroundColor = activeProduct.hex_code;
        
        const hexText = document.getElementById('details-hex-text');
        if (hexText) hexText.innerText = `Mã màu: ${activeProduct.hex_code}`;
        
        const familyText = document.getElementById('details-family-text');
        if (familyText) familyText.innerText = `Tông màu: ${activeProduct.color_family}`;
        
        const addBtn = document.getElementById('btn-add-to-cart');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                addToCart(activeProduct, 1);
            });
        }
        
        const scrollBtn = document.getElementById('btn-scroll-to-ar');
        if (scrollBtn) {
            scrollBtn.addEventListener('click', () => {
                document.getElementById('ar-tryon-panel').scrollIntoView({ behavior: 'smooth' });
            });
        }
        
        arActiveShade = activeProduct;
        document.getElementById('ar-shade-preview').style.backgroundColor = activeProduct.hex_code;
        document.getElementById('ar-shade-name-el').innerText = `${activeProduct.product_name} - ${activeProduct.shade_name}`;
        document.getElementById('ar-shade-brand-el').innerText = `${activeProduct.brand.toUpperCase()} | ${activeProduct.color_family}`;
        document.getElementById('ar-active-card').classList.add('active');
        
        const allRes = await fetch('/api/lipsticks');
        lipstickDataset = await allRes.json();
        
        const trayContainer = document.getElementById('ar-tray-list');
        if (trayContainer) {
            trayContainer.innerHTML = lipstickDataset.map(item => `
                <div class="ar-tray-item ${item.id === productId ? 'active' : ''}" 
                     style="background-color: ${item.hex_code};" 
                     title="${item.brand} - ${item.shade_name}"
                     onclick="selectArTrayItem(${item.id}, this)">
                </div>
            `).join('');
        }
        
        renderDupePanel();
        drawInitialCanvas();
    } catch(e) {
        console.error("Product detail initialization failed:", e);
    }
    
    function renderDupePanel() {
        const luxSlot = document.getElementById('luxury-slot');
        const affSlot = document.getElementById('aff-slot');
        const matchCircle = document.getElementById('match-percent-circle');
        const verdictEl = document.getElementById('match-verdict');
        const listEl = document.getElementById('analysis-list');
        
        if (!luxSlot) return;
        
        let priceTierText = "Cao cấp";
        if (activeProduct.price_tier === "Ultra-Luxury") priceTierText = "Siêu cao cấp";
        if (activeProduct.price_tier === "Premium") priceTierText = "Trung cấp";
        if (activeProduct.price_tier === "Affordable") priceTierText = "Bình dân";
        
        luxSlot.innerHTML = `
            <span class="dupe-slot-title">Son Phân Tích</span>
            <div class="dupe-card-inner">
                <div class="dupe-img-box" style="position: relative; width: 130px; height: 130px; border-radius: 50%; background: rgba(0,0,0,0.4); border: 2px solid var(--border-glass); padding: 10px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; overflow:hidden;">
                    <img src="${activeProduct.original_image_url || activeProduct.image_base64}" alt="${activeProduct.brand}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 50%;" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="display:none; width: 70px; height: 90px;">${getLipstickSvg(activeProduct.hex_code)}</div>
                    <div class="dupe-color-badge" style="background-color: ${activeProduct.hex_code};"></div>
                </div>
                <span class="dupe-brand">${activeProduct.brand}</span>
                <h4 class="dupe-name">${activeProduct.product_name}</h4>
                <span class="dupe-shade">${activeProduct.shade_name}</span>
            </div>
        `;
        
        if (activeProduct.price_tier !== 'Affordable' && activeProduct.dupes && activeProduct.dupes.length > 0) {
            const bestDupe = activeProduct.dupes[0];
            
            affSlot.innerHTML = `
                <span class="dupe-slot-title">Bản Dupe gợi ý</span>
                <div class="dupe-card-inner">
                    <div class="dupe-img-box" style="position: relative; width: 130px; height: 130px; border-radius: 50%; background: rgba(0,0,0,0.4); border: 2px solid var(--border-glass); padding: 10px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; overflow:hidden;">
                        <img src="${bestDupe.original_image_url || bestDupe.image_base64}" alt="${bestDupe.brand}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 50%;" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div style="display:none; width: 70px; height: 90px;">${getLipstickSvg(bestDupe.hex_code)}</div>
                        <div class="dupe-color-badge" style="background-color: ${bestDupe.hex_code};"></div>
                    </div>
                    <span class="dupe-brand">${bestDupe.brand}</span>
                    <h4 class="dupe-name">${bestDupe.product_name}</h4>
                    <span class="dupe-shade">${bestDupe.shade_name}</span>
                </div>
            `;
            
            if (matchCircle) {
                matchCircle.style.display = 'flex';
                matchCircle.querySelector('.match-value').innerText = bestDupe.similarity + '%';
            }
            
            if (verdictEl) {
                verdictEl.style.display = 'block';
                verdictEl.innerText = bestDupe.similarity >= 92 ? "Trùng khớp Hoàn hảo" : "Tương đồng rất cao";
            }
            
            if (listEl) {
                listEl.innerHTML = `
                    <div class="metric-row">
                        <span class="metric-label">Khoảng cách Delta-E (CIELAB)</span>
                        <span class="metric-value">${bestDupe.delta_e}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Sự khác biệt màu sắc</span>
                        <span class="metric-value">${bestDupe.delta_e < 2 ? 'Không thể phân biệt bằng mắt thường' : 'Sai lệch cực nhỏ'}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Mã màu Son đắt tiền</span>
                        <span class="metric-value hex">${activeProduct.hex_code}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Mã màu Bản Dupe rẻ</span>
                        <span class="metric-value hex">${bestDupe.hex_code}</span>
                    </div>
                `;
            }
        } else {
            affSlot.innerHTML = `
                <span class="dupe-slot-title">Bản Dupe</span>
                <div class="dupe-placeholder" style="padding: 20px; font-style: italic; color: var(--text-muted);">
                    Đây là thỏi son phân khúc bình dân hoặc hiện không có bản dupe nào tương hợp.
                </div>
            `;
            if (matchCircle) matchCircle.style.display = 'none';
            if (verdictEl) verdictEl.style.display = 'none';
            if (listEl) {
                listEl.innerHTML = `
                    <div class="metric-row">
                        <span class="metric-label">Không gian màu Lab</span>
                        <span class="metric-value">L:${activeProduct.lab.l} a:${activeProduct.lab.a} b:${activeProduct.lab.b}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Mã màu Hex</span>
                        <span class="metric-value hex">${activeProduct.hex_code}</span>
                    </div>
                `;
            }
        }
    }
}

// Global functions for AR Tray select
let arActiveShade = null;

function selectArTrayItem(itemId, el) {
    document.querySelectorAll('.ar-tray-item').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    
    const product = lipstickDataset.find(x => x.id === itemId);
    if (!product) return;
    
    arActiveShade = product;
    document.getElementById('ar-shade-preview').style.backgroundColor = product.hex_code;
    document.getElementById('ar-shade-name-el').innerText = `${product.product_name} - ${product.shade_name}`;
    document.getElementById('ar-shade-brand-el').innerText = `${product.brand.toUpperCase()} | ${product.color_family}`;
    
    logInteraction('ar_tryon', itemId, "Selected shade in AR Tray");
    
    if (document.getElementById('ar-model-select').value !== 'camera') {
        drawModelTryOn();
    }
}

// Interaction logging helper
async function logInteraction(actionType, itemId, details = '') {
    try {
        await fetch('/api/interaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lipstick_id: itemId,
                action_type: actionType,
                details: details
            })
        });
    } catch(e) {
        console.error("Log interaction error:", e);
    }
}

// --- D. MEDIA PIPE WEBCAM & FALLBACK DRAW LOOP (LAG REDUCTION OPTIMIZED) ---
const arVideo = document.getElementById('ar-video');
const arCanvas = document.getElementById('ar-canvas');
const arCtx = arCanvas ? arCanvas.getContext('2d') : null;
let isCameraOn = false;
let isCompareOn = false;
let arStream = null;
let faceMesh = null;
let mpCamera = null;

// Styled portrait vector coordinates (Face Charts)
const FACE_CHART_COORDS = {
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

function drawInitialCanvas() {
    if (!arCtx) return;
    arCtx.clearRect(0, 0, arCanvas.width, arCanvas.height);
    arCtx.fillStyle = '#110a0c';
    arCtx.fillRect(0, 0, arCanvas.width, arCanvas.height);
    
    arCtx.strokeStyle = 'rgba(229,176,131,0.2)';
    arCtx.lineWidth = 2;
    arCtx.beginPath();
    arCtx.arc(320, 240, 110, 0, Math.PI*2);
    arCtx.stroke();
    
    arCtx.font = "italic 15px 'Outfit', sans-serif";
    arCtx.fillStyle = 'var(--text-muted)';
    arCtx.textAlign = 'center';
    arCtx.fillText("Bật Camera WebRTC hoặc Chọn Người Mẫu để thử màu son ảo", 320, 240);
}

function drawModelTryOn() {
    if (!arCtx) return;
    const model = document.getElementById('ar-model-select').value;
    if (model === 'camera') return;
    
    arCtx.clearRect(0, 0, arCanvas.width, arCanvas.height);
    
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
    
    arCtx.fillStyle = bgColor;
    arCtx.fillRect(0, 0, arCanvas.width, arCanvas.height);
    
    arCtx.strokeStyle = lineOutlineColor;
    arCtx.lineWidth = 2;
    
    arCtx.beginPath();
    const hd = FACE_CHART_COORDS.head;
    arCtx.moveTo(hd[0].x, hd[0].y);
    for (let i = 1; i < hd.length; i++) arCtx.lineTo(hd[i].x, hd[i].y);
    arCtx.closePath();
    arCtx.stroke();
    
    arCtx.strokeStyle = lineFeatureColor;
    arCtx.lineWidth = 1.5;
    
    arCtx.beginPath();
    arCtx.moveTo(FACE_CHART_COORDS.leftEye[0].x, FACE_CHART_COORDS.leftEye[0].y);
    for (let i = 1; i < 4; i++) arCtx.lineTo(FACE_CHART_COORDS.leftEye[i].x, FACE_CHART_COORDS.leftEye[i].y);
    arCtx.closePath();
    arCtx.stroke();
    arCtx.fillStyle = lineFeatureColor;
    arCtx.beginPath();
    arCtx.arc(265, 175, 5, 0, Math.PI * 2);
    arCtx.fill();
    
    arCtx.beginPath();
    arCtx.moveTo(FACE_CHART_COORDS.rightEye[0].x, FACE_CHART_COORDS.rightEye[0].y);
    for (let i = 1; i < 4; i++) arCtx.lineTo(FACE_CHART_COORDS.rightEye[i].x, FACE_CHART_COORDS.rightEye[i].y);
    arCtx.closePath();
    arCtx.stroke();
    arCtx.beginPath();
    arCtx.arc(375, 175, 5, 0, Math.PI * 2);
    arCtx.fill();
    
    arCtx.beginPath();
    arCtx.moveTo(FACE_CHART_COORDS.nose[0].x, FACE_CHART_COORDS.nose[0].y);
    arCtx.lineTo(FACE_CHART_COORDS.nose[1].x, FACE_CHART_COORDS.nose[1].y);
    arCtx.lineTo(FACE_CHART_COORDS.nose[2].x, FACE_CHART_COORDS.nose[2].y);
    arCtx.stroke();
    
    if (arActiveShade) {
        const opacityVal = document.getElementById('ar-intensity').value / 100;
        const hex = arActiveShade.hex_code;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        arCtx.save();
        arCtx.globalCompositeOperation = document.getElementById('ar-blend-mode').value;
        
        arCtx.beginPath();
        arCtx.moveTo(FACE_CHART_COORDS.outerLips[0].x, FACE_CHART_COORDS.outerLips[0].y);
        for (let i = 1; i < FACE_CHART_COORDS.outerLips.length; i++) arCtx.lineTo(FACE_CHART_COORDS.outerLips[i].x, FACE_CHART_COORDS.outerLips[i].y);
        arCtx.closePath();
        
        arCtx.moveTo(FACE_CHART_COORDS.innerLips[0].x, FACE_CHART_COORDS.innerLips[0].y);
        for (let i = 1; i < FACE_CHART_COORDS.innerLips.length; i++) arCtx.lineTo(FACE_CHART_COORDS.innerLips[i].x, FACE_CHART_COORDS.innerLips[i].y);
        arCtx.closePath();
        
        arCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacityVal})`;
        
        if (isCompareOn) {
            arCtx.rect(arCanvas.width / 2, 0, arCanvas.width / 2, arCanvas.height);
            arCtx.clip();
        }
        
        arCtx.fill('evenodd');
        arCtx.restore();
    }
    
    arCtx.strokeStyle = lineFeatureColor;
    arCtx.lineWidth = 1;
    arCtx.beginPath();
    arCtx.moveTo(FACE_CHART_COORDS.outerLips[0].x, FACE_CHART_COORDS.outerLips[0].y);
    for (let i = 1; i < FACE_CHART_COORDS.outerLips.length; i++) arCtx.lineTo(FACE_CHART_COORDS.outerLips[i].x, FACE_CHART_COORDS.outerLips[i].y);
    arCtx.closePath();
    arCtx.stroke();
    
    if (isCompareOn) {
        arCtx.strokeStyle = 'var(--accent-gold)';
        arCtx.lineWidth = 2;
        arCtx.beginPath();
        arCtx.moveTo(arCanvas.width / 2, 0);
        arCtx.lineTo(arCanvas.width / 2, arCanvas.height);
        arCtx.stroke();
    }
}

// MediaPipe execution triggers
function initMediaPipe() {
    if (faceMesh) return;
    
    faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    
    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    
    faceMesh.onResults(onFaceMeshResults);
}

function onFaceMeshResults(results) {
    if (!isCameraOn || !arCtx) return;
    
    arCtx.clearRect(0, 0, arCanvas.width, arCanvas.height);
    
    arCtx.save();
    arCtx.translate(arCanvas.width, 0);
    arCtx.scale(-1, 1);
    arCtx.drawImage(results.image, 0, 0, arCanvas.width, arCanvas.height);
    arCtx.restore();
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        document.getElementById('ar-viewport').classList.remove('scanning');
        const landmarks = results.multiFaceLandmarks[0];
        
        const outerIndices = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
        const innerIndices = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
        
        if (arActiveShade) {
            const opacityVal = document.getElementById('ar-intensity').value / 100;
            const hex = arActiveShade.hex_code;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            
            arCtx.save();
            arCtx.globalCompositeOperation = document.getElementById('ar-blend-mode').value;
            
            arCtx.beginPath();
            const ptStartOuter = landmarks[outerIndices[0]];
            arCtx.moveTo((1 - ptStartOuter.x) * arCanvas.width, ptStartOuter.y * arCanvas.height);
            for (let i = 1; i < outerIndices.length; i++) {
                const pt = landmarks[outerIndices[i]];
                arCtx.lineTo((1 - pt.x) * arCanvas.width, pt.y * arCanvas.height);
            }
            arCtx.closePath();
            
            const ptStartInner = landmarks[innerIndices[0]];
            arCtx.moveTo((1 - ptStartInner.x) * arCanvas.width, ptStartInner.y * arCanvas.height);
            for (let i = 1; i < innerIndices.length; i++) {
                const pt = landmarks[innerIndices[i]];
                arCtx.lineTo((1 - pt.x) * arCanvas.width, pt.y * arCanvas.height);
            }
            arCtx.closePath();
            
            arCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacityVal})`;
            
            if (isCompareOn) {
                arCtx.rect(arCanvas.width / 2, 0, arCanvas.width / 2, arCanvas.height);
                arCtx.clip();
            }
            
            arCtx.fill('evenodd');
            arCtx.restore();
        }
    } else {
        document.getElementById('ar-viewport').classList.add('scanning');
        arCtx.fillStyle = 'rgba(216, 75, 99, 0.1)';
        arCtx.fillRect(0, 0, arCanvas.width, arCanvas.height);
        
        arCtx.font = "bold 13px sans-serif";
        arCtx.fillStyle = "var(--accent-gold)";
        arCtx.textAlign = "center";
        arCtx.fillText("ĐANG XÁC ĐỊNH KHUÔN MẶT ĐỂ THỬ SON...", arCanvas.width/2, arCanvas.height/2);
    }
    
    if (isCompareOn) {
        arCtx.strokeStyle = 'var(--accent-gold)';
        arCtx.lineWidth = 2;
        arCtx.beginPath();
        arCtx.moveTo(arCanvas.width / 2, 0);
        arCtx.lineTo(arCanvas.width / 2, arCanvas.height);
        arCtx.stroke();
    }
}

async function startArCamera() {
    initMediaPipe();
    try {
        arStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false
        });
        
        arVideo.srcObject = arStream;
        await arVideo.play();
        isCameraOn = true;
        
        // Throttling flag to skip frames when WebAssembly Face Mesh is busy, reducing lag significantly!
        let isProcessingFrame = false;
        
        mpCamera = new Camera(arVideo, {
            onFrame: async () => {
                if (isCameraOn && !isProcessingFrame) {
                    isProcessingFrame = true;
                    try {
                        await faceMesh.send({ image: arVideo });
                    } catch (e) {
                        console.error("AR loop error:", e);
                    } finally {
                        isProcessingFrame = false;
                    }
                }
            },
            width: 640,
            height: 480
        });
        mpCamera.start();
        
        document.getElementById('btn-ar-camera').classList.add('active');
        document.getElementById('ar-status-badge').innerText = "CAMERA HOẠT ĐỘNG";
        document.getElementById('ar-status-badge').className = "ar-status-badge active";
    } catch(err) {
        alert("Không thể khởi động camera. Hệ thống tự động chuyển sang ảnh người mẫu ảo để bạn kiểm thử.");
        document.getElementById('ar-model-select').value = 'model1';
        document.getElementById('ar-model-select').dispatchEvent(new Event('change'));
    }
}

function stopArCamera() {
    isCameraOn = false;
    document.getElementById('ar-viewport').classList.remove('scanning');
    if (arStream) {
        arStream.getTracks().forEach(track => track.stop());
        arStream = null;
    }
    if (arVideo) arVideo.srcObject = null;
    document.getElementById('btn-ar-camera').classList.remove('active');
}

// Binds for AR control elements
if (isProductPage) {
    const btnCam = document.getElementById('btn-ar-camera');
    if (btnCam) {
        btnCam.addEventListener('click', () => {
            if (isCameraOn) {
                stopArCamera();
                document.getElementById('ar-status-badge').innerText = "CAMERA TẮT";
                document.getElementById('ar-status-badge').className = "ar-status-badge";
                drawInitialCanvas();
            } else {
                startArCamera();
            }
        });
    }
    
    const btnComp = document.getElementById('btn-ar-compare');
    if (btnComp) {
        btnComp.addEventListener('click', () => {
            isCompareOn = !isCompareOn;
            btnComp.classList.toggle('active', isCompareOn);
            if (document.getElementById('ar-model-select').value !== 'camera') {
                drawModelTryOn();
            }
        });
    }
    
    const btnCap = document.getElementById('btn-ar-capture');
    if (btnCap) {
        btnCap.addEventListener('click', () => {
            if (!arActiveShade) return;
            const dl = document.createElement('a');
            dl.download = `tryon_lipstick_${arActiveShade.shade_name}.png`;
            dl.href = arCanvas.toDataURL('image/png');
            dl.click();
        });
    }
    
    const modelSelect = document.getElementById('ar-model-select');
    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            stopArCamera();
            if (val === 'camera') {
                btnCam.disabled = false;
                document.getElementById('ar-status-badge').innerText = "CAMERA TẮT";
                document.getElementById('ar-status-badge').className = "ar-status-badge";
                drawInitialCanvas();
            } else {
                btnCam.disabled = true;
                document.getElementById('ar-status-badge').innerText = "MODEL PHOTO";
                document.getElementById('ar-status-badge').className = "ar-status-badge active";
                drawModelTryOn();
            }
        });
    }
    
    const intensitySlider = document.getElementById('ar-intensity');
    if (intensitySlider) {
        intensitySlider.addEventListener('input', (e) => {
            document.getElementById('ar-intensity-val').innerText = `${e.target.value}%`;
            if (modelSelect && modelSelect.value !== 'camera') drawModelTryOn();
        });
    }
    
    const blendSelect = document.getElementById('ar-blend-mode');
    if (blendSelect) {
        blendSelect.addEventListener('change', () => {
            if (modelSelect && modelSelect.value !== 'camera') drawModelTryOn();
        });
    }
}

// --- E. CART & CHECKOUT PAGE ---
function initCartPage() {
    syncUserSession();
    
    const itemsBody = document.getElementById('cart-items-body');
    const totalDisplay = document.getElementById('cart-total-display');
    const orderBtn = document.getElementById('btn-submit-order');
    
    function renderCartTable() {
        const cart = getCart();
        if (!itemsBody) return;
        itemsBody.innerHTML = '';
        
        if (cart.length === 0) {
            itemsBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted); font-style: italic;">
                        Giỏ hàng của bạn đang trống. Hãy quay lại <a href="/shop" style="color: var(--accent-gold);">Cửa hàng</a> để lựa chọn sản phẩm!
                    </td>
                </tr>
            `;
            if (totalDisplay) totalDisplay.innerText = '0₫';
            return;
        }
        
        let grandTotal = 0;
        
        cart.forEach((item, index) => {
            let itemPrice = 180000;
            if (item.price_tier === 'Premium') itemPrice = 480000;
            else if (item.price_tier === 'Luxury') itemPrice = 980000;
            else if (item.price_tier === 'Ultra-Luxury') itemPrice = 1580000;
            
            const total = itemPrice * item.quantity;
            grandTotal += total;
            
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            tr.style.fontSize = '14px';
            
            tr.innerHTML = `
                <td style="padding: 15px 8px;"><strong>${item.brand}</strong><br><span style="color: var(--text-muted); font-size:12px;">${item.product_name}</span></td>
                <td style="padding: 15px 8px; color: var(--accent-gold);">${item.brand}</td>
                <td style="padding: 15px 8px; text-align: center;"><span style="display:inline-block; width:15px; height:15px; border-radius:50%; background-color:${item.hex_code}; border:1px solid #fff; vertical-align:middle; margin-right:6px;"></span>${item.shade_name}</td>
                <td style="padding: 15px 8px; text-align: center;">
                    <input type="number" min="1" max="10" value="${item.quantity}" style="width:50px; background: rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); color:#fff; text-align:center; padding: 4px; border-radius:4px;" onchange="updateCartQty(${index}, this.value)">
                </td>
                <td style="padding: 15px 8px; text-align: right;">${itemPrice.toLocaleString('vi-VN')}₫</td>
                <td style="padding: 15px 8px; text-align: right; color: var(--accent-gold); font-weight:600;">${total.toLocaleString('vi-VN')}₫</td>
                <td style="padding: 15px 8px; text-align: center;"><button class="btn-export" style="padding:4px 8px; border-color:var(--accent-pink); color:var(--accent-pink); background:transparent; font-size:11px;" onclick="removeFromCart(${index})">Xóa</button></td>
            `;
            itemsBody.appendChild(tr);
        });
        
        if (totalDisplay) totalDisplay.innerText = grandTotal.toLocaleString('vi-VN') + '₫';
    }
    
    window.updateCartQty = function(idx, val) {
        let cart = getCart();
        const qty = parseInt(val);
        if (qty > 0 && cart[idx]) {
            cart[idx].quantity = qty;
            saveCart(cart);
            renderCartTable();
        }
    };
    
    window.removeFromCart = function(idx) {
        let cart = getCart();
        cart.splice(idx, 1);
        saveCart(cart);
        renderCartTable();
    };
    
    renderCartTable();
    
    if (orderBtn) {
        orderBtn.addEventListener('click', async () => {
            const cart = getCart();
            if (cart.length === 0) {
                alert("Giỏ hàng của bạn đang trống!");
                return;
            }
            
            const name = document.getElementById('checkout-name').value.trim();
            const phone = document.getElementById('checkout-phone').value.trim();
            const address = document.getElementById('checkout-address').value.trim();
            const payment = document.getElementById('checkout-payment').value;
            
            if (!name || !phone || !address) {
                alert("Vui lòng nhập đầy đủ thông tin giao hàng!");
                return;
            }
            
            const priceMap = { 'Affordable': 180000, 'Premium': 480000, 'Luxury': 980000, 'Ultra-Luxury': 1580000 };
            const grandTotal = cart.reduce((sum, item) => sum + (priceMap[item.price_tier] || 180000) * item.quantity, 0);
            
            try {
                const res = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name,
                        phone: phone,
                        address: address,
                        total_amount: grandTotal,
                        items: cart,
                        payment: payment
                    })
                });
                
                const data = await res.json();
                if (data.error) {
                    alert(data.error);
                } else {
                    alert(data.message);
                    saveCart([]);
                    window.location.href = '/profile';
                }
            } catch(e) {
                alert("Đặt hàng không thành công. Lỗi kết nối!");
            }
        });
    }
}

// --- F. USER PROFILE & SKIN SURVEY TEST PAGE ---
function initProfilePage() {
    syncUserSession().then(() => {
        if (activeUser.logged_in) {
            showWorkspace();
        } else {
            showAuth();
        }
    });
    
    const tabLogin = document.getElementById('tab-login-btn');
    const tabRegister = document.getElementById('tab-register-btn');
    const loginBox = document.getElementById('login-form-box');
    const registerBox = document.getElementById('register-form-box');
    
    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => {
            tabLogin.style.color = 'var(--accent-gold)';
            tabRegister.style.color = 'var(--text-muted)';
            loginBox.style.display = 'flex';
            registerBox.style.display = 'none';
        });
        
        tabRegister.addEventListener('click', () => {
            tabRegister.style.color = 'var(--accent-gold)';
            tabLogin.style.color = 'var(--text-muted)';
            loginBox.style.display = 'none';
            registerBox.style.display = 'flex';
        });
    }
    
    const loginSubmit = document.getElementById('btn-login-submit');
    if (loginSubmit) {
        loginSubmit.addEventListener('click', async () => {
            const user = document.getElementById('login-username').value.trim();
            const pass = document.getElementById('login-password').value.trim();
            if (!user || !pass) { alert("Vui lòng nhập tài khoản và mật khẩu!"); return; }
            
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await res.json();
            if (data.error) {
                alert(data.error);
            } else {
                await syncUserSession();
                showWorkspace();
            }
        });
    }
    
    const registerSubmit = document.getElementById('btn-register-submit');
    if (registerSubmit) {
        registerSubmit.addEventListener('click', async () => {
            const user = document.getElementById('reg-username').value.trim();
            const pass = document.getElementById('reg-password').value.trim();
            if (!user || !pass) { alert("Vui lòng nhập đầy đủ tên tài khoản và mật khẩu!"); return; }
            
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await res.json();
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message);
                await syncUserSession();
                showWorkspace();
            }
        });
    }
    
    const logoutSubmit = document.getElementById('btn-logout-submit');
    if (logoutSubmit) {
        logoutSubmit.addEventListener('click', async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.reload();
        });
    }
    
    function showAuth() {
        document.getElementById('auth-panel-wrapper').style.display = 'block';
        document.getElementById('user-workspace-wrapper').style.display = 'none';
    }
    
    function showWorkspace() {
        document.getElementById('auth-panel-wrapper').style.display = 'none';
        document.getElementById('user-workspace-wrapper').style.display = 'grid';
        
        document.getElementById('user-info-username').innerText = activeUser.username.toUpperCase();
        document.getElementById('user-info-skin').innerText = activeUser.skin_tone ? `${activeUser.skin_tone} (${activeUser.undertone})` : "Chưa kiểm tra";
        
        loadOrdersHistory();
    }
    
    async function loadOrdersHistory() {
        const orderContainer = document.getElementById('user-orders-list');
        if (!orderContainer) return;
        orderContainer.innerHTML = '';
        
        const res = await fetch('/api/user/orders');
        const orders = await res.json();
        
        if (orders.length === 0) {
            orderContainer.innerHTML = `<div class="dupe-placeholder" style="max-width:100%;">Bạn chưa đặt đơn hàng nào.</div>`;
            return;
        }
        
        orders.forEach(o => {
            const oDiv = document.createElement('div');
            oDiv.className = 'glass-panel';
            oDiv.style.padding = '15px';
            oDiv.style.marginBottom = '10px';
            oDiv.style.background = 'rgba(255,255,255,0.02)';
            oDiv.style.borderColor = 'rgba(255,255,255,0.05)';
            oDiv.style.fontSize = '13px';
            
            let statusText = 'Đang duyệt';
            let statusColor = 'orange';
            if (o.status === 'approved') { statusText = 'Đã thanh toán / Đang giao'; statusColor = 'green'; }
            else if (o.status === 'cancelled') { statusText = 'Đã hủy'; statusColor = 'red'; }
            
            const dateStr = new Date(o.created_at).toLocaleDateString('vi-VN');
            
            oDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:5px;">
                    <strong>Đơn hàng #${o.id} (${dateStr})</strong>
                    <span style="color:${statusColor}; font-weight:600;">${statusText}</span>
                </div>
                <div style="color: var(--text-muted); line-height: 1.5;">
                    ${o.items.map(item => `- ${item.brand} ${item.product_name} (${item.shade_name}) x ${item.quantity}`).join('<br>')}
                    <div style="margin-top:8px; text-align:right; font-weight:600; color:#fff;">Tổng: ${parseFloat(o.total_amount).toLocaleString('vi-VN')}₫</div>
                </div>
            `;
            orderContainer.appendChild(oDiv);
        });
    }
    
    const testSubmit = document.getElementById('btn-submit-test');
    if (testSubmit) {
        testSubmit.addEventListener('click', async () => {
            const veins = document.getElementById('test-veins').value;
            const jewelry = document.getElementById('test-jewelry').value;
            const sun = document.getElementById('test-sun').value;
            const skinTone = document.getElementById('test-skin-tone').value;
            const finish = document.getElementById('test-finish').value;
            
            let undertone = 'Neutral';
            let warmCount = 0;
            let coolCount = 0;
            
            if (veins === 'Warm') warmCount++; else if (veins === 'Cool') coolCount++;
            if (jewelry === 'Warm') warmCount++; else if (jewelry === 'Cool') coolCount++;
            if (sun === 'Warm') warmCount++; else if (sun === 'Cool') coolCount++;
            
            if (warmCount > coolCount) undertone = 'Warm';
            else if (coolCount > warmCount) undertone = 'Cool';
            
            let personalColor = 'Spring';
            if (skinTone === 'Fair') {
                personalColor = undertone === 'Cool' ? 'Summer' : 'Spring';
            } else {
                personalColor = undertone === 'Cool' ? 'Winter' : 'Autumn';
            }
            
            try {
                const res = await fetch('/api/survey', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        skin_tone: skinTone,
                        undertone: undertone,
                        personal_color: personalColor,
                        preferred_finish: finish
                    })
                });
                
                const data = await res.json();
                alert(data.message);
                
                await syncUserSession();
                showWorkspace();
            } catch(e) {
                alert("Không thể lưu kết quả khảo sát. Lỗi kết nối!");
            }
        });
    }
}

// --- G. ADMIN PANEL MANAGEMENT PAGE ---
function initAdminPage() {
    syncUserSession().then(() => {
        if (!activeUser.logged_in || activeUser.role !== 'admin') {
            window.location.href = '/profile';
        } else {
            loadAdminOrders();
        }
    });
    
    const tabOrders = document.getElementById('admin-tab-orders');
    const tabProducts = document.getElementById('admin-tab-products');
    const ordersSection = document.getElementById('admin-orders-section');
    const productsSection = document.getElementById('admin-products-section');
    
    if (tabOrders && tabProducts) {
        tabOrders.addEventListener('click', () => {
            tabOrders.classList.add('active');
            tabProducts.classList.remove('active');
            ordersSection.style.display = 'block';
            productsSection.style.display = 'none';
            loadAdminOrders();
        });
        
        tabProducts.addEventListener('click', () => {
            tabProducts.classList.add('active');
            tabOrders.classList.remove('active');
            productsSection.style.display = 'block';
            ordersSection.style.display = 'none';
            loadAdminProducts();
        });
    }
    
    async function loadAdminOrders() {
        const body = document.getElementById('admin-orders-body');
        if (!body) return;
        body.innerHTML = '';
        
        const res = await fetch('/api/admin/orders');
        const orders = await res.json();
        
        if (orders.length === 0) {
            body.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted); font-style: italic;">Chưa có đơn đặt hàng nào trong CSDL.</td></tr>`;
            return;
        }
        
        orders.forEach(o => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            tr.style.fontSize = '13px';
            
            const dateStr = new Date(o.created_at).toLocaleDateString('vi-VN');
            
            let statusBadge = `<span style="color:orange; font-weight:600;">Đang duyệt</span>`;
            if (o.status === 'approved') statusBadge = `<span style="color:green; font-weight:600;">Đã duyệt</span>`;
            if (o.status === 'cancelled') statusBadge = `<span style="color:red; font-weight:600;">Đã hủy</span>`;
            
            tr.innerHTML = `
                <td style="padding: 12px 8px;"><strong>#${o.id}</strong><br><span style="color:var(--text-muted); font-size:11px;">${dateStr}</span></td>
                <td style="padding: 12px 8px; color:var(--accent-gold);">${o.username}</td>
                <td style="padding: 12px 8px;"><strong>${o.customer_name}</strong></td>
                <td style="padding: 12px 8px; font-size:12px;">${o.phone}<br><span style="color:var(--text-muted);">${o.address}</span></td>
                <td style="padding: 12px 8px; color:var(--text-muted); font-size:12px;">
                    ${o.items.map(item => `${item.brand} ${item.product_name} (${item.shade_name}) x${item.quantity}`).join('<br>')}
                </td>
                <td style="padding: 12px 8px; text-align: right; font-weight:600; color:var(--accent-gold);">${parseFloat(o.total_amount).toLocaleString('vi-VN')}₫</td>
                <td style="padding: 12px 8px; text-align: center;">${statusBadge}</td>
                <td style="padding: 12px 8px; text-align: center; min-width:140px;">
                    ${o.status === 'pending' ? `
                        <button class="btn-export" style="padding:4px 8px; font-size:11px; display:inline-block; border-color:green; color:green; background:transparent; margin-right:4px;" onclick="updateOrderStatus(${o.id}, 'approved')">Duyệt</button>
                        <button class="btn-export" style="padding:4px 8px; font-size:11px; display:inline-block; border-color:var(--accent-pink); color:var(--accent-pink); background:transparent;" onclick="updateOrderStatus(${o.id}, 'cancelled')">Hủy</button>
                    ` : `<span style="color:var(--text-muted);">-</span>`}
                </td>
            `;
            body.appendChild(tr);
        });
    }
    
    window.updateOrderStatus = async function(orderId, status) {
        if (!confirm(`Bạn có chắc chắn muốn cập nhật trạng thái đơn hàng #${orderId} thành '${status === 'approved' ? 'Đã duyệt' : 'Đã hủy'}'?`)) return;
        
        try {
            const res = await fetch(`/api/admin/orders/${orderId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: status })
            });
            const data = await res.json();
            alert(data.message);
            loadAdminOrders();
        } catch(e) {
            alert("Cập nhật trạng thái thất bại. Lỗi kết nối!");
        }
    };
    
    async function loadAdminProducts() {
        const body = document.getElementById('admin-products-body');
        if (!body) return;
        body.innerHTML = '';
        
        const res = await fetch('/api/lipsticks');
        const products = await res.json();
        
        products.forEach(p => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            tr.style.fontSize = '13px';
            
            tr.innerHTML = `
                <td style="padding: 12px 8px;"><strong>ID #${p.id}</strong></td>
                <td style="padding: 12px 8px; color:var(--accent-gold);">${p.brand}</td>
                <td style="padding: 12px 8px;"><strong>${p.product_name}</strong></td>
                <td style="padding: 12px 8px;">${p.shade_name}</td>
                <td style="padding: 12px 8px; text-align: center;"><span style="display:inline-block; width:18px; height:18px; border-radius:50%; background-color:${p.hex_code}; border:1px solid #fff; vertical-align:middle;"></span></td>
                <td style="padding: 12px 8px;">
                    <div class="select-wrapper" style="width: 130px;">
                        <select onchange="updateProductPrice(${p.id}, this.value)" style="padding:6px 12px; font-size:12px; background: rgba(0,0,0,0.6);">
                            <option value="Affordable" ${p.price_tier === 'Affordable' ? 'selected' : ''}>Bình dân</option>
                            <option value="Premium" ${p.price_tier === 'Premium' ? 'selected' : ''}>Trung cấp</option>
                            <option value="Luxury" ${p.price_tier === 'Luxury' ? 'selected' : ''}>Cao cấp</option>
                            <option value="Ultra-Luxury" ${p.price_tier === 'Ultra-Luxury' ? 'selected' : ''}>Siêu cao cấp</option>
                        </select>
                    </div>
                </td>
                <td style="padding: 12px 8px; text-align: center;"><a href="/product/${p.id}" style="color:var(--accent-gold); font-size:12px;" target="_blank">Xem Link</a></td>
            `;
            body.appendChild(tr);
        });
    }
    
    window.updateProductPrice = async function(lipstickId, priceTier) {
        try {
            const res = await fetch(`/api/admin/products/${lipstickId}/price`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price_tier: priceTier })
            });
            const data = await res.json();
            alert(data.message);
        } catch(e) {
            alert("Thay đổi phân khúc giá thất bại. Lỗi kết nối!");
        }
    };
}

// ==========================================================================
// 5. BOOTSTRAP INITIALIZATION ROUTER
// ==========================================================================

window.addEventListener('DOMContentLoaded', () => {
    updateCartCountBadge();
    
    if (isHomePage) {
        initHomePage();
    } else if (isShopPage) {
        initShopPage();
    } else if (isProductPage) {
        initProductPage();
    } else if (isCartPage) {
        initCartPage();
    } else if (isProfilePage) {
        initProfilePage();
    } else if (isAdminPage) {
        initAdminPage();
    }
});
