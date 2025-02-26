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

// Update login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // First verify if user exists and get their role
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            alert('User not found');
            return;
        }

        // Get user data and check role before login
        const userData = querySnapshot.docs[0].data();
        if (userData.role !== selectedRole) {
            alert(`Please select the correct role. You are a ${userData.role}.`);
            return;
        }

        // If role matches, proceed with login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Redirect based on role
        if (userData.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'user.html';
        }

    } catch (error) {
        console.error('Login error:', error);
        if (error.code === 'auth/wrong-password') {
            alert('Invalid password');
        } else if (error.code === 'auth/user-not-found') {
            alert('User not found');
        } else {
            alert('Login failed: ' + error.message);
        }
    }
});

// Check if user is already logged in
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.role === 'admin') {
                    window.location.href = 'admin.html';
                } else if (userData.role === 'user') {
                    window.location.href = 'user.html';
                }
            } else {
                // Handle case where user document doesn't exist
                console.log("No user data found");
                await signOut(auth);
            }
        } catch (error) {
            console.error("Error checking user role:", error);
            await signOut(auth);
        }
    }
});