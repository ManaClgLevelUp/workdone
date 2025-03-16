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

// Modify loadContacts function to use a different approach
async function loadContacts(workType) {
    // Prevent concurrent loads and throttle requests
    const now = Date.now();
    if (isDataLoading || (now - lastLoadTime < loadCooldown && hasInitialLoad)) {
        console.log("Skipping load - already in progress or too recent");
        return;
    }
    
    isDataLoading = true;
    lastLoadTime = now;
    
    console.log(`Loading contacts for work type: ${workType}`);
    
    // Show a loading indicator only if this is the first load
    if (!hasInitialLoad) {
        contactsData.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading contacts...</div>';
    }

    try {
        // Clean up any existing listener first
        cleanupListeners();
        
        // Get contacts without a listener first
        const contactsRef = collection(db, 'contacts');
        const q = query(
            contactsRef,
            where('assignedTo', '==', currentUser.uid),
            where('workType', '==', workType)
        );
        
        // Get contacts directly first
        const snapshot = await getDocs(q);
        
        // Calculate counts
        const counts = calculateCounts(snapshot.docs);
        
        // Update filter dropdown
        updateFilterDropdown(counts, snapshot.docs.length, workType);
        
        // Render contacts - only re-render the full list on first load or work type change
        renderContacts(snapshot.docs, workType);
        hasInitialLoad = true;
        
        // Set up a limited listener with optimized approach
        const unsubscribe = onSnapshot(
            q, 
            { includeMetadataChanges: false },
            (updatedSnapshot) => {
                // Only re-render if there are actual changes that matter to the user
                const changes = updatedSnapshot.docChanges();
                
                // Check for real changes (added, removed, or status changes)
                const hasImportantChanges = changes.some(change => {
                    if (change.type === 'added' || change.type === 'removed') {
                        return true;
                    }
                    
                    if (change.type === 'modified') {
                        // Only care about modifications if they affect displayed data
                        const oldData = change.doc.data();
                        const newData = change.doc.data();
                        
                        // Check if status changed or notes changed
                        return oldData.status !== newData.status;
                    }
                    
                    return false;
                });
                
                if (hasImportantChanges) {
                    console.log("Important changes detected - updating UI");
                    
                    // Recalculate counts
                    const newCounts = calculateCounts(updatedSnapshot.docs);
                    updateFilterDropdown(newCounts, updatedSnapshot.docs.length, workType);
                    
                    // Find and update only changed elements without full re-render
                    changes.forEach(change => {
                        const docId = change.doc.id;
                        const docData = change.doc.data();
                        
                        if (change.type === 'modified') {
                            const card = document.querySelector(`.contact-card[data-id="${docId}"]`);
                            if (card) {
                                // Update only what changed
                                updateContactCardStatus(card, docData.status);
                            }
                        }
                    });
                    
                    // Only do full re-render if contacts were added or removed
                    if (changes.some(change => change.type === 'added' || change.type === 'removed')) {
                        renderContacts(updatedSnapshot.docs, workType);
                    }
                }
            },
            (error) => {
                console.error("Snapshot error:", error);
                if (!hasInitialLoad) {
                    contactsData.innerHTML = '<div class="error-message">Error loading contacts. Please try again later.</div>';
                }
            }
        );
        
        window.currentUnsubscribe = unsubscribe;
        
    } catch (error) {
        console.error("Error loading contacts:", error);
        if (!hasInitialLoad) {
            contactsData.innerHTML = '<div class="error-message">Error loading contacts. Please try again later.</div>';
        }
    } finally {
        isDataLoading = false;
    }
}

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
let initialTouchY = 0;
let lastScrollTop = 0;
let refreshThreshold = 80; // Increased from 50 to make it less sensitive

contactsGrid.addEventListener('touchstart', (e) => {
    // Only initiate if we're at the top of the scroll area
    if (contactsGrid.scrollTop <= 10) {
        initialTouchY = e.touches[0].clientY;
        touchStartY = initialTouchY;
    } else {
        // Reset to prevent accidental triggers
        initialTouchY = 0;
    }
});

contactsGrid.addEventListener('touchmove', (e) => {
    // Only process pull-to-refresh if we started at the top
    if (initialTouchY === 0 || isRefreshing) return;
    
    const touchY = e.touches[0].clientY;
    const diff = touchY - touchStartY;
    const currentTime = Date.now();
    
    // Check if we're pulling down enough AND we're at top AND sufficient time has passed
    if (diff > refreshThreshold && 
        contactsGrid.scrollTop === 0 &&
        currentTime - lastRefreshTime > refreshCooldown) {
        
        contactsGrid.classList.add('refreshing');
        
        // Create and show pull indicator
        let indicator = document.querySelector('.pull-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'pull-indicator';
            indicator.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Releasing will refresh...';
            contactsGrid.prepend(indicator);
        }
        indicator.style.transform = `translateY(${Math.min(diff/2, 70)}px)`;
        indicator.style.opacity = Math.min(diff / 100, 1);
        
        e.preventDefault(); // Prevent scrolling when pulling
    }
});

contactsGrid.addEventListener('touchend', (e) => {
    const indicator = document.querySelector('.pull-indicator');
    const currentTime = Date.now();
    
    // Check if refresh is possible and not in cooldown
    if (contactsGrid.classList.contains('refreshing') && 
        currentTime - lastRefreshTime > refreshCooldown && 
        !isRefreshing) {
        
        isRefreshing = true;
        contactsGrid.classList.add('is-refreshing');
        
        if (indicator) {
            indicator.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
            indicator.style.transform = 'translateY(20px)';
        }
        
        // Update timestamps to prevent rapid refreshing
        lastRefreshTime = currentTime;
        
        const activeWorkType = document.querySelector('.type-btn.active').dataset.type;
        
        // Add loading state
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = '<div class="loader"></div>';
        contactsGrid.appendChild(loadingOverlay);
        
        // Use Promise to handle the refresh
        refreshContacts(activeWorkType)
            .finally(() => {
                // Clean up refresh state
                contactsGrid.classList.remove('refreshing');
                contactsGrid.classList.remove('is-refreshing');
                isRefreshing = false;
                
                // Remove indicators with smooth animation
                if (indicator) {
                    indicator.style.transform = 'translateY(-30px)';
                    indicator.style.opacity = '0';
                    setTimeout(() => indicator.remove(), 300);
                }
                
                // Remove loading overlay
                loadingOverlay.remove();
            });
    } else if (indicator) {
        // Just remove the indicator if not refreshing
        indicator.style.transform = 'translateY(-30px)';
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 300);
        contactsGrid.classList.remove('refreshing');
    }
    
    // Reset variables
    initialTouchY = 0;
});

// Add a new function to refresh contacts that returns a Promise
// function refreshContacts(workType) {
//     return new Promise((resolve, reject) => {
//         // Don't refresh if we're already loading
//         if (isDataLoading) {
//             console.log("Skipping refresh - load already in progress");
//             resolve();
//             return;
//         }
        
//         console.log("Manual refresh requested");
        
//         // Force a clean load by clearing the listener and setting a flag
//         cleanupListeners();
        
//         // Load fresh data
//         loadContacts(workType)
//             .then(resolve)
//             .catch(reject);
//     });
// }

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

// Fix handleVisibilityChange to be smarter about when to reload
async function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
        if (currentVisit) {
            await logPageVisit('closed');
        }
    } else if (document.visibilityState === 'visible') {
        // Only do a complete reload if it's been a while since our last load
        const now = Date.now();
        if (!currentVisit) {
            await logPageVisit('opened');
            
            // Only reload data if it's been more than 30 seconds since last load
            // This prevents unnecessary reloads when quickly switching tabs
            if (now - lastLoadTime > 30000 && !suppressNextVisibilityChange) {
                if (!isDataLoading) {
                    console.log("Visibility changed to visible - reloading data");
                    loadContacts(currentWorkType);
                }
            } else {
                console.log("Visibility changed but skipping reload (recently loaded)");
            }
        }
        
        // Reset the suppression flag
        suppressNextVisibilityChange = false;
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
        
        // Update the "Last updated" text
        const lastUpdateEl = contactCard.querySelector('.contact-lastupdate');
        if (lastUpdateEl) {
            lastUpdateEl.textContent = 'Last updated: just now';
        }
        
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status: ' + error.message);
    }
};