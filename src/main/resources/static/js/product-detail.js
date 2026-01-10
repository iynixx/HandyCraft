// --- Configuration ---
// CART_STORAGE_KEY is sourced globally from js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    createBackButton();
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (productId) {
        // Run all initialization together
        fetchProductDetails(productId);
        loadFeedback(productId);
        updateAverageDisplay(productId);
        checkReviewEligibility(productId);
    } else {
        const container = document.getElementById('product-detail-container');
        if (container) container.innerHTML = "<p>Product not found.</p>";
    }

    async function checkReviewEligibility(productId) {
        const userEmail = localStorage.getItem('userEmail');
        const formContainer = document.querySelector('.feedback-form-container');

        if (!userEmail) {
            if (formContainer) formContainer.style.display = 'none';
            return;
        }

        try {
            const res = await fetch(`http://localhost:8000/api/orders?userId=${encodeURIComponent(userEmail)}`);
            const orders = await res.json();

            const hasBought = orders.some(o =>
                o.status === 'Completed' &&
                o.items.some(item => String(item.id) === String(productId))
            );

            if (!hasBought && formContainer) {
                formContainer.innerHTML = "<p style='color: #888; background: #eee; padding: 10px; border-radius: 8px;'>Only customers who have purchased and received this item can leave a review.</p>";
            }
        } catch (e) {
            console.error("Eligibility check failed", e);
        }
    }
});

// --- Authentication and Security ---
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
    if (!isLoggedIn) {
        alert("You must be signed in to access your cart or add items. Please sign in first.");
        window.location.href = 'signin.html';
        return true;
    }
    return false;
}

// --- Product Data Fetching & Rendering ---
async function fetchProductDetails(id) {
    try {
        const res = await fetch('http://localhost:8000/api/products');
        const products = await res.json();
        const product = products.find(p => p['Product ID'].toString() === id);

        if (product) {
            renderProductDetail(product);
        } else {
            document.getElementById('product-detail-container').innerHTML = "<p>Product ID not found.</p>";
        }
    } catch (err) {
        console.error("Error fetching details:", err);
    }
}

function renderProductDetail(product) {
    const container = document.getElementById('product-detail-container');
    const imageUrl = product['File Name'] ? `images/products/${product['File Name']}` : 'images/placeholder.jpg';
    const inventoryObj = product.Inventory || {};
    const variants = Object.keys(inventoryObj);

    let variantHtml = '';
    let initialStock = 0;

    if (variants.length > 0) {
        const firstVariantKey = variants[0];
        let rawStock = inventoryObj[firstVariantKey];
        initialStock = (typeof rawStock === 'number') ? rawStock : (rawStock?.quantity || parseInt(rawStock) || 0);

        if (variants.length === 1 && firstVariantKey === 'Default') {
            variantHtml = `<input type="hidden" id="variant-dropdown" value="Default">`;
        } else {
            const options = variants.map(v => `<option value="${v}">${v}</option>`).join('');
            variantHtml = `
                <div class="variant-selector">
                    <label class="variant-label">Choose Variation:</label>
                    <select id="variant-dropdown" class="variant-select">${options}</select>
                </div>`;
        }
    }

    container.innerHTML = `
        <div class="detail-image-wrapper">
            <img src="${imageUrl}" alt="${product['Product Name']}" class="detail-image">
        </div>
        <div class="detail-info">
            <span class="detail-category">${product.Category}</span>
            <h1 class="detail-title">${product['Product Name']}</h1>
            <p class="detail-price">RM ${product['Price (RM)'].toFixed(2)}</p>
            <p class="detail-description">${product.Description}</p>
            ${variantHtml}
            <p class="stock-status">Stock: <span id="stock-display">${initialStock}</span> units</p>
            <p class="average-rating" style="margin-top: 10px; font-weight: bold; color: #D67D8C;">
                Average Customer Rating: <span id="avg-rating-value">Loading...</span>/5
            </p>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                <label style="font-weight: 600;">Quantity:</label>
                <button id="qty-minus" class="button" style="padding: 5px 15px; background:#eee; color:black;">-</button>
                <span id="qty-value" style="font-weight: bold; font-size: 1.2rem; min-width:30px; text-align:center;">1</span>
                <button id="qty-plus" class="button" style="padding: 5px 15px; background:#eee; color:black;">+</button>
            </div>
            <button id="detail-add-btn" class="button large primary">Add to Cart</button>
        </div>`;

    // Quantity Logic
    let currentSelectedQty = 1;
    const qtyDisplay = document.getElementById('qty-value');
    document.getElementById('qty-plus').onclick = () => { currentSelectedQty++; qtyDisplay.textContent = currentSelectedQty; };
    document.getElementById('qty-minus').onclick = () => { if(currentSelectedQty > 1) currentSelectedQty--; qtyDisplay.textContent = currentSelectedQty; };

    const dropdown = document.getElementById('variant-dropdown');
    const stockDisplay = document.getElementById('stock-display');
    const addBtn = document.getElementById('detail-add-btn');

    // Live Stock Update when dropdown changes
    if (dropdown && dropdown.tagName === 'SELECT') {
        dropdown.addEventListener('change', (e) => {
            const val = inventoryObj[e.target.value];
            const newStock = (typeof val === 'number') ? val : (val?.quantity || parseInt(val) || 0);
            stockDisplay.textContent = newStock;
            addBtn.disabled = newStock <= 0;
            addBtn.textContent = newStock <= 0 ? "Out of Stock" : "Add to Cart";
        });
    }

    // --- STRICT ADD TO CART TRIGGER ---
    addBtn.addEventListener('click', () => {
        if (checkLoginStatus()) return;

        const variant = dropdown ? dropdown.value : "Default";
        const requestedQty = parseInt(document.getElementById('qty-value').textContent);
        const rawStock = inventoryObj[variant];
        const stockAvailable = (typeof rawStock === 'number') ? rawStock : (rawStock?.quantity || parseInt(rawStock) || 0);

        if (requestedQty > stockAvailable) {
            alert(`Only ${stockAvailable} units available for this variation. Please adjust your quantity.`);
            document.getElementById('qty-value').textContent = stockAvailable;
            return;
        }

        addToCart(product['Product ID'], product['Product Name'], product['Price (RM)'], variant, requestedQty, stockAvailable);
    });
}

// --- Cart Management ---
function addToCart(productId, productName, productPrice, variant = "Default", quantity = 1, stock = 99) {
    let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    const existingItem = cart.find(item => item.id === productId && item.variant === variant);

    const currentInCart = existingItem ? existingItem.quantity : 0;
    if (currentInCart + quantity > stock) {
        alert(`You already have ${currentInCart} in your cart. Adding ${quantity} more would exceed total stock (${stock}).`);
        return;
    }

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: productId, name: productName, price: productPrice,
            quantity: quantity, variant: variant, remainingStock: stock
        });
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    const variantDisplay = (variant !== "Default") ? ` (${variant})` : "";
    alert(`Added ${quantity} x ${productName}${variantDisplay} to your cart!`);
}

window.viewCart = function() {
    if (checkLoginStatus()) return;
    window.location.href = "cart.html";
};

// --- Feedback and Rating System ---
async function updateAverageDisplay(productId) {
    try {
        const res = await fetch(`http://localhost:8000/api/feedback?productId=${productId}`);
        const data = await res.json();
        const avgDisplay = document.getElementById('avg-rating-value');
        if (avgDisplay) avgDisplay.textContent = (data.average || 0).toFixed(1);
    } catch (error) { console.error("Error updating average:", error); }
}

async function loadFeedback(productId) {
    try {
        const res = await fetch(`http://localhost:8000/api/feedback?productId=${productId}`);
        const data = await res.json();
        const reviews = data.reviews || [];
        const container = document.getElementById('reviews-list');
        const countHeader = document.querySelector('.feedback-section h3');

        if (countHeader) countHeader.textContent = `Customer Reviews (${reviews.length})`;

        if (reviews.length === 0) {
            container.innerHTML = "<p>Be the first to review this product!</p>";
            return;
        }

        container.innerHTML = reviews.map(r => `
            <div style="margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                <strong>${r.username}</strong> 
                <span style="color: #D67D8C; font-weight: bold;">(${r.rating}/5)</span>
                <p style="margin-top: 5px;">${r.comment}</p>
            </div>`).join('');
    } catch (err) { console.error("Error loading feedback:", err); }
}

const fbForm = document.getElementById('feedback-form');
if (fbForm) {
    fbForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (checkLoginStatus()) return;

        const params = new URLSearchParams(window.location.search);
        const productId = params.get('id');
        const feedbackData = {
            productId: productId,
            username: localStorage.getItem('username'),
            userEmail: localStorage.getItem('userEmail'),
            rating: parseInt(document.getElementById('fb-rating').value),
            comment: document.getElementById('fb-comment').value
        };

        const response = await fetch('http://localhost:8000/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feedbackData)
        });

        if (response.ok) {
            alert("Thank you for your feedback!");
            fbForm.reset();
            loadFeedback(productId);
            updateAverageDisplay(productId);
        }
    });
}

function createBackButton() {
    const container = document.getElementById('back-button-container');
    if (!container) return;

    const btn = document.createElement('button');
    btn.className = 'back-button';
    btn.innerHTML = '← Back';

    btn.addEventListener('click', () => {
        window.location.href = 'products.html';
    });

    container.appendChild(btn);
}