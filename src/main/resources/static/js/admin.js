//Configuration
const API_BASE_URL = 'http://localhost:8000/api';
const API_ADMIN_BASE_URL = `${API_BASE_URL}/admin`;

//arrays to store data
let adminProductsCache = [];
let adminUsersCache = [];
let adminOrdersCache = [];
let salesChartInstance = null; //track the chart
let activityLogs = [];
let logoutTimer;
let warningTimer;
let countdownInterval;

//session timeout
const SESSION_TIMEOUT = 10 * 60 * 1000; //10 Minutes
const WARNING_TIME = 10 * 1000;         //10 Seconds warning

//SECURITY & UI HELPERS
function getAuthHeaders(contentType = 'application/json') {
    const userId = localStorage.getItem('userId');
    const headers = { 'X-User-ID': userId };
    if (contentType) headers['Content-Type'] = contentType;
    return headers;
}

function checkAdminAccessAndGetHeaders(contentType = 'application/json') {
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    if (userRole !== 'admin' || !userId) throw new Error("Admin access required.");
    return getAuthHeaders(contentType);
}

function syncHeaderUsername() {
    const username = localStorage.getItem('username');
    const display = document.getElementById('admin-username');
    if (username && display) {
        display.textContent = username;
    }
}
async function logActivity(action, details) {
    const username = localStorage.getItem('username') || 'Unknown Admin';
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    const log = {
        id: Date.now(),
        username: username,
        action: action,
        details: details,
        timestamp: timestamp
    };
    try{
        const headers = checkAdminAccessAndGetHeaders();
        //send to Java backend instead of localStorage
        const response= await fetch(`${API_ADMIN_BASE_URL}/logs`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(log)
        });
        return response.ok; //return true if successful
    } catch (e) {
        console.error('Failed to sync log:', e);
        return false;
    }
}
function resetSessionTimer() {
    clearTimeout(logoutTimer);
    clearTimeout(warningTimer);
    clearInterval(countdownInterval);

    const modal = document.getElementById('session-modal');
    if (modal) modal.classList.remove('active');

    //Set timer for the 10-second warning
    warningTimer = setTimeout(showSessionWarning, SESSION_TIMEOUT - WARNING_TIME);
    //Set timer for the actual logout
    logoutTimer = setTimeout(() => window.handleLogout(), SESSION_TIMEOUT);
}

function showSessionWarning() {
    const modal = document.getElementById('session-modal');
    const countdownDisplay = document.getElementById('session-countdown');
    if (!modal) return;

    modal.classList.add('active');
    let timeLeft = 10;
    countdownDisplay.textContent = timeLeft;

    countdownInterval = setInterval(() => {
        timeLeft--;
        countdownDisplay.textContent = timeLeft;
        if (timeLeft <= 0) clearInterval(countdownInterval);
    }, 1000);
}

function extendSession() {
    resetSessionTimer();
    console.log("Session extended by admin.");
}

//Initialize session tracking on page load and user activity
document.addEventListener('DOMContentLoaded', () => {
    resetSessionTimer();
});

async function renderActivityLog() {
    const container = document.getElementById('activity-log');
    if (!container) return;
    try {
        const headers = checkAdminAccessAndGetHeaders();
        const response = await fetch(`${API_ADMIN_BASE_URL}/logs`, { headers });

        if (!response.ok) {
            console.error("Failed to fetch logs from server.");
            container.innerHTML = `<p style="color:red;">Error: Backend returned ${response.status}</p>`;
            return;
        }

        //Updates the global activityLogs variable with data from Java
        activityLogs = await response.json();
    } catch (e) {
        console.error("Activity Log Error:", e);
        container.innerHTML = `<p style="color:red; text-align:center; padding:20px;">
            Error: Could not load activity logs from the backend. 
            Please check if your Java server is running.</p>`;
        return; //Stop rendering if the fetch fails
    }
    container.innerHTML = `
        <div class="section-header">
            <h2>Activity Log</h2>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="log-search" placeholder="Search by admin name or action..." 
                       oninput="filterActivityLogs()" 
                       style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; width: 300px;">
                <button onclick="clearActivityLogs()" class="button" style="background: #dc3545; color: white;">Clear All Logs</button>
                <button onclick="exportLogsToCSV()" class="button secondary">Export CSV</button>
            </div>
        </div>
        
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
            <div style="background: #FFF5F6; padding: 20px; border-radius: 8px; border: 1px solid #FADADD; text-align: center;">
                <div style="color: #D67D8C; font-size: 0.9rem;">Total Activities</div>
                <div style="font-size: 2rem; font-weight: bold;">${activityLogs.length}</div>
            </div>
            <div style="background: #FFF5F6; padding: 20px; border-radius: 8px; border: 1px solid #FADADD; text-align: center;">
                <div style="color: #D67D8C; font-size: 0.9rem;">Today</div>
                <div style="font-size: 2rem; font-weight: bold;">${getTodayLogsCount()}</div>
            </div>
            <div style="background: #FFF5F6; padding: 20px; border-radius: 8px; border: 1px solid #FADADD; text-align: center;">
                <div style="color: #D67D8C; font-size: 0.9rem;">Active Admins</div>
                <div style="font-size: 2rem; font-weight: bold;">${getUniqueAdminCount()}</div>
            </div>
            <div style="background: #FFF5F6; padding: 20px; border-radius: 8px; border: 1px solid #FADADD; text-align: center;">
                <div style="color: #D67D8C; font-size: 0.9rem;">Last Activity</div>
                <div style="font-size: 0.85rem; font-weight: bold;">${getLastActivityTime()}</div>
            </div>
        </div>
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
            <table class="admin-data-table" id="activity-log-table">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Admin</th>
                        <th>Action</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${activityLogs.length === 0 ?
        '<tr><td colspan="4" style="text-align: center; color: #999;">No activities recorded yet</td></tr>' :
        activityLogs.map(log => `
                            <tr>
                                <td style="font-family: monospace; font-size: 0.85rem; color: #666;">${log.timestamp}</td>
                                <td style="font-weight: 600;">${log.username}</td>
                                <td><span class="action-badge ${getActionClass(log.action)}">${log.action}</span></td>
                                <td style="color: #555;">${log.details}</td>
                            </tr>
                        `).join('')
    }
                </tbody>
            </table>
        </div>
    `;
}
function getTodayLogsCount() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return activityLogs.filter(log => log.timestamp.startsWith(today)).length;
}
function getUniqueAdminCount() {
    const admins = new Set(activityLogs.map(log => log.username));
    return admins.size;
}
function getLastActivityTime() {
    if (activityLogs.length === 0) return 'N/A';
    const sortedLogs = [...activityLogs].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    const lastLog = sortedLogs[0];
    return lastLog.timestamp;
}
function getActionClass(action) {
    if (action.includes('Promoted') || action.includes('Added')) return 'action-success';
    if (action.includes('Demoted') || action.includes('Deleted')) return 'action-danger';
    if (action.includes('Updated') || action.includes('Modified')) return 'action-warning';
    return 'action-info';
}
//filter activity log
function filterActivityLogs() {
    const searchTerm = document.getElementById('log-search').value.toLowerCase();
    const rows = document.querySelectorAll('#activity-log-table tbody tr');

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}
//clear all logs
async function clearActivityLogs() {
    if (!confirm('Are you sure you want to clear all activity logs?')) return;

    try {
        const headers = checkAdminAccessAndGetHeaders();
        const response = await fetch(`${API_ADMIN_BASE_URL}/logs`, {
            method: 'DELETE',
            headers: headers
        });

        if (response.ok) {
            alert('All activity logs have been cleared.');
            await renderActivityLog(); //Re-fetch the empty list from Java
        } else {
            alert('Server failed to clear logs.');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}
function exportLogsToCSV() {
    let csv = "Timestamp,Admin,Action,Details\n";
    activityLogs.forEach(log => {
        csv += `"${log.timestamp}","${log.username}","${log.action}","${log.details}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Activity_Log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

//DASHBOARD OVERVIEW
async function fetchDashboardStats() {
    try {
        const headers = checkAdminAccessAndGetHeaders();
        const response = await fetch(`${API_ADMIN_BASE_URL}/stats`, { headers });
        const stats = await response.json();

        //Manually fetch lists for accuracy
        let productCount = stats.totalProducts || 0;

        //fetch users specifically for the real count
        const userRes = await fetch(`${API_ADMIN_BASE_URL}/users`, { headers });
        const users = await userRes.json();
        const userCount = users.length;

        //Check the products endpoint if products are 0 in stats
        if (productCount === 0) {
            const prodRes = await fetch(`${API_ADMIN_BASE_URL}/products`, { headers });
            const prods = await prodRes.json();
            productCount = prods.length;
        }

        //Update UI
        if (document.getElementById('stat-products')) {
            document.getElementById('stat-products').textContent = productCount;
        }
        if (document.getElementById('stat-orders')) {
            document.getElementById('stat-orders').textContent = stats.pendingOrders;
        }
        if (document.getElementById('stat-users')) {
            document.getElementById('stat-users').textContent = userCount;
        }
    } catch (e) {
        console.error("Dashboard stats error:", e);
    }
}

//CUSTOMER MANAGEMENT
async function listCustomersForAdmin() {
    const container = document.getElementById('customer-list-admin');
    if (!container) return;
    try {
        const headers = checkAdminAccessAndGetHeaders();
        const response = await fetch(`${API_ADMIN_BASE_URL}/users`, { method: 'GET', headers });
        const users = await response.json();
        adminUsersCache = users;
        renderCustomerTable(users);
    } catch (e) {
        container.innerHTML = `<p style="color:red;">Failed to load customers.</p>`;
    }
}

function renderCustomerTable(users) {
    const container = document.getElementById('customer-list-admin');
    const currentAdminUsername = localStorage.getItem('username'); // David Lee
    const currentAdminId = localStorage.getItem('userId');

    let html = `<table class="admin-data-table">
        <thead>
            <tr>
                <th>USER ID</th>
                <th>USERNAME</th>
                <th>EMAIL</th>
                <th>ROLE</th>
                <th>ACTIONS</th>
            </tr>
        </thead>
        <tbody>`;

    users.forEach(user => {
        //Track ID across different possible names
        const userId = user.id || user._id || user.userId || 'N/A';

        //Compare ID or Username with David Lee
        const isSelf = (userId !== 'N/A' && String(userId) === String(currentAdminId)) ||
            (user.username === currentAdminUsername);
        //Define the Super Admin (David)
        const isDavid = (user.username === 'David Lee');
        const displayId = userId;

        let actionButton;
        if (isDavid) {
            //David is always the Super Admin and cannot be demoted by anyone
            actionButton = `<span class="self-label" style="background: #D67D8C; color: white; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 0.8rem;">SUPER ADMIN</span>`;
        }
        else if (isSelf) {
            actionButton = `<span class="self-label" style="background: #eee; padding: 6px 14px; border-radius: 20px; font-weight: bold; color: #555; font-size: 0.8rem;">YOU (Self)</span>`;
        } else if (user.role?.toLowerCase() === 'admin') {
            actionButton = `<button class="action-btn demote" onclick="handleUpdateUserRole('${userId}', 'customer')">Demote to Customer</button>`;
        } else {
            actionButton = `<button class="action-btn promote" onclick="handleUpdateUserRole('${userId}', 'admin')">Promote to Admin</button>`;
        }

        html += `<tr>
            <td style="color: #888; font-family: monospace; font-size: 0.85rem;">${displayId}</td>
            <td style="font-weight: ${(isSelf || isDavid) ? 'bold' : '500'};">
                ${user.username} 
                ${isDavid ? '<span style="color: #D67D8C; font-size: 0.8rem; margin-left: 5px;">(Super)</span>' : ''}
                ${isSelf && !isDavid ? '<span style="color: #D67D8C; font-size: 0.8rem; margin-left: 5px;">(You)</span>' : ''}
            </td>
            <td>${user.email || 'N/A'}</td>
            <td style="text-transform: uppercase; font-size: 0.85rem;">${user.role}</td>
            <td>${actionButton}</td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

async function handleUpdateUserRole(userId, newRole) {
    if (!confirm(`Are you sure you want to change this user to ${newRole}?`)) return;
    try {
        const headers = checkAdminAccessAndGetHeaders('application/json');
        const user = adminUsersCache.find(u => {
            const id = u.id || u._id || u.userId;
            return String(id) === String(userId);
        });
        const targetUsername = user ? user.username : userId;
        const response = await fetch(`${API_ADMIN_BASE_URL}/role/${userId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ role: newRole })
        });
        if (response.ok)
        {
            const action = newRole === 'admin' ? 'Promoted User' : 'Demoted User';
            //wait for the activity to log
            const logged = await logActivity(action, `Changed ${targetUsername} to ${newRole}`);
            alert("Role updated!");
            await listCustomersForAdmin();

            const activeSection = document.querySelector('.dashboard-section.active');
            if (activeSection && activeSection.id === 'activity-log') {
                await renderActivityLog();
            }
        }else {
            const errorText = await response.text();
            console.error("Server response:", errorText);
            alert("Update failed: " + errorText);
        }
    } catch (e) {
        console.error("Error:", e);
        alert("Update failed: " + e.message);
    }
}

//PRODUCT MANAGEMENT
async function listProductsForAdmin() {
    try {
        const headers = checkAdminAccessAndGetHeaders();
        const response = await fetch(`${API_ADMIN_BASE_URL}/products`, { headers });
        const products = await response.json();
        adminProductsCache = products;
        renderProductTable(products);
        populateCategoryFilter(products);
    } catch (e) { console.error("Error loading products:", e); }
}

function renderProductTable(products) {
    const container = document.getElementById('product-list-admin');
    if (!container) return;

    let html = `
        <div class="table-controls">
            <input type="text" id="product-search" placeholder="Search products..." oninput="filterProducts()">
            <select id="category-filter" onchange="filterProducts()"><option value="">All Categories</option></select>
            <button onclick="exportProductsToCSV()" class="button secondary">Export CSV</button>
            <span id="product-count-display">Showing ${products.length} products</span>
        </div>
        <table class="admin-data-table">
            <thead>
                <tr>
                    <th>IMAGE</th>
                    <th>ID</th>
                    <th>NAME</th>
                    <th>CATEGORY</th>
                    <th>PRICE (RM)</th>
                    <th>INVENTORY</th>
                    <th>ACTIONS</th>
                </tr>
            </thead>
            <tbody>`;

    products.forEach(p => {
        const productId = p['Product ID'] || p.id || 'N/A';
        const currentFileName = p['File Name'] || p.imageUrl || 'placeholder.jpg';
        const totalInventory = p.Inventory ? (typeof p.Inventory === 'object' ? Object.values(p.Inventory)[0] : p.Inventory) : 0;
        const displayId = (typeof productId === 'string' && productId.length > 8) ? `${productId.substring(0, 8)}...` : productId;

        html += `<tr>
            <td><img src="http://localhost:8000/images/products/${currentFileName}" alt="${p['Product Name'] || p.name || 'Product Image'}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px;"></td>
            <td style="color: #666; font-size: 0.85rem; font-family: monospace;">${displayId}</td>
            <td style="font-weight: 600;">${p['Product Name'] || p.name}</td>
            <td>${p.Category || p.category || 'N/A'}</td>
            <td>${parseFloat(p['Price (RM)'] || p.price || 0).toFixed(2)}</td>
            <td class="${totalInventory < 5 ? 'low-stock' : ''}">${totalInventory}</td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="button small secondary" onclick="showProductModal('${productId}')">Edit</button>
                    <button class="button small danger" onclick="confirmDelete('${productId}')">Delete</button>
                </div>
            </td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

//FEEDBACK MANAGEMENT
async function listFeedbackForAdmin() {
    const container = document.getElementById('feedback-list-admin');
    if (!container) return;
    try {
        const headers = checkAdminAccessAndGetHeaders();
        const response = await fetch(`${API_ADMIN_BASE_URL}/feedback`, { headers });
        const feedbacks = await response.json();
        //update section title with count
        const titleElement = document.querySelector('#feedback .section-title');
        if (titleElement) {
            titleElement.innerText = `Feedback Management (${feedbacks.length} Reviews)`;
        }

        let html = `<table class="admin-data-table"><thead><tr><th>PRODUCT ID</th><th>USER</th><th>RATING</th><th>COMMENT</th><th>DATE</th><th style="text-align: center;">ACTIONS</th></tr></thead><tbody>`;
        feedbacks.forEach(fb => {
            let ratingColor = fb.rating <= 1 ? '#d67d8c' : (fb.rating <= 3 ? '#ffc107' : '#28a745');
            //ensure have a valid ID for deletion
            const feedbackId = fb.id || fb._id;
            //format timestamp
            const displayDate = fb.timestamp ? formatAdminDate(fb.timestamp) : 'N/A';
            html += `<tr>
                <td style="color: #666;">${fb.productId || fb.product_id || 'N/A'}</td>
                <td style="font-weight: 500;">${fb.username || 'Guest'}</td>
                <td><span style="background-color: #f0fdf4; color: ${ratingColor}; border: 1px solid ${ratingColor}44; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 0.85rem;">${fb.rating}/5</span></td>
                <td style="color: #555;">${fb.comment || fb.message || ''}</td>
                <td style="color: #888; font-size: 0.85rem;">${displayDate}</td>
                <td style="text-align: center;">
                    <button class="action-btn demote" onclick="handleDeleteFeedback('${feedbackId}')" 
                    style="background: #D67D8C; color: white; border: none; padding: 6px 12px;">
                Delete
            </button>
        </td>
            </tr>`;
        });
        container.innerHTML = html + `</tbody></table>`;
    } catch (e) { container.innerHTML = `<p style="color:red;">Failed to load feedback.</p>`; }
}

function filterFeedbackByIdOrUser() {
    const searchTerm = document.getElementById('feedback-id-user-search').value.toLowerCase();
    const rows = document.querySelectorAll('#feedback-list-admin tbody tr');

    rows.forEach(row => {
        const productId = row.cells[0].innerText.toLowerCase();
        const username = row.cells[1].innerText.toLowerCase();

        const matchesSearch = productId.includes(searchTerm) || username.includes(searchTerm);
        row.style.display = matchesSearch ? '' : 'none';
    });
}

async function handleDeleteFeedback(feedbackId) {
    if (!confirm("Are you sure you want to delete this inappropriate comment?")) return;

    try {
        const headers = checkAdminAccessAndGetHeaders();
        const response = await fetch(`${API_ADMIN_BASE_URL}/feedback/${feedbackId}`, {
            method: 'DELETE',
            headers: headers
        });

        if (response.ok) {
            //record activity
            await logActivity('Deleted Feedback', `Removed feedback ID: ${feedbackId}`);
            alert("Comment removed successfully.");
            await listFeedbackForAdmin(); //Refresh the table
        } else {
            alert("Failed to delete feedback. It may have already been removed.");
        }
    } catch (e) {
        console.error("Delete Error:", e);
        alert("Network error. Please check your server.");
    }
}

async function listOrdersForAdmin() {
    const container = document.getElementById('order-list-admin');
    if (!container) return;
    try {
        //Point to the Java API
        const headers = checkAdminAccessAndGetHeaders();
        const response = await fetch(`${API_ADMIN_BASE_URL}/orders`, { headers });

        if (!response.ok)
        {
            console.error("Server returned an error status:", response.status);
            container.innerHTML = `<p style="color:red;">Failed to load orders from Java Server.</p>`;
            return;
        }

        const orders = await response.json();
        adminOrdersCache = orders;
        renderOrderStats(orders);
        renderOrderTable(orders);
    } catch (e) {
        console.error("Error loading orders:", e);
        container.innerHTML = `<p style="color:red;">Failed to load orders from Java Server.</p>`;
    }
}

function formatAdminDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) return dateString; // Fallback if date is invalid

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function renderOrderStats(orders) {
    const statsContainer = document.getElementById('order-stats');
    if (!statsContainer) return;

    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'Pending').length,
        processing: orders.filter(o => o.status === 'Processing').length,
        shipped: orders.filter(o => o.status === 'Shipped').length,
        completed: orders.filter(o => o.status === 'Completed').length
    };

    statsContainer.innerHTML = `
        <div class="order-stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Orders</div>
                <div class="stat-value">${stats.total}</div>
            </div>
            <div class="stat-card pending">
                <div class="stat-label">Pending</div>
                <div class="stat-value">${stats.pending}</div>
            </div>
            <div class="stat-card processing">
                <div class="stat-label">Processing</div>
                <div class="stat-value">${stats.processing}</div>
            </div>
            <div class="stat-card shipped">
                <div class="stat-label">Shipped</div>
                <div class="stat-value">${stats.shipped}</div>
            </div>
            <div class="stat-card completed">
                <div class="stat-label">Completed</div>
                <div class="stat-value">${stats.completed}</div>
            </div>
        </div>
    `;
}

function renderOrderTable(orders) {
    const container = document.getElementById('order-list-admin');
    if (!container) return;

    let html = `
        <div class="table-controls">
            <input type="text" id="order-search" placeholder="Search by Order ID, Customer Name, or Phone..." oninput="filterOrders()">
            <select id="order-status-filter" onchange="filterOrders()">
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Completed">Completed</option>
            </select>
            <button onclick="exportOrdersToCSV()" class="button secondary">Export CSV</button>
            <span id="order-count-display">Showing ${orders.length} orders</span>
        </div>
        <table class="admin-data-table">
            <thead>
                <tr>
                    <th>ORDER ID</th>
                    <th>CUSTOMER</th>
                    <th>PHONE</th>
                    <th>DATE</th>
                    <th>ITEMS</th>
                    <th>TOTAL (RM)</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                </tr>
            </thead>
            <tbody>`;

    orders.forEach(order => {
        const statusClass = order.status.toLowerCase();

        html += `<tr>
            <td style="font-family: monospace; color: #666; font-size: 0.85rem;">${order.orderId}</td>
            <td style="font-weight: 600;">${order.customerName}</td>
            <td>${order.phone}</td>
            <td style="font-size: 0.9rem;">${formatAdminDate(order.orderDate)}</td>
            <td style="text-align: center;">${order.items.length}</td>
            <td style="font-weight: 600;">RM ${order.totalAmount.toFixed(2)}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${order.status}
                </span>
            </td>
            <td>
                <button class="button small secondary" onclick="showOrderModal('${order.orderId}')">View Details</button>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function filterOrders() {
    const searchTerm = document.getElementById('order-search').value.toLowerCase();
    const statusFilter = document.getElementById('order-status-filter').value;
    const rows = document.querySelectorAll('#order-list-admin tbody tr');

    let visibleCount = 0;
    rows.forEach(row => {
        const orderId = row.cells[0].innerText.toLowerCase();
        const customerName = row.cells[1].innerText.toLowerCase();
        const phone = row.cells[2].innerText.toLowerCase();
        const statusCell = row.cells[6].innerText.trim();

        const matchesSearch = orderId.includes(searchTerm) ||
            customerName.includes(searchTerm) ||
            phone.includes(searchTerm);
        const matchesStatus = !statusFilter || statusCell.includes(statusFilter);

        if (matchesSearch && matchesStatus) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    document.getElementById('order-count-display').textContent = `Showing ${visibleCount} orders`;
}

function showOrderModal(orderId) {
    const order = adminOrdersCache.find(o => o.orderId === orderId);
    if (!order) return;

    const modal = document.getElementById('order-modal');
    if (!modal) return;

    document.getElementById('order-modal-id').textContent = order.orderId;
    document.getElementById('order-modal-customer').textContent = order.customerName;
    document.getElementById('order-modal-phone').textContent = order.phone;
    document.getElementById('order-modal-address').textContent = order.address;
    document.getElementById('order-modal-date').textContent = order.orderDate;

    //render items
    let itemsHtml = '';
    order.items.forEach(item => {
        itemsHtml += `
            <div class="order-item">
                <div class="order-item-info">
                    <div class="order-item-name">${item.name}</div>
                    <div class="order-item-variant">Variant: ${item.variant}</div>
                    <div class="order-item-quantity">Quantity: ${item.quantity}</div>
                </div>
                <div class="order-item-price">
                    <div style="font-weight: 600;">RM ${(item.price * item.quantity).toFixed(2)}</div>
                    <div style="font-size: 0.85rem; color: #666;">RM ${item.price.toFixed(2)} each</div>
                </div>
            </div>
        `;
    });
    document.getElementById('order-modal-items').innerHTML = itemsHtml;
    document.getElementById('order-modal-total').textContent = `RM ${order.totalAmount.toFixed(2)}`;

    //status buttons
    document.getElementById('order-status-buttons').innerHTML = `
        <button class="status-btn ${order.status === 'Pending' ? 'active' : ''}" 
                onclick="updateOrderStatus('${orderId}', 'Pending')">Pending</button>
        <button class="status-btn ${order.status === 'Processing' ? 'active' : ''}" 
                onclick="updateOrderStatus('${orderId}', 'Processing')">Processing</button>
        <button class="status-btn ${order.status === 'Shipped' ? 'active' : ''}" 
                onclick="updateOrderStatus('${orderId}', 'Shipped')">Shipped</button>
        <button class="status-btn ${order.status === 'Completed' ? 'active' : ''}" 
                onclick="updateOrderStatus('${orderId}', 'Completed')">Completed</button>
    `;

    modal.classList.add('active');
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        //Get headers
        const headers = checkAdminAccessAndGetHeaders('application/json');
        const buttons = document.querySelectorAll('.status-btn');
        buttons.forEach(btn => btn.disabled = true);
        //Send the PUT request to the Java backend
        const response = await fetch(`${API_ADMIN_BASE_URL}/orders/status`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({
                orderId: orderId, //must match body.get("orderId") in Java
                status: newStatus  //must match body.get("status") in Java
            })
        });

        if (response.ok) {
            await logActivity('Updated Order Status', `Changed order ${orderId} to ${newStatus}`);
            //refresh the background table
            await listOrdersForAdmin();

            //close modal and notify user
            closeOrderModal();
            alert(`Order status updated to ${newStatus}`);
        } else {
            const errorData = await response.json();
            alert("Server Error: " + (errorData.message || "Could not update status."));
        }
    } catch (e) {
        console.error("Update error:", e);
        alert("Network error. Please check if your Java server is running.");
    } finally {
        //re-enable buttons
        const buttons = document.querySelectorAll('.status-btn');
        buttons.forEach(btn => btn.disabled = false);
    }
}

function exportOrdersToCSV() {
    let csv = "Order ID,Customer,Phone,Date,Items,Total,Status\n";
    adminOrdersCache.forEach(order => {
        const itemsList = order.items.map(i => `${i.name} (${i.quantity})`).join('; ');
        csv += `"${order.orderId}","${order.customerName}","${order.phone}","${order.orderDate}","${itemsList}",${order.totalAmount},"${order.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
}

function closeOrderModal() {
    const modal = document.getElementById('order-modal');
    if (modal) modal.classList.remove('active');
}

async function renderSalesReport() {
    const container = document.getElementById('sales-reports');
    if (!container) return;

    if (adminOrdersCache.length === 0) {
        await listOrdersForAdmin();
    }

    //Filter for Sold (Shipped + Completed) and specifically Completed for the list
    const soldOrders = adminOrdersCache.filter(o =>
        o.status === 'Shipped' || o.status === 'Completed'
    );

    //calculate Summary Metrics using the new soldOrders
    const totalRevenue = soldOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = soldOrders.length;

    //calculate Top Selling Products
    const productStats = {};
    soldOrders.forEach(order => {
        order.items.forEach(item => {
            if (!productStats[item.name]) {
                productStats[item.name] = { count: 0, revenue: 0 };
            }
            productStats[item.name].count += item.quantity;
            productStats[item.name].revenue += (item.price * item.quantity);
        });
    });

    const topProducts = Object.entries(productStats)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    //build the UI
    container.innerHTML = `
        <div class="section-header">
            <h2>Sales Report</h2>
            <div style="display: flex; gap: 10px;">
                <select id="time-period" onchange="changePeriod()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                    <option value="daily">Daily View</option>
                    <option value="weekly">Weekly View</option>
                    <option value="monthly">Monthly View</option>
                </select>
                <button onclick="exportSalesReportToCSV()" class="button secondary">Export CSV</button>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
            <div class="report-card">
                <div class="report-label">Total Revenue</div>
                <div class="report-value" style="color: #D67D8C;">RM ${totalRevenue.toFixed(2)}</div>
            </div>
            <div class="report-card">
                <div class="report-label">Total Orders</div>
                <div class="report-value">${totalOrders}</div>
            </div>
            <div class="report-card">
                <div class="report-label">Average Order</div>
                <div class="report-value">RM ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}</div>
            </div>
        </div>

        <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #FADADD; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 id="chart-title" style="margin-bottom: 15px; font-weight: 700;">Daily Sales Trend</h3>
            <canvas id="salesChart" style="max-height: 300px;"></canvas>
        </div>
        
        <div style="background: white; padding: 25px; border-radius: 12px; border: 1px solid #FADADD; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 20px; color: #333; font-weight: 700;">Top 5 Best Selling Products</h3>
            <table class="admin-data-table centered-table">
                <thead>
                    <tr>
                        <th>RANK</th>
                        <th>PRODUCT NAME</th>
                        <th>UNITS SOLD</th>
                    </tr>
                </thead>
                <tbody>
                    ${topProducts.map((p, index) => `
                        <tr>
                            <td style="font-weight: bold; color: #D67D8C;">#${index + 1}</td>
                            <td>${p.name}</td>
                            <td>${p.count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #FADADD; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 20px; color: #333; font-weight: 700;">Shipped & Completed Orders List</h3>
            <table class="admin-data-table">
                <thead>
                    <tr>
                        <th>DATE</th>
                        <th>ORDER ID</th>
                        <th>CUSTOMER NAME</th>
                        <th>TOTAL (RM)</th>
                    </tr>
                </thead>
                <tbody>
                    ${soldOrders.map(o => `
                        <tr>
                            <td style="color: #666;">${formatAdminDate(o.orderDate)}</td>
                            <td style="font-family: monospace; font-weight: bold;">${o.orderId}</td>
                            <td style="font-weight: 600; color: #131313;">${o.customerName}</td>
                            <td style="font-weight: 800;">RM ${o.totalAmount.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div id="sales-detail-table" style="margin-top: 30px;"></div>
    `;
    //initialize the chart with soldOrders to track units sold
    changePeriod();
}
//daily
function groupByDay(orders) {
    const grouped = {};
    orders.forEach(order => {
        const date = order.orderDate.split(' ')[0];
        if (!grouped[date]) {
            grouped[date] = { orders: 0, revenue: 0, products: {} };
        }
        grouped[date].orders += 1;
        grouped[date].revenue += order.totalAmount;

        order.items.forEach(item => {
            if (!grouped[date].products[item.name]) {
                grouped[date].products[item.name] = 0;
            }
            grouped[date].products[item.name] += item.quantity;
        });
    });
    return grouped;
}
//weekly
function groupByWeek(orders) {
    const grouped = {};
    orders.forEach(order => {
        const date = new Date(order.orderDate);
        const year = date.getFullYear();
        const weekNum = getWeekNumber(date);
        const weekLabel = `${year}-W${weekNum}`;

        if (!grouped[weekLabel]) {
            grouped[weekLabel] = { orders: 0, revenue: 0, products: {} };
        }
        grouped[weekLabel].orders += 1;
        grouped[weekLabel].revenue += order.totalAmount;

        order.items.forEach(item => {
            if (!grouped[weekLabel].products[item.name]) {
                grouped[weekLabel].products[item.name] = 0;
            }
            grouped[weekLabel].products[item.name] += item.quantity;
        });
    });
    return grouped;
}
//monthly
function groupByMonth(orders) {
    const grouped = {};
    orders.forEach(order => {
        const month = order.orderDate.substring(0, 7); // "2025-12"
        if (!grouped[month]) {
            grouped[month] = { orders: 0, revenue: 0, products: {} };
        }
        grouped[month].orders += 1;
        grouped[month].revenue += order.totalAmount;

        order.items.forEach(item => {
            if (!grouped[month].products[item.name]) {
                grouped[month].products[item.name] = 0;
            }
            grouped[month].products[item.name] += item.quantity;
        });
    });
    return grouped;
}
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function changePeriod() {
    const period = document.getElementById('time-period').value;
    const soldOrders = adminOrdersCache.filter(o =>
        o.status === 'Shipped' || o.status === 'Completed'
    );

    let salesData;
    let chartTitle;
    let tableTitle;

    if (period === 'daily') {
        salesData = groupByDay(soldOrders);
        chartTitle = 'Daily Sales Trend';
        tableTitle = 'Sales by Day';
    } else if (period === 'weekly') {
        salesData = groupByWeek(soldOrders);
        chartTitle = 'Weekly Sales Trend';
        tableTitle = 'Sales by Week';
    } else if (period === 'monthly') {
        salesData = groupByMonth(soldOrders);
        chartTitle = 'Monthly Sales Trend';
        tableTitle = 'Sales by Month';
    }

    document.getElementById('chart-title').textContent = chartTitle;
    updateSalesChart(salesData);
    updateSalesTable(salesData, tableTitle);
}

function updateSalesChart(salesData) {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    //remove old
    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    const labels = Object.keys(salesData).sort();
    const revenues = labels.map(label => salesData[label].revenue);

    salesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue (RM)',
                data: revenues,
                backgroundColor: '#D67D8C',
                borderColor: '#D67D8C',
                borderWidth: 1,
                barThickness: 40,
                maxBarThickness: 50
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        padding: 20, //adds space between the chart and the legend
                        boxWidth: 40,
                        usePointStyle: false
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            return 'Revenue: RM ' + context.parsed.y.toFixed(2);
                        },
                        afterLabel: function(context) {
                            const index = context.dataIndex;
                            const period = labels[index];
                            const data = salesData[period];
                            return 'Orders: ' + data.orders;
                        },
                        afterBody: function(context) {
                            const index = context[0].dataIndex;
                            const period = labels[index];
                            const products = salesData[period].products;

                            let productList = ['\nProducts Sold:'];
                            for (let productName in products) {
                                productList.push(`- ${productName}: ${products[productName]} units`);
                            }
                            return productList.join('\n');
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'RM ' + value;
                        }
                    }
                }
            }
        }
    });
}

//update table
function updateSalesTable(salesData, title) {
    const container = document.getElementById('sales-detail-table');
    if (!container) return;

    const sortedData = Object.entries(salesData).sort((a, b) => b[0].localeCompare(a[0]));

    container.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; border: 1px solid #FADADD; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 20px; color: #333; font-weight: 700;">${title}</h3>
            <table class="admin-data-table centered-table">
                <thead>
                    <tr>
                        <th>PERIOD</th>
                        <th>ORDERS</th>
                        <th>REVENUE (RM)</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedData.map(([period, data]) => `
                        <tr>
                            <td style="font-weight: 600; color: #666;">${period}</td>
                            <td>${data.orders}</td>
                            <td style="font-weight: 800; color: #333;">RM ${data.revenue.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

//export only the successful sales data
function exportSalesReportToCSV() {
    const soldOrders = adminOrdersCache.filter(o =>
        o.status === 'Shipped' || o.status === 'Completed'
    );

    let csv = "Date,Order ID,Customer,Items,Total (RM),Status\n";

    soldOrders.forEach(order => {
        const itemCount = order.items.length;
        csv += `"${order.orderDate}","${order.orderId}","${order.customerName}",${itemCount},${order.totalAmount},"${order.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sales_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

//MODAL & HELPER LOGIC
async function showProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    if(!modal || !form) return;
    form.reset();
    document.getElementById('image-preview').innerHTML = '';
    if (productId) {
        document.getElementById('product-modal-title').textContent = 'Edit Product';
        document.getElementById('product-id-hidden').value = productId;
        const p = adminProductsCache.find(item => String(item['Product ID'] || item.id) === String(productId));
        if (p) {
            form.elements['product-name'].value = p['Product Name'] || p.name || '';
            form.elements['product-category'].value = p.Category || p.category || '';
            form.elements['product-price'].value = p['Price (RM)'] || p.price || '';
            form.elements['product-description'].value = p.Description || p.description || '';
            form.elements['product-inventory'].value = p.Inventory ? (typeof p.Inventory === 'object' ? Object.values(p.Inventory)[0] : p.Inventory) : 0;
            const fileName = p['File Name'] || p.imageUrl || 'placeholder.jpg';
            document.getElementById('product-image-hidden').value = fileName;
            document.getElementById('image-preview').innerHTML = `<img src="http://localhost:8000/images/products/${fileName}" alt="${p['Product Name'] || p.name || 'Product Image'}" style="max-width: 100px; border-radius: 8px;">`;
        }
    } else {
        document.getElementById('product-modal-title').textContent = 'Add New Product';
        document.getElementById('product-id-hidden').value = '';
        document.getElementById('product-image-hidden').value = 'placeholder.jpg';
    }
    modal.classList.add('active');
}

async function handleProductSubmit(event) {
    event.preventDefault();
    const productId = document.getElementById('product-id-hidden').value;
    const productName = document.getElementById('product-name').value.trim();
    const newData = {
        "Product Name": document.getElementById('product-name').value.trim(),
        "Category": document.getElementById('product-category').value.trim(),
        "Price (RM)": parseFloat(document.getElementById('product-price').value),
        "Description": document.getElementById('product-description').value.trim(),
        "File Name": document.getElementById('product-image-hidden').value,
        "Inventory": { "Default": parseInt(document.getElementById('product-inventory').value) || 0 }
    };
    try {
        const method = productId ? 'PUT' : 'POST';
        const response = await fetch(productId ? `${API_ADMIN_BASE_URL}/products/${productId}` : `${API_ADMIN_BASE_URL}/products`, {
            method,
            headers: checkAdminAccessAndGetHeaders('application/json'),
            body: JSON.stringify(newData)
        });
        if (response.ok)
        {
            const action = productId ? 'Modified Product' : 'Added Product';
            await logActivity(action, `${action}: ${productName}`);
            alert("Success!");
            closeProductModal();
            await listProductsForAdmin();
        }
    } catch (e) { alert("Save failed."); }
}

function filterCustomers() {
    const term = document.getElementById('customer-search').value.toLowerCase();
    const rows = document.querySelectorAll('#customer-list-admin tbody tr');
    rows.forEach(row => row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none');
}

function filterProducts() {
    const term = document.getElementById('product-search').value.toLowerCase();
    const cat = document.getElementById('category-filter').value;
    const rows = document.querySelectorAll('.admin-data-table tbody tr');
    rows.forEach(row => {
        const matchesTerm = row.innerText.toLowerCase().includes(term);
        const matchesCat = !cat || row.cells[3].innerText === cat;
        row.style.display = matchesTerm && matchesCat ? '' : 'none';
    });
}

function populateCategoryFilter(products) {
    const filter = document.getElementById('category-filter');
    if (!filter) return;
    const cats = [...new Set(products.map(p => p.Category || p.category))].filter(Boolean);
    filter.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function exportProductsToCSV() {
    let csv = "ID,Name,Category,Price,Stock\n";
    adminProductsCache.forEach(p => {
        const stock = p.Inventory ? (typeof p.Inventory === 'object' ? Object.values(p.Inventory)[0] : p.Inventory) : 0;
        csv += `"${p.id || p['Product ID']}","${p.name || p['Product Name']}","${p.category || p.Category}",${p.price || p['Price (RM)']},${stock}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'products.csv'; a.click();
}

async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    try {
        const product = adminProductsCache.find(p => (p['Product ID'] || p.id) === id);
        const productName = product ? (product['Product Name'] || product.name) : id;
        const res = await fetch(`${API_ADMIN_BASE_URL}/products/${id}`,
            { method: 'DELETE',
                headers: checkAdminAccessAndGetHeaders()
            });
        if (res.ok)
        {
            //record the activity
            await logActivity('Deleted Product', `Removed product: ${productName}`);
            await listProductsForAdmin();
        }
    } catch (e) { alert('Delete failed'); }
}

//NAVIGATION
async function showSection(targetId) {
    const sections = document.querySelectorAll('.dashboard-section');
    const navLinks = document.querySelectorAll('.admin-nav a');
    sections.forEach(s => s.classList.remove('active'));
    navLinks.forEach(l => l.classList.remove('active-nav'));
    const targetSection = document.getElementById(targetId);
    if (targetSection) targetSection.classList.add('active');
    const activeLink = document.querySelector(`.admin-nav a[href="#${targetId}"]`);
    if (activeLink) activeLink.classList.add('active-nav');

    if (targetId === 'products') await listProductsForAdmin();
    else if (targetId === 'customers') await listCustomersForAdmin();
    else if (targetId === 'dashboard') await fetchDashboardStats();
    else if (targetId === 'feedback') await listFeedbackForAdmin();
    else if (targetId === 'orders') await listOrdersForAdmin();
    else if (targetId === 'sales-reports') await renderSalesReport();
    else if (targetId === 'activity-log') await renderActivityLog();
}

//INITIALIZATION
window.listCustomersForAdmin = listCustomersForAdmin;
window.listProductsForAdmin = listProductsForAdmin;
window.listFeedbackForAdmin = listFeedbackForAdmin;
window.fetchDashboardStats = fetchDashboardStats;
window.showProductModal = showProductModal;
window.handleUpdateUserRole = handleUpdateUserRole;
window.filterCustomers = filterCustomers;
window.filterProducts = filterProducts;
window.filterFeedbackByIdOrUser = filterFeedbackByIdOrUser;
window.exportProductsToCSV = exportProductsToCSV;
window.confirmDelete = deleteProduct;
window.closeProductModal = () => document.getElementById('product-modal').classList.remove('active');
window.listOrdersForAdmin = listOrdersForAdmin;
window.filterOrders = filterOrders;
window.showOrderModal = showOrderModal;
window.updateOrderStatus = updateOrderStatus;
window.exportOrdersToCSV = exportOrdersToCSV;
window.closeOrderModal = closeOrderModal;
window.handleDeleteFeedback = handleDeleteFeedback;
window.renderSalesReport = renderSalesReport;
window.exportSalesReportToCSV = exportSalesReportToCSV;
window.renderActivityLog = renderActivityLog;
window.filterActivityLogs = filterActivityLogs;
window.clearActivityLogs = clearActivityLogs;
window.exportLogsToCSV = exportLogsToCSV;
window.logActivity = logActivity;

document.addEventListener('DOMContentLoaded', async () => {
    syncHeaderUsername();
    const form = document.getElementById('product-form');
    if (form) form.addEventListener('submit', handleProductSubmit);
    const navLinks = document.querySelectorAll('.admin-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const id = link.getAttribute('href').substring(1);
            window.location.hash = id;
            showSection(id);
        });
    });
    const initialId = window.location.hash.substring(1) || 'dashboard';
    await showSection(initialId);
});