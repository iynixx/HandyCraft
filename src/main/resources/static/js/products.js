// --- Configuration ---
const API_PRODUCTS_URL = 'http://localhost:8000/api/products';

let allProductsData = [];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    console.log("Product and Cart logic initialized.");
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

// --- API Fetching, Filtering, and Rendering ---
function fetchProducts() {
    fetch(API_PRODUCTS_URL)
        .then(response => response.json())
        .then(products => {
            if (Array.isArray(products) && products.length > 0) {
                // Map and save data globally
                allProductsData = products.map(p => ({
                    id: p['Product ID'],
                    category: p.Category,
                    name: p['Product Name'],
                    price: p['Price (RM)'],
                    description: p.Description,
                    imageUrl: p['File Name'],
                    inventory: p.Inventory
                }));

                const params = new URLSearchParams(window.location.search);
                const categoryFilter = params.get('category');
                const searchQuery = params.get('search');

                let filteredProducts = allProductsData;
                let pageTitle = 'All Handmade Crochet Collections';

                if (categoryFilter && categoryFilter !== 'all') {
                    const normalizedFilter = categoryFilter.toLowerCase().replace(/\s/g, '');
                    filteredProducts = allProductsData.filter(product =>
                        product.category &&
                        product.category.toLowerCase().replace(/\s/g, '').includes(normalizedFilter)
                    );
                    pageTitle = (filteredProducts.length > 0 ? filteredProducts[0].category : categoryFilter) + " Collection";
                } else if (searchQuery) {
                    const lowerQuery = searchQuery.toLowerCase();
                    filteredProducts = allProductsData.filter(product =>
                        (product.name && product.name.toLowerCase().includes(lowerQuery)) ||
                        (product.description && product.description.toLowerCase().includes(lowerQuery))
                    );
                    pageTitle = `Search Results for: "${searchQuery}"`;
                }

                updatePageTitle(pageTitle);
                populateCategoryFilter(allProductsData, categoryFilter);

                if (filteredProducts.length > 0) {
                    renderProducts(filteredProducts);
                } else {
                    document.getElementById('product-grid').innerHTML = '<p>No products found in this selection.</p>';
                }
            }
        })
        .catch(error => {
            console.error("Error loading products:", error);
            document.getElementById('product-grid').innerHTML = `<p class="error-message">Could not connect to the server.</p>`;
        });
}

function updatePageTitle(title) {
    const pageTitleElement = document.querySelector('.page-title');
    if (pageTitleElement) pageTitleElement.textContent = title;
}

function populateCategoryFilter(products, currentFilter) {
    const filterDropdown = document.getElementById('category-filter');
    if (!filterDropdown) return;
    const categories = [...new Set(products.map(p => p.category))].sort();
    filterDropdown.innerHTML = '<option value="all">All Products</option>';
    categories.forEach(category => {
        if (category) {
            const option = document.createElement('option');
            const slug = category.toLowerCase().replace(/\s/g, '');
            option.value = slug;
            option.textContent = category;
            if (currentFilter && slug === currentFilter.toLowerCase()) option.selected = true;
            filterDropdown.appendChild(option);
        }
    });
    filterDropdown.addEventListener('change', (e) => {
        window.location.href = `products.html?category=${e.target.value}`;
    });
}

function renderProducts(products) {
    const gridContainer = document.getElementById('product-grid');
    gridContainer.innerHTML = '';

    products.forEach(product => {
        const safePrice = product.price || 0;
        const formattedPrice = parseFloat(safePrice).toFixed(2);
        const finalImage = product.imageUrl ? `images/products/${product.imageUrl}` : "images/placeholder.jpg";

        // --- 1. Calculate Total Stock Across All Variants ---
        const inventory = product.inventory || {};
        const variantKeys = Object.keys(inventory);

        // Sum up the quantities of all variants (e.g., Light Brown + Dark Brown)
        const totalStock = Object.values(inventory).reduce((sum, val) => {
            const qty = (typeof val === 'number') ? val : (val?.quantity || parseInt(val) || 0);
            return sum + qty;
        }, 0);

        const isSoldOut = totalStock <= 0;

        // --- 2. Build Variant Selector HTML ---
        let variantHtml = '';
        if (!isSoldOut) {
            if (variantKeys.length > 1 || (variantKeys.length === 1 && variantKeys[0] !== 'Default')) {
                const options = variantKeys.map(v => `<option value="${v}">${v}</option>`).join('');
                variantHtml = `<select class="variant-select-mini" id="variant-${product.id}" style="margin-bottom: 10px; width: 100%; padding: 8px; border-radius: 5px; border: 1px solid #ddd;">${options}</select>`;
            } else {
                variantHtml = `<input type="hidden" id="variant-${product.id}" value="Default">`;
            }
        }

        const productCard = document.createElement('div');
        productCard.className = `product-card ${isSoldOut ? 'sold-out' : ''}`;

        // --- 3. Build the Card HTML ---
        productCard.innerHTML = `
        <div class="image-container-relative">
            <a href="product-detail.html?id=${product.id}" class="product-link">
                <div class="product-image-wrapper">
                    <img src="${finalImage}" alt="${product.name}" class="product-image" style="display: block; width: 100%;"/>
                </div>
            </a>
            ${isSoldOut ? `<div class="sold-out-badge">Sold Out</div>` : ''}
        </div>

        <span class="category-tag" style="margin-top: 12px; display: inline-block;">${product.category || "New"}</span>
        <h3 class="product-name" style="margin-top: 5px; margin-bottom: 5px;">${product.name}</h3>
    
        <p class="product-description-mini" style="font-size: 0.85rem; color: #666; margin-bottom: 10px; 
              display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; 
              overflow: hidden; text-overflow: ellipsis; height: 2.6rem; line-height: 1.3rem;">
            ${product.description || "Handmade with care."}
        </p>

        <p class="product-price" style="font-weight: bold; margin-bottom: 10px; font-size: 1.1rem;">
        RM ${formattedPrice}
        </p>

        ${variantHtml}

        ${!isSoldOut ? `
            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 15px; justify-content: center;">
                <button onclick="updateQtyDisplay('${product.id}', -1)" class="button secondary" style="padding: 2px 12px; background:#f0f0f0; color:black; border:1px solid #ccc; width: 35px;">-</button>
                <input type="text" id="qty-${product.id}" value="1" readonly style="width: 45px; text-align: center; border: 1px solid #ddd; border-radius: 4px; font-weight: bold; outline: none;">       
                <button onclick="updateQtyDisplay('${product.id}', 1)" class="button secondary" style="padding: 2px 12px; background:#f0f0f0; color:black; border:1px solid #ccc; width: 35px;">+</button>
            </div>
            <button class="button primary" onclick="handleMainAddToCart('${product.id}', '${product.name}', ${safePrice})">Add to Cart</button>
        ` : `
            <div style="height: 40px; margin-top: 15px;">
                <button class="button" disabled style="background: #e0e0e0; color: #888; cursor: not-allowed; width: 100%; border: none;">Out of Stock</button>
            </div>
        `}
    `;
        gridContainer.appendChild(productCard);
    });
}

// --- Cart Logic ---
function addToCart(productId, productName, productPrice, variant = "Default", quantity = 1, stock = 99) {
    let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    const existingItem = cart.find(item => item.id === productId && item.variant === variant);

    const currentInCart = existingItem ? existingItem.quantity : 0;
    if (currentInCart + quantity > stock) {
        alert(`You already have ${currentInCart} in your cart. Total cannot exceed the available stock (${stock}).`);
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
    const variantDisplay = variant !== "Default" ? ` (${variant})` : "";
    alert(`Added ${quantity} x ${productName}${variantDisplay} to cart!`);
}

window.updateQtyDisplay = function(id, delta) {
    const input = document.getElementById(`qty-${id}`);
    const variant = document.getElementById(`variant-${id}`)?.value || "Default";
    const product = allProductsData.find(p => p.id.toString() === id.toString());

    if (product && product.inventory) {
        const currentStock = product.inventory[variant] || 0;
        let newVal = parseInt(input.value) + delta;
        if (newVal < 1) newVal = 1;
        if (newVal > currentStock) {
            alert(`Sorry, only ${currentStock} units available!`);
            newVal = currentStock;
        }
        input.value = newVal;
    }
};

window.handleMainAddToCart = function(id, name, price) {
    if (checkLoginStatus()) return;
    const variant = document.getElementById(`variant-${id}`)?.value || "Default";
    const qtyInput = document.getElementById(`qty-${id}`);
    const requestedQty = parseInt(qtyInput.value);
    const product = allProductsData.find(p => p.id.toString() === id.toString());
    const stockAvailable = product.inventory[variant] || 0;

    if (requestedQty > stockAvailable) {
        alert(`Only ${stockAvailable} units available for this selection.`);
        qtyInput.value = stockAvailable;
        return;
    }

    addToCart(id, name, price, variant, requestedQty, stockAvailable);
    qtyInput.value = 1;
};

window.viewCart = function() {
    if (checkLoginStatus()) return;
    window.location.href = "cart.html";
};
