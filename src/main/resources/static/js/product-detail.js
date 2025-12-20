// --- Configuration (Needed for cart storage) ---
const CART_STORAGE_KEY = 'handyCraftCart';

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (productId) {
        // Load product data first
        fetchProductDetails(productId);
        // loadFeedback handles the reviews list AND internal data
        loadFeedback(productId);
        // updateAverageDisplay handles the score at the top
        updateAverageDisplay(productId);
    } else {
        const container = document.getElementById('product-detail-container');
        if (container) container.innerHTML = "<p>Product not found.</p>";
    }
});

async function updateAverageDisplay(productId) {
    try {
        const res = await fetch(`http://localhost:8000/api/feedback?id=${productId}`);
        const data = await res.json();

        const avgDisplay = document.getElementById('avg-rating-value');
        if (avgDisplay) {
            avgDisplay.textContent = (data.average || 0).toFixed(1);
        }
    } catch (error) {
        console.error("Error updating average:", error);
    }
}

// --- Authentication and Security (COPIED from product.js) ---
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
    if (!isLoggedIn) {
        alert("You must be signed in to access your cart or add items. Please sign in first.");
        // Redirect is handled here, returning true signifies redirection happened
        window.location.href = 'signin.html';
        return true; // Return true means STOP
    }
    // Return false signifies the user is logged in
    return false; // Return false means PROCEED
}

function fetchProductDetails(id) {
    // Reuse the API URL from your configuration
    fetch('http://localhost:8000/api/products')
        .then(res => res.json())
        .then(products => {
            // Find the specific product (Convert ID to string for comparison)
            const product = products.find(p => p['Product ID'].toString() === id);

            if (product) {
                renderProductDetail(product);
                updateAverageDisplay(id);
            } else {
                document.getElementById('product-detail-container').innerHTML =
                    "<p>Product ID not found.</p>";
            }
        })
        .catch(err => console.error("Error:", err));
}

function renderProductDetail(product) {
    const container = document.getElementById('product-detail-container');
    const imageUrl = product['File Name'] ? `images/products/${product['File Name']}` : 'images/placeholder.jpg';

    // 1. Determine Inventory/Variants
    const inventoryObj = product.Inventory || {};
    const variants = Object.keys(inventoryObj);

    let variantHtml = '';
    let initialStock = 0;

    // Logic to build the dropdown
    if (variants.length > 0) {
        // Fix for stock showing [object Object] when it's a number/object
        const firstVariantKey = variants[0];

        // Check stock type (handles number, string, or object)
        let rawStock = inventoryObj[firstVariantKey];
        if (typeof rawStock === 'number') {
            initialStock = rawStock;
        } else if (typeof rawStock === 'object' && rawStock !== null) {
            initialStock = rawStock.quantity || rawStock.count || 0;
        } else if (typeof rawStock === 'string') {
            initialStock = parseInt(rawStock) || 0;
        } else {
            initialStock = 0;
        }

        if (variants.length === 1 && firstVariantKey === 'Default') {
            variantHtml = `<input type="hidden" id="selected-variant" value="Default">`;
        } else {
            const options = variants.map(v =>
                `<option value="${v}">${v}</option>`
            ).join('');

            variantHtml = `
                <div class="variant-selector">
                    <label class="variant-label">Choose Variation:</label>
                    <select id="variant-dropdown" class="variant-select">
                        ${options}
                    </select>
                </div>
            `;
        }
    }

    // 2. Build the HTML
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

            <p class="stock-status">
                Stock: <span id="stock-display">${initialStock}</span> units
            </p>
            
            <p class="average-rating" style="margin-top: 10px; font-weight: bold; color: #D67D8C;">
                Average Customer Rating: <span id="avg-rating-value">Loading...</span>/5
            </p>

            <button id="detail-add-btn" class="button large primary">Add to Cart</button>
        </div>
    `;

    // 3. Add Logic for Dropdown Changes
    const dropdown = document.getElementById('variant-dropdown');
    const stockDisplay = document.getElementById('stock-display');
    const addBtn = document.getElementById('detail-add-btn');

    if (dropdown) {
        dropdown.addEventListener('change', (e) => {
            const selectedColor = e.target.value;
            const rawNewStock = inventoryObj[selectedColor];

            // Check stock type again for the change event
            let newStock = 0;
            if (typeof rawNewStock === 'number') {
                newStock = rawNewStock;
            } else if (typeof rawNewStock === 'object' && rawNewStock !== null) {
                newStock = rawNewStock.quantity || rawNewStock.count || 0;
            } else if (typeof rawNewStock === 'string') {
                newStock = parseInt(rawNewStock) || 0;
            }

            stockDisplay.textContent = newStock;

            // Disable button if stock is 0
            if(newStock <= 0) {
                addBtn.disabled = true;
                addBtn.textContent = "Out of Stock";
                addBtn.style.backgroundColor = "#ccc";
            } else {
                addBtn.disabled = false;
                addBtn.textContent = "Add to Cart";
                addBtn.style.backgroundColor = ""; // Reset to CSS default
            }
        });
    }

    // 4. ADD TO CART FUNCTION (MODIFIED)
    addBtn.addEventListener('click', () => {
        // --- ADD LOGIN CHECK HERE ---
        if (checkLoginStatus()) {
            return;
        }

        // Get the chosen variant (or "Default")
        const variant = dropdown ? dropdown.value : "Default";

        // Use a customized Add To Cart function
        const cartItemName = variant === "Default"
            ? product['Product Name']
            : `${product['Product Name']} (${variant})`;

        addToCart(
            product['Product ID'],
            cartItemName,
            product['Price (RM)']
        );
    });
}


// --- CART LOGIC (COPIED from product.js) ---
function addToCart(productId, productName, productPrice) {
    // Retrieve cart or initialize as empty array
    let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];

    // Check if item already exists in cart (matching ID and Name/Variant)
    const existingItem = cart.find(item => item.id === productId && item.name === productName);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        // Add new item to cart
        cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            quantity: 1
        });
    }

    // Save updated cart back to local storage
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));

    showCartConfirmation(productName);
}

function showCartConfirmation(productName) {
    alert(`"${productName}" added to your cart.`);
}

/**
 * Global function linked to the header button: onclick="viewCart()" (COPIED from product.js)
 */
window.viewCart = function() {
    // LOGIN CHECK
    if (checkLoginStatus()) {
        return;
    }

    const cartString = localStorage.getItem(CART_STORAGE_KEY);
    let cart = cartString ? JSON.parse(cartString) : [];

    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    // Create a readable summary of cart contents
    let cartDetails = "🛒 Your Shopping Cart:\n\n";
    let subtotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        cartDetails += `- ${item.name}: Qty ${item.quantity} x RM ${item.price.toFixed(2)} = RM ${itemTotal.toFixed(2)}\n`;
        subtotal += itemTotal;
    });

    cartDetails += `\n------------------------\n`;
    cartDetails += `Subtotal: RM ${subtotal.toFixed(2)}`;

    alert(cartDetails);
}

// 1. Function to display reviews
async function loadFeedback(productId) {
    const res = await fetch(`http://localhost:8000/api/feedback?id=${productId}`);
    const data = await res.json(); // 'data' is now the Object { reviews: [], average: 0 }

    // Access the reviews property specifically
    const reviews = data.reviews;
    const container = document.getElementById('reviews-list');
    const countHeader = document.querySelector('.feedback-section h3');

    if(countHeader && reviews){
        countHeader.textContent = `Customer Reviews (${reviews.length})`;
    }

    if (!reviews || reviews.length === 0) {
        container.innerHTML = "<p>Be the first to review this product!</p>";
        return;
    }

    container.innerHTML = reviews.map(r => `
        <div style="margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
            <strong>${r.username}</strong> 
            <span style="color: #D67D8C; font-weight: bold;">(${r.rating}/5)</span>
            <p style="margin-top: 5px;">${r.comment}</p>
        </div>
    `).join('');
}

// 2. Function to submit reviews
document.getElementById('feedback-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
    if (!isLoggedIn) {
        alert("Please sign in to leave a review.");
        window.location.href = 'signin.html';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    const username = localStorage.getItem('username');

    const feedbackData = {
        productId: productId,
        username: username,
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
        document.getElementById('feedback-form').reset();
        loadFeedback(productId); // Refresh the list of comments
        updateAverageDisplay(productId); // Refresh the average rating
    }
});

// 3. Initialize loading on page load
const currentProductId = new URLSearchParams(window.location.search).get('id');
if (currentProductId) {
    loadFeedback(currentProductId);
}