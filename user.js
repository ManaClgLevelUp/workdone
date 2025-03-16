import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, query, where, onSnapshot, updateDoc, serverTimestamp, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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

let activityLogRef = null;
let currentUserId = null;
let pageVisitDoc = null;

// DOM Elements
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const typeButtons = document.querySelectorAll('.type-btn');
const statusFilter = document.getElementById('statusFilter');
const contactsData = document.getElementById('contactsData');
const themeToggle = document.getElementById('themeToggle');

let contactsGrid = document.getElementById('contactsData');

let currentUser = null;
let currentContactId = null;

// Add this after Firebase initialization
let lastVisitDoc = null;

// Replace the old logPageVisit function with this new version
let currentVisit = null;

async function logPageVisit(type) {
    if (!currentUserId) return;
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const timestamp = serverTimestamp();  // Change to serverTimestamp

        if (type === 'opened') {
            // Store start time in memory and in database
            const docRef = await addDoc(collection(db, 'pageVisits'), {
                userId: currentUserId,
                date: today,
                openTime: timestamp,
                serverTime: timestamp,
                status: 'open'
            });
            currentVisit = {
                docId: docRef.id,
                startTime: new Date()  // Store local time for duration calculation
            };
        } else if (type === 'closed' && currentVisit) {
            // Calculate duration using local time for accuracy
            const endTime = new Date();
            const duration = endTime - currentVisit.startTime;
            
            // Update the existing document with close time and duration
            await updateDoc(doc(db, 'pageVisits', currentVisit.docId), {
                closeTime: timestamp,
                duration: duration,
                status: 'closed'
            });

            currentVisit = null;
        }
    } catch (error) {
        console.error('Error logging page visit:', error);
    }
}

// Add error handling and logging
async function checkUserRole(user) {
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        console.log('User doc exists:', userDoc.exists());
        console.log('User role:', userDoc.data()?.role);
        return userDoc.exists() && userDoc.data().role === 'user';
    } catch (error) {
        console.error('Error checking user role:', error);
        return false;
    }
}

// Update the auth state observer with better error handling
onAuthStateChanged(auth, async (user) => {
    try {
        if (user) {
            console.log('Auth state changed - user:', user.uid);
            const isValidUser = await checkUserRole(user);
            console.log('Is valid user:', isValidUser);

            if (isValidUser) {
                currentUser = user;
                currentUserId = user.uid;
                
                // Get user data
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                userName.textContent = userDoc.data().name || 'User';
                
                // Set initial work type from active button
                const activeWorkType = document.querySelector('.type-btn.active').dataset.type;
                currentWorkType = activeWorkType;
                
                // Start with fresh slate
                cleanupListeners();
                
                // Start tracking and load data
                await Promise.all([
                    logPageVisit('opened'),
                    loadContacts(currentWorkType)
                ]);

                // Set up event listeners
                document.addEventListener('visibilitychange', handleVisibilityChange);
                window.addEventListener('beforeunload', handleBeforeUnload);
                
                // Log activity
                activityLogRef = await addDoc(collection(db, 'userActivities'), {
                    userId: user.uid,
                    type: 'login',
                    startTime: serverTimestamp(),
                    date: new Date().toISOString().split('T')[0]
                });
                
                initTheme();
                
                // Add after loading contacts
                addManualRefreshButton();
            } else {
                console.log('Not a valid user, redirecting to login');
                await signOut(auth);
                window.location.replace('index.html');
            }
        } else {
            console.log('No user, redirecting to login');
            window.location.replace('index.html');
        }
    } catch (error) {
        console.error('Error in auth state observer:', error);
        // Handle error gracefully
        window.location.replace('index.html');
    }
});

// Add these new functions
// async function handleVisibilityChange() {
//     if (document.visibilityState === 'hidden') {
//         if (currentVisit) {
//             await logPageVisit('closed');
//         }
//     } else if (document.visibilityState === 'visible') {
//         // Only do a complete reload if it's been a while since our last load
//         const now = Date.now();
//         if (!currentVisit) {
//             await logPageVisit('opened');
            
//             // Only reload data if it's been more than 30 seconds since last load
//             // This prevents unnecessary reloads when quickly switching tabs
//             if (now - lastLoadTime > 30000 && !suppressNextVisibilityChange) {
//                 if (!isDataLoading) {
//                     console.log("Visibility changed to visible - reloading data");
//                     loadContacts(currentWorkType);
//                 }
//             } else {
//                 console.log("Visibility changed but skipping reload (recently loaded)");
//             }
//         }
        
//         // Reset the suppression flag
//         suppressNextVisibilityChange = false;
//     }
// }

async function handleBeforeUnload(event) {
    if (currentVisit) {
        await logPageVisit('closed');
    }
}

// Update getStatusCounts to include new statuses
async function getStatusCounts(userId, workType) {
    const contactsRef = collection(db, 'contacts');
    const q = query(contactsRef, 
        where('assignedTo', '==', userId),
        where('workType', '==', workType)
    );
    
    const snapshot = await getDocs(q);
    const counts = {
        notCalled: 0,
        answered: 0,
        notAnswered: 0,
        notInterested: 0,
        callLater: 0,        // Add new status
        alreadyInCourse: 0   // Add new status
    };
    
    snapshot.docs.forEach(doc => {
        const status = doc.data().status;
        if (counts.hasOwnProperty(status)) {
            counts[status]++;
        }
    });
    
    return counts;
}

// Add new function to generate status options based on work type
function getStatusOptionsForType(workType, currentStatus) {
    if (workType === 'sales') {
        return `
            <select onchange="window.updateStatus('${doc.id}', this.value)">
                <option value="notCalled" ${currentStatus === 'notCalled' ? 'selected' : ''}>Not Called</option>
                <option value="answered" ${currentStatus === 'answered' ? 'selected' : ''}>Answered</option>
                <option value="notAnswered" ${currentStatus === 'notAnswered' ? 'selected' : ''}>Not Answered</option>
                <option value="notInterested" ${currentStatus === 'notInterested' ? 'selected' : ''}>Not Interested</option>
                <option value="callLater" ${currentStatus === 'callLater' ? 'selected' : ''}>Call Later</option>
                <option value="alreadyInCourse" ${currentStatus === 'alreadyInCourse' ? 'selected' : ''}>Already in Course</option>
            </select>
        `;
    } else {
        return `
            <select onchange="window.updateStatus('${doc.id}', this.value)">
                <option value="notCalled" ${currentStatus === 'notCalled' ? 'selected' : ''}>Not Called</option>
                <option value="answered" ${currentStatus === 'answered' ? 'selected' : ''}>Answered</option>
                <option value="notAnswered" ${currentStatus === 'notAnswered' ? 'selected' : ''}>Not Answered</option>
                <option value="notInterested" ${currentStatus === 'notInterested' ? 'selected' : ''}>Not Interested</option>
            </select>
        `;
    }
}

// Update the updateStatusFilterCounts function to handle all statuses
async function updateStatusFilterCounts(userId, workType) {
    const statusHeaderFilter = document.getElementById('statusHeaderFilter');
    if (!statusHeaderFilter) return;

    const counts = await getStatusCounts(userId, workType);
    
    Array.from(statusHeaderFilter.options).forEach(option => {
        const status = option.value;
        if (status) {
            const count = counts[status] || 0;
            let statusText = '';
            
            switch (status) {
                case 'notCalled': statusText = 'Not Called'; break;
                case 'answered': statusText = 'Answered'; break;
                case 'notAnswered': statusText = 'Not Answered'; break;
                case 'notInterested': statusText = 'Not Interested'; break;
                case 'callLater': statusText = 'Call Later'; break;
                case 'alreadyInCourse': statusText = 'Already in Course'; break;
                default: statusText = status;
            }
            
            option.textContent = `${statusText} (${count})`;
        }
    });
}

// Logout Handler
logoutBtn.addEventListener('click', async () => {
    await logPageVisit('closed');
    if (activityLogRef) {
        await updateDoc(activityLogRef, {
            endTime: serverTimestamp(),
            type: 'logout'
        });
    }
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    });
});

// Work Type Selection
typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Don't do anything if this is already the active type
        if (btn.classList.contains('active')) return;
        
        const selectedType = btn.dataset.type;
        currentWorkType = selectedType;
        
        // Update UI first
        typeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Clean up existing listeners before loading new data
        cleanupListeners();
        
        // Use a flag to avoid redundant loads when visibility changes 
        // right after switching tabs
        suppressNextVisibilityChange = true;
        
        // Load new data
        loadContacts(selectedType);
    });
});

// Add a debounce function at the top level
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add helper function for phone formatting
function formatPhoneNumber(phone) {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    // Add +91 if not present and number is 10 digits
    if (cleaned.length === 10) {
        return `+91${cleaned}`;
    }
    // If number already has country code
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return `+${cleaned}`;
    }
    return phone; // Return original if format is unknown
}

// Modify the window.updateStatus function to directly update the UI
window.updateStatus = async (contactId, newStatus) => {
    try {
        const contactCard = document.querySelector(`.contact-card[data-id="${contactId}"]`);
        if (!contactCard) return;
        
        // Update Firestore document
        await updateDoc(doc(db, 'contacts', contactId), {
            status: newStatus,
            lastUpdated: serverTimestamp()
        });

        // Update the "Last updated" text in the UI directly
        const lastUpdateEl = contactCard.querySelector('.contact-lastupdate');
        if (lastUpdateEl) {
            lastUpdateEl.textContent = 'Last updated: just now';
        }
        
        // Apply the appropriate status class for visual indication
        contactCard.setAttribute('data-status', newStatus);
        
        // Refresh the status counts without reloading all contacts
        const activeWorkType = document.querySelector('.type-btn.active').dataset.type;
        await updateStatusFilterCounts(currentUser.uid, activeWorkType);

    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status: ' + error.message);
    }
};



// Helper function to calculate counts
function calculateCounts(docs) {
    const counts = {
        notCalled: 0,
        answered: 0,
        notAnswered: 0,
        notInterested: 0,
        callLater: 0,
        alreadyInCourse: 0
    };
    
    docs.forEach(doc => {
        const status = doc.data().status || 'notCalled';
        counts[status] = (counts[status] || 0) + 1;
    });
    
    return counts;
}

// Helper function to update the filter dropdown
function updateFilterDropdown(counts, totalCount, workType) {
    const filterContainer = document.querySelector('.status-filter-container');
    if (filterContainer) {
        const baseOptions = `
            <option value="">All Status (${totalCount})</option>
            <option value="notCalled">Not Called (${counts.notCalled})</option>
            <option value="answered">Answered (${counts.answered})</option>
            <option value="notAnswered">Not Answered (${counts.notAnswered})</option>
            <option value="notInterested">Not Interested (${counts.notInterested})</option>
        `;

        const salesOptions = workType === 'sales' ? `
            <option value="callLater">Call Later (${counts.callLater})</option>
            <option value="alreadyInCourse">Already in Course (${counts.alreadyInCourse})</option>
        ` : '';

        filterContainer.innerHTML = `
            <select id="statusHeaderFilter" class="status-header-filter">
                ${baseOptions}
                ${salesOptions}
            </select>
        `;

        // Add filter change handler
        const statusFilter = document.getElementById('statusHeaderFilter');
        if (statusFilter) {
            // Remove any existing listeners
            const newFilter = statusFilter.cloneNode(true);
            statusFilter.parentNode.replaceChild(newFilter, statusFilter);
            
            newFilter.addEventListener('change', () => {
                const selectedStatus = newFilter.value;
                
                // Get all contact cards
                const cards = document.querySelectorAll('.contact-card');
                
                if (selectedStatus === '') {
                    // Show all cards if no filter is selected
                    cards.forEach(card => card.style.display = 'flex');
                } else {
                    // Filter cards by status
                    cards.forEach(card => {
                        const cardStatus = card.getAttribute('data-status');
                        card.style.display = (cardStatus === selectedStatus) ? 'flex' : 'none';
                    });
                }
            });
        }
    }
}

// Update renderContacts to include data-status attribute
function renderContacts(docs, workType) {
    const html = docs.map(doc => {
        const data = doc.data();
        const formattedPhone = formatPhoneNumber(data.phone);
        const status = data.status || 'notCalled';
        
        // Generate status options based on work type
        const statusOptions = workType === 'sales' ? `
            <select onchange="window.updateStatus('${doc.id}', this.value)">
                <option value="notCalled" ${status === 'notCalled' ? 'selected' : ''}>Not Called</option>
                <option value="answered" ${status === 'answered' ? 'selected' : ''}>Answered</option>
                <option value="notAnswered" ${status === 'notAnswered' ? 'selected' : ''}>Not Answered</option>
                <option value="notInterested" ${status === 'notInterested' ? 'selected' : ''}>Not Interested</option>
                <option value="callLater" ${status === 'callLater' ? 'selected' : ''}>Call Later</option>
                <option value="alreadyInCourse" ${status === 'alreadyInCourse' ? 'selected' : ''}>Already in Course</option>
            </select>
        ` : `
            <select onchange="window.updateStatus('${doc.id}', this.value)">
                <option value="notCalled" ${status === 'notCalled' ? 'selected' : ''}>Not Called</option>
                <option value="answered" ${status === 'answered' ? 'selected' : ''}>Answered</option>
                <option value="notAnswered" ${status === 'notAnswered' ? 'selected' : ''}>Not Answered</option>
                <option value="notInterested" ${status === 'notInterested' ? 'selected' : ''}>Not Interested</option>
            </select>
        `;

        return `
            <div class="contact-card" data-id="${doc.id}" data-status="${status}">
                <div class="contact-info">
                    <div class="contact-name">${data.name}</div>
                    <div class="contact-phone">${formattedPhone}</div>
                </div>
                
                <div class="contact-actions">
                    <button class="action-btn call-btn" onclick="window.makeCall('${doc.id}', '${data.phone}')">
                        <i class="fas fa-phone"></i>
                    </button>
                    <button class="action-btn whatsapp-btn" onclick="window.sendWhatsApp('${doc.id}', '${data.phone}')">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </div>
                
                <div class="contact-notes">
                    <textarea class="notes-textarea" 
                            placeholder="Add notes here..."
                            onfocus="this.readOnly = false"
                            onblur="window.handleNotesBlur(this, '${doc.id}'); this.readOnly = true;"
                            readOnly="true">${data.notes || ''}</textarea>
                </div>
                
                <div class="contact-lastupdate">
                    ${data.lastUpdated ? 'Last updated: ' + new Date(data.lastUpdated.toDate()).toLocaleString() : 'Not updated yet'}
                </div>
                
                <div class="contact-status">
                    ${statusOptions}
                </div>
            </div>
        `;
    }).join('');

    contactsData.innerHTML = html || '<div class="no-contacts">No contacts found</div>';
}

// Make functions available to window object for inline event handlers
window.makeCall = async (contactId, phone) => {
    const formattedPhone = formatPhoneNumber(phone);
    window.location.href = `tel:${formattedPhone}`;
    await updateContactStatus(contactId, {
        callTime: serverTimestamp(),
        lastUpdated: serverTimestamp()
    });
};

window.sendWhatsApp = async (contactId, phone) => {
    const formattedPhone = formatPhoneNumber(phone);
    // Remove '+' for WhatsApp URL
    const whatsappNumber = formattedPhone.startsWith('+') ? formattedPhone.substring(1) : formattedPhone;
    window.open(`https://wa.me/${whatsappNumber}`, '_blank');
    await updateContactStatus(contactId, {
        whatsappTime: serverTimestamp(),
        lastUpdated: serverTimestamp()
    });
};

window.updateNotes = async (contactId, notes) => {
    try {
        await updateDoc(doc(db, 'contacts', contactId), {
            notes: notes,
            lastUpdated: serverTimestamp()
        });
    } catch (error) {
        alert('Error updating notes: ' + error.message);
    }
};

window.updateStatus = async (contactId, newStatus) => {
    try {
        const contactCard = document.querySelector(`.contact-card[data-id="${contactId}"]`);
        
        await updateDoc(doc(db, 'contacts', contactId), {
            status: newStatus,
            lastUpdated: serverTimestamp()
        });

        // Refresh the status counts after updating
        const activeWorkType = document.querySelector('.type-btn.active').dataset.type;
        await updateStatusFilterCounts(currentUser.uid, activeWorkType);

    } catch (error) {
        alert('Error updating status: ' + error.message);
    }
};

// Add this new function for handling the blur event on notes
window.handleNotesBlur = async (textarea, contactId) => {
    try {
        // Only update if the value has changed
        const contactRef = doc(db, 'contacts', contactId);
        const contactDoc = await getDoc(contactRef);
        
        if (contactDoc.exists() && contactDoc.data().notes !== textarea.value) {
            await updateDoc(contactRef, {
                notes: textarea.value,
                lastUpdated: serverTimestamp()
            });
            
            // Update the last updated text in the UI immediately
            const card = textarea.closest('.contact-card');
            const lastUpdateEl = card.querySelector('.contact-lastupdate');
            if (lastUpdateEl) {
                lastUpdateEl.textContent = 'Last updated: just now';
            }
        }
    } catch (error) {
        alert('Error saving notes: ' + error.message);
    }
};

// Update debounce time from 2000 to 10000 milliseconds
window.handleNotesInput = debounce(async (textarea, contactId) => {
    try {
        await updateDoc(doc(db, 'contacts', contactId), {
            notes: textarea.value,
            lastUpdated: serverTimestamp()
        });
    } catch (error) {
        alert('Error saving notes: ' + error.message);
    }
}, 10000); // Changed to 10 seconds

// Add status filter change handler after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const statusHeaderFilter = document.getElementById('statusHeaderFilter');
    if (statusHeaderFilter) {
        statusHeaderFilter.addEventListener('change', () => {
            const activeWorkType = document.querySelector('.type-btn.active').dataset.type;
            loadContacts(activeWorkType);
        });
    }
});

// Add pull-to-refresh functionality
let lastRefreshTime = 0;
let refreshCooldown = 2000; // 2 seconds cooldown
let isRefreshing = false;

// Add touch feedback to buttons
document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('touchstart', () => {
        btn.style.transform = 'scale(0.95)';
    });
    
    btn.addEventListener('touchend', () => {
        btn.style.transform = 'scale(1)';
    });
});

// Add theme toggle functionality
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    if (themeToggle) {
        themeToggle.innerHTML = theme === 'dark' ? 
            '<i class="fas fa-sun"></i>' : 
            '<i class="fas fa-moon"></i>';
    }
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

// Helper function for updating contact status and refreshing UI
async function updateContactStatus(contactId, updates) {
    try {
        await updateDoc(doc(db, 'contacts', contactId), updates);
        
        // Update the UI to show "Last updated: just now"
        const contactCard = document.querySelector(`.contact-card[data-id="${contactId}"]`);
        if (contactCard) {
            const lastUpdateEl = contactCard.querySelector('.contact-lastupdate');
            if (lastUpdateEl) {
                lastUpdateEl.textContent = 'Last updated: just now';
            }
        }
    } catch (error) {
        console.error('Error updating contact:', error);
    }
}

// Update the makeCall function
window.makeCall = async (contactId, phone) => {
    const formattedPhone = formatPhoneNumber(phone);
    window.location.href = `tel:${formattedPhone}`;
    await updateContactStatus(contactId, {
        callTime: serverTimestamp(),
        lastUpdated: serverTimestamp()
    });
};

window.sendWhatsApp = async (contactId, phone) => {
    const formattedPhone = formatPhoneNumber(phone);
    // Remove '+' for WhatsApp URL
    const whatsappNumber = formattedPhone.startsWith('+') ? formattedPhone.substring(1) : formattedPhone;
    window.open(`https://wa.me/${whatsappNumber}`, '_blank');
    await updateContactStatus(contactId, {
        whatsappTime: serverTimestamp(),
        lastUpdated: serverTimestamp()
    });
};

// Add loading indicator styles
const style = document.createElement('style');
style.textContent = `
    .loading-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: var(--text-secondary);
        font-size: 1.1rem;
        background: var(--surface-color);
        border-radius: 8px;
        box-shadow: var(--card-shadow);
    }
    
    .loading-indicator i {
        margin-right: 10px;
        font-size: 1.5rem;
    }
    
    .error-message {
        padding: 2rem;
        color: var(--error-color);
        background: var(--surface-color);
        border-radius: 8px;
        box-shadow: var(--card-shadow);
        text-align: center;
    }
`;
document.head.appendChild(style);

// Add these styles at the end of the file
const pullToRefreshStyles = document.createElement('style');
pullToRefreshStyles.textContent = `
    .pull-indicator {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        text-align: center;
        padding: 10px;
        color: var(--text-secondary);
        transform: translateY(-30px);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
        z-index: 10;
        pointer-events: none;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }
    
    .pull-indicator i {
        animation: spin 1s linear infinite;
    }
    
    .contacts-grid {
        position: relative;
        min-height: 200px;
    }
    
    .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
    }
    
    [data-theme="dark"] .loading-overlay {
        background: rgba(0, 0, 0, 0.5);
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .contacts-grid.is-refreshing {
        pointer-events: none;
    }
`;

document.head.appendChild(pullToRefreshStyles);

// Add these variables to track state and prevent excessive reloads
let isDataLoading = false;
let lastLoadTime = 0;
let loadCooldown = 1000; // 1 second cooldown between loads
let currentWorkType = 'students'; // Track current work type
let hasInitialLoad = false;
let suppressNextVisibilityChange = false;
let disableScrollLoading = true; // Add this flag to completely disable scroll-based loading

// Replace handleVisibilityChange to prevent unnecessary reloads
async function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
        if (currentVisit) {
            await logPageVisit('closed');
        }
    } else if (document.visibilityState === 'visible') {
        if (!currentVisit) {
            await logPageVisit('opened');
            // Do NOT trigger a reload when the page becomes visible again
            // The user will need to manually refresh if they want updated data
        }
    }
}

// Add this cleanup function to properly remove listeners
function cleanupListeners() {
    if (window.currentUnsubscribe) {
        console.log("Cleaning up previous Firestore listener");
        window.currentUnsubscribe();
        window.currentUnsubscribe = null;
    }
}

// Remove or comment out old scroll-based listeners:
// contactsGrid.removeEventListener('scroll', handleScrollReload);  // handleScrollReload is not defined
// or remove entire lines if any were directly binding scroll events
// Replace the touchmove and touchend event listeners with versions that don't react to normal scrolling
contactsGrid.removeEventListener('touchmove', contactsGrid._touchmoveListener);
contactsGrid.removeEventListener('touchend', contactsGrid._touchendListener);

// Only keep the pull-to-refresh functionality (deliberate action at the top)
// Disable pull-to-refresh and scroll-based contact reload functionality by removing touch event listeners:
if (contactsGrid) {
    // Comment out the pull-to-refresh code to prevent auto-reloading on scroll:
    /*
    contactsGrid.addEventListener('touchstart', (e) => {
        if (contactsGrid.scrollTop === 0) {
            initialTouchY = e.touches[0].clientY;
            touchStartY = initialTouchY;
        } else {
            initialTouchY = 0;
        }
    });
    
    contactsGrid._touchmoveListener = (e) => {
        if (initialTouchY === 0 || isRefreshing) return;
        const touchY = e.touches[0].clientY;
        const diff = touchY - touchStartY;
        if (diff > refreshThreshold && contactsGrid.scrollTop === 0) {
            contactsGrid.classList.add('refreshing');
            // Optional pull indicator code...
            e.preventDefault();
        }
    };
    contactsGrid.addEventListener('touchmove', contactsGrid._touchmoveListener);
    
    contactsGrid._touchendListener = (e) => {
        const indicator = document.querySelector('.pull-indicator');
        if (contactsGrid.classList.contains('refreshing') && !isRefreshing) {
            isRefreshing = true;
            // Optional refreshContacts trigger...
        }
        initialTouchY = 0;
    };
    contactsGrid.addEventListener('touchend', contactsGrid._touchendListener);
    */
}

// Replace loadContacts function with a version that only loads once and doesn't react to scroll
async function loadContacts(workType) {
    if (isDataLoading) {
        console.log("Already loading contacts - skipping");
        return;
    }
    
    isDataLoading = true;
    
    // Show loading indicator
    contactsData.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading contacts...</div>';

    try {
        // Clean up any existing listeners
        cleanupListeners();
        
        // Load contacts with a simple one-time query (no real-time listener)
        const contactsRef = collection(db, 'contacts');
        const q = query(
            contactsRef,
            where('assignedTo', '==', currentUser.uid),
            where('workType', '==', workType)
        );
        
        const snapshot = await getDocs(q);
        
        // Calculate counts and update UI
        const counts = calculateCounts(snapshot.docs);
        updateFilterDropdown(counts, snapshot.docs.length, workType);
        renderContacts(snapshot.docs, workType);
        
        // We don't set up any real-time listeners - user must manually refresh
        
    } catch (error) {
        console.error("Error loading contacts:", error);
        contactsData.innerHTML = '<div class="error-message">Error loading contacts. Please try again later.</div>';
    } finally {
        isDataLoading = false;
    }
}

// Properly handle app lifecycle
window.addEventListener('beforeunload', async () => {
    // Clean up listeners
    cleanupListeners();
    
    // Log page visit closed
    if (currentVisit) {
        await logPageVisit('closed');
    }
    
    // Log user activity
    if (activityLogRef) {
        try {
            await updateDoc(activityLogRef, {
                endTime: serverTimestamp(),
                type: 'logout'
            });
        } catch (error) {
            console.error("Error updating activity log:", error);
        }
    }
});

// Helper function to update a single contact card's status without re-rendering
function updateContactCardStatus(card, newStatus) {
    // Update the data-status attribute
    card.setAttribute('data-status', newStatus);
    
    // Update the status dropdown
    const statusSelect = card.querySelector('.contact-status select');
    if (statusSelect) {
        statusSelect.value = newStatus;
    }
}

// Update window.updateStatus to be more efficient
window.updateStatus = async (contactId, newStatus) => {
    try {
        const contactCard = document.querySelector(`.contact-card[data-id="${contactId}"]`);
        if (!contactCard) return;
        
        // Update status in Firebase
        await updateDoc(doc(db, 'contacts', contactId), {
            status: newStatus,
            lastUpdated: serverTimestamp()
        });

        // Update the UI immediately without waiting for the snapshot
        updateContactCardStatus(contactCard, newStatus);
        
        // Update the "Last updated" text with the actual timestamp
        const lastUpdateEl = contactCard.querySelector('.contact-lastupdate');
        if (lastUpdateEl) {
            const now = new Date();
            lastUpdateEl.textContent = 'Last updated: ' + now.toLocaleString();
        }
        
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status: ' + error.message);
    }
};

// Update the window.handleNotesBlur function to avoid unnecessary UI updates
window.handleNotesBlur = async (textarea, contactId) => {
    try {
        // Get current notes from database
        const contactRef = doc(db, 'contacts', contactId);
        const contactDoc = await getDoc(contactRef);
        
        // Only update if the notes have actually changed
        if (contactDoc.exists() && contactDoc.data().notes !== textarea.value) {
            await updateDoc(contactRef, {
                notes: textarea.value,
                lastUpdated: serverTimestamp()
            });
            
            // Update the last updated text in the UI directly
            const card = textarea.closest('.contact-card');
            const lastUpdateEl = card.querySelector('.contact-lastupdate');
            if (lastUpdateEl) {
                lastUpdateEl.textContent = 'Last updated: just now';
            }
        }
    } catch (error) {
        console.error('Error saving notes:', error);
        alert('Error saving notes: ' + error.message);
    }
};

// Add this style to show a manual refresh button at the top
const refreshButtonStyle = document.createElement('style');
refreshButtonStyle.textContent = `
    .manual-refresh-container {
        display: flex;
        justify-content: center;
        margin: 10px 0 20px;
    }
    
    .manual-refresh-btn {
        padding: 10px 20px;
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        transition: all 0.2s ease;
    }
    
    .manual-refresh-btn:hover {
        background-color: var(--primary-dark);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .manual-refresh-btn:active {
        transform: translateY(0);
    }
    
    .manual-refresh-btn.loading {
        opacity: 0.8;
        cursor: not-allowed;
    }
    
    .manual-refresh-btn.loading i {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(refreshButtonStyle);

// Function to add the manual refresh button to the UI
function addManualRefreshButton() {
    // Check if it already exists
    if (document.querySelector('.manual-refresh-container')) {
        return;
    }
    
    const container = document.createElement('div');
    container.className = 'manual-refresh-container';
    
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'manual-refresh-btn';
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Contacts';
    
    refreshBtn.addEventListener('click', async () => {
        if (refreshBtn.classList.contains('loading')) return;
        
        // Show loading state
        refreshBtn.classList.add('loading');
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refreshing...';
        
        try {
            // Get current work type
            const activeWorkType = document.querySelector('.type-btn.active').dataset.type;
            
            // Reload contacts
            await loadContacts(activeWorkType);
            
            // Show success briefly
            refreshBtn.innerHTML = '<i class="fas fa-check"></i> Updated!';
            
            setTimeout(() => {
                refreshBtn.classList.remove('loading');
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Contacts';
            }, 1500);
        } catch (error) {
            console.error('Error refreshing contacts:', error);
            
            // Show error state
            refreshBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
            
            setTimeout(() => {
                refreshBtn.classList.remove('loading');
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Contacts';
            }, 2000);
        }
    });
    
    container.appendChild(refreshBtn);
    
    // Insert after the work type selector
    const workTypeSelector = document.querySelector('.work-type-selector');
    if (workTypeSelector) {
        workTypeSelector.parentNode.insertBefore(container, workTypeSelector.nextSibling);
    }
}

// Make sure the onAuthStateChanged handler calls our addManualRefreshButton function
// ...existing code for onAuthStateChanged...

// IMPORTANT: Add this to ensure we don't have any lingering touch events
document.addEventListener('DOMContentLoaded', function() {
    // Make sure we don't have any scroll event handlers
    if (contactsGrid) {
        // Comment out the lines below:
        // const newContactsGrid = contactsGrid.cloneNode(true);
        // contactsGrid.parentNode.replaceChild(newContactsGrid, contactsGrid);
        // window.contactsData = document.getElementById('contactsData');
        // contactsGrid = document.getElementById('contactsData');
        
        // Add only the manual refresh button
        addManualRefreshButton();
    }
});

// Improved refresh contacts function
function refreshContacts(workType) {
    return new Promise((resolve, reject) => {
        // Don't refresh if we're already loading
        if (isDataLoading) {
            console.log("Skipping refresh - load already in progress");
            resolve();
            return;
        }
        
        console.log("Manual refresh requested");
        
        // Force a clean load by clearing the listener and setting a flag
        cleanupListeners();
        
        // Load fresh data
        loadContacts(workType)
            .then(resolve)
            .catch(reject);
    });
}

// Add these global declarations at the top (e.g., after variable declarations)
let initialTouchY = 0;
let touchStartY = 0;
let refreshThreshold = 50; // adjust as needed