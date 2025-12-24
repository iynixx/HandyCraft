// --- Configuration ---
const API_BASE_URL = 'http://localhost:8000/api';
const API_ADMIN_BASE_URL = `${API_BASE_URL}/admin`;

// --- Global State ---
let adminProductsCache = [];
let adminUsersCache = [];

// --- 0. SECURITY & UI HELPERS ---
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

// --- 1. DASHBOARD OVERVIEW ---
async function fetchDashboardStats() {
    try {
        const headers = checkAdminAccessAndGetHeaders();
        const response = await fetch(`${API_ADMIN_BASE_URL}/stats`, { headers });
        const stats = await response.json();

        // FALLBACK: Since stats API might return 0, we manually fetch lists for accuracy
        let productCount = stats.totalProducts || 0;

        // Fetch users specifically to get the real count (e.g., your 11 users)
        const userRes = await fetch(`${API_ADMIN_BASE_URL}/users`, { headers });
        const users = await userRes.json();
        const userCount = users.length;

        // If products are also 0 in stats, check the products endpoint
        if (productCount === 0) {
            const prodRes = await fetch(`${API_ADMIN_BASE_URL}/products`, { headers });
            const prods = await prodRes.json();
            productCount = prods.length;
        }

        // Update UI
        if (document.getElementById('stat-products')) {
            document.getElementById('stat-products').textContent = productCount;
        }
        if (document.getElementById('stat-orders')) {
            document.getElementById('stat-orders').textContent = stats.pendingOrders || 0;
        }
        if (document.getElementById('stat-users')) {
            document.getElementById('stat-users').textContent = userCount;
        }
    } catch (e) {
        console.error("Dashboard stats error:", e);
    }
}

// --- 2. CUSTOMER MANAGEMENT ---
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
        // Track ID across different possible property names (_id is common in JSON databases)
        const userId = user.id || user._id || user.userId || 'N/A';

        // "Self" Detection: Compare ID or Username (David Lee)
        const isSelf = (userId !== 'N/A' && String(userId) === String(currentAdminId)) ||
            (user.username === currentAdminUsername);

        const displayId = (userId !== 'N/A' && userId.length > 8)
            ? `${userId.substring(0, 8)}...`
            : userId;

        let actionButton;
        if (isSelf) {
            actionButton = `<span class="self-label" style="background: #eee; padding: 6px 14px; border-radius: 20px; font-weight: bold; color: #555; font-size: 0.8rem;">YOU (Self)</span>`;
        } else if (user.role?.toLowerCase() === 'admin') {
            actionButton = `<button class="action-btn demote" onclick="handleUpdateUserRole('${userId}', 'user')">Demote to Customer</button>`;
        } else {
            actionButton = `<button class="action-btn promote" onclick="handleUpdateUserRole('${userId}', 'admin')">Promote to Admin</button>`;
        }

        html += `<tr>
            <td style="color: #888; font-family: monospace; font-size: 0.85rem;">${displayId}</td>
            <td style="font-weight: ${isSelf ? 'bold' : '500'};">
                ${user.username} ${isSelf ? '<span style="color: #D67D8C; font-size: 0.8rem; margin-left: 5px;">(You)</span>' : ''}
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
        const response = await fetch(`${API_ADMIN_BASE_URL}/role/${userId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ role: newRole })
        });
        if (response.ok) { alert("Role updated!"); listCustomersForAdmin(); }
    } catch (e) { alert("Update failed."); }
}

// --- 3. PRODUCT MANAGEMENT ---
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

// --- 4. FEEDBACK MANAGEMENT ---
async function listFeedbackForAdmin() {
    const container = document.getElementById('feedback-list-admin');
    if (!container) return;
    try {
        const headers = checkAdminAccessAndGetHeaders();
        const response = await fetch(`${API_ADMIN_BASE_URL}/feedback`, { headers });
        const feedbacks = await response.json();
        let html = `<table class="admin-data-table"><thead><tr><th>PRODUCT ID</th><th>USER</th><th>RATING</th><th>COMMENT</th></tr></thead><tbody>`;
        feedbacks.forEach(fb => {
            let ratingColor = fb.rating <= 1 ? '#d67d8c' : (fb.rating <= 3 ? '#ffc107' : '#28a745');
            html += `<tr>
                <td style="color: #666;">${fb.productId || fb.product_id || 'N/A'}</td>
                <td style="font-weight: 500;">${fb.username || 'Guest'}</td>
                <td><span style="background-color: #f0fdf4; color: ${ratingColor}; border: 1px solid ${ratingColor}44; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 0.85rem;">${fb.rating}/5</span></td>
                <td style="color: #555;">${fb.comment || fb.message || ''}</td>
            </tr>`;
        });
        container.innerHTML = html + `</tbody></table>`;
    } catch (e) { container.innerHTML = `<p style="color:red;">Failed to load feedback.</p>`; }
}

function filterFeedbackByIdOrUser() {
    const searchTerm = document.getElementById('feedback-id-user-search').value.toLowerCase();
    const rows = document.querySelectorAll('#feedback-list-admin tbody tr');

    rows.forEach(row => {
        // Cell 0 is PRODUCT ID, Cell 1 is USER (based on your listFeedbackForAdmin html string)
        const productId = row.cells[0].innerText.toLowerCase();
        const username = row.cells[1].innerText.toLowerCase();

        const matchesSearch = productId.includes(searchTerm) || username.includes(searchTerm);
        row.style.display = matchesSearch ? '' : 'none';
    });
}

// --- 5. MODAL & HELPER LOGIC ---
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
        if (response.ok) { alert("Success!"); closeProductModal(); await listProductsForAdmin(); }
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
        const res = await fetch(`${API_ADMIN_BASE_URL}/products/${id}`, { method: 'DELETE', headers: checkAdminAccessAndGetHeaders() });
        if (res.ok) await listProductsForAdmin();
    } catch (e) { alert('Delete failed'); }
}

// --- 6. NAVIGATION LOGIC ---
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
}

// --- INITIALIZATION ---
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