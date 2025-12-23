const CART_STORAGE_KEY = 'handyCraftCart';

document.addEventListener('DOMContentLoaded', () => {
    renderOrderSummary();
    const placeOrderBtn = document.getElementById('place-order-btn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', handlePlaceOrder);
    }
});

function renderOrderSummary() {
    const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    const container = document.getElementById('checkout-summary');
    let subtotal = 0;

    // --- NEW: AUTO-CORRECT QUANTITIES ON LOAD ---
    let cartNeedsUpdate = false;
    cart.forEach(item => {
        if (item.quantity > item.remainingStock) {
            item.quantity = item.remainingStock; // Force quantity to match stock
            cartNeedsUpdate = true;
        }
    });

    if (cartNeedsUpdate) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        alert("Some items in your cart were adjusted because stock levels have changed.");
    }

    if (cart.length === 0) {
        container.innerHTML = "<p>Your cart is empty.</p>";
        setTimeout(() => { window.location.href = "products.html"; }, 2000);
        return;
    }

    container.innerHTML = cart.map((item, index) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        const displayName = (item.variant && item.variant !== "Default")
            ? `${item.name} (${item.variant})`
            : item.name;

        // --- NEW: Low Stock Badge Logic ---
        // 1. Define the stockLeft variable first
        const stockLeft = item.remainingStock || 0;
        let stockBadgeHtml = '';

        // 2. Use stockLeft to check if we should show the warning
        if (stockLeft > 0 && stockLeft <= 2) {
            stockBadgeHtml = `
            <span style="background: #FFF0F0; color: #D67D8C; font-size: 0.8rem; 
                         padding: 2px 8px; border-radius: 4px; border: 1px solid #FFCCCC; 
                         margin-top: 5px; display: inline-block; font-weight: bold;">
                ⚠️ Only ${stockLeft} left!
            </span>`;
        }

        return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
            <div style="flex: 2;">
                <span style="display: block; font-weight: 600;">${displayName}</span>
                <span style="font-size: 0.9em; color: #666;">RM ${item.price.toFixed(2)} each</span>
                ${stockBadgeHtml} 
            </div>
            
            <div style="flex: 1; display: flex; align-items: center; gap: 10px; justify-content: center;">
                <button onclick="changeQuantity(${index}, -1)" style="width: 25px; height: 25px; cursor: pointer;">-</button>
                <span style="font-weight: bold; min-width: 20px; text-align: center;">${item.quantity}</span>
                <button onclick="changeQuantity(${index}, 1)" style="width: 25px; height: 25px; cursor: pointer;">+</button>
            </div>

            <div style="flex: 1; text-align: right; font-weight: bold;">
                RM ${itemTotal.toFixed(2)}
            </div>
        </div>
    `;
    }).join('');

    document.getElementById('checkout-total').textContent = `RM ${subtotal.toFixed(2)}`;
    document.getElementById('place-order-btn').textContent = `Place Order (RM ${subtotal.toFixed(2)})`;
}

async function handlePlaceOrder() {
    const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const address = document.getElementById('cust-address').value;

    if (!name || !phone || !address) {
        alert("Please fill in all shipping details.");
        return;
    }

    const orderData = {
        // match 'userId' or 'username' from your auth.js logic
        userId: localStorage.getItem('username') || "Guest",
        customerName: name,
        phone: phone,
        address: address,
        items: cart,
        totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };

    try {
        const response = await fetch('http://localhost:8000/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (response.ok) {
            alert("Order placed successfully!");
            localStorage.removeItem(CART_STORAGE_KEY);
            window.location.href = "order-success.html";
        } else {
            alert("⚠️ Order Error: " + result.message);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        alert("Could not connect to the server. Please check if the backend is running.");
    }
}

// --- Logic to Change Quantity or Delete ---
window.changeQuantity = function(index, delta) {
    let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    let item = cart[index];

    if (item.quantity + delta <= 0) {
        if (confirm(`Do you want to remove "${item.name}" from your order?`)) {
            cart.splice(index, 1);
        }
    } else {
        // --- STRICT LIMIT: Use remainingStock saved in cart ---
        const maxAvailable = item.remainingStock || 0;

        if (delta > 0 && item.quantity + delta > maxAvailable) {
            alert(`⚠️ Sorry, you've reached the limit! Only ${maxAvailable} units are available for this item.`);
            return; // Exit without changing quantity
        }
        item.quantity += delta;
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    renderOrderSummary();
};