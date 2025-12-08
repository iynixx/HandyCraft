// Base URL for the Java HTTP server
const API_BASE_URL = 'http://localhost:8000/api/auth';
const CART_STORAGE_KEY = 'handyCraftCart';


// Helper Function to Save User Session Data
function saveSession(data) {
    // Store user data and role in local storage after successful login
    localStorage.setItem('userLoggedIn', 'true');
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('username', data.username);
    localStorage.setItem('userRole', data.role);
}


// Helper Function for Redirection based on Role
function redirectToDashboard(role) {
    if (role === 'admin') {
        window.location.href = 'admin.html'; // Redirect to Admin Dashboard
    } else {
        window.location.href = 'index.html'; // Redirect to standard Product Page or Home
    }
}


// --- CORE AUTHENTICATION LOGIC ---


// Sign Up Logic
function handleSignUp(event) {
    event.preventDefault();


    const form = event.target;
    const password = form.elements['password'].value;
    const confirmPassword = form.elements['confirm-password'].value;
    const termsChecked = form.elements['terms-agreement'].checked;


    // 1. Client-Side Validation
    if (password !== confirmPassword) {
        alert("Error: Passwords do not match.");
        return;
    }
    if (!termsChecked) {
        alert("You must agree to the Terms of Service and Privacy Policy to register.");
        return;
    }


    const userData = {
        username: form.elements['username'].value,
        email: form.elements['email'].value,
        password: password
    };


    // 2. API Communication (POST to Java server)
    fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    })
        .then(response => {
            if (response.status === 201 || response.ok) {
                alert('Registration successful! You can now sign in.');
                window.location.href = 'signin.html';
                return response.json();
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


    fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            // Throw an error if the status is 401 Unauthorized or other failure
            throw new Error('Login failed. Invalid email or password.');
        })
        .then(data => {
            alert(`Login successful! Welcome ${data.username}.`);


            // 1. Save session data (including role)
            saveSession(data);


            // 2. Redirect based on role
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
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');


    // 2. CRITICAL: Clear the cart to prevent the next user from seeing the previous user's items
    localStorage.removeItem(CART_STORAGE_KEY);


    // 3. Redirect to the home page (where login links will appear again)
    window.location.href = 'index.html';
}


// --- DOM Initialization ---


document.addEventListener('DOMContentLoaded', () => {
    const signUpForm = document.getElementById('signup-form');
    if (signUpForm) {
        signUpForm.addEventListener('submit', handleSignUp);
    }


    const signInForm = document.getElementById('signin-form');
    if (signInForm) {
        signInForm.addEventListener('submit', handleSignIn);
    }


    // Bind the logout function to any button with id="logout-button"
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
});

