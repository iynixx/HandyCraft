document.addEventListener('DOMContentLoaded', () => {
    renderCart();
});

function renderCart() {
    const cartString = localStorage.getItem(CART_STORAGE_KEY);
    const cart = cartString ? JSON.parse(cartString) : [];
    const tbody = document.getElementById('cart-items-body');
    const subtotalElement = document.getElementById('cart-subtotal');
    let subtotal = 0;

    if (!cart || cart.length === 0) {
        document.getElementById('cart-content').innerHTML = `
            <div style="text-align:center; padding: 60px; background: #fff; border-radius: 15px; border: 1px dashed #ccc;">
                <p style="font-size: 1.2rem; color: #888;">Your cart is empty 🧺</p>
                <a href="products.html" class="button primary" style="display:inline-block; margin-top:20px;">Go Shopping</a>
            </div>`;
        return;
    }

    tbody.innerHTML = cart.map((item, index) => {
        const itemTotal = (item.price || 0) * (item.quantity || 0);
        subtotal += itemTotal;
        const displayName = (item.variant && item.variant !== "Default") ? `${item.name} (${item.variant})` : item.name;

        return `
            <tr>
                <td><strong>${displayName}</strong></td>
                <td>RM ${(item.price || 0).toFixed(2)}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button class="qty-btn" onclick="updateCartQty(${index}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="updateCartQty(${index}, 1)">+</button>
                    </div>
                </td>
                <td style="font-weight: bold;">RM ${itemTotal.toFixed(2)}</td>
                <td><button onclick="deleteItem(${index})" style="color:red; background:none; border:none; cursor:pointer;">Remove</button></td>
            </tr>`;
    }).join('');

    subtotalElement.textContent = `RM ${subtotal.toFixed(2)}`;
}

// Fixed Clear Cart function
window.clearCart = function() {
    if (confirm("Are you sure you want to clear your entire cart?")) {
        localStorage.removeItem(CART_STORAGE_KEY);
        renderCart();
    }
};

window.updateCartQty = function(index, delta) {
    let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    if (cart[index].quantity + delta <= 0) {
        window.deleteItem(index);
    } else {
        cart[index].quantity += delta;
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        renderCart();
    }
};

window.deleteItem = function(index) {
    let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    cart.splice(index, 1);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    renderCart();
};