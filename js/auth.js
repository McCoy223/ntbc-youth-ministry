// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.show-password');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁️';
    }
}

// Login form submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    
    if (!loginForm) return;
    
    // Check if user is already logged in
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Check user role from Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userRole = userDoc.exists ? userDoc.data().role : 'member';
            
            // Redirect based on role
            redirectUser(userRole);
        }
    });
    
    // Handle form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const selectedRole = document.querySelector('input[name="role"]:checked').value;
        const rememberMe = document.getElementById('remember').checked;
        
        // Set persistence based on remember me
        const persistence = rememberMe ? 
            firebase.auth.Auth.Persistence.LOCAL : 
            firebase.auth.Auth.Persistence.SESSION;
        
        // Update UI
        loginBtn.disabled = true;
        document.querySelector('.btn-text').style.display = 'none';
        document.querySelector('.btn-loader').style.display = 'inline';
        errorMessage.style.display = 'none';
        
        try {
            // Set persistence
            await auth.setPersistence(persistence);
            
            // Sign in
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Get user data from Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                throw new Error('User account not properly configured');
            }
            
            const userData = userDoc.data();
            const userRole = userData.role;
            
            // Check if selected role matches actual role
            if (selectedRole === 'admin' && userRole !== 'admin') {
                throw new Error('You are not authorized as an administrator');
            }
            
            // Store user info in localStorage
            localStorage.setItem('userRole', userRole);
            localStorage.setItem('userName', userData.name || email);
            
            // Redirect user
            redirectUser(userRole);
            
        } catch (error) {
            // Handle errors
            console.error('Login error:', error);
            
            let message = 'Login failed. Please try again.';
            
            switch (error.code) {
                case 'auth/invalid-email':
                    message = 'Invalid email address.';
                    break;
                case 'auth/user-disabled':
                    message = 'This account has been disabled.';
                    break;
                case 'auth/user-not-found':
                    message = 'No account found with this email.';
                    break;
                case 'auth/wrong-password':
                    message = 'Incorrect password.';
                    break;
                case 'auth/too-many-requests':
                    message = 'Too many failed attempts. Try again later.';
                    break;
                case 'auth/network-request-failed':
                    message = 'Network error. Check your connection.';
                    break;
            }
            
            if (error.message.includes('authorized')) {
                message = error.message;
            }
            
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            
            // Scroll to error
            errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
        } finally {
            // Reset UI
            loginBtn.disabled = false;
            document.querySelector('.btn-text').style.display = 'inline';
            document.querySelector('.btn-loader').style.display = 'none';
        }
    });
});

// Redirect user based on role
function redirectUser(role) {
    if (role === 'admin') {
        window.location.href = 'admin/dashboard.html';
    } else {
        window.location.href = 'member/dashboard.html';
    }
}

// Logout function (to be used in all protected pages)
function logoutUser() {
    auth.signOut().then(() => {
        localStorage.clear();
        window.location.href = '../login.html';
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}

// Check authentication status on protected pages
async function requireAuth(requiredRole = null) {
    return new Promise(async (resolve, reject) => {
        const user = auth.currentUser;
        
        if (!user) {
            window.location.href = '../login.html';
            reject('Not authenticated');
            return;
        }
        
        if (requiredRole) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userRole = userDoc.exists ? userDoc.data().role : null;
            
            if (userRole !== requiredRole) {
                // Redirect to appropriate dashboard
                redirectUser(userRole);
                reject('Insufficient permissions');
                return;
            }
        }
        
        resolve(user);
    });
}