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

let touchStartY = 0;
const contactsGrid = document.getElementById('contactsData');

let currentUser = null;
let currentContactId = null;

// Add this after Firebase initialization
let lastVisitDoc = null;

async function logPageVisit(action) {
    if (!currentUserId) return;
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const currentTimestamp = new Date(); // Get current time

        if (action === 'opened') {
            const visitDoc = await addDoc(collection(db, 'pageVisits'), {
                userId: currentUserId,
                action: 'opened',
                timestamp: currentTimestamp, // Use actual Date object
                serverTime: serverTimestamp(), // Keep server timestamp for consistency
                date: today
            });
            lastVisitDoc = visitDoc;
        } else if (action === 'closed' && lastVisitDoc) {
            await addDoc(collection(db, 'pageVisits'), {
                userId: currentUserId,
                action: 'closed',
                timestamp: currentTimestamp, // Use actual Date object
                serverTime: serverTimestamp(), // Keep server timestamp for consistency
                date: today,
                openedDocId: lastVisitDoc.id
            });
            lastVisitDoc = null;
        }
    } catch (error) {
        console.error('Error logging page visit:', error);
    }
}

// Authentication State Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'user') {
            currentUser = user;
            currentUserId = user.uid;
            userName.textContent = userDoc.data().name || 'User';
            
            // Log page open
            await logPageVisit('opened');

            // Add page visibility change detection
            document.addEventListener('visibilitychange', handleVisibilityChange);
            
            // Add beforeunload event listener
            window.addEventListener('beforeunload', handleBeforeUnload);

            loadContacts('students'); // Default work type

            // Log user login
            const activityRef = await addDoc(collection(db, 'userActivities'), {
                userId: user.uid,
                type: 'login',
                startTime: serverTimestamp(),
                date: new Date().toISOString().split('T')[0]
            });
            activityLogRef = activityRef;

            // Log page open
            await logPageVisit(user.uid, true);

            // Add page visibility change detection
            document.addEventListener('visibilitychange', async () => {
                if (document.visibilityState === 'hidden') {
                    await logPageVisit(user.uid, false);
                } else if (document.visibilityState === 'visible') {
                    await logPageVisit(user.uid, true);
                }
            });

            // Set up disconnect logging
            window.addEventListener('beforeunload', async () => {
                if (activityLogRef) {
                    await updateDoc(activityLogRef, {
                        endTime: serverTimestamp(),
                        duration: firebase.firestore.FieldValue.increment(1)
                    });
                }
                await logPageVisit(user.uid, false);
            });

            initTheme(); // Initialize theme
        } else {
            window.location.href = 'index.html';
        }
    } else {
        window.location.href = 'index.html';
    }
});

// Add these new functions
async function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
        await logPageVisit('closed');
    } else if (document.visibilityState === 'visible') {
        await logPageVisit('opened');
    }
}

async function handleBeforeUnload(event) {
    await logPageVisit('closed');
}

// Add this new function to get status counts
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
        notInterested: 0
    };
    
    snapshot.docs.forEach(doc => {
        const status = doc.data().status;
        if (counts.hasOwnProperty(status)) {
            counts[status]++;
        }
    });
    
    return counts;
}

// Add this function to update the status filter counts
async function updateStatusFilterCounts(userId, workType) {
    const statusHeaderFilter = document.getElementById('statusHeaderFilter');
    if (!statusHeaderFilter) return;

    const counts = await getStatusCounts(userId, workType);
    
    Array.from(statusHeaderFilter.options).forEach(option => {
        const status = option.value;
        if (status) {
            const count = counts[status] || 0;
            option.textContent = `${status === 'notCalled' ? 'Not Called' : 
                                 status === 'notAnswered' ? 'Not Answered' : 
                                 status === 'notInterested' ? 'Not Interested' : 
                                 'Answered'} (${count})`;
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
        typeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadContacts(btn.dataset.type);
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

// Modify the loadContacts function
async function loadContacts(workType) {
    if (!currentUser) return;

    let baseQuery = query(
        collection(db, 'contacts'),
        where('assignedTo', '==', currentUser.uid),
        where('workType', '==', workType)
    );

    const statusHeaderFilter = document.getElementById('statusHeaderFilter');
    let finalQuery = baseQuery;

    if (statusHeaderFilter && statusHeaderFilter.value) {
        finalQuery = query(
            collection(db, 'contacts'),
            where('assignedTo', '==', currentUser.uid),
            where('workType', '==', workType),
            where('status', '==', statusHeaderFilter.value)
        );
    }

    // Update counts first
    await updateStatusFilterCounts(currentUser.uid, workType);

    // Then load filtered contacts
    onSnapshot(finalQuery, (snapshot) => {
        const html = snapshot.docs.map(doc => {
            const data = doc.data();
            const formattedPhone = formatPhoneNumber(data.phone);
            return `
                <div class="contact-card">
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
                                oninput="window.handleNotesInput(this, '${doc.id}')"
                                >${data.notes || ''}</textarea>
                    </div>
                    
                    <div class="contact-lastupdate">
                        ${data.lastUpdated ? 'Last updated: ' + new Date(data.lastUpdated.toDate()).toLocaleString() : 'Not updated yet'}
                    </div>
                    
                    <div class="contact-status">
                        <select onchange="window.updateStatus('${doc.id}', this.value)">
                            <option value="notCalled" ${data.status === 'notCalled' ? 'selected' : ''}>Not Called</option>
                            <option value="answered" ${data.status === 'answered' ? 'selected' : ''}>Answered</option>
                            <option value="notAnswered" ${data.status === 'notAnswered' ? 'selected' : ''}>Not Answered</option>
                            <option value="notInterested" ${data.status === 'notInterested' ? 'selected' : ''}>Not Interested</option>
                        </select>
                    </div>
                </div>
            `;
        }).join('');
        contactsData.innerHTML = html;
    });
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
        await updateDoc(doc(db, 'contacts', contactId), {
            status: newStatus,
            lastUpdated: serverTimestamp()
        });
    } catch (error) {
        alert('Error updating status: ' + error.message);
    }
};

// Add debounced notes update handler
window.handleNotesInput = debounce(async (textarea, contactId) => {
    try {
        await updateDoc(doc(db, 'contacts', contactId), {
            notes: textarea.value,
            lastUpdated: serverTimestamp()
        });
    } catch (error) {
        alert('Error saving notes: ' + error.message);
    }
}, 500); // Wait 500ms after user stops typing before saving

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
contactsGrid.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
});

contactsGrid.addEventListener('touchmove', (e) => {
    const touchY = e.touches[0].clientY;
    const diff = touchY - touchStartY;
    
    if (diff > 50 && contactsGrid.scrollTop === 0) {
        contactsGrid.classList.add('refreshing');
        e.preventDefault();
    }
});

contactsGrid.addEventListener('touchend', (e) => {
    if (contactsGrid.classList.contains('refreshing')) {
        contactsGrid.classList.remove('refreshing');
        const activeWorkType = document.querySelector('.type-btn.active').dataset.type;
        loadContacts(activeWorkType); // Refresh data
    }
});

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