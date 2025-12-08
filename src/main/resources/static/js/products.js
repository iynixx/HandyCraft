// --- Configuration ---
const API_PRODUCTS_URL = 'http://localhost:8000/api/products';
const CART_STORAGE_KEY = 'handyCraftCart';


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    console.log("Cart logic initialized.");
});


// --- Authentication and Security ---


/**
 * Checks if the user is logged in. If not, alerts them and redirects.
 * @returns {boolean} True if login is required (and user is not logged in), false otherwise.
 */
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
    if (!isLoggedIn) {
        alert("You must be signed in to access your cart or add items. Please sign in first.");
        window.location.href = 'signin.html';
        return true;
    }
    return false;
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
                renderProducts(products);
            } else {
                document.getElementById('product-grid').innerHTML = '<p>No products found at this time.</p>';
            }
        })
        .catch(error => {
            console.error("Error loading products:", error);
            document.getElementById('product-grid').innerHTML = `<p class="error-message">Could not connect to the server. Please check the Java backend is running. ${error.message}</p>`;
        });
}


// --- Product Rendering and Event Binding ---


function renderProducts(products) {
    const gridContainer = document.getElementById('product-grid');
    gridContainer.innerHTML = '';


    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';


        // NOTE: price is added as a data attribute to be available when adding to cart
        productCard.innerHTML = `
           <img src="/${product.imageUrl || 'images/placeholder.jpg'}" alt="${product.name}" class="product-image">
           <div class="product-info">
               <h3 class="product-name">${product.name}</h3>
               <p class="product-price">RM ${product.price.toFixed(2)}</p>
               <p class="product-description">${product.description.substring(0, 60)}...</p>
               <button
                   class="button secondary add-to-cart"
                   data-product-id="${product.id}"
                   data-product-name="${product.name}"
                   data-product-price="${product.price}">
                   Add to Cart
               </button>
           </div>
       `;


        gridContainer.appendChild(productCard);
    });


    attachAddToCartListeners();
}


/**
 * Attaches click handlers to all 'Add to Cart' buttons.
 */
function attachAddToCartListeners() {
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', (event) => {
            const productId = event.target.dataset.productId;
            const productName = event.target.dataset.productName;
            const productPrice = event.target.dataset.productPrice; // Get price from dataset


            addToCart(productId, productName, productPrice);
        });
    });
}


// --- Cart Management Functions ---


/**
 * Adds a product ID to the cart stored in localStorage.
 * @param {string} productId - The ID of the product to add.
 * @param {string} productName - The name of the product.
 * @param {string} productPrice - The price of the product (as string).
 */
function addToCart(productId, productName, productPrice) {
    // 🛑 LOGIN CHECK 🛑
    if (checkLoginStatus()) {
        return;
    }


    const price = parseFloat(productPrice); // Convert price to number
    const cartString = localStorage.getItem(CART_STORAGE_KEY);
    let cart = cartString ? JSON.parse(cartString) : [];


    // Find if the item is already in the cart
    const existingItem = cart.find(item => item.id === productId);


    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id: productId, name: productName, price: price, quantity: 1 });
    }


    // Save the updated cart back to localStorage
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));


    console.log(`Added ${productName} (ID: ${productId}) to cart.`);
    showCartConfirmation(productName);
}


/**
 * Displays a simple message to confirm the item was added.
 * @param {string} productName - The name of the product.
 */
function showCartConfirmation(productName) {
    // Use an existing container or create a temporary one for the message
    let messageBox = document.getElementById('cart-message');
    if (!messageBox) {
        messageBox = document.createElement('div');
        messageBox.id = 'cart-message';
        document.body.appendChild(messageBox);
    }


    messageBox.textContent = `${productName} added to cart! (${getCartItemCount()} items total)`;
    messageBox.style.cssText = `
       position: fixed;
       top: 20px;
       right: 20px;
       background-color: #28a745; /* Green color */
       color: white;
       padding: 10px 20px;
       border-radius: 5px;
       z-index: 1000;
       opacity: 1;
       transition: opacity 0.5s;
   `;


    // Fade out and remove the message after 3 seconds
    setTimeout(() => {
        messageBox.style.opacity = '0';
        setTimeout(() => messageBox.remove(), 500);
    }, 3000);
}


/**
 * Helper function to get the total number of items (quantity) in the cart.
 */
function getCartItemCount() {
    const cartString = localStorage.getItem(CART_STORAGE_KEY);
    if (!cartString) return 0;


    const cart = JSON.parse(cartString);
    // Note: This sums up quantities, not unique item types.
    return cart.reduce((total, item) => total + item.quantity, 0);
}




/**
 * Allows the user to view their current cart contents.
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

