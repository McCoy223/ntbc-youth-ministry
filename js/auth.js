document.addEventListener('DOMContentLoaded', function() {
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded!');
        return;
    }
    
    // Initialize services
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Make available globally
    window.auth = auth;
    window.db = db;
    
    // ===== Toggle password visibility =====
    window.togglePassword = function() {
        const passwordInput = document.getElementById('password');
        const toggleBtn = document.querySelector('.show-password');
        
        if (!passwordInput || !toggleBtn) return;
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    };
    
    // ===== Login form submission =====
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email')?.value?.trim();
            const password = document.getElementById('password')?.value;
            const selectedRole = document.querySelector('input[name="role"]:checked')?.value;
            const loginBtn = document.getElementById('loginBtn');
            const errorMessage = document.getElementById('errorMessage');
            
            if (!email || !password || !selectedRole) {
                if (errorMessage) {
                    errorMessage.textContent = 'Please fill all fields';
                    errorMessage.style.display = 'block';
                }
                return;
            }
            
            // Update UI
            if (loginBtn) {
                loginBtn.disabled = true;
                const btnText = loginBtn.querySelector('.btn-text');
                const btnLoader = loginBtn.querySelector('.btn-loader');
                if (btnText) btnText.style.display = 'none';
                if (btnLoader) btnLoader.style.display = 'inline';
            }
            
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
            
            try {
                // Sign in with Firebase
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                console.log('Login successful:', user.email);
                
                // Simple redirect for now
                if (selectedRole === 'admin') {
                    window.location.href = 'admin/dashboard.html';
                } else {
                    window.location.href = 'member/dashboard.html';
                }
                
            } catch (error) {
                console.error('Login error:', error);
                
                let message = 'Login failed. Please try again.';
                
                switch (error.code) {
                    case 'auth/invalid-email':
                        message = 'Invalid email address.';
                        break;
                    case 'auth/user-disabled':
                        message = 'Account has been disabled.';
                        break;
                    case 'auth/user-not-found':
                        message = 'No account found with this email.';
                        break;
                    case 'auth/wrong-password':
                        message = 'Incorrect password.';
                        break;
                    case 'auth/too-many-requests':
                        message = 'Too many attempts. Try again later.';
                        break;
                }
                
                if (errorMessage) {
                    errorMessage.textContent = message;
                    errorMessage.style.display = 'block';
                }
                
            } finally {
                // Reset UI
                if (loginBtn) {
                    loginBtn.disabled = false;
                    const btnText = loginBtn.querySelector('.btn-text');
                    const btnLoader = loginBtn.querySelector('.btn-loader');
                    if (btnText) btnText.style.display = 'inline';
                    if (btnLoader) btnLoader.style.display = 'none';
                }
            }
        });
    }
    
    // ===== Check if user is already logged in =====
    auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? user.email : 'No user');
        // You can add auto-redirect logic here if needed
    });
    
    // ===== Logout function =====
    window.logoutUser = function() {
        auth.signOut().then(() => {
            window.location.href = '../login.html';
        }).catch((error) => {
            console.error('Logout error:', error);
        });
    };
    
    console.log('Auth.js loaded successfully!');
});
