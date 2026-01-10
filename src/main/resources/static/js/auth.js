const API_ROOT_URL = 'http://localhost:8000/api';
const API_AUTH_URL = `${API_ROOT_URL}/auth`;
const CART_STORAGE_KEY = 'handyCraftCart';
const AUTH_LINKS_CONTAINER_ID = 'auth-links-container';

function saveSession(data) {
    localStorage.setItem('userLoggedIn', 'true');
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('username', data.username);
    localStorage.setItem('userEmail', data.email);
    localStorage.setItem('userRole', data.role);
}

function redirectToDashboard(role) {
    if (role === 'admin') {
        window.location.href = 'admin.html#dashboard';
    } else {
        window.location.href = 'index.html';
    }
}

function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';

    if (!isLoggedIn) {
        alert("You must be signed in to access your cart or add items. Please sign in first.");
        window.location.href = 'signin.html';
        return true;
    }
    return false;
}

function updateAuthHeader() {
    const container = document.getElementById('auth-links-container');
    const loggedIn = localStorage.getItem('userLoggedIn') === 'true';
    const username = localStorage.getItem('username');

    const path = window.location.pathname;
    const isProfilePage = path.includes('profile.html');

    if (!container) return;

    let authLinksList = container.querySelector('#auth-links');
    if (!authLinksList) {
        authLinksList = document.createElement('ul');
        authLinksList.id = 'auth-links';
        authLinksList.classList.add('nav-links');
        container.appendChild(authLinksList);
    }

    let htmlContent = '';

    if (loggedIn && username) {
        if (isProfilePage) {
            htmlContent = `
                <li><a href="index.html" class="nav-link-text">Back to Home</a></li>
                <li>
                    <a href="profile.html" class="button secondary profile-btn">
                        <img src="images/profile.png" alt="Profile" class="profile-icon">
                        My Profile
                    </a>
                </li>
            `;
        } else {
            htmlContent = `
                <li class="user-greeting">Hello, <strong>${username}</strong></li>
                <li>
                    <a href="profile.html" class="button secondary profile-btn">
                        <img src="images/profile.png" alt="Profile" class="profile-icon">
                        My Profile
                    </a>
                </li>
                <li><button id="logout-button" class="button primary">Log Out</button></li>
            `;
        }
    } else {
        htmlContent = `
            <li><a href="signin.html">Sign In</a></li>
            <li><a href="signup.html">Sign Up</a></li>
        `;
    }

    authLinksList.innerHTML = htmlContent;

    if (loggedIn) {
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            if (typeof handleLogout === 'function') {
                logoutButton.addEventListener('click', handleLogout);
            }
        }
    }
}

function handleSignUp(event) {
    event.preventDefault();

    const form = event.target;
    const username = form.elements['username'].value.trim();
    const email = form.elements['email'].value.trim();
    const password = form.elements['password'].value;
    const confirmPassword = form.elements['confirm-password'].value;
    const securityAnswer1 = form.elements['securityAnswer1'].value;
    const securityAnswer2 = form.elements['securityAnswer2'].value;
    const securityAnswer3 = form.elements['securityAnswer3'].value;
    const termsChecked = form.elements['agree-terms'] ? form.elements['agree-terms'].checked : false;

    if (username.length < 2 || username.length > 20) {
        alert("Username must be 2-20 characters.");
        return;
    }

    if (!/^[a-zA-Z\s]+$/.test(username)) {
        alert("Username can only contain letters and spaces.");
        return;
    }

    const formattedUsername = username
        .toLowerCase()
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    if (!email.includes('@')) {
        alert("Please enter a valid email address (must contain @).");
        return;
    }

    if (password.length < 8 || password.length > 15) {
        alert("Password must be 8-15 characters.");
        return;
    }

    if (!/\d/.test(password)) {
        alert("Password must contain at least 1 number.");
        return;
    }

    if (!/[A-Z]/.test(password)) {
        alert("Password must contain at least 1 uppercase letter.");
        return;
    }

    if (!/[a-z]/.test(password)) {
        alert("Password must contain at least 1 lowercase letter.");
        return;
    }

    if (password.includes(' ')) {
        alert("Password cannot contain spaces.");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    if (!securityAnswer1 || !securityAnswer2 || !securityAnswer3) {
        alert("Please answer all security questions for password recovery.");
        return;
    }

    if (!termsChecked) {
        alert("You must agree to the User Agreement, Terms of Service, and Privacy Policy to register.");
        return;
    }

    const userData = {
        username: formattedUsername,
        email: email.toLowerCase(),
        password: password,
        securityAnswer1: securityAnswer1,
        securityAnswer2: securityAnswer2,
        securityAnswer3: securityAnswer3
    };

    fetch(`${API_AUTH_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    })
        .then(response => {
            if (response.status === 201 || response.ok) {
                alert('Registration successful! You can now sign in.');
                window.location.href = 'signin.html';
                return Promise.resolve({});
            }
            if (response.status === 409) {
                throw new Error('This email is already registered. Please use a different one or sign in.');
            }
            return response.json().then(err => {
                throw new Error(err.message || 'Registration failed due to a server error.');
            });
        })
        .catch(error => {
            console.error('Registration Error:', error);
            alert(`${error.message}`);
        });
}

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
            saveSession(data);
            updateAuthHeader();
            redirectToDashboard(data.role);
        })
        .catch(error => {
            console.error('Login Error:', error);
            alert(`${error.message}`);
        });
}

function handleLogout() {
    localStorage.clear();
    localStorage.removeItem(CART_STORAGE_KEY);
    updateAuthHeader();
    window.location.href = 'index.html';
}

async function showPolicyModal(url, title) {
    const modal = document.getElementById('policyModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    if (!modal || !modalTitle || !modalContent) return;

    modalTitle.textContent = title;
    modalContent.innerHTML = 'Loading ' + title + '...';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}.`);

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const contentBox = doc.querySelector('.content-box');

        if (contentBox) {
            modalContent.innerHTML = contentBox.innerHTML;
        } else {
            modalContent.innerHTML = `<p style="color: red;">Error: Content not found.</p>`;
        }

    } catch (error) {
        modalContent.innerHTML = `<p style="color: red;">Error loading content.</p>`;
    }
}

function closePolicyModal() {
    const modal = document.getElementById('policyModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

window.showPolicyModal = showPolicyModal;
window.closePolicyModal = closePolicyModal;
window.handleLogout = handleLogout;
window.checkLoginStatus = checkLoginStatus;

document.addEventListener('DOMContentLoaded', () => {
    const signUpForm = document.getElementById('signup-form');
    if (signUpForm) signUpForm.addEventListener('submit', handleSignUp);

    const signInForm = document.getElementById('signin-form');
    if (signInForm) signInForm.addEventListener('submit', handleSignIn);

    updateAuthHeader();
});