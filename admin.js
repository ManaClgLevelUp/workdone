import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    fetchSignInMethodsForEmail  // Add this import
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs,
    addDoc,
    query,
    where,
    orderBy,  // Add this import
    limit,    // Add this import
    onSnapshot,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    setDoc,
    writeBatch 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { deleteApp, initializeApp as initializeSecondaryApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";

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

let currentUser = null;

// DOM Elements
const adminName = document.getElementById('adminName');
const logoutBtn = document.getElementById('logoutBtn');
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');

// Form Elements
const createUserForm = document.getElementById('createUserForm');
const userName = document.getElementById('userName');
const userId = document.getElementById('userId');
const userPassword = document.getElementById('userPassword');
const usersList = document.getElementById('usersList');
const userPhone = document.getElementById('userPhone');

// Work Assign Elements
const selectUser = document.getElementById('selectUser');
const searchUser = document.getElementById('searchUser');
const workType = document.getElementById('workType');
const contactName = document.getElementById('contactName');
const contactPhone = document.getElementById('contactPhone');
const addSingleContact = document.getElementById('addSingleContact');
const bulkContacts = document.getElementById('bulkContacts');
const addBulkContacts = document.getElementById('addBulkContacts');

// Progress Elements
const progressUser = document.getElementById('progressUser');
const progressWorkType = document.getElementById('progressWorkType');
const progressData = document.getElementById('progressData');

// Add after progress elements
const activityDate = document.getElementById('activityDate');
const firstLogin = document.getElementById('firstLogin');
const lastLogout = document.getElementById('lastLogout');
const totalDuration = document.getElementById('totalDuration');
const sessionCount = document.getElementById('sessionCount');
const activityTimeline = document.getElementById('activityTimeline');

// Add after DOM Elements
const toggleBtns = document.querySelectorAll('.view-toggle .toggle-btn');
const viewSections = document.querySelectorAll('.view-section');

// Add toggle functionality
toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        toggleBtns.forEach(b => b.classList.remove('active'));
        viewSections.forEach(s => s.classList.remove('active'));
        
        btn.classList.add('active');
        const targetView = btn.dataset.view;
        document.getElementById(targetView === 'summary' ? 'activitySummary' : 'pageVisitLog').classList.add('active');
    });
});

// Add after DOM Elements
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// Add mobile menu handlers
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    menuToggle.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
    menuToggle.innerHTML = sidebar.classList.contains('active') ? 
        '<i class="fas fa-times"></i>' : 
        '<i class="fas fa-bars"></i>';
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    menuToggle.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
});

// Close sidebar when clicking nav buttons on mobile
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            menuToggle.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
});

// Add after initial DOM elements
const themeToggle = document.getElementById('themeToggle');

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

// Add null checks for event listeners
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

if (menuToggle && sidebar && sidebarOverlay) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        menuToggle.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
        menuToggle.innerHTML = sidebar.classList.contains('active') ? 
            '<i class="fas fa-times"></i>' : 
            '<i class="fas fa-bars"></i>';
    });

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        menuToggle.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    });
}

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            currentUser = user;
            adminName.textContent = userDoc.data().name || 'Admin';
            loadUsers();
            loadExistingUsers(); // Add this line
            initTheme(); // Initialize theme
            initMobileMenu(); // Initialize mobile menu after DOM is ready
        } else {
            window.location.href = 'index.html';
        }
    } else {
        window.location.href = 'index.html';
    }
});

// Navigation
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetSection = btn.dataset.section;
        navBtns.forEach(b => b.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(targetSection).classList.add('active');
    });
});

// Logout handler
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    });
});

// Add this helper function at the top level
async function deleteUserAndAssociatedData(userId) {
    try {
        const batch = writeBatch(db);
        
        // Delete user's page visits
        const visitsQuery = query(collection(db, 'pageVisits'), where('userId', '==', userId));
        const visitsSnapshot = await getDocs(visitsQuery);
        visitsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete user's activities
        const activitiesQuery = query(collection(db, 'userActivities'), where('userId', '==', userId));
        const activitiesSnapshot = await getDocs(activitiesQuery);
        activitiesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete assigned contacts
        const contactsQuery = query(collection(db, 'contacts'), where('assignedTo', '==', userId));
        const contactsSnapshot = await getDocs(contactsQuery);
        contactsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete the user document
        batch.delete(doc(db, 'users', userId));

        // Commit all deletions
        await batch.commit();

        return true;
    } catch (error) {
        console.error('Error deleting user data:', error);
        throw error;
    }
}

// Replace the createUserForm event listener with this updated version
createUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        // Check if email already exists
        const methods = await fetchSignInMethodsForEmail(auth, userId.value);
        if (methods.length > 0) {
            alert('This email is already registered');
            return;
        }

        // Create a secondary app instance
        const secondaryApp = initializeSecondaryApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);
        
        // Create new user with secondary auth instance
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userId.value, userPassword.value);
        
        // Save user data in Firestore using the main db
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: userName.value,
            email: userId.value,
            phone: userPhone.value,
            role: 'user',
            createdAt: serverTimestamp()
        });
        
        // Delete the secondary app
        await deleteApp(secondaryApp);

        // Clear form and show success message
        createUserForm.reset();
        alert('User created successfully');

        // Refresh all user lists
        await Promise.all([
            loadExistingUsers(),  // Refresh users table
            loadUsers()           // Refresh select dropdowns
        ]);

    } catch (error) {
        console.error('Error creating user:', error);
        alert('Error creating user: ' + error.message);
    }
});

// Update the delete user function to delete all associated data
window.deleteUser = async (userId) => {
    if (confirm('Are you sure you want to delete this user and ALL their associated data?')) {
        try {
            await deleteUserAndAssociatedData(userId);
            loadExistingUsers(); // Refresh the list
            loadUsers(); // Refresh select dropdowns
            alert('User and all associated data deleted successfully');
        } catch (error) {
            alert('Error deleting user: ' + error.message);
        }
    }
};

// Replace just the showContactPreview function
function showContactPreview(contacts) {
    return new Promise((resolve) => {
        // Remove any existing preview dialogs first
        const existingDialog = document.querySelector('.preview-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        const previewHTML = contacts.map(contact => `
            <div class="contact-preview">
                <div class="contact-name">${contact.name}</div>
                <div class="contact-phone">${formatPhoneNumber(contact.phone)}</div>
            </div>
        `).join('');

        const previewDialog = document.createElement('div');
        previewDialog.className = 'preview-dialog';
        previewDialog.innerHTML = `
            <div class="preview-content">
                <h3>Preview Contacts</h3>
                <div class="preview-list">${previewHTML}</div>
                <div class="preview-actions">
                    <button class="confirm-btn">Confirm</button>
                    <button class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;

        // Create one-time event handlers
        const handleConfirm = () => {
            previewDialog.remove();
            resolve(true);
        };

        const handleCancel = () => {
            previewDialog.remove();
            resolve(false);
        };

        document.body.appendChild(previewDialog);

        // Add event listeners with { once: true }
        previewDialog.querySelector('.confirm-btn').addEventListener('click', handleConfirm, { once: true });
        previewDialog.querySelector('.cancel-btn').addEventListener('click', handleCancel, { once: true });
    });
}

// Update single contact addition with preview
addSingleContact.addEventListener('click', async () => {
    if (!selectUser.value || !contactName.value || !contactPhone.value) {
        alert('Please fill all fields');
        return;
    }

    const contact = {
        name: contactName.value,
        phone: formatPhoneNumber(contactPhone.value)
    };

    const confirmed = await showContactPreview([contact]);
    if (!confirmed) return;

    try {
        await addDoc(collection(db, 'contacts'), {
            ...contact,
            assignedTo: selectUser.value,
            workType: workType.value,
            status: 'notCalled',
            createdAt: serverTimestamp()
        });

        contactName.value = '';
        contactPhone.value = '';
        alert('Contact assigned successfully');
    } catch (error) {
        alert('Error assigning contact: ' + error.message);
    }
});

// Update bulk contacts addition with preview
addBulkContacts.addEventListener('click', async () => {
    if (!selectUser.value || !bulkContacts.value) {
        alert('Please select user and enter contacts');
        return;
    }

    const contacts = bulkContacts.value.split('\n')
        .map(line => {
            const parts = line.includes(':') ? line.split(':') : line.split('\t');
            const [name, phone] = parts.map(item => item.trim());
            return name && phone ? { name, phone: formatPhoneNumber(phone) } : null;
        })
        .filter(contact => contact !== null);

    if (contacts.length === 0) {
        alert('No valid contacts found');
        return;
    }

    const confirmed = await showContactPreview(contacts);
    if (!confirmed) return;

    try {
        const batch = writeBatch(db);
        
        contacts.forEach(contact => {
            const newDocRef = doc(collection(db, 'contacts'));
            batch.set(newDocRef, {
                ...contact,
                assignedTo: selectUser.value,
                workType: workType.value,
                status: 'notCalled',
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();
        bulkContacts.value = '';
        alert('Bulk contacts assigned successfully');
    } catch (error) {
        alert('Error assigning bulk contacts: ' + error.message);
    }
});

// Load Users
async function loadUsers() {
    const q = query(collection(db, 'users'), where('role', '==', 'user'));
    const snapshot = await getDocs(q);
    const usersHtml = snapshot.docs.map(doc => 
        `<option value="${doc.id}">${doc.data().name}</option>`
    ).join('');
    
    selectUser.innerHTML = '<option value="">Select User</option>' + usersHtml;
    progressUser.innerHTML = selectUser.innerHTML;
}

// Add function to load existing users with inline editing
async function loadExistingUsers() {
    const q = query(collection(db, 'users'), where('role', '==', 'user'));
    const snapshot = await getDocs(q);
    
    const html = snapshot.docs.map(doc => {
        const data = doc.data();
        return `
            <tr data-userid="${doc.id}">
                <td>
                    <input type="text" class="inline-edit name" value="${data.name}" readonly>
                </td>
                <td>
                    <input type="tel" class="inline-edit phone" value="${data.phone || ''}" readonly>
                </td>
                <td>
                    <input type="email" class="inline-edit email" value="${data.email}" readonly>
                </td>
                <td class="user-actions">
                    <button class="action-btn edit-user-btn" onclick="window.toggleEdit(this)">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn save-user-btn" onclick="window.saveChanges(this)" style="display:none;">
                        <i class="fas fa-save"></i>
                    </button>
                    <button class="action-btn delete-user-btn" onclick="window.deleteUser('${doc.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    usersList.innerHTML = html;
}

// Add inline editing functions to window object
window.toggleEdit = (button) => {
    const row = button.closest('tr');
    const inputs = row.querySelectorAll('.inline-edit');
    const saveBtn = row.querySelector('.save-user-btn');
    const editBtn = row.querySelector('.edit-user-btn');

    inputs.forEach(input => {
        input.readOnly = !input.readOnly;
        if (!input.readOnly) {
            input.focus();
        }
    });

    saveBtn.style.display = inputs[0].readOnly ? 'none' : 'inline-flex';
    editBtn.style.display = inputs[0].readOnly ? 'inline-flex' : 'none';
};

window.saveChanges = async (button) => {
    const row = button.closest('tr');
    const userId = row.dataset.userid;
    const nameInput = row.querySelector('.inline-edit.name');
    const phoneInput = row.querySelector('.inline-edit.phone');
    const emailInput = row.querySelector('.inline-edit.email');

    try {
        await updateDoc(doc(db, 'users', userId), {
            name: nameInput.value,
            phone: phoneInput.value,
            email: emailInput.value,
            lastUpdated: serverTimestamp()
        });

        window.toggleEdit(button); // Switch back to readonly mode
        alert('User updated successfully');
    } catch (error) {
        alert('Error updating user: ' + error.message);
    }
};

// Add user management functions
window.editUser = async (userId) => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    
    const newName = prompt('Enter new name:', userData.name);
    const newPhone = prompt('Enter new phone:', userData.phone);
    const newEmail = prompt('Enter new email:', userData.email);
    
    if (newName && newPhone && newEmail) {
        try {
            await updateDoc(doc(db, 'users', userId), {
                name: newName,
                phone: newPhone,
                email: newEmail,
                lastUpdated: serverTimestamp()
            });
            loadExistingUsers(); // Refresh the list
        } catch (error) {
            alert('Error updating user: ' + error.message);
        }
    }
};

// Helper function to format phone number
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

// Work Assignment Handlers
addSingleContact.addEventListener('click', async () => {
    if (!selectUser.value || !contactName.value || !contactPhone.value) {
        alert('Please fill all fields');
        return;
    }

    const contact = {
        name: contactName.value,
        phone: formatPhoneNumber(contactPhone.value)
    };

    const confirmed = await showContactPreview([contact]);
    if (!confirmed) return;

    try {
        await addDoc(collection(db, 'contacts'), {
            ...contact,
            assignedTo: selectUser.value,
            workType: workType.value,
            status: 'notCalled',
            createdAt: serverTimestamp()
        });

        contactName.value = '';
        contactPhone.value = '';
        alert('Contact assigned successfully');
    } catch (error) {
        alert('Error assigning contact: ' + error.message);
    }
});

addBulkContacts.addEventListener('click', async () => {
    if (!selectUser.value || !bulkContacts.value) {
        alert('Please select user and enter contacts');
        return;
    }

    const contacts = bulkContacts.value.split('\n')
        .map(line => {
            const parts = line.includes(':') ? line.split(':') : line.split('\t');
            const [name, phone] = parts.map(item => item.trim());
            return name && phone ? { name, phone: formatPhoneNumber(phone) } : null;
        })
        .filter(contact => contact !== null);

    if (contacts.length === 0) {
        alert('No valid contacts found');
        return;
    }

    const confirmed = await showContactPreview(contacts);
    if (!confirmed) return;

    try {
        const batch = writeBatch(db);
        
        contacts.forEach(contact => {
            const newDocRef = doc(collection(db, 'contacts'));
            batch.set(newDocRef, {
                ...contact,
                assignedTo: selectUser.value,
                workType: workType.value,
                status: 'notCalled',
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();
        bulkContacts.value = '';
        alert('Bulk contacts assigned successfully');
    } catch (error) {
        alert('Error assigning bulk contacts: ' + error.message);
    }
});

// Progress Monitoring
let progressUnsubscribe = null;

progressUser.addEventListener('change', setupProgressListener);
progressWorkType.addEventListener('change', setupProgressListener);

window.adminMakeCall = async (contactId, phone) => {
    window.location.href = `tel:+${phone}`;
    await updateDoc(doc(db, 'contacts', contactId), {
        adminCallTime: serverTimestamp(),
        lastUpdated: serverTimestamp()
    });
};

window.adminSendWhatsApp = async (contactId, phone) => {
    const formattedPhone = phone.startsWith('+') ? phone.substring(1) : phone;
    window.open(`https://wa.me/91${formattedPhone}`, '_blank');
    await updateDoc(doc(db, 'contacts', contactId), {
        adminWhatsappTime: serverTimestamp(),
        lastUpdated: serverTimestamp()
    });
};

// Add new function to format log time
function formatLogTime(timestamp) {
    if (!timestamp) return '-';
    // Handle both Firestore Timestamp and regular Date objects
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

// Update loadUserPageVisits function
let pageVisitsUnsubscribe = null;

async function loadUserPageVisits(userId, date) {
    const visitsLog = document.getElementById('visitsLog');
    const totalTimeToday = document.getElementById('totalTimeToday');
    const pageOpens = document.getElementById('pageOpens');

    // Clear previous listener
    if (pageVisitsUnsubscribe) {
        pageVisitsUnsubscribe();
        pageVisitsUnsubscribe = null;
    }

    if (!userId || !date) {
        visitsLog.innerHTML = '<tr><td colspan="3">No data available</td></tr>';
        return;
    }

    try {
        const q = query(
            collection(db, 'pageVisits'),
            where('userId', '==', userId),
            where('date', '==', date),
            orderBy('serverTime', 'desc') // Use serverTime for ordering
        );

        pageVisitsUnsubscribe = onSnapshot(q, (snapshot) => {
            let visits = [];
            let totalDuration = 0;
            let openCount = 0;
            const openedVisits = new Map();

            // First pass: collect all opened visits
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.action === 'opened') {
                    openedVisits.set(doc.id, {
                        openTime: data.timestamp,
                        serverTime: data.serverTime,
                        id: doc.id
                    });
                }
            });

            // Second pass: match closed visits with opened ones
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.action === 'closed' && data.openedDocId) {
                    const openedVisit = openedVisits.get(data.openedDocId);
                    if (openedVisit) {
                        const duration = calculateDuration(openedVisit.openTime, data.timestamp);
                        if (duration > 0) {
                            visits.push({
                                openTime: openedVisit.openTime,
                                closeTime: data.timestamp,
                                duration: duration,
                                serverTime: data.serverTime // Keep for sorting
                            });
                            totalDuration += duration;
                            openCount++;
                        }
                    }
                }
            });

            // Sort visits by server timestamp for consistency
            visits.sort((a, b) => b.serverTime.toMillis() - a.serverTime.toMillis());

            // Generate HTML with visibility classes
            const html = visits.map((visit, index) => `
                <tr class="${index < 5 ? 'visible' : 'hidden'}" style="animation-delay: ${index * 0.1}s">
                    <td>${formatLogTime(visit.openTime)}</td>
                    <td>${formatLogTime(visit.closeTime)}</td>
                    <td>${formatDuration(visit.duration)}</td>
                </tr>
            `).join('');

            visitsLog.innerHTML = html || '<tr><td colspan="3">No visits recorded for this date</td></tr>';
            totalTimeToday.textContent = formatDuration(totalDuration);
            pageOpens.textContent = openCount;

            // Set up infinite scroll
            if (visits.length > 5) {
                const tableContainer = visitsLog.closest('.log-table-container');
                tableContainer.onscroll = () => {
                    if (tableContainer.scrollTop + tableContainer.clientHeight >= tableContainer.scrollHeight - 20) {
                        const hiddenRows = visitsLog.querySelectorAll('tr.hidden');
                        hiddenRows.forEach((row, index) => {
                            if (index < 5) {
                                row.classList.replace('hidden', 'visible');
                            }
                        });
                    }
                };
            }
        }, (error) => {
            console.error('Error in page visits subscription:', error);
            visitsLog.innerHTML = '<tr><td colspan="3">Error loading data</td></tr>';
        });

    } catch (error) {
        console.error('Error setting up page visits:', error);
        visitsLog.innerHTML = '<tr><td colspan="3">Error loading data</td></tr>';
    }
}

// Update the cleanup when changing date or user
document.getElementById('activityDate').addEventListener('change', (e) => {
    if (pageVisitsUnsubscribe) {
        pageVisitsUnsubscribe();
        pageVisitsUnsubscribe = null;
    }
    if (progressUser.value) {
        loadUserPageVisits(progressUser.value, e.target.value);
        loadUserActivities(progressUser.value, e.target.value);
    }
});

// Update setupProgressListener function
function setupProgressListener() {
    if (progressUnsubscribe) {
        progressUnsubscribe();
    }
    if (pageVisitsUnsubscribe) {
        pageVisitsUnsubscribe();
        pageVisitsUnsubscribe = null;
    }

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('activityDate').value = today;

    if (!progressUser.value) {
        document.getElementById('userContactInfo').innerHTML = '';
        progressData.innerHTML = '';
        resetActivityDisplay();
        document.getElementById('visitsLog').innerHTML = '';
        document.getElementById('activityLog').innerHTML = '';
        return;
    }

    const q = query(collection(db, 'contacts'), 
        where('assignedTo', '==', progressUser.value),
        where('workType', '==', progressWorkType.value));

    progressUnsubscribe = onSnapshot(q, async (snapshot) => {
        // Get user details for contact
        const userDoc = await getDoc(doc(db, 'users', progressUser.value));
        const userData = userDoc.data();
        
        // Update user contact info
        document.getElementById('userContactInfo').innerHTML = `
            <div class="user-contact-row">
                <div class="user-contact-info">
                    <div>
                        <strong>${userData.name}</strong>
                        <div class="user-phone">${userData.phone || 'No phone'}</div>
                    </div>
                    <div class="user-contact-actions">
                        <button class="action-btn call-btn" onclick="window.adminMakeCall('${progressUser.value}', '${userData.phone}')">
                            <i class="fas fa-phone"></i>
                        </button>
                        <button class="action-btn whatsapp-btn" onclick="window.adminSendWhatsApp('${progressUser.value}', '${userData.phone}')">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Update contacts list with inline editing
        progressData.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <tr data-contactid="${doc.id}">
                    <td>
                        <div class="contact-details">
                            <div class="contact-name">${data.name}</div>
                            <div class="contact-phone">${data.phone}</div>
                            <div class="contact-edit-form" style="display: none;">
                                <input type="text" class="inline-edit name" value="${data.name}">
                                <input type="tel" class="inline-edit phone" value="${data.phone}">
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn call-btn" onclick="window.adminMakeCall('${doc.id}', '${data.phone}')">
                                <i class="fas fa-phone"></i>
                            </button>
                            <button class="action-btn whatsapp-btn" onclick="window.adminSendWhatsApp('${doc.id}', '${data.phone}')">
                                <i class="fab fa-whatsapp"></i>
                            </button>
                        </div>
                    </td>
                    <td>
                        <select class="status-select" disabled>
                            <option value="notCalled" ${data.status === 'notCalled' ? 'selected' : ''}>Not Called</option>
                            <option value="answered" ${data.status === 'answered' ? 'selected' : ''}>Answered</option>
                            <option value="notAnswered" ${data.status === 'notAnswered' ? 'selected' : ''}>Not Answered</option>
                            <option value="notInterested" ${data.status === 'notInterested' ? 'selected' : ''}>Not Interested</option>
                        </select>
                    </td>
                    <td>
                        <textarea class="notes-textarea" readonly
                                placeholder="Add notes...">${data.notes || ''}</textarea>
                    </td>
                    <td>${data.lastUpdated ? new Date(data.lastUpdated.toDate()).toLocaleString() : '-'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit-btn" onclick="window.toggleContactEdit('${doc.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn save-btn" onclick="window.saveContactChanges('${doc.id}')" style="display: none;">
                                <i class="fas fa-save"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="window.deleteContact('${doc.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    });

    // Add activity loading
    loadUserActivities(progressUser.value, today);

    // Load page visits for today by default
    loadUserPageVisits(progressUser.value, today);
}

// Update loadUserActivities function
async function loadUserActivities(userId, date) {
    const activityLog = document.getElementById('activityLog');

    if (!userId || !date) {
        activityLog.innerHTML = '<tr><td colspan="3">No data available</td></tr>';
        return;
    }

    try {
        const q = query(
            collection(db, 'userActivities'),
            where('userId', '==', userId),
            where('date', '==', date),
            orderBy('startTime', 'desc'),
            limit(50)
        );

        const snapshot = await getDocs(q);
        const activities = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        // Generate HTML for the first 5 activities
        const html = activities.slice(0, 5).map(activity => {
            const startTime = activity.startTime;
            const endTime = activity.endTime;
            const duration = startTime && endTime ? 
                formatDuration(endTime.toMillis() - startTime.toMillis()) : '-';

            return `
                <tr>
                    <td>${formatLogTime(startTime)}</td>
                    <td>${activity.type || 'Page Visit'}</td>
                    <td>${duration}</td>
                </tr>
            `;
        }).join('');

        activityLog.innerHTML = html || '<tr><td colspan="3">No activities recorded for this date</td></tr>';

    } catch (error) {
        console.error('Error loading activities:', error);
        activityLog.innerHTML = '<tr><td colspan="3">Error loading data</td></tr>';
    }
}

// Add date change handler
document.getElementById('activityDate').addEventListener('change', (e) => {
    if (pageVisitsUnsubscribe) {
        pageVisitsUnsubscribe();
        pageVisitsUnsubscribe = null;
    }
    if (progressUser.value) {
        const selectedDate = e.target.value;
        loadUserPageVisits(progressUser.value, selectedDate);
        loadUserActivities(progressUser.value, selectedDate);
    }
});

// Add new contact management functions to window object
window.updateContactStatus = async (contactId, status) => {
    try {
        await updateDoc(doc(db, 'contacts', contactId), {
            status: status,
            lastUpdated: serverTimestamp()
        });
    } catch (error) {
        alert('Error updating status: ' + error.message);
    }
};

window.updateContactNotes = async (contactId, notes) => {
    try {
        await updateDoc(doc(db, 'contacts', contactId), {
            notes: notes,
            lastUpdated: serverTimestamp()
        });
    } catch (error) {
        alert('Error updating notes: ' + error.message);
    }
};

window.editContactInline = async (contactId) => {
    const row = document.querySelector(`tr[data-contactid="${contactId}"]`);
    const nameDiv = row.querySelector('.contact-name');
    const phoneDiv = row.querySelector('.contact-phone');
    
    const currentName = nameDiv.textContent;
    const currentPhone = phoneDiv.textContent;
    
    nameDiv.innerHTML = `<input type="text" class="inline-edit" value="${currentName}">`;
    phoneDiv.innerHTML = `<input type="tel" class="inline-edit" value="${currentPhone}">`;
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'action-btn save-btn';
    saveBtn.innerHTML = '<i class="fas fa-save"></i>';
    saveBtn.onclick = async () => {
        const newName = nameDiv.querySelector('input').value;
        const newPhone = phoneDiv.querySelector('input').value;
        
        try {
            await updateDoc(doc(db, 'contacts', contactId), {
                name: newName,
                phone: newPhone,
                lastUpdated: serverTimestamp()
            });
            
            nameDiv.textContent = newName;
            phoneDiv.textContent = newPhone;
            saveBtn.remove();
        } catch (error) {
            alert('Error updating contact: ' + error.message);
        }
    };
    
    row.querySelector('.action-buttons').appendChild(saveBtn);
};

// Add toggle edit mode function
window.toggleContactEdit = (contactId) => {
    const row = document.querySelector(`tr[data-contactid="${contactId}"]`);
    const editForm = row.querySelector('.contact-edit-form');
    const displayInfo = row.querySelectorAll('.contact-name, .contact-phone');
    const statusSelect = row.querySelector('.status-select');
    const notesArea = row.querySelector('.notes-textarea');
    const editBtn = row.querySelector('.edit-btn');
    const saveBtn = row.querySelector('.save-btn');

    const isEditing = editForm.style.display === 'none';
    
    // Toggle display
    editForm.style.display = isEditing ? 'block' : 'none';
    displayInfo.forEach(el => el.style.display = isEditing ? 'none' : 'block');
    editBtn.style.display = isEditing ? 'none' : 'inline-flex';
    saveBtn.style.display = isEditing ? 'inline-flex' : 'none';
    
    // Toggle form controls
    statusSelect.disabled = !isEditing;
    notesArea.readOnly = !isEditing;
};

// Add save changes function
window.saveContactChanges = async (contactId) => {
    const row = document.querySelector(`tr[data-contactid="${contactId}"]`);
    const nameInput = row.querySelector('.inline-edit.name');
    const phoneInput = row.querySelector('.inline-edit.phone');
    const statusSelect = row.querySelector('.status-select');
    const notesArea = row.querySelector('.notes-textarea');

    try {
        await updateDoc(doc(db, 'contacts', contactId), {
            name: nameInput.value,
            phone: formatPhoneNumber(phoneInput.value),
            status: statusSelect.value,
            notes: notesArea.value,
            lastUpdated: serverTimestamp()
        });

        // Update display values
        row.querySelector('.contact-name').textContent = nameInput.value;
        row.querySelector('.contact-phone').textContent = formatPhoneNumber(phoneInput.value);
        
        // Exit edit mode
        window.toggleContactEdit(contactId);
        
    } catch (error) {
        alert('Error updating contact: ' + error.message);
    }
};

// Contact Management Functions
async function editContact(contactId) {
    // Implement edit functionality
    const newName = prompt('Enter new name:');
    if (newName) {
        try {
            await updateDoc(doc(db, 'contacts', contactId), {
                name: newName,
                lastUpdated: serverTimestamp()
            });
        } catch (error) {
            alert('Error updating contact: ' + error.message);
        }
    }
}

async function deleteContact(contactId) {
    if (confirm('Are you sure you want to delete this contact?')) {
        try {
            await deleteDoc(doc(db, 'contacts', contactId));
        } catch (error) {
            alert('Error deleting contact: ' + error.message);
        }
    }
}

// Add activity date change handler
activityDate.addEventListener('change', () => {
    if (progressUser.value) {
        loadUserActivities(progressUser.value, activityDate.value);
        loadUserPageVisits(progressUser.value, activityDate.value);
    }
});

function formatDateTime(date) {
    return date.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

function resetActivityDisplay() {
    firstLogin.textContent = '-';
    lastLogout.textContent = '-';
    totalDuration.textContent = '-';
    sessionCount.textContent = '-';
    activityTimeline.innerHTML = '';
}

// Update the timestamp calculation functions
function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    // Handle both Firestore Timestamp and regular Date objects
    const start = startTime instanceof Date ? startTime : startTime.toDate();
    const end = endTime instanceof Date ? endTime : endTime.toDate();
    return end.getTime() - start.getTime();
}

// Update the mobile menu initialization
function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (!menuToggle || !sidebar || !sidebarOverlay) {
        console.error('Mobile menu elements not found');
        return;
    }

    function toggleMenu() {
        sidebar.classList.toggle('active');
        menuToggle.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
        menuToggle.innerHTML = sidebar.classList.contains('active') ? 
            '<i class="fas fa-times"></i>' : 
            '<i class="fas fa-bars"></i>';
    }

    // Remove any existing listeners first
    menuToggle.removeEventListener('click', toggleMenu);
    sidebarOverlay.removeEventListener('click', toggleMenu);

    // Add fresh event listeners
    menuToggle.addEventListener('click', toggleMenu);
    sidebarOverlay.addEventListener('click', toggleMenu);

    // Close menu when clicking nav buttons on mobile
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                menuToggle.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
    });
}