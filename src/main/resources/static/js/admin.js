// --- Configuration ---
const API_BASE_URL = 'http://localhost:8000/api';
const API_ADMIN_BASE_URL = `${API_BASE_URL}/admin`;
//const API_PRODUCTS_URL = `${API_BASE_URL}/products`;

// --- FEATURE 1: Simple Product Search (Easy to implement) ---
function setupProductSearch() {
    const searchInput = document.getElementById('product-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
        const searchValue = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#product-list-admin tbody tr');

        rows.forEach(row => {
            const productName = row.cells[2].textContent.toLowerCase(); // Name column
            const category = row.cells[3].textContent.toLowerCase(); // Category column

            if (productName.includes(searchValue) || category.includes(searchValue)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// --- FEATURE 2: Category Filter Dropdown (Simple) ---
function setupCategoryFilter() {
    const filterSelect = document.getElementById('category-filter');
    if (!filterSelect) return;

    filterSelect.addEventListener('change', function(e) {
        const selectedCategory = e.target.value;
        const rows = document.querySelectorAll('#product-list-admin tbody tr');

        rows.forEach(row => {
            const category = row.cells[3].textContent; // Category column

            if (selectedCategory === '' || category === selectedCategory) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// Populate filter dropdown with categories
function populateCategoryFilter() {
    const filterSelect = document.getElementById('category-filter');
    if (!filterSelect) return;

    // Get unique categories from the table
    const rows = document.querySelectorAll('#product-list-admin tbody tr');
    const categories = new Set();

    rows.forEach(row => {
        const category = row.cells[3].textContent;
        if (category !== 'N/A') {
            categories.add(category);
        }
    });
    // Clear and rebuild options
    filterSelect.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filterSelect.appendChild(option);
    });
}
// --- FEATURE 3: Low Stock Warning Badge (Visual Enhancement) ---
function addLowStockWarnings() {
    const rows = document.querySelectorAll('#product-list-admin tbody tr');

    rows.forEach(row => {
        const inventoryCell = row.cells[5]; // Inventory column
        const inventory = parseInt(inventoryCell.textContent);

        if (inventory < 10) {
            inventoryCell.style.color = 'red';
            inventoryCell.style.fontWeight = 'bold';
            inventoryCell.innerHTML += ' ⚠️'; // Warning emoji
        } else if (inventory < 30) {
            inventoryCell.style.color = 'orange';
        }
    });
}

// --- FEATURE 4: Simple Confirmation Dialog (Better UX) ---
function confirmDelete(productId) {
    // More detailed confirmation
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

// --- FEATURE 5: Success/Error Messages (Toast-like but simpler) ---
function showMessage(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `admin-message ${type}`;
    messageDiv.textContent = message;

    // Add to page
    document.body.appendChild(messageDiv);

    // Remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// --- FEATURE 6: Sort Table by Column (Click header to sort) ---
function makeSortable() {
    const headers = document.querySelectorAll('#product-list-admin th');

    headers.forEach((header, index) => {
        // Skip the first column (thumbnail) and last column (actions)
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

    // Toggle sort direction
    const isAscending = table.dataset.sortDir !== 'asc';
    table.dataset.sortDir = isAscending ? 'asc' : 'desc';

    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent;
        const bValue = b.cells[columnIndex].textContent;

        // Try to parse as number for price and inventory columns
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return isAscending ? aNum - bNum : bNum - aNum;
        }

        // Otherwise sort as string
        return isAscending
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
    });

    // Re-append rows in sorted order
    rows.forEach(row => table.appendChild(row));
}

// --- FEATURE 7: Export to CSV (Simple version) ---
function exportProductsToCSV() {
    const rows = document.querySelectorAll('#product-list-admin tbody tr');
    let csv = 'ID,Name,Category,Price,Inventory\n';

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        // Skip thumbnail (0) and actions (last)
        const data = [
            cells[1].textContent, // ID
            cells[2].textContent, // Name
            cells[3].textContent, // Category
            cells[4].textContent, // Price
            cells[5].textContent  // Inventory
        ];
        csv += data.join(',') + '\n';
    });

    // Download file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products.csv';
    link.click();
    URL.revokeObjectURL(url);

    showMessage('Products exported successfully!', 'success');
}

// --- FEATURE 8: Customer Search (Same pattern as product search) ---
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
/**
 * Simple helper to show a loading indicator in a container
 * @param {string} containerId - The ID of the element to show loading in
 */
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
let adminProductsCache = []; // Store the full product list for quick access

// --- 0. SECURITY HELPERS ---

/**
 * Retrieves the required authentication headers (X-User-ID) from local storage.
 * This is used for all protected Admin API calls.
 * @param {string | null} contentType - The Content-Type header. Pass null to skip setting it (e.g., for FormData).
 */
function getAuthHeaders(contentType = 'application/json') {
    const userId = localStorage.getItem('userId');

    // The AdminHandler.java requires this header for all secure endpoints
    const headers = {
        'X-User-ID': userId
    };

    // Only set Content-Type if specified (essential for JSON, omit for FormData)
    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    return headers;
}

/**
 * Performs a final sanity check for admin role and returns authentication headers.
 * @param {string | null} contentType - Optional Content-Type to pass to getAuthHeaders.
 * @returns {Headers} The headers object with X-User-ID.
 * @throws {Error} if user is not logged in or not an admin.
 */
function checkAdminAccessAndGetHeaders(contentType = 'application/json') {
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');

    if (userRole !== 'admin' || !userId) {
        // Redirect is handled by the inline script in admin.html, but stop JS execution here.
        throw new Error("Admin access required.");
    }

    return getAuthHeaders(contentType);
}


// --- 1. Dashboard Statistics (Fetch) ---

async function fetchDashboardStats() {
    try {
        // Use default JSON headers for GET request
        const headers = checkAdminAccessAndGetHeaders('application/json');

        // Fetch Admin Stats
        const response = await fetch(`${API_ADMIN_BASE_URL}/stats`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch stats: ${response.statusText}`);
        }

        const stats = await response.json();

        // Update the dashboard UI
        document.getElementById('stat-products').textContent = stats.totalProducts || 0;
        document.getElementById('stat-orders').textContent = stats.pendingOrders || 0;
        document.getElementById('stat-users').textContent = stats.registeredUsers || 0;

        console.log("Dashboard stats loaded successfully.");

    } catch (error) {
        console.error("Failed to load dashboard statistics:", error);
        // Display fallback message
        document.getElementById('stat-products').textContent = 'Error';
        document.getElementById('stat-orders').textContent = 'Error';
        document.getElementById('stat-users').textContent = 'Error';
    }
}


// --- 2. Product Management (CRUD Operations) ---

// --- 2.1 Rendering ---

function renderProductTable(products) {
    const container = document.getElementById('product-list-admin');
    if (!container) return;

    // ADDED: Thumbnail column header
    let html = `
         <div class="table-controls" style="margin-bottom: 15px;">
            <input type="text" id="product-search" placeholder="Search products..." 
                   style="padding: 8px; margin-right: 10px; width: 250px;">
            <select id="category-filter" style="padding: 8px; margin-right: 10px;">
                <option value="">All Categories</option>
            </select>
            <button onclick="exportProductsToCSV()" class="button secondary" 
                    style="padding: 8px 15px;">Export CSV</button>
            <p id="product-count" style="display: inline; margin-left: 15px; color: #666;">
                Showing ${products.length} products
            </p>
        </div>
        <table class="admin-data-table">
            <thead>
                <tr>
                    <th>Thumbnail</th>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th> 
                    <th>Price (RM)</th>
                    <th>Inventory (Total)</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    products.forEach(p => {
        // CRITICAL FIX: Access fields using the exact string keys from products.json

        // 1. Safe ID Access
        const productId = p['Product ID'];
        const displayId = productId ? String(productId).substring(0, 8) + '...' : 'N/A';

        // 2. CORRECTED Image URL logic: Use the 'File Name' key confirmed by products.js
        const imageFileName = p['File Name'] || 'placeholder.jpg'; // <<<--- CORRECTED KEY HERE

        // Assuming images are served from http://localhost:8000/images/products/
        const imagePath = `http://localhost:8000/images/products/${imageFileName}`;


        // 3. Safe Field Access
        const name = p['Product Name'] || 'N/A';
        const priceValue = parseFloat(p['Price (RM)']);
        const formattedPrice = isNaN(priceValue) ? 'N/A' : priceValue.toFixed(2);

        const category = p.Category || 'N/A';

        // Calculate total inventory from the inventory map
        const inventoryMap = p.Inventory;
        const totalInventory = inventoryMap ?
            Object.values(inventoryMap).reduce((sum, count) => sum + count, 0) : 0;

        html += `
            <tr>
                <td>
                    <div class="product-thumb">
                        <img src="${imagePath}" alt="${name} Thumbnail">
                    </div>
                </td>
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

    //initialization new features
    setupProductSearch();
    populateCategoryFilter();
    setupCategoryFilter();
    addLowStockWarnings();
    makeSortable();

    // Bind listeners to the new buttons
    document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', () => showProductModal(btn.dataset.id));
    });
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
    });
}

// --- 2.2 Listing ---

async function listProductsForAdmin() {
    try {
        showLoading('product-list-admin');
        const headers = checkAdminAccessAndGetHeaders('application/json');

        // We now fetch from the protected Admin endpoint to ensure security policies are met
        const response = await fetch(`${API_ADMIN_BASE_URL}/products`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            const errorBody = await response.text();
            try {
                const parsedBody = JSON.parse(errorBody);
                throw new Error(parsedBody.message || `Failed to load product list: ${response.statusText}`);
            } catch (jsonError) {
                throw new Error(`Failed to load product list: ${response.statusText}. Server response: ${errorBody.substring(0, 100)}...`);
            }
        }

        const products = await response.json();

        // --- ADDED: Cache the product list for editing ---
        adminProductsCache = products;

        renderProductTable(products);

    } catch (error) {
        console.error("Failed to load product list for admin:", error);
        showMessage('Failed to load products', 'error');
        document.getElementById('product-list-admin').innerHTML = `<p style="color: red;">Failed to load products: ${error.message}</p>`;
    }
}

// --- 2.3 Modal/Form Logic (Add/Edit) ---

/**
 * Populates the form fields with the given product data object.
 */
function populateProductForm(product, form) {
    // CRITICAL FIX: Use the exact string keys for form population
    form.elements['product-name'].value = product['Product Name'] || '';
    form.elements['product-category'].value = product.Category || '';
    form.elements['product-price'].value = product['Price (RM)'] || '';
    form.elements['product-description'].value = product.Description || '';

    // Inventory population logic
    if (product.Inventory) {
        // Calculate total inventory from the map for the input field
        const totalInventory = Object.values(product.Inventory).reduce((sum, count) => sum + count, 0);
        if (form.elements['product-inventory']) {
            form.elements['product-inventory'].value = totalInventory;
        }
    }

    console.log("Product data populated successfully from cache.");
}

/**
 * Opens the product modal, preparing it for either Add (no ID) or Edit (with ID).
 */
async function showProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('product-modal-title');
    const fileInput = document.getElementById('product-file-name');

    // NOTE: Removed inventoryInput as it was unused

    if (!modal || !form || !title) {
        console.error("Product Modal or Form elements not found.");
        return;
    }

    form.reset(); // Clear form data
    form.dataset.productId = ''; // Clear product ID

    // Clear image preview
    const previewContainer = document.getElementById('image-preview');
    if (previewContainer) previewContainer.innerHTML = '';

    // Reset file input value to allow selecting the same file after reset
    if (fileInput) fileInput.value = '';

    if (productId) {
        // EDIT Mode
        title.textContent = 'Edit Product';
        form.dataset.productId = productId;

        // File input is not required for edit
        if (fileInput) fileInput.removeAttribute('required');

        // *** CORE FIX: Use the cached list instead of making a new network fetch ***
        const product = adminProductsCache.find(p => String(p['Product ID']) === String(productId));

        if (product) {
            populateProductForm(product, form);
            // Only show the modal if the data was successfully found in cache
            modal.classList.add('active');
        } else {
            // This happens if a product was deleted or the cache is out of date.
            alert("Failed to load product data: Product not found in cache. Please refresh the page.");
            closeProductModal();
        }

    } else {
        // ADD Mode
        title.textContent = 'Add New Product';
        // File input is required for a new product
        if (fileInput) fileInput.setAttribute('required', 'required');
        modal.classList.add('active'); // Show modal for Add mode
    }
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
}

/* * NOTE: The old 'fetchProductForEdit' function was deleted as it was the source of the 404/Not Found errors.
 * The logic is now integrated into 'showProductModal' using the cached data.
 */

/**
 * Handles form submission for both adding (POST) and updating (PUT) a product,
 * now supporting image file uploads using FormData.
 */
async function handleProductSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const productId = form.dataset.productId; // Check if we are in EDIT mode
    const isEditing = !!productId;

    // Get the file input
    const imageFile = form.elements['file'].files[0];

    // CRITICAL: New validation for adding product (file required)
    if (!isEditing && !imageFile) {
        alert("When adding a new product, an image file is required.");
        return;
    }

    // 1. Create FormData object (used for sending files + data)
    const formData = new FormData();

    // 2. Append the file (if one was selected)
    if (imageFile) {
        // The Java backend must look for the field named 'file'
        formData.append('file', imageFile);
    }

    // 3. Append all other product data fields using the EXACT keys expected by Java

    // Append the ID only if editing
    if (isEditing) {
        // Send as a string, Java should parse it as Integer
        formData.append("Product ID", productId);
    }

    // Append product details (using exact JSON keys)
    formData.append("Product Name", form.elements['product-name'].value.trim());
    formData.append("Category", form.elements['product-category'].value.trim());
    formData.append("Price (RM)", parseFloat(form.elements['product-price'].value));
    formData.append("Description", form.elements['product-description'].value.trim());

    // Append Inventory as a JSON string for Java to parse
    formData.append("Inventory", JSON.stringify({ "Default": parseInt(form.elements['product-inventory'].value) || 0 }));


    // 4. Determine API call details
    const method = isEditing ? 'PUT' : 'POST';
    const endpoint = isEditing ? `${API_ADMIN_BASE_URL}/products/${productId}` : `${API_ADMIN_BASE_URL}/products`;

    try {
        // Use null for contentType to tell getAuthHeaders NOT to set the Content-Type header.
        // The browser sets 'Content-Type: multipart/form-data' automatically when sending FormData.
        const headers = checkAdminAccessAndGetHeaders(null);

        const response = await fetch(endpoint, {
            method: method,
            headers: headers, // Headers only contain X-User-ID now
            body: formData // Send the FormData object
        });

        if (response.ok || response.status === 201) { // 200/201 Success
            alert(`Product ${isEditing ? 'updated' : 'added'} successfully!`);
            closeProductModal();
            listProductsForAdmin(); // Refresh the table
        } else {
            // Server error response might still be JSON, attempt to parse
            const errorBody = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorBody.message || `Operation failed: ${response.statusText}`);
        }

    } catch (error) {
        console.error(`Product ${method} failed:`, error);
        alert(`Failed to save product: ${error.message}`);
    }
}

// --- 2.4 Deleting ---

async function deleteProduct(productId) {
    //if (confirm(`Are you sure you want to delete Product ID ${productId}? This action is permanent.`)) {
        try {
            const headers = checkAdminAccessAndGetHeaders('application/json');

            const response = await fetch(`${API_ADMIN_BASE_URL}/products/${productId}`, {
                method: 'DELETE',
                headers: headers
            });

            if (response.status === 204) { // 204 No Content is success for DELETE
                //alert(`Product ID ${productId} deleted successfully.`);
                showMessage('Product deleted successfully!', 'success');
                listProductsForAdmin(); // Refresh the table
            } else if (response.status === 404) {
                //alert(`Error: Product ID ${productId} not found.`);
                showMessage('Product not found', 'error');
            } else {
                //const errorBody = await response.json();
                throw new Error(errorBody.message || `Deletion failed with status: ${response.status}`);
            }
        } catch (error) {
            console.error("Product deletion failed:", error);
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
                <tr>
                    <th>User ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Actions</th>
                </tr>
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

    // Initialize search
    setupCustomerSearch();

    // Bind listeners to the new buttons
    document.querySelectorAll('.promote-btn').forEach(btn => {
        btn.addEventListener('click', () => updateRole(btn.dataset.id, 'admin'));
    });
    document.querySelectorAll('.demote-btn').forEach(btn => {
        btn.addEventListener('click', () => updateRole(btn.dataset.id, 'customer'));
    });
}

async function listCustomersForAdmin() {
    try {
        showLoading('product-list-admin');
        const headers = checkAdminAccessAndGetHeaders('application/json');

        const response = await fetch(`${API_ADMIN_BASE_URL}/users`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`Failed to load products: ${response.statusText}`);
        }

        const products = await response.json();
        adminProductsCache = products;
        renderProductTable(products);

    } catch (error) {
        console.error("Failed to load product list:", error);
        showMessage('Failed to load products', 'error');
        document.getElementById('product-list-admin').innerHTML =
            `<p style="color: red;">Failed to load products: ${error.message}</p>`;
    }
}

async function updateRole(userId, newRole) {
    if (confirm(`Are you sure you want to change User ID ${userId ? userId.substring(0, 8) + '...' : 'N/A'} role to ${newRole.toUpperCase()}?`)) {
        try {
            const headers = checkAdminAccessAndGetHeaders('application/json');

            // Prevent self-demotion/promotion safeguard (Client-side)
            if (userId === localStorage.getItem('userId') && newRole === 'customer') {
                alert("Operation Canceled: You cannot demote your own active admin account.");
                return;
            }

            const response = await fetch(`${API_ADMIN_BASE_URL}/role/${userId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                alert(`Role updated successfully!`);
                listCustomersForAdmin(); // Refresh the table
            } else {
                const errorBody = await response.json();
                throw new Error(errorBody.message || `Failed to update role. Status: ${response.status}`);
            }

        } catch (error) {
            console.error("Update role failed:", error);
            alert(`Update role failed: ${error.message}`);
        }
    }
}


// --- 4. Main Initialization & Event Binding ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load initial dashboard stats
    fetchDashboardStats();

    // 2. Bind the Sidebar Navigation to trigger data loads
    const navLinks = document.querySelectorAll('.admin-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            const targetId = event.currentTarget.getAttribute('href').substring(1);

            // Only load data when the respective section is clicked
            switch (targetId) {
                case 'products':
                    listProductsForAdmin();
                    break;
                case 'customers':
                    listCustomersForAdmin();
                    break;
                // Add cases for 'orders' and 'reports' here later
            }
        });
    });

    // 3. Bind the "Add New Product" Button and Form
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => showProductModal());
    }

    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }

    // Optional: Bind a close button or background click for the modal
    const closeBtn = document.querySelector('#product-modal .close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeProductModal);
    }

    // Since 'dashboard' is the default section, also load products and customers once (if they are the initial hash)
    const initialHash = window.location.hash.substring(1);
    if (initialHash === 'products') listProductsForAdmin();
    if (initialHash === 'customers') listCustomersForAdmin();
});

// Expose functions globally if needed by inline HTML (e.g., modal close buttons)
window.showProductModal = showProductModal;
window.closeProductModal = closeProductModal;
window.exportProductsToCSV = exportProductsToCSV;
window.confirmDelete = confirmDelete;
window.showMessage = showMessage;