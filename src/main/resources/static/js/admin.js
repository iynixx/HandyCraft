// --- Configuration ---
const API_BASE_URL = 'http://localhost:8000/api';
const API_ADMIN_BASE_URL = `${API_BASE_URL}/admin`;
//const API_PRODUCTS_URL = `${API_BASE_URL}/products`;

// --- FEATURE 1: Simple Product Search ---
function setupProductSearch() {
    const searchInput = document.getElementById('product-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
        const searchValue = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#product-list-admin tbody tr');

        rows.forEach(row => {
            const productName = row.cells[2].textContent.toLowerCase();
            const category = row.cells[3].textContent.toLowerCase();

            if (productName.includes(searchValue) || category.includes(searchValue)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// --- FEATURE 2: Category Filter Dropdown ---
function setupCategoryFilter() {
    const filterSelect = document.getElementById('category-filter');
    if (!filterSelect) return;

    filterSelect.addEventListener('change', function(e) {
        const selectedCategory = e.target.value;
        const rows = document.querySelectorAll('#product-list-admin tbody tr');

        rows.forEach(row => {
            const category = row.cells[3].textContent;

            if (selectedCategory === '' || category === selectedCategory) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

function populateCategoryFilter() {
    const filterSelect = document.getElementById('category-filter');
    if (!filterSelect) return;

    const rows = document.querySelectorAll('#product-list-admin tbody tr');
    const categories = new Set();

    rows.forEach(row => {
        const category = row.cells[3].textContent;
        if (category !== 'N/A') {
            categories.add(category);
        }
    });
    filterSelect.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filterSelect.appendChild(option);
    });
}

// --- FEATURE 3: Low Stock Warning ---
function addLowStockWarnings() {
    const rows = document.querySelectorAll('#product-list-admin tbody tr');

    rows.forEach(row => {
        const inventoryCell = row.cells[5];
        const inventory = parseInt(inventoryCell.textContent);

        if (inventory < 10) {
            inventoryCell.style.color = 'red';
            inventoryCell.style.fontWeight = 'bold';
        } else if (inventory < 30) {
            inventoryCell.style.color = 'orange';
        }
    });
}

// --- FEATURE 4: Confirmation Dialog ---
function confirmDelete(productId) {
    const confirmed = confirm(
        `Delete Product?\n\n` +
        `Product ID: ${productId}\n` +
        `This action cannot be undone.\n\n` +
        `Click OK to confirm deletion.`
    );

    if (confirmed) {
        deleteProduct(productId);
    }
}

// --- FEATURE 5: Messages ---
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `admin-message ${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// --- FEATURE 6: Sorting ---
function makeSortable() {
    const headers = document.querySelectorAll('#product-list-admin th');

    headers.forEach((header, index) => {
        if (index === 0 || index === headers.length - 1) return;
        header.style.cursor = 'pointer';
        header.title = 'Click to sort';
        header.addEventListener('click', () => {
            sortTable(index);
        });
    });
}

function sortTable(columnIndex) {
    const table = document.querySelector('#product-list-admin tbody');
    const rows = Array.from(table.querySelectorAll('tr'));
    const isAscending = table.dataset.sortDir !== 'asc';
    table.dataset.sortDir = isAscending ? 'asc' : 'desc';

    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent;
        const bValue = b.cells[columnIndex].textContent;
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return isAscending ? aNum - bNum : bNum - aNum;
        }
        return isAscending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
    rows.forEach(row => table.appendChild(row));
}

// --- FEATURE 7: Export CSV ---
function exportProductsToCSV() {
    const rows = document.querySelectorAll('#product-list-admin tbody tr');
    let csv = 'ID,Name,Category,Price,Inventory\n';

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const data = [
            cells[1].textContent,
            cells[2].textContent,
            cells[3].textContent,
            cells[4].textContent,
            cells[5].textContent
        ];
        csv += data.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products.csv';
    link.click();
    URL.revokeObjectURL(url);
    showMessage('Products exported successfully!', 'success');
}

// --- FEATURE 8: Customer Search ---
function setupCustomerSearch() {
    const searchInput = document.getElementById('customer-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
        const searchValue = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#customer-list-admin tbody tr');

        rows.forEach(row => {
            const username = row.cells[1].textContent.toLowerCase();
            const email = row.cells[2].textContent.toLowerCase();

            if (username.includes(searchValue) || email.includes(searchValue)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <span class="spinner">⏳</span> Loading data, please wait...
            </div>
        `;
    }
}

// --- Global State ---
let adminProductsCache = [];

// --- 0. SECURITY HELPERS ---
function getAuthHeaders(contentType = 'application/json') {
    const userId = localStorage.getItem('userId');
    const headers = { 'X-User-ID': userId };
    if (contentType) {
        headers['Content-Type'] = contentType;
    }
    return headers;
}

function checkAdminAccessAndGetHeaders(contentType = 'application/json') {
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    if (userRole !== 'admin' || !userId) {
        throw new Error("Admin access required.");
    }
    return getAuthHeaders(contentType);
}

// --- 1. Dashboard Statistics ---
async function fetchDashboardStats() {
    try {
        const headers = checkAdminAccessAndGetHeaders('application/json');
        const response = await fetch(`${API_ADMIN_BASE_URL}/stats`, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) throw new Error("Failed stats");
        const stats = await response.json();
        document.getElementById('stat-products').textContent = stats.totalProducts || 0;
        document.getElementById('stat-orders').textContent = stats.pendingOrders || 0;
        document.getElementById('stat-users').textContent = stats.registeredUsers || 0;
    } catch (error) {
        console.error(error);
    }
}

// --- 2. Product Management ---
function renderProductTable(products) {
    const container = document.getElementById('product-list-admin');
    if (!container) return;

    let html = `
         <div class="table-controls" style="margin-bottom: 15px;">
            <input type="text" id="product-search" placeholder="Search products..." 
                   style="padding: 8px; margin-right: 10px; width: 250px;">
            <select id="category-filter" style="padding: 8px; margin-right: 10px;">
                <option value="">All Categories</option>
            </select>
            <button onclick="exportProductsToCSV()" class="button secondary" style="padding: 8px 15px;">Export CSV</button>
            <p id="product-count" style="display: inline; margin-left: 15px; color: #666;">Showing ${products.length} products</p>
        </div>
        <table class="admin-data-table">
            <thead>
                <tr><th>Thumbnail</th><th>ID</th><th>Name</th><th>Category</th><th>Price (RM)</th><th>Inventory</th><th>Actions</th></tr>
            </thead>
            <tbody>
    `;

    products.forEach(p => {
        const productId = p['Product ID'];
        const displayId = productId ? String(productId).substring(0, 8) + '...' : 'N/A';
        const imageFileName = p['File Name'] || 'placeholder.jpg';
        const imagePath = `http://localhost:8000/images/products/${imageFileName}`;
        const name = p['Product Name'] || 'N/A';
        const priceValue = parseFloat(p['Price (RM)']);
        const formattedPrice = isNaN(priceValue) ? 'N/A' : priceValue.toFixed(2);
        const category = p.Category || 'N/A';
        const inventoryMap = p.Inventory;
        const totalInventory = inventoryMap ? Object.values(inventoryMap).reduce((sum, count) => sum + count, 0) : 0;

        html += `
            <tr>
                <td><div class="product-thumb"><img src="${imagePath}" alt="${name}"></div></td>
                <td>${displayId}</td>
                <td>${name}</td>
                <td>${category}</td>
                <td>${formattedPrice}</td>
                <td>${totalInventory}</td>
                <td>
                    <button class="button small secondary edit-product-btn" data-id="${productId}">Edit</button>
                    <button class="button small danger" onclick="confirmDelete('${productId}')">Delete</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    setupProductSearch();
    populateCategoryFilter();
    setupCategoryFilter();
    addLowStockWarnings();
    makeSortable();

    document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', () => showProductModal(btn.dataset.id));
    });
}

async function listProductsForAdmin() {
    try {
        showLoading('product-list-admin');
        const headers = checkAdminAccessAndGetHeaders('application/json');
        const response = await fetch(`${API_ADMIN_BASE_URL}/products`, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) throw new Error("Failed load");
        const products = await response.json();
        adminProductsCache = products;
        renderProductTable(products);
    } catch (error) {
        console.error(error);
        showMessage('Failed to load products', 'error');
    }
}

function populateProductForm(product, form) {
    form.elements['product-name'].value = product['Product Name'] || '';
    form.elements['product-category'].value = product.Category || '';
    form.elements['product-price'].value = product['Price (RM)'] || '';
    form.elements['product-description'].value = product.Description || '';
    if (product.Inventory) {
        const totalInventory = Object.values(product.Inventory).reduce((sum, count) => sum + count, 0);
        if (form.elements['product-inventory']) form.elements['product-inventory'].value = totalInventory;
    }
}

async function showProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('product-modal-title');
    const fileInput = document.getElementById('product-file-name');

    if (!modal || !form || !title) return;
    form.reset();
    form.dataset.productId = '';

    if (productId) {
        title.textContent = 'Edit Product';
        form.dataset.productId = productId;
        if (fileInput) fileInput.removeAttribute('required');
        const product = adminProductsCache.find(p => String(p['Product ID']) === String(productId));
        if (product) {
            populateProductForm(product, form);
            modal.classList.add('active');
        }
    } else {
        title.textContent = 'Add New Product';
        if (fileInput) fileInput.setAttribute('required', 'required');
        modal.classList.add('active');
    }
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
}

async function handleProductSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const productId = form.dataset.productId;
    const isEditing = !!productId;
    const imageFile = form.elements['file'] ? form.elements['file'].files[0] : null;

    if (!isEditing && !imageFile) { alert("Image file is required."); return; }

    const formData = new FormData();
    if (imageFile) formData.append('file', imageFile);
    if (isEditing) formData.append("Product ID", productId);

    formData.append("Product Name", form.elements['product-name'].value.trim());
    formData.append("Category", form.elements['product-category'].value.trim());
    formData.append("Price (RM)", parseFloat(form.elements['product-price'].value));
    formData.append("Description", form.elements['product-description'].value.trim());
    formData.append("Inventory", JSON.stringify({ "Default": parseInt(form.elements['product-inventory'].value) || 0 }));

    const method = isEditing ? 'PUT' : 'POST';
    const endpoint = isEditing ? `${API_ADMIN_BASE_URL}/products/${productId}` : `${API_ADMIN_BASE_URL}/products`;

    try {
        const headers = checkAdminAccessAndGetHeaders(null);
        const response = await fetch(endpoint, { method: method, headers: headers, body: formData });
        if (response.ok || response.status === 201) {
            alert("Product saved!");
            closeProductModal();
            listProductsForAdmin();
        } else {
            throw new Error("Save failed");
        }
    } catch (error) {
        console.error(error);
    }
}

async function deleteProduct(productId) {
    try {
        const headers = checkAdminAccessAndGetHeaders('application/json');
        const response = await fetch(`${API_ADMIN_BASE_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: headers
        });
        if (response.status === 204) {
            showMessage('Product deleted successfully!', 'success');
            listProductsForAdmin();
        }
    } catch (error) {
        showMessage('Failed to delete product', 'error');
    }
}

// --- 3. Customer Management (Role Assignment) ---

function renderCustomerTable(users) {
    const container = document.getElementById('customer-list-admin');
    if (!container) return;

    let html = `
        <div class="table-controls" style="margin-bottom: 15px;">
            <input type="text" id="customer-search" placeholder="Search customers..." 
                   style="padding: 8px; width: 250px;">
        </div>
        
        <table class="admin-data-table">
            <thead>
                <tr><th>User ID</th><th>Username</th><th>Email</th><th>Role</th><th>Actions</th></tr>
            </thead>
            <tbody>
    `;

    users.forEach(u => {
        const displayUserId = u.userId ? u.userId.substring(0, 8) + '...' : 'N/A';
        const isSelf = u.userId === localStorage.getItem('userId');
        const actionButton = isSelf
            ? `<span class="tag self-tag">YOU (Self)</span>`
            : u.role === 'customer'
                ? `<button class="button small secondary promote-btn" data-id="${u.userId}">Promote to Admin</button>`
                : `<button class="button small demote-btn" data-id="${u.userId}">Demote to Customer</button>`;

        html += `
            <tr>
                <td>${displayUserId}</td>
                <td>${u.username || 'N/A'}</td>
                <td>${u.email || 'N/A'}</td>
                <td id="role-${u.userId}">${(u.role || 'N/A').toUpperCase()}</td>
                <td>${actionButton}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    setupCustomerSearch();

    document.querySelectorAll('.promote-btn').forEach(btn => {
        btn.addEventListener('click', () => updateRole(btn.dataset.id, 'admin'));
    });
    document.querySelectorAll('.demote-btn').forEach(btn => {
        btn.addEventListener('click', () => updateRole(btn.dataset.id, 'customer'));
    });
}

async function listCustomersForAdmin() {
    try {
        showLoading('customer-list-admin');
        const headers = checkAdminAccessAndGetHeaders('application/json');

        const response = await fetch(`${API_ADMIN_BASE_URL}/users`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) throw new Error("Failed to load users");

        const users = await response.json();
        renderCustomerTable(users);

    } catch (error) {
        console.error(error);
        showMessage('Failed to load users', 'error');
        document.getElementById('customer-list-admin').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

async function updateRole(userId, newRole) {
    const action = newRole === 'admin' ? 'Promote' : 'Demote';
    if (confirm(`Are you sure you want to ${action} this user?`)) {
        try {
            const headers = checkAdminAccessAndGetHeaders('application/json');

            if (userId === localStorage.getItem('userId') && newRole === 'customer') {
                alert("Operation Canceled: You cannot demote yourself.");
                return;
            }

            const response = await fetch(`${API_ADMIN_BASE_URL}/role/${userId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                alert(`Role updated successfully!`);
                listCustomersForAdmin();
            } else {
                const errorBody = await response.json();
                throw new Error(errorBody.message || `Failed to update role.`);
            }

        } catch (error) {
            console.error(error);
            alert(`Update role failed: ${error.message}`);
        }
    }
}

// --- 4. Main Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchDashboardStats();

    const navLinks = document.querySelectorAll('.admin-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            const targetId = event.currentTarget.getAttribute('href').substring(1);
            switch (targetId) {
                case 'products': listProductsForAdmin(); break;
                case 'customers': listCustomersForAdmin(); break;
            }
        });
    });

    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) addProductBtn.addEventListener('click', () => showProductModal());

    const productForm = document.getElementById('product-form');
    if (productForm) productForm.addEventListener('submit', handleProductSubmit);

    const closeBtn = document.querySelector('#product-modal .close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeProductModal);

    const initialHash = window.location.hash.substring(1);
    if (initialHash === 'products') listProductsForAdmin();
    if (initialHash === 'customers') listCustomersForAdmin();
});

window.showProductModal = showProductModal;
window.closeProductModal = closeProductModal;
window.exportProductsToCSV = exportProductsToCSV;
window.confirmDelete = confirmDelete;
window.showMessage = showMessage;