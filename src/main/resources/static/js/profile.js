/**
 * profile.js
 * Handles user profile data and order history fetching.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // --- HEADER SYNC ---
    // Calls the shared function from auth.js to render the Profile Icon and Separator
    if (typeof updateAuthHeader === 'function') {
        updateAuthHeader();
    }

    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    const userEmail = localStorage.getItem('userEmail');

    // Security Redirect: If no email is found, the user isn't logged in
    if (!userEmail) {
        window.location.href = 'signin.html';
        return;
    }

    /**
     * Original Date Formatter
     * Converts ISO strings to YYYY-MM-DD HH:mm format
     */
    function formatProfileDate(dateString) {
        const date = new Date(dateString);
        if (isNaN(date)) return dateString; // Fallback if date is invalid

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    // --- 1. LOAD PERSONAL INFO ---
    try {
        const res = await fetch('http://localhost:8000/api/profile', {
            headers: { 'X-User-ID': userId }
        });

        if (res.ok) {
            const user = await res.json();
            document.getElementById('prof-username').textContent = user.username;
            document.getElementById('prof-email').textContent = user.email;
            document.getElementById('prof-role').textContent = user.role;
        }
    } catch (e) {
        console.error("Error loading profile info:", e);
    }

    // --- 2. LOAD ORDER HISTORY ---
    try {
        const res = await fetch(
            `http://localhost:8000/api/orders?userId=${encodeURIComponent(userEmail)}`
        );

        if (!res.ok) throw new Error("Orders fetch failed");

        const myOrders = await res.json();
        const container = document.getElementById('order-history-list');

        // CASE: EMPTY HISTORY
        if (!myOrders || myOrders.length === 0) {
            container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p style="color: #666; font-size: 1.1rem; margin-bottom: 15px;">
                    No order yet. Start shop now!
                </p>
                <a href="products.html" class="button primary"
                   style="padding: 10px 25px; text-decoration: none;">
                    Shop Now
                </a>
            </div>
        `;
            return;
        }

        // CASE: RENDER HISTORY
        // Maintains original inline styling and "View Items" details logic
        container.innerHTML = myOrders.map(order => `
        <div style="background: #fff; border: 1px solid #eee; border-radius: 10px;
                    padding: 15px; margin-bottom: 15px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.02);">

            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color: #D67D8C;">
                    Order ID: ${order.orderId}
                </strong>
                <span class="status-badge ${order.status.toLowerCase()}">
                    ${order.status}
                </span>
            </div>

            <p style="font-size: 0.85rem; color: #666; margin: 5px 0;">
                Placed on: ${formatProfileDate(order.orderDate) || 'N/A'}
            </p>

            <p style="font-weight: bold; margin-top: 5px;">
                Total: RM ${order.totalAmount.toFixed(2)}
            </p>

            <details style="margin-top: 10px; font-size: 0.85rem;">
                <summary style="color: #D67D8C; font-weight: 600; cursor: pointer;">
                    View Items
                </summary>
                <ul style="margin-top: 5px; color: #555; list-style-type: none; padding-left: 0;">
                    ${order.items.map(item =>
            `<li>
                            • ${item.name}
                            ${item.variant && item.variant !== "Default" ? ` (${item.variant})` : ""}
                            (${item.quantity}x)
                        </li>`).join('')}
                    </ul>
            </details>
        </div>
    `).join('');

    } catch (e) {
        console.error("Order history load error:", e);
        document.getElementById('order-history-list').innerHTML =
            "<p style='color: red;'>Unable to load order history. Please try again later.</p>";
    }
});