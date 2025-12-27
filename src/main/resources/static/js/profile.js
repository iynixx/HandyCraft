document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');

    if (!userId) {
        window.location.href = 'signin.html';
        return;
    }

    // 1. Load Personal Info
    try {
        const res = await fetch('http://localhost:8000/api/profile', {
            headers: { 'X-User-ID': userId }
        });
        const user = await res.json();
        document.getElementById('prof-username').textContent = user.username;
        document.getElementById('prof-email').textContent = user.email;
        document.getElementById('prof-role').textContent = user.role;
    } catch (e) { console.error("Error loading profile info"); }

    // 2. Load History
    try {
        const res = await fetch('http://localhost:8000/api/orders');
        const allOrders = await res.json();

        // Filter orders based on the logged-in username
        const myOrders = allOrders.filter(o => o.userId === username);
        const container = document.getElementById('order-history-list');

        // CHECK FOR EMPTY HISTORY
        if (!myOrders || myOrders.length === 0) {
            container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p style="color: #666; font-size: 1.1rem; margin-bottom: 15px;">No order yet. Start shop now!</p>
                <a href="products.html" class="button primary" style="padding: 10px 25px; text-decoration: none;">Shop Now</a>
            </div>
        `;
            return;
        }

        // IF HISTORY EXISTS, RENDER THE ORDERS
        container.innerHTML = myOrders.map(order => `
        <div style="background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color: #D67D8C;">Order ID: ${order.orderId}</strong>
                <span style="font-size: 0.8rem; padding: 3px 10px; border-radius: 15px; background: #E7DADA; font-weight: bold;">${order.status}</span>
            </div>
            <p style="font-size: 0.85rem; color: #666; margin: 5px 0;">Placed on: ${order.orderDate}</p>
            <p style="font-weight: bold; margin-top: 5px;">Total: RM ${order.totalAmount.toFixed(2)}</p>
            
            <details style="margin-top: 10px; font-size: 0.85rem; cursor: pointer;">
                <summary style="color: #D67D8C; font-weight: 600;">View Items</summary>
                <ul style="margin-top: 5px; color: #555; list-style-type: none; padding-left: 0;">
                    ${order.items.map(item => `<li>• ${item.name} (${item.quantity}x)</li>`).join('')}
                </ul>
            </details>
        </div>
    `).join('');

    } catch (e) {
        console.error("Order history load error", e);
        document.getElementById('order-history-list').innerHTML = "<p style='color: red;'>Unable to load order history. Please try again later.</p>";
    }
});