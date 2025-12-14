// Base URL for all APIs (Root endpoint)
const API_ROOT_URL = 'http://localhost:8000/api';
// Auth specific endpoint
const API_AUTH_URL = `${API_ROOT_URL}/auth`;
const CART_STORAGE_KEY = 'handyCraftCart';
const AUTH_LINKS_CONTAINER_ID = 'auth-links-container';

// Helper Function to Save User Session Data
function saveSession(data) {
    // Store user data and role in local storage after successful login
    localStorage.setItem('userLoggedIn', 'true');
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('username', data.username);
    localStorage.setItem('userRole', data.role);
}

// Helper Function for Redirection based on Role
// *** FIX 1: Ensure the function uses the passed 'role' argument. ***
// *** FIX 2: Admin redirect must include #dashboard hash. ***
function redirectToDashboard(role) {
    if (role === 'admin') {
        window.location.href = 'admin.html#dashboard'; // Redirect to Admin Dashboard with hash
    } else {
        window.location.href = 'index.html'; // Redirect to standard Product Page or Home
    }
}

// --- HEADER UI UPDATE LOGIC ---

/**
 * Updates the header navigation based on login status.
 */
function updateAuthHeader() {
    const container = document.getElementById(AUTH_LINKS_CONTAINER_ID);
    const loggedIn = localStorage.getItem('userLoggedIn') === 'true';
    const username = localStorage.getItem('username');

    if (!container) return;

    // We target the inner UL element
    let authLinksList = container.querySelector('#auth-links');
    if (!authLinksList) {
        // If the inner UL isn't found (shouldn't happen with the corrected HTML)
        authLinksList = document.createElement('ul');
        authLinksList.id = 'auth-links';
        authLinksList.classList.add('nav-links');
        container.appendChild(authLinksList);
    }

    let htmlContent = '';

    if (loggedIn && username) {
        // Logged In: Keep Log Out as a button
        htmlContent = `
            <li class="user-greeting">Hello, <strong>${username}</strong>!</li>
            <li><button id="logout-button" class="button primary">Log Out</button></li>
        `;
    } else {
        // Logged Out: Sign In and Sign Up.
        htmlContent = `
            <li><a href="signin.html">Sign In</a></li>
            <li><a href="signup.html">Sign Up</a></li>
        `;
    }

    // Set the content on the inner UL
    authLinksList.innerHTML = htmlContent;

    // Re-bind the logout handler if the button was just added
    if (loggedIn) {
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            // Ensure handleLogout is globally available or defined earlier in the script
            if (typeof handleLogout === 'function') {
                logoutButton.addEventListener('click', handleLogout);
            } else {
                console.error("handleLogout function not found. Logout binding failed.");
            }
        }
    }
}

// --- CORE AUTHENTICATION LOGIC ---

// Sign Up Logic
function handleSignUp(event) {
    event.preventDefault();

    const form = event.target;
    const username = form.elements['username'].value.trim();
    const email = form.elements['email'].value.trim();
    const password = form.elements['password'].value;
    const confirmPassword = form.elements['confirm-password'].value;
    const termsChecked = form.elements['agree-terms'] ? form.elements['agree-terms'].checked : false;

    // === 1. USERNAME VALIDATION ===
    if (username.length < 2 || username.length > 20) {
        alert("Username must be 2-20 characters.");
        return;
    }

    if (!/^[a-zA-Z\s]+$/.test(username)) {
        alert("Username can only contain letters and spaces.");
        return;
    }

    // Auto-capitalize: "john doe" → "John Doe"
    const formattedUsername = username
        .toLowerCase()
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    // === 2. EMAIL VALIDATION ===
    if (!email.includes('@')) {
        alert("Please enter a valid email address (must contain @).");
        return;
    }

    // === 3. PASSWORD VALIDATION ===
    // Length: 8-15 characters
    if (password.length < 8 || password.length > 15) {
        alert("Password must be 8-15 characters.");
        return;
    }

    // Must have at least 1 number
    if (!/\d/.test(password)) {
        alert("Password must contain at least 1 number.");
        return;
    }

    // Must have at least 1 uppercase letter
    if (!/[A-Z]/.test(password)) {
        alert("Password must contain at least 1 uppercase letter.");
        return;
    }

    // Must have at least 1 lowercase letter
    if (!/[a-z]/.test(password)) {
        alert("Password must contain at least 1 lowercase letter.");
        return;
    }

    // No spaces allowed
    if (password.includes(' ')) {
        alert("Password cannot contain spaces.");
        return;
    }

    // === 4. PASSWORD MATCH ===
    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    // === 5. TERMS CHECK ===
    if (!termsChecked) {
        alert("You must agree to the User Agreement, Terms of Service, and Privacy Policy to register.");
        return;
    }

    // === ALL VALIDATION PASSED ===
    const userData = {
        username: formattedUsername,  // Use formatted username
        email: email.toLowerCase(),    // Lowercase email
        password: password
    };

    // 2. API Communication (POST to Java server)
    fetch(`${API_AUTH_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    })
        .then(response => {
            if (response.status === 201 || response.ok) {
                alert('Registration successful! You can now sign in.');
                // Redirect on success
                window.location.href = 'signin.html';
                return Promise.resolve({});
            }
            return response.json().then(err => {
                throw new Error(err.message || 'Registration failed due to a server error.');
            });
        })
        .catch(error => {
            console.error('Registration Error:', error);
            alert(`Registration failed: ${error.message}`);
        });
}


// Sign In Logic
function handleSignIn(event) {
    event.preventDefault();

    const form = event.target;
    const email = form.elements['email'].value;
    const password = form.elements['password'].value;

    const credentials = {
        email: email,
        password: password
    };

    fetch(`${API_AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    })
        .then(response => {
            return response.json().then(data => {
                if (response.ok) return data;
                throw new Error(data.message);
            });
        })
        .then(data => {
            alert(`Login successful! Welcome ${data.username}.`);

            // 1. Save session data (including role)
            saveSession(data);

            // 2. Update header immediately (if on the homepage)
            updateAuthHeader();

            // 3. Redirect based on role
            // *** CRITICAL: Call redirectToDashboard with the role from the server response (data.role) ***
            redirectToDashboard(data.role);
        })
        .catch(error => {
            console.error('Login Error:', error);
            alert(`${error.message}`);
        });
}


// Log Out Logic
function handleLogout() {
    // 1. Clear ALL user-specific data from storage
    localStorage.clear(); // Safest way to ensure all session data is gone
    localStorage.removeItem(CART_STORAGE_KEY); // Re-add cart removal just in case 'clear' is too broad

    // 2. Update header UI immediately
    updateAuthHeader();

    // 3. Redirect to the home page (where login links will appear again)
    window.location.href = 'index.html';
}


// --- POLICY MODAL LOGIC (EXPORTED to global scope for HTML onclick) ---

/**
 * Fetches content from a standalone HTML file and loads it into the policy modal.
 * @param {string} url - The URL of the policy file (e.g., 'privacy.html').
 * @param {string} title - The title to display in the modal header.
 */
async function showPolicyModal(url, title) {
    const modal = document.getElementById('policyModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    if (!modal || !modalTitle || !modalContent) {
        console.error("Policy Modal elements not found on the page. Ensure the modal HTML is included.");
        return;
    }

    modalTitle.textContent = title;
    modalContent.innerHTML = 'Loading ' + title + '...';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}. Status: ${response.status}`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Target the content inside the <div> with class 'content-box' from the standalone files
        const contentBox = doc.querySelector('.content-box');

        if (contentBox) {
            modalContent.innerHTML = contentBox.innerHTML;
        } else {
            modalContent.innerHTML = `<p style="color: red;">Error: Could not find the main policy content (div.content-box) in ${url}.</p>`;
        }

    } catch (error) {
        console.error('Policy Load Error:', error);
        modalContent.innerHTML = `<p style="color: red;">Error loading content: ${error.message}. Please ensure ${url} exists and is accessible.</p>`;
    }
}

/**
 * Closes the policy modal and re-enables body scrolling.
 */
function closePolicyModal() {
    const modal = document.getElementById('policyModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Attach modal functions to the global window object so HTML 'onclick' attributes can find them
window.showPolicyModal = showPolicyModal;
window.closePolicyModal = closePolicyModal;
window.handleLogout = handleLogout; // Expose handleLogout globally for header script blocks

// --- DOM Initialization ---


document.addEventListener('DOMContentLoaded', () => {
    // A. BIND FORM SUBMISSIONS
    const signUpForm = document.getElementById('signup-form');
    if (signUpForm) {
        signUpForm.addEventListener('submit', handleSignUp);
    }

    const signInForm = document.getElementById('signin-form');
    if (signInForm) {
        signInForm.addEventListener('submit', handleSignIn);
    }

    // B. UPDATE AUTH LINKS on every page load
    // This is the CRITICAL line to ensure the header reflects the current login status
    updateAuthHeader();

    // NOTE: The logout button binding is now handled inside updateAuthHeader()
});