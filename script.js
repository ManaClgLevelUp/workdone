import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCve0_yChnzGgaSBtKh-yKvGopGo3psBQ8",
    authDomain: "workdone-949f9.firebaseapp.com",
    projectId: "workdone-949f9",
    storageBucket: "workdone-949f9.firebasestorage.app",
    messagingSenderId: "577135186360",
    appId: "1:577135186360:web:2ae4d41853abd77d243f4d",
    measurementId: "G-87305ZNEZ1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const roleButtons = document.querySelectorAll('.role-btn');
const loginForm = document.getElementById('loginForm');
const togglePassword = document.querySelector('.toggle-password');
let selectedRole = 'admin'; // Default role

// Add this flag to prevent redirect loops
let isLoggingIn = false;

// Role selection handling
roleButtons.forEach(button => {
    button.addEventListener('click', () => {
        roleButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        selectedRole = button.dataset.role;
    });
});

// Toggle password visibility
togglePassword.addEventListener('click', () => {
    const passwordInput = document.getElementById('password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePassword.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        passwordInput.type = 'password';
        togglePassword.innerHTML = '<i class="fas fa-eye"></i>';
    }
});

// Update the login form submission with better error handling and redirection
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const selectedRole = document.querySelector('.role-btn.active').dataset.role;

    try {
        // Set logging in flag
        isLoggingIn = true;

        // First try to sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Then verify role
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        if (!userDoc.exists()) {
            console.error('User document not found');
            await signOut(auth);
            alert('User data not found. Please contact administrator.');
            return;
        }

        const userData = userDoc.data();
        if (userData.role !== selectedRole) {
            console.error('Role mismatch:', userData.role, selectedRole);
            await signOut(auth);
            alert(`Please select the correct role. You are a ${userData.role}.`);
            return;
        }

        // Store auth state in localStorage
        localStorage.setItem('authUser', JSON.stringify({
            uid: userCredential.user.uid,
            role: userData.role,
            timestamp: Date.now() // Add timestamp for session tracking
        }));

        // Redirect based on role using replace
        const redirectTo = userData.role === 'admin' ? 'admin.html' : 'user.html';
        window.location.replace(redirectTo);

    } catch (error) {
        console.error('Login error:', error);
        isLoggingIn = false; // Reset flag on error
        if (error.code === 'auth/wrong-password') {
            alert('Invalid password');
        } else if (error.code === 'auth/user-not-found') {
            alert('User not found');
        } else {
            alert('Login failed: ' + error.message);
        }
    }
});

// Update auth state observer to handle stored auth state
onAuthStateChanged(auth, async (user) => {
    // Don't redirect if we're in the process of logging in
    if (isLoggingIn) return;

    // Check if we're already on the login page
    const isLoginPage = window.location.pathname.endsWith('index.html') || 
                       window.location.pathname === '/';

    if (user) {
        try {
            const storedAuth = JSON.parse(localStorage.getItem('authUser') || '{}');
            
            // Verify stored auth is still valid (within 24 hours)
            const isValidSession = storedAuth.timestamp && 
                                 (Date.now() - storedAuth.timestamp) < 24 * 60 * 60 * 1000;

            if (storedAuth.uid === user.uid && isValidSession) {
                if (isLoginPage) {
                    // Only redirect if we're on the login page
                    const redirectTo = storedAuth.role === 'admin' ? 'admin.html' : 'user.html';
                    window.location.replace(redirectTo);
                }
            } else {
                // Clear invalid auth data
                localStorage.removeItem('authUser');
                await signOut(auth);
                if (!isLoginPage) {
                    window.location.replace('index.html');
                }
            }
        } catch (error) {
            console.error("Error checking stored auth:", error);
            localStorage.removeItem('authUser');
            await signOut(auth);
            if (!isLoginPage) {
                window.location.replace('index.html');
            }
        }
    } else if (!isLoginPage) {
        // Only redirect to login if we're not already there
        window.location.replace('index.html');
    }
});