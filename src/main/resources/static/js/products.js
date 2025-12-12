// --- Configuration ---
const API_PRODUCTS_URL = 'http://localhost:8000/api/products';
const CART_STORAGE_KEY = 'handyCraftCart';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    console.log("Cart logic initialized.");
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

// --- Helper Functions ---
function truncateText(text, limit = 55) {
    if (!text) return "";
    return text.length > limit ? text.substring(0, limit) + "..." : text;
}

// --- API Fetching ---
function fetchProducts() {
    fetch(API_PRODUCTS_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch products: ' + response.statusText);
            }
            return response.json();
        })
        .then(products => {
            if (Array.isArray(products) && products.length > 0) {

                // Normalize backend fields into frontend-friendly names
                const normalizedProducts = products.map(p => ({
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

                let filteredProducts = normalizedProducts;
                let pageTitle = 'All Handmade Crochet Collections';

                // Category filtering
                if (categoryFilter && categoryFilter !== 'all') {
                    filteredProducts = normalizedProducts.filter(product =>
                        product.category &&
                        product.category.toLowerCase().replace(/\s/g, '')
                            .includes(categoryFilter.toLowerCase())
                    );

                    const categoryName = filteredProducts.length > 0 ?
                        filteredProducts[0].category :
                        categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1);

                    pageTitle = `${categoryName} Collection`;

                } else if (searchQuery) {
                    // Search filtering
                    const lowerQuery = searchQuery.toLowerCase();
                    filteredProducts = normalizedProducts.filter(product =>
                        (product.name && product.name.toLowerCase().includes(lowerQuery)) ||
                        (product.description && product.description.toLowerCase().includes(lowerQuery))
                    );

                    pageTitle = `Search Results for: "${searchQuery}"`;
                }

                updatePageTitle(pageTitle);
                populateCategoryFilter(normalizedProducts, categoryFilter);

                if (filteredProducts.length > 0) {
                    renderProducts(filteredProducts);
                } else {
                    document.getElementById('product-grid').innerHTML =
                        '<p>No products found in this selection.</p>';
                }

            } else {
                document.getElementById('product-grid').innerHTML =
                    '<p>No products found at this time.</p>';
            }
        })
        .catch(error => {
            console.error("Error loading products:", error);
            document.getElementById('product-grid').innerHTML =
                `<p class="error-message">Could not connect to the server. Please check the Java backend is running.</p>`;
        });
}

// --- Update Page Title ---
function updatePageTitle(title) {
    const pageTitleElement = document.querySelector('.page-title');
    if (pageTitleElement) pageTitleElement.textContent = title;
}

// --- Category Filter ---
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

            if (currentFilter && slug === currentFilter.toLowerCase()) {
                option.selected = true;
            }

            filterDropdown.appendChild(option);
        }
    });

    filterDropdown.addEventListener('change', (event) => {
        const selectedValue = event.target.value;
        window.location.href = `products.html?category=${selectedValue}`;
    });
}

// --- Render Product Cards (Updated with New Design) ---
function renderProducts(products) {
    const gridContainer = document.getElementById('product-grid');
    gridContainer.innerHTML = '';

    products.forEach(product => {
        const safePrice = product.price != null ? product.price : 0;
        const formattedPrice = parseFloat(safePrice).toFixed(2);

        // Use normalized 'imageUrl' from the old logic
        const finalImage = product.imageUrl
            ? `/images/products/${product.imageUrl}`
            : "/images/placeholder.jpg";

        const productCard = document.createElement('div');
        productCard.className = 'product-card';

        // NEW HTML STRUCTURE
        productCard.innerHTML = `
            <div class="product-image-wrapper">
                <img src="${finalImage}" alt="${product.name}" class="product-image"/>
            </div>

            <span class="category-tag">${product.category || "New"}</span>

            <h3 class="product-name">${product.name}</h3>

            <p class="product-description">
                ${truncateText(product.description)}
            </p>

            <p class="product-price">RM ${formattedPrice}</p>

            <button 
                class="button primary add-to-cart"
                data-product-id="${product.id}"
                data-product-name="${product.name}"
                data-product-price="${safePrice}">
                Add to Cart
            </button>
        `;

        gridContainer.appendChild(productCard);
    });

    attachAddToCartListeners();
}

// --- Cart Logic ---
function attachAddToCartListeners() {
    const buttons = document.querySelectorAll('.add-to-cart');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Keep the Login Check from the old code
            if (checkLoginStatus()) return;

            const productId = btn.dataset.productId;
            const productName = btn.dataset.productName;
            const productPrice = parseFloat(btn.dataset.productPrice);

            addToCart(productId, productName, productPrice);
        });
    });
}

function addToCart(productId, productName, productPrice) {
    let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            quantity: 1
        });
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));

    showCartConfirmation(productName);
}

function showCartConfirmation(productName) {
    alert(`"${productName}" added to your cart.`);
}

/**
 * Global function linked to the header button: onclick="viewCart()"
 */
window.viewCart = function() {
    // 🛑 LOGIN CHECK 🛑
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