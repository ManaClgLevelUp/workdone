import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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

// Get current page information
const currentPage = window.location.pathname.split('/').pop();
console.log('Current page:', currentPage);

// Skip auth check for login page or explicitly public pages
const publicPages = ['index.html', 'register.html', 'reset-password.html'];
if (publicPages.includes(currentPage)) {
    // No need to check auth on public pages
    console.log('On public page, skipping auth check');
} else {
    // Show loading state while checking auth
    document.body.classList.add('auth-loading');
    
    // Create and append loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="loader"></div>';
    document.body.appendChild(loadingOverlay);
    
    // Check auth state
    onAuthStateChanged(auth, async (user) => {
        try {
            if (user) {
                // User is signed in, check their role for page access
                console.log('User is authenticated:', user.uid);
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const userRole = userData.role;
                    
                    // Check if user has access to this page
                    if ((currentPage === 'admin.html' && userRole !== 'admin') || 
                        (currentPage === 'user.html' && userRole !== 'user')) {
                        console.log('User does not have permission for this page');
                        window.location.replace('index.html');
                    } else {
                        console.log('Auth check successful, user has access');
                        // Remove loading state
                        document.body.classList.remove('auth-loading');
                        loadingOverlay.remove();
                    }
                } else {
                    console.log('User document not found');
                    window.location.replace('index.html');
                }
            } else {
                // User is not signed in, redirect to login
                console.log('User not authenticated, redirecting to login');
                window.location.replace('index.html');
            }
        } catch (error) {
            console.error('Auth check error:', error);
            window.location.replace('index.html');
        }
    });
}

// Add loading styles
const style = document.createElement('style');
style.textContent = `
    .auth-loading {
        overflow: hidden;
    }
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    .loader {
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
