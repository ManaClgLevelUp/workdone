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
let progressUnsubscribe = null;
let pageVisitsUnsubscribe = null;  // Add this line

// Add these functions at the start of your code
function saveActiveSection(sectionId) {
    localStorage.setItem('activeSection', sectionId);
}

function loadActiveSection() {
    return localStorage.getItem('activeSection') || 'createUser'; // default to createUser if none saved
}

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

// Add this after DOM Elements section
const progressToggleBtns = document.querySelectorAll('.progress-toggle-btn');
const progressSections = document.querySelectorAll('.progress-section');

// Add this to your initialization code
progressToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons and sections
        progressToggleBtns.forEach(b => b.classList.remove('active'));
        progressSections.forEach(s => s.classList.remove('active'));

        // Add active class to clicked button and corresponding section
        btn.classList.add('active');
        const targetView = btn.dataset.view;
        document.getElementById(`${targetView}Section`).classList.add('active');
    });
});

// Auth state observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            currentUser = user;
            adminName.textContent = userDoc.data().name || 'Admin';

            // Restore active section immediately before loading data
            const activeSection = loadActiveSection();
            const activeBtn = document.querySelector(`.nav-btn[data-section="${activeSection}"]`);
            if (activeBtn) {
                navBtns.forEach(b => b.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));
                activeBtn.classList.add('active');
                document.getElementById(activeSection).classList.add('active');
            }

            // Then load all data asynchronously
            initTheme();
            initMobileMenu();
            await Promise.all([
                loadUsers(),
                loadExistingUsers()
            ]);

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
        saveActiveSection(targetSection); // Save the active section
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
        // Get user document without prompting for password
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            throw new Error('User not found');
        }
        // Delete associated Firestore data using a batch
        const batch = writeBatch(db);
        const visitsSnapshot = await getDocs(query(collection(db, 'pageVisits'), where('userId', '==', userId)));
        visitsSnapshot.forEach(doc => batch.delete(doc.ref));
        const activitiesSnapshot = await getDocs(query(collection(db, 'userActivities'), where('userId', '==', userId)));
        activitiesSnapshot.forEach(doc => batch.delete(doc.ref));
        const contactsSnapshot = await getDocs(query(collection(db, 'contacts'), where('assignedTo', '==', userId)));
        contactsSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        // Instead of deleting the user document (which holds the password),
        // update it so that only the hashedPassword remains and mark it as "deleted"
        const { hashedPassword } = userDoc.data();
        await updateDoc(userDocRef, {
            name: '',
            email: '',
            phone: '',
            role: 'deleted',
            // Preserve the password field, remove other sensitive data
            createdAt: null,
            lastUpdated: serverTimestamp()
        });

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
            hashedPassword: userPassword.value, // Store password for future deletion
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
    if (!confirm('Are you sure you want to delete this user and ALL their associated data? This action cannot be undone.')) {
        return;
    }

    try {
        // Show loading state
        const deleteButton = document.querySelector(`tr[data-userid="${userId}"] .delete-user-btn`);
        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        await deleteUserAndAssociatedData(userId);

        // Remove the deleted user's row immediately
        const userRow = document.querySelector(`tr[data-userid="${userId}"]`);
        if (userRow) {
            userRow.remove();
        }
        // Refresh the users list displays without reloading the page
        await Promise.all([
            loadExistingUsers(),
            loadUsers()
        ]);

        alert('User and all associated data deleted successfully');
    } catch (error) {
        console.error('Error during user deletion:', error);
        alert('Error deleting user: ' + error.message);
    } finally {
        // Reset button state if it exists
        const deleteButton = document.querySelector(`tr[data-userid="${userId}"] .delete-user-btn`);
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
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
async function loadUserPageVisits(userId, date) {
    const visitsLog = document.getElementById('visitsLog');
    const totalTimeToday = document.getElementById('totalTimeToday');
    const pageOpens = document.getElementById('pageOpens');

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
            orderBy('serverTime', 'desc')
        );

        pageVisitsUnsubscribe = onSnapshot(q, (snapshot) => {
            let totalDuration = 0;
            let totalVisits = 0;

            // Generate HTML for visits
            const html = snapshot.docs.map(doc => {
                const data = doc.data();
                // Add to totals if valid duration exists
                if (data.duration) {
                    totalDuration += data.duration;
                    totalVisits++;
                }

                const openTime = data.openTime;
                const closeTime = data.closeTime;
                const duration = data.duration || 0;

                // Only show visits that have complete data
                if (openTime && closeTime && duration) {
                    return `
                        <tr>
                            <td>${formatLogTime(openTime)}</td>
                            <td>${formatLogTime(closeTime)}</td>
                            <td>${formatDuration(duration)}</td>
                        </tr>
                    `;
                }
                return '';
            }).filter(row => row !== '').join('');

            // Update the display
            visitsLog.innerHTML = html || '<tr><td colspan="3">No visits recorded for this date</td></tr>';
            totalTimeToday.textContent = formatDuration(totalDuration);
            pageOpens.textContent = totalVisits;
        });

    } catch (error) {
        console.error('Error loading page visits:', error);
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
        callLater: 0,
        alreadyInCourse: 0
    };

    snapshot.docs.forEach(doc => {
        const status = doc.data().status;
        if (counts.hasOwnProperty(status)) {
            counts[status]++;
        }
    });

    return counts;
}

// Fix the updateStatusHeaderCounts function
async function updateStatusHeaderCounts(userId, workType) {
    const statusFilter = document.getElementById('statusHeaderFilter');
    if (!statusFilter) return;

    const counts = await getStatusCounts(userId, workType);

    // Update dropdown options with counts
    Array.from(statusFilter.options).forEach(option => {
        const status = option.value;
        if (status) {
            const count = counts[status] || 0; // Get count for this status
            option.textContent = `${status === 'notCalled' ? 'Not Called' :
                status === 'notAnswered' ? 'Not Answered' :
                    status === 'notInterested' ? 'Not Interested' :
                    status === 'callLater' ? 'Call Later' :
                    status === 'alreadyInCourse' ? 'Already in Course' :
                        'Answered'} (${count})`;
        }
    });
}

async function setupProgressListener() {
    // Clear existing listeners
    if (progressUnsubscribe) {
        progressUnsubscribe();
    }
    if (pageVisitsUnsubscribe) {
        pageVisitsUnsubscribe();
    }

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('activityDate').value = today;

    if (!progressUser.value) {
        resetAllDisplays();
        return;
    }

    // Load both activities and visits
    loadUserActivities(progressUser.value, today);
    loadUserPageVisits(progressUser.value, today);

    // Create base query
    let baseQuery = query(collection(db, 'contacts'),
        where('assignedTo', '==', progressUser.value),
        where('workType', '==', progressWorkType.value));

    const statusHeaderFilter = document.getElementById('statusHeaderFilter');

    // Function to update contacts list with filtered data
    async function updateContactsList(filterQuery) {
        const snapshot = await getDocs(filterQuery);
        const userData = (await getDoc(doc(db, 'users', progressUser.value))).data();
        const statusCounts = await getStatusCounts(progressUser.value, progressWorkType.value);

        // Update contact list HTML with full contact row template

        progressData.innerHTML = `
            <div class="section-wrapper">
                <div class="table-container">
                    <table class="contacts-table">
                        <thead>
                            <tr>
                                <th style="width: 50px;">
                                    <input type="checkbox" id="selectAllContacts" class="select-all">
                                </th>
                                <th>Contact Info</th>
                                <th>Actions</th>
                                <th>
                                    <select id="statusFilter" class="status-filter">
                                        <option value="">All Status</option>
                                        <option value="notCalled">Not Called</option>
                                        <option value="answered">Answered</option>
                                        <option value="notAnswered">Not Answered</option>
                                        <option value="notInterested">Not Interested</option>
                                        <option value="callLater">Call Later</option>
                                        <option value="alreadyInCourse">Already in Course</option>
                                    </select>
                                </th>
                                <th>Notes</th>
                                <th>Last Updated</th>
                                <th>Manage</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${snapshot.docs.map(doc => {
                                const data = doc.data();
                                return `
                                    <tr data-contactid="${doc.id}">
                                        <td><input type="checkbox" class="contact-checkbox" data-contactid="${doc.id}"></td>
                                        <td>
                                            <div class="contact-details">
                                                <div class="contact-name">${data.name}</div>
                                                <div class="contact-phone">${data.phone}</div>
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
                                            <select class="status-select" onchange="window.updateContactStatus('${doc.id}', this.value)">
                                                <option value="notCalled" ${data.status === 'notCalled' ? 'selected' : ''}>Not Called</option>
                                                <option value="answered" ${data.status === 'answered' ? 'selected' : ''}>Answered</option>
                                                <option value="notAnswered" ${data.status === 'notAnswered' ? 'selected' : ''}>Not Answered</option>
                                                <option value="notInterested" ${data.status === 'notInterested' ? 'selected' : ''}>Not Interested</option>
                                                <option value="callLater" ${data.status === 'callLater' ? 'selected' : ''}>Call Later</option>
                                                <option value="alreadyInCourse" ${data.status === 'alreadyInCourse' ? 'selected' : ''}>Already in Course</option>
                                            </select>
                                        </td>
                                        <td>
                                            <textarea class="notes-textarea" placeholder="Add notes..." onchange="window.updateContactNotes('${doc.id}', this.value)">${data.notes || ''}</textarea>
                                        </td>
                                        <td>${data.lastUpdated ? new Date(data.lastUpdated.toDate()).toLocaleString() : '-'}</td>
                                        <td>
                                            <div class="action-buttons">
                                                <button class="action-btn edit-btn" onclick="window.toggleContactEdit('${doc.id}')">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="action-btn delete-btn" onclick="window.deleteContact('${doc.id}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="bulk-actions">
                    <button id="deleteSelectedContacts" class="danger-btn" style="display: none;">
                        <i class="fas fa-trash"></i> Delete Selected
                        <span class="selected-count"></span>
                    </button>
                    <button id="updateSelectedStatus" class="update-btn" style="display: none;">
                        <i class="fas fa-edit"></i> Update Status
                        <select class="bulk-status-select">
                            <option value="">Select Status</option>
                            <option value="notCalled">Not Called</option>
                            <option value="answered">Answered</option>
                            <option value="notAnswered">Not Answered</option>
                            <option value="notInterested">Not Interested</option>
                            <option value="callLater">Call Later</option>
                            <option value="alreadyInCourse">Already in Course</option>
                        </select>
                    </button>
                </div>
            </div>
        `;

        // Add event listener for bulk status update
        const bulkStatusSelect = document.querySelector('.bulk-status-select');
        const updateSelectedBtn = document.getElementById('updateSelectedStatus');
        
        bulkStatusSelect?.addEventListener('change', async () => {
            const selectedContacts = Array.from(document.querySelectorAll('.contact-checkbox:checked'))
                .map(checkbox => checkbox.dataset.contactid);
            
            if (selectedContacts.length === 0 || !bulkStatusSelect.value) return;
            
            if (confirm(`Update status to "${bulkStatusSelect.value}" for ${selectedContacts.length} contacts?`)) {
                try {
                    const batch = writeBatch(db);
                    selectedContacts.forEach(contactId => {
                        batch.update(doc(db, 'contacts', contactId), {
                            status: bulkStatusSelect.value,
                            lastUpdated: serverTimestamp()
                        });
                    });
                    await batch.commit();
                    
                    // Update UI
                    selectedContacts.forEach(contactId => {
                        const statusSelect = document.querySelector(`tr[data-contactid="${contactId}"] .status-select`);
                        if (statusSelect) statusSelect.value = bulkStatusSelect.value;
                    });
                    
                    alert('Status updated successfully');
                } catch (error) {
                    console.error('Error updating status:', error);
                    alert('Error updating status');
                }
            }
        });

        // Add the status filter functionality
        const statusFilter = document.getElementById('statusFilter');
        statusFilter?.addEventListener('change', async () => {
            const selectedStatus = statusFilter.value;
            let filteredQuery = baseQuery;

            if (selectedStatus) {
                filteredQuery = query(
                    collection(db, 'contacts'),
                    where('assignedTo', '==', progressUser.value),
                    where('workType', '==', progressWorkType.value),
                    where('status', '==', selectedStatus)
                );
            }

            await updateContactsList(filteredQuery);
        });

        initCheckboxHandlers('contact');

        // Add style for the bulk actions and table
        const style = document.createElement('style');
        style.textContent = `
            .bulk-actions {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #fff;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                display: flex;
                gap: 10px;
                z-index: 1000;
            }

            .bulk-actions button {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.3s ease;
            }

            .danger-btn {
                background: #dc3545;
                color: white;
            }

            .update-btn {
                background: #17a2b8;
                color: white;
            }

            .bulk-status-select {
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid #ddd;
                margin-left: 8px;
            }

            .status-filter {
                width: 100%;
                padding: 6px;
                border-radius: 4px;
                border: 1px solid #ddd;
            }

            .selected-count {
                background: rgba(255,255,255,0.2);
                padding: 2px 6px;
                border-radius: 4px;
                margin-left: 4px;
            }

            .contacts-table th {
                position: sticky;
                top: 0;
                background: #f8f9fa;
                z-index: 10;
            }
        `;
        document.head.appendChild(style);

        // Attach bulk delete handler for contacts
        const deleteSelectedContactsBtn = document.getElementById('deleteSelectedContacts');
        if (deleteSelectedContactsBtn) {
            // Replace button node to clear previous listeners
            const newBtn = deleteSelectedContactsBtn.cloneNode(true);
            deleteSelectedContactsBtn.parentNode.replaceChild(newBtn, deleteSelectedContactsBtn);
            newBtn.addEventListener('click', async () => {
                const selectedContacts = Array.from(document.querySelectorAll('.contact-checkbox:checked'))
                    .map(cb => cb.dataset.contactid);
                if (selectedContacts.length === 0) {
                    alert("Please select contacts to delete");
                    return;
                }
                if (!confirm(`Are you sure you want to delete ${selectedContacts.length} selected contact(s)? This action cannot be undone.`)) {
                    return;
                }
                try {
                    newBtn.disabled = true;
                    newBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
                    // Delete contacts one by one
                    for (const contactId of selectedContacts) {
                        await window.deleteContact(contactId);
                    }
                    alert("Selected contacts deleted successfully");
                } catch (error) {
                    console.error("Error deleting contacts:", error);
                    alert("Error deleting contacts: " + error.message);
                } finally {
                    newBtn.disabled = false;
                    newBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Selected';
                    updateDeleteButtonVisibility('contact');
                }
            });
        }
    }

    // Add status filter change handler
    if (statusHeaderFilter) {
        statusHeaderFilter.addEventListener('change', async () => {
            const selectedStatus = statusHeaderFilter.value;
            let filteredQuery;

            if (selectedStatus) {
                filteredQuery = query(collection(db, 'contacts'),
                    where('assignedTo', '==', progressUser.value),
                    where('workType', '==', progressWorkType.value),
                    where('status', '==', selectedStatus)
                );
            } else {
                filteredQuery = baseQuery;
            }

            // Update the contacts list with filtered data
            await updateContactsList(filteredQuery);
        });
    }

    // Set up real-time listener for initial/unfiltered data
    progressUnsubscribe = onSnapshot(baseQuery, async () => {
        await updateContactsList(baseQuery);
        if (progressUser.value) {
            loadUserActivities(progressUser.value, today);
            loadUserPageVisits(progressUser.value, today);
        }
    });

    // Load activities and page visits
    loadUserActivities(progressUser.value, today);
    loadUserPageVisits(progressUser.value, today);

    // Initialize activity date filters
    initActivityDateRange();
    initPeriodSelector();
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

// Update the window.deleteContact function
window.deleteContact = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
        return;
    }

    try {
        // Show loading state on the delete button
        const deleteButton = document.querySelector(`tr[data-contactid="${contactId}"] .delete-btn`);
        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        await deleteDoc(doc(db, 'contacts', contactId));

        // Remove the row from the table
        const row = document.querySelector(`tr[data-contactid="${contactId}"]`);
        if (row) {
            row.remove();
        }

    } catch (error) {
        console.error('Error deleting contact:', error);
        alert('Error deleting contact: ' + error.message);
    } finally {
        // Reset button state if the row still exists
        const deleteButton = document.querySelector(`tr[data-contactid="${contactId}"] .delete-btn`);
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        }
    }
};

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

// 1. Update the resetActivityDisplay function to check for null elements
function resetActivityDisplay() {
    // Add null checks for each element
    if (firstLogin) firstLogin.textContent = '-';
    if (lastLogout) lastLogout.textContent = '-';
    if (totalDuration) totalDuration.textContent = '-';
    if (sessionCount) sessionCount.textContent = '-';
    if (activityTimeline) activityTimeline.innerHTML = '';
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

// Add this helper function
function resetAllDisplays() {
    const displays = {
        userContactInfo: document.getElementById('userContactInfo'),
        progressData: document.getElementById('progressData'),
        visitsLog: document.getElementById('visitsLog'),
        activityLog: document.getElementById('activityLog'),
        totalTimeToday: document.getElementById('totalTimeToday'),
        pageOpens: document.getElementById('pageOpens')
    };

    // Clear all displays safely
    if (displays.userContactInfo) displays.userContactInfo.innerHTML = '';
    if (displays.progressData) displays.progressData.innerHTML = '';
    if (displays.visitsLog) displays.visitsLog.innerHTML = '<tr><td colspan="3">No data available</td></tr>';
    if (displays.activityLog) displays.activityLog.innerHTML = '<tr><td colspan="3">No data available</td></tr>';
    if (displays.totalTimeToday) displays.totalTimeToday.textContent = '-';
    if (displays.pageOpens) displays.pageOpens.textContent = '0';
}

// Add these new functions after your existing activity-related functions
function initActivityDateRange() {
    const today = new Date();
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    // Set default date range to current week
    startDate.value = formatDateForInput(new Date(today.setDate(today.getDate() - 7)));
    endDate.value = formatDateForInput(new Date());

    // Add event listeners
    startDate.addEventListener('change', updateActivityData);
    endDate.addEventListener('change', updateActivityData);
}

function initPeriodSelector() {
    const periodBtns = document.querySelectorAll('.period-btn');

    periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            periodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Set date range based on selected period
            const period = btn.dataset.period;
            setDateRangeForPeriod(period);
            updateActivityData();
        });
    });
}

function setDateRangeForPeriod(period) {
    const today = new Date();
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    switch (period) {
        case 'day':
            startDate.value = formatDateForInput(today);
            endDate.value = formatDateForInput(today);
            break;
        case 'week':
            startDate.value = formatDateForInput(new Date(today.setDate(today.getDate() - 7)));
            endDate.value = formatDateForInput(new Date());
            break;
        case 'month':
            startDate.value = formatDateForInput(new Date(today.setMonth(today.getMonth() - 1)));
            endDate.value = formatDateForInput(new Date());
            break;
    }
}

// async function updateActivityData() {
//     const startDate = document.getElementById('startDate').value;
//     const endDate = document.getElementById('endDate').value;
//     const userId = progressUser.value;

//     if (!userId || !startDate || !endDate) return;

//     try {
//         // Fetch activities for date range
//         const activities = await getActivitiesForDateRange(userId, startDate, endDate);

//         // Update summary cards
//         updateActivitySummary(activities);

//         // Update activity logs
//         updateActivityLogs(activities);
//     } catch (error) {
//         console.error('Error updating activity data:', error);
//     }
// }

async function getActivitiesForDateRange(userId, startDate, endDate) {
    const activitiesRef = collection(db, 'userActivities');
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0); // Start of day

    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999); // End of day

    try {
        // Query for both activities and page visits
        const activitiesQuery = query(
            activitiesRef,
            where('userId', '==', userId),
            where('date', '>=', startDate),
            where('date', '<=', endDate),
            orderBy('date', 'desc'),
            orderBy('startTime', 'desc')
        );

        const snapshot = await getDocs(activitiesQuery);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp || doc.data().startTime // Fallback for older records
        }));
    } catch (error) {
        console.error('Error fetching activities:', error);
        return [];
    }
}

function updateActivitySummary(activities) {
    let totalTime = 0;
    let totalSessions = activities.length;
    let completedTasks = activities.filter(a => a.status === 'completed').length;

    activities.forEach(activity => {
        if (activity.duration) {
            totalTime += activity.duration;
        }
    });

    // Update summary cards
    document.getElementById('totalActiveTime').textContent = formatDuration(totalTime);
    document.getElementById('avgDailyTime').textContent = formatDuration(totalTime / getDaysBetweenDates());
    document.getElementById('totalSessions').textContent = totalSessions;
    document.getElementById('completionRate').textContent =
        totalSessions ? `${Math.round((completedTasks / totalSessions) * 100)}%` : '0%';
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function getDaysBetweenDates() {
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    return Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
}

// Add missing updateActivityLogs function
function updateActivityLogs(activities) {
    const activityLog = document.getElementById('activityLog');
    const visitsLog = document.getElementById('visitsLog');

    // Update activity log
    const activityHtml = activities.map(activity => {
        const startTime = activity.startTime;
        const type = activity.type || 'Page Visit';
        const duration = activity.duration ? formatDuration(activity.duration) : '-';

        return `
            <tr>
                <td>${formatLogTime(startTime)}</td>
                <td>${type}</td>
                <td>${duration}</td>
            </tr>
        `;
    }).join('');

    activityLog.innerHTML = activityHtml || '<tr><td colspan="3">No activities recorded for this period</td></tr>';

    // Update visits log for page visits
    const visitsHtml = activities
        .filter(activity => activity.type === 'Page Visit' && activity.openTime && activity.closeTime)
        .map(visit => `
            <tr>
                <td>${formatLogTime(visit.openTime)}</td>
                <td>${formatLogTime(visit.closeTime)}</td>
                <td>${formatDuration(visit.duration)}</td>
            </tr>
        `).join('');

    visitsLog.innerHTML = visitsHtml || '<tr><td colspan="3">No page visits recorded for this period</td></tr>';
}

// Update the getActivitiesForDateRange function to handle date ranges properly
// async function getActivitiesForDateRange(userId, startDate, endDate) {
//     const activitiesRef = collection(db, 'userActivities');
//     const startDateTime = new Date(startDate);
//     const endDateTime = new Date(endDate);
//     endDateTime.setHours(23, 59, 59, 999); // Set to end of day

//     const q = query(
//         activitiesRef,
//         where('userId', '==', userId),
//         where('timestamp', '>=', startDateTime),
//         where('timestamp', '<=', endDateTime),
//         orderBy('timestamp', 'desc')
//     );

//     try {
//         const snapshot = await getDocs(q);
//         return snapshot.docs.map(doc => ({
//             id: doc.id,
//             ...doc.data()
//         }));
//     } catch (error) {
//         console.error('Error fetching activities:', error);
//         return [];
//     }
// }

// Update the updateActivityData function to handle errors better
async function updateActivityData() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const userId = progressUser.value;

    if (!userId || !startDate || !endDate) {
        resetActivityDisplays();
        return;
    }

    try {
        // Show loading state
        showLoadingState();

        // Fetch activities for date range
        const activities = await getActivitiesForDateRange(userId, startDate, endDate);

        // Update summary cards
        updateActivitySummary(activities);

        // Update activity logs
        updateActivityLogs(activities);

    } catch (error) {
        console.error('Error updating activity data:', error);
        showErrorState('Error loading activity data');
    } finally {
        hideLoadingState();
    }
}

// Add helper functions for loading states
function showLoadingState() {
    const loaders = document.querySelectorAll('.activity-loader');
    loaders.forEach(loader => loader.style.display = 'block');
}

function hideLoadingState() {
    const loaders = document.querySelectorAll('.activity-loader');
    loaders.forEach(loader => loader.style.display = 'none');
}

function showErrorState(message) {
    // Update activity displays with error message
    const displays = [
        document.getElementById('activityLog'),
        document.getElementById('visitsLog')
    ];

    displays.forEach(display => {
        if (display) {
            display.innerHTML = `<tr><td colspan="3">${message}</td></tr>`;
        }
    });
}

function resetActivityDisplays() {
    // Reset all activity displays to default state
    const elements = {
        activityLog: document.getElementById('activityLog'),
        visitsLog: document.getElementById('visitsLog'),
        totalActiveTime: document.getElementById('totalActiveTime'),
        avgDailyTime: document.getElementById('avgDailyTime'),
        totalSessions: document.getElementById('totalSessions'),
        completionRate: document.getElementById('completionRate')
    };

    if (elements.activityLog) elements.activityLog.innerHTML = '<tr><td colspan="3">No data available</td></tr>';
    if (elements.visitsLog) elements.visitsLog.innerHTML = '<tr><td colspan="3">No data available</td></tr>';
    if (elements.totalActiveTime) elements.totalActiveTime.textContent = '-';
    if (elements.avgDailyTime) elements.avgDailyTime.textContent = '-';
    if (elements.totalSessions) elements.totalSessions.textContent = '-';
    if (elements.completionRate) elements.completionRate.textContent = '-';
}

// Add these functions after your existing code

// Add function to load existing users with inline editing
// async function loadExistingUsers() {
//     const q = query(collection(db, 'users'), where('role', '==', 'user'));
//     const snapshot = await getDocs(q);
    
//     const html = `
//         <div class="section-wrapper">
//             <div class="table-container">
//                 <table class="users-table">
//                     <thead>
//                         <tr>
//                             <th style="width: 50px;">
//                                 <input type="checkbox" id="selectAllUsers" class="select-all">
//                             </th>
//                             <th>Name</th>
//                             <th>Phone</th>
//                             <th>Email</th>
//                             <th>Actions</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         ${snapshot.docs.map(doc => {
//                             const data = doc.data();
//                             return `
//                                 <tr data-userid="${doc.id}">
//                                     <td><input type="checkbox" class="user-checkbox" data-userid="${doc.id}"></td>
//                                     <td><input type="text" class="inline-edit name" value="${data.name || ''}" readonly></td>
//                                     <td><input type="tel" class="inline-edit phone" value="${data.phone || ''}" readonly></td>
//                                     <td><input type="email" class="inline-edit email" value="${data.email || ''}" readonly></td>
//                                     <td>
//                                         <div class="action-buttons">
//                                             <button class="action-btn edit-user-btn" onclick="window.toggleEdit(this)">
//                                                 <i class="fas fa-edit"></i>
//                                             </button>
//                                             <button class="action-btn save-user-btn" onclick="window.saveChanges(this)" style="display: none;">
//                                                 <i class="fas fa-save"></i>
//                                             </button>
//                                             <button class="action-btn delete-user-btn" onclick="window.deleteUser('${doc.id}')">
//                                                 <i class="fas fa-trash"></i>
//                                             </button>
//                                         </div>
//                                     </td>
//                                 </tr>
//                             `;
//                         }).join('')}
//                     </tbody>
//                 </table>
//             </div>
//             <div class="bulk-actions">
//                 <button id="deleteSelectedUsers" class="danger-btn" style="display: none;">Delete Selected Users</button>
//             </div>
//         </div>
//     `;

//     usersList.innerHTML = html;
//     initCheckboxHandlers('user');
    
//     // Add bulk delete handler
//     const deleteSelectedBtn = document.getElementById('deleteSelectedUsers');
//     deleteSelectedBtn?.addEventListener('click', async () => {
//         const selectedUsers = Array.from(document.querySelectorAll('.user-checkbox:checked'))
//             .map(checkbox => checkbox.dataset.userid);
        
//         if (selectedUsers.length === 0) {
//             alert('Please select users to delete');
//             return;
//         }

//         if (!confirm(`Are you sure you want to delete ${selectedUsers.length} selected users? This cannot be undone.`)) {
//             return;
//         }

//         try {
//             // Show loading state
//             deleteSelectedBtn.disabled = true;
//             deleteSelectedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

//             // Delete users in sequence to avoid overwhelming the system
//             for (const userId of selectedUsers) {
//                 await deleteUserAndAssociatedData(userId);
//                 // Remove row from UI
//                 const row = document.querySelector(`tr[data-userid="${userId}"]`);
//                 if (row) row.remove();
//             }

//             // Refresh the users lists
//             await loadUsers();
//             alert('Selected users deleted successfully');
//         } catch (error) {
//             console.error('Error deleting users:', error);
//             alert('Error deleting some users. Please try again.');
//         } finally {
//             // Reset button state
//             deleteSelectedBtn.disabled = false;
//             deleteSelectedBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Selected Users';
//             updateDeleteButtonVisibility('user');
//         }
//     });
// }

// Update the styles for bulk actions
const bulkActionsStyle = document.createElement('style');
bulkActionsStyle.textContent = `
    .bulk-actions {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #fff;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 3px 15px rgba(0,0,0,0.2);
        display: flex;
        gap: 10px;
        z-index: 1000;
        transition: all 0.3s ease;
    }

    .bulk-actions .danger-btn {
        background: #dc3545;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
    }

    .bulk-actions .danger-btn:hover {
        background: #c82333;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
    }

    .bulk-actions .danger-btn:active {
        transform: translateY(0);
    }

    .bulk-actions .danger-btn:disabled {
        background: #6c757d;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    .bulk-actions .danger-btn i {
        font-size: 1.1em;
    }

    .bulk-actions .selected-count {
        background: rgba(255,255,255,0.2);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.9em;
        margin-left: 4px;
    }

    @media (max-width: 768px) {
        .bulk-actions {
            bottom: 10px;
            right: 10px;
            left: 10px;
            padding: 10px;
        }
        
        .bulk-actions .danger-btn {
            width: 100%;
            justify-content: center;
        }
    }
`;

// Remove any existing bulk actions styles and add the new one
document.querySelectorAll('style').forEach(style => {
    if (style.textContent.includes('.bulk-actions')) {
        style.remove();
    }
});
document.head.appendChild(bulkActionsStyle);

// Modify updateContactsList to include checkboxes
async function updateContactsList(filterQuery) {
    const snapshot = await getDocs(filterQuery);
    
    progressData.innerHTML = `
        <div class="section-wrapper">
            <div class="table-container">
                <table class="contacts-table">
                    <thead>
                        <tr>
                            <th style="width: 50px;">
                                <input type="checkbox" id="selectAllContacts" class="select-all">
                            </th>
                            <th>Contact Info</th>
                            <th>Actions</th>
                            <th>
                                <select id="statusFilter" class="status-filter">
                                    <option value="">All Status</option>
                                    <option value="notCalled">Not Called</option>
                                    <option value="answered">Answered</option>
                                    <option value="notAnswered">Not Answered</option>
                                    <option value="notInterested">Not Interested</option>
                                    <option value="callLater">Call Later</option>
                                    <option value="alreadyInCourse">Already in Course</option>
                                </select>
                            </th>
                            <th>Notes</th>
                            <th>Last Updated</th>
                            <th>Manage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${snapshot.docs.map(doc => {
                            const data = doc.data();
                            return `
                                <tr data-contactid="${doc.id}">
                                    <td><input type="checkbox" class="contact-checkbox" data-contactid="${doc.id}"></td>
                                    <td>
                                        <div class="contact-details">
                                            <div class="contact-name">${data.name}</div>
                                            <div class="contact-phone">${data.phone}</div>
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
                                        <select class="status-select" onchange="window.updateContactStatus('${doc.id}', this.value)">
                                            <option value="notCalled" ${data.status === 'notCalled' ? 'selected' : ''}>Not Called</option>
                                            <option value="answered" ${data.status === 'answered' ? 'selected' : ''}>Answered</option>
                                            <option value="notAnswered" ${data.status === 'notAnswered' ? 'selected' : ''}>Not Answered</option>
                                            <option value="notInterested" ${data.status === 'notInterested' ? 'selected' : ''}>Not Interested</option>
                                            <option value="callLater" ${data.status === 'callLater' ? 'selected' : ''}>Call Later</option>
                                            <option value="alreadyInCourse" ${data.status === 'alreadyInCourse' ? 'selected' : ''}>Already in Course</option>
                                        </select>
                                    </td>
                                    <td>
                                        <textarea class="notes-textarea" placeholder="Add notes..." onchange="window.updateContactNotes('${doc.id}', this.value)">${data.notes || ''}</textarea>
                                    </td>
                                    <td>${data.lastUpdated ? new Date(data.lastUpdated.toDate()).toLocaleString() : '-'}</td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn edit-btn" onclick="window.toggleContactEdit('${doc.id}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn delete-btn" onclick="window.deleteContact('${doc.id}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="bulk-actions">
                <button id="deleteSelectedContacts" class="danger-btn" style="display: none;">
                    <i class="fas fa-trash"></i> Delete Selected
                    <span class="selected-count"></span>
                </button>
                <button id="updateSelectedStatus" class="update-btn" style="display: none;">
                    <i class="fas fa-edit"></i> Update Status
                    <select class="bulk-status-select">
                        <option value="">Select Status</option>
                        <option value="notCalled">Not Called</option>
                        <option value="answered">Answered</option>
                        <option value="notAnswered">Not Answered</option>
                        <option value="notInterested">Not Interested</option>
                        <option value="callLater">Call Later</option>
                        <option value="alreadyInCourse">Already in Course</option>
                    </select>
                </button>
            </div>
        </div>
    `;

    // Add event listener for bulk status update
    const bulkStatusSelect = document.querySelector('.bulk-status-select');
    const updateSelectedBtn = document.getElementById('updateSelectedStatus');
    
    bulkStatusSelect?.addEventListener('change', async () => {
        const selectedContacts = Array.from(document.querySelectorAll('.contact-checkbox:checked'))
            .map(checkbox => checkbox.dataset.contactid);
        
        if (selectedContacts.length === 0 || !bulkStatusSelect.value) return;
        
        if (confirm(`Update status to "${bulkStatusSelect.value}" for ${selectedContacts.length} contacts?`)) {
            try {
                const batch = writeBatch(db);
                selectedContacts.forEach(contactId => {
                    batch.update(doc(db, 'contacts', contactId), {
                        status: bulkStatusSelect.value,
                        lastUpdated: serverTimestamp()
                    });
                });
                await batch.commit();
                
                // Update UI
                selectedContacts.forEach(contactId => {
                    const statusSelect = document.querySelector(`tr[data-contactid="${contactId}"] .status-select`);
                    if (statusSelect) statusSelect.value = bulkStatusSelect.value;
                });
                
                alert('Status updated successfully');
            } catch (error) {
                console.error('Error updating status:', error);
                alert('Error updating status');
            }
        }
    });

    // Add the status filter functionality
    const statusFilter = document.getElementById('statusFilter');
    statusFilter?.addEventListener('change', async () => {
        const selectedStatus = statusFilter.value;
        let filteredQuery = baseQuery;

        if (selectedStatus) {
            filteredQuery = query(
                collection(db, 'contacts'),
                where('assignedTo', '==', progressUser.value),
                where('workType', '==', progressWorkType.value),
                where('status', '==', selectedStatus)
            );
        }

        await updateContactsList(filteredQuery);
    });

    initCheckboxHandlers('contact');

    // Add style for the bulk actions and table
    const style = document.createElement('style');
    style.textContent = `
        .bulk-actions {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #fff;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: flex;
            gap: 10px;
            z-index: 1000;
        }

        .bulk-actions button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .danger-btn {
            background: #dc3545;
            color: white;
        }

        .update-btn {
            background: #17a2b8;
            color: white;
        }

        .bulk-status-select {
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #ddd;
            margin-left: 8px;
        }

        .status-filter {
            width: 100%;
            padding: 6px;
            border-radius: 4px;
            border: 1px solid #ddd;
        }

        .selected-count {
            background: rgba(255,255,255,0.2);
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 4px;
        }

        .contacts-table th {
            position: sticky;
            top: 0;
            background: #f8f9fa;
            z-index: 10;
        }
    `;
    document.head.appendChild(style);

    // Attach bulk delete handler for contacts
    const deleteSelectedContactsBtn = document.getElementById('deleteSelectedContacts');
    if (deleteSelectedContactsBtn) {
        // Replace button node to clear previous listeners
        const newBtn = deleteSelectedContactsBtn.cloneNode(true);
        deleteSelectedContactsBtn.parentNode.replaceChild(newBtn, deleteSelectedContactsBtn);
        newBtn.addEventListener('click', async () => {
            const selectedContacts = Array.from(document.querySelectorAll('.contact-checkbox:checked'))
                .map(cb => cb.dataset.contactid);
            if (selectedContacts.length === 0) {
                alert("Please select contacts to delete");
                return;
            }
            if (!confirm(`Are you sure you want to delete ${selectedContacts.length} selected contact(s)? This action cannot be undone.`)) {
                return;
            }
            try {
                newBtn.disabled = true;
                newBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
                // Delete contacts one by one
                for (const contactId of selectedContacts) {
                    await window.deleteContact(contactId);
                }
                alert("Selected contacts deleted successfully");
            } catch (error) {
                console.error("Error deleting contacts:", error);
                alert("Error deleting contacts: " + error.message);
            } finally {
                newBtn.disabled = false;
                newBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Selected';
                updateDeleteButtonVisibility('contact');
            }
        });
    }
}

// Update checkbox handlers

// Add some CSS for the bulk actions
const style = document.createElement('style');
style.textContent = `
    .section-wrapper {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .bulk-actions {
        position: sticky;
        top: 0;
        z-index: 1;
        background: #f5f5f5;
        padding: 1rem;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .table-container {
        overflow-x: auto;
    }
    .danger-btn {
        background: #dc3545;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    .danger-btn:hover {
        background: #c82333;
    }
    .danger-btn:disabled {
        background: #6c757d;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);

// Add styles to head
const bulkActionStyles = document.createElement('style');
bulkActionStyles.textContent = `
    .section-wrapper {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .bulk-actions {
        margin: 10px 0;
        padding: 10px;
        background: #f5f5f5;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        position: sticky;
        bottom: 0;
        z-index: 1;
    }
    .table-container {
        overflow-x: auto;
        margin-bottom: 60px;
    }
    .danger-btn {
        background: #dc3545;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    .danger-btn:hover {
        background: #c82333;
    }
    .danger-btn:disabled {
        background: #6c757d;
        cursor: not-allowed;
    }
`;
document.head.appendChild(bulkActionStyles);

// Remove any duplicate style elements
document.querySelectorAll('style').forEach((style, index) => {
    if (index > 0 && style.textContent.includes('.bulk-actions')) {
        style.remove();
    }
});


function updateDeleteButtonVisibility(type) {
    const selectedCount = document.querySelectorAll(`.${type}-checkbox:checked`).length;
    const deleteBtn = document.getElementById(`deleteSelected${type.charAt(0).toUpperCase() + type.slice(1)}s`);
    const updateBtn = document.getElementById('updateSelectedStatus');
    
    if (deleteBtn) {
        deleteBtn.style.display = selectedCount > 0 ? 'inline-flex' : 'none';
        const countSpan = deleteBtn.querySelector('.selected-count');
        if (countSpan) {
            countSpan.textContent = `(${selectedCount})`;
        } else {
            deleteBtn.textContent = `Delete Selected ${type.charAt(0).toUpperCase() + type.slice(1)}s (${selectedCount})`;
        }
    }
    
    // Only show update status button for contacts
    if (updateBtn && type === 'contact') {
        updateBtn.style.display = selectedCount > 0 ? 'inline-flex' : 'none';
    }
}


// Add checkbox event listeners
function initCheckboxHandlers(type) {
    const selectAllCheckbox = document.getElementById(`selectAll${type.charAt(0).toUpperCase() + type.slice(1)}s`);
    const checkboxes = document.querySelectorAll(`.${type}-checkbox`);
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', () => {
            checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
            updateDeleteButtonVisibility(type);
        });
    }

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => updateDeleteButtonVisibility(type));
    });
}

// Initialize the checkbox handlers
document.addEventListener('DOMContentLoaded', () => {
    initCheckboxHandlers('user');
    initCheckboxHandlers('contact');
});

// Modify the addCheckboxesToTables function to only add headers if they don't exist
function addCheckboxesToTables() {
    // Add checkbox to contacts table header only if it doesn't exist
    const existingContactHeader = document.querySelector('#progressData .select-all');
    const contactTableHeader = document.querySelector('#progressData tr:first-child');
    if (contactTableHeader && !existingContactHeader) {
        const firstTh = contactTableHeader.querySelector('th:first-child');
        if (firstTh) {
            firstTh.innerHTML = '<input type="checkbox" id="selectAllContacts" class="select-all">';
            
            // Add event listener to new select all checkbox
            document.getElementById('selectAllContacts').addEventListener('change', e => {
                const checkboxes = document.querySelectorAll('.contact-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
                updateDeleteButtonVisibility('contact');
            });
        }
    }
}

// Update loadExistingUsers function with fixed bulk delete functionality
async function loadExistingUsers() {
    const q = query(collection(db, 'users'), where('role', '==', 'user'));
    const snapshot = await getDocs(q);
    
    const html = `
        <div class="section-wrapper">
            <div class="table-container">
                <table class="users-table">
                    <thead>
                        <tr>
                            <th style="width: 50px;">
                                <input type="checkbox" id="selectAllUsers" class="select-all">
                            </th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${snapshot.docs.map(doc => {
                            const data = doc.data();
                            return `
                                <tr data-userid="${doc.id}">
                                    <td><input type="checkbox" class="user-checkbox" data-userid="${doc.id}"></td>
                                    <td><input type="text" class="inline-edit name" value="${data.name || ''}" readonly></td>
                                    <td><input type="tel" class="inline-edit phone" value="${data.phone || ''}" readonly></td>
                                    <td><input type="email" class="inline-edit email" value="${data.email || ''}" readonly></td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn edit-user-btn" onclick="window.toggleEdit(this)">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn save-user-btn" onclick="window.saveChanges(this)" style="display: none;">
                                                <i class="fas fa-save"></i>
                                            </button>
                                            <button class="action-btn delete-user-btn" onclick="window.deleteUser('${doc.id}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="bulk-actions">
                <button id="deleteSelectedUsers" class="danger-btn" style="display: none;">Delete Selected Users</button>
            </div>
        </div>
    `;

    usersList.innerHTML = html;
    initCheckboxHandlers('user');
    
    // Fix bulk delete handler for users in work progress section
    const deleteSelectedBtn = document.getElementById('deleteSelectedUsers');
    // Replace the button element to clear any previous listeners
    deleteSelectedBtn.replaceWith(deleteSelectedBtn.cloneNode(true));
    const newDeleteSelectedBtn = document.getElementById('deleteSelectedUsers');
    newDeleteSelectedBtn.addEventListener('click', async () => {
        const selectedUsers = Array.from(document.querySelectorAll('.user-checkbox:checked'))
            .map(checkbox => checkbox.dataset.userid);
        
        if (selectedUsers.length === 0) {
            alert('Please select users to delete');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete ${selectedUsers.length} selected user(s) and ALL their associated data? This cannot be undone.`)) {
            return;
        }
        
        try {
            newDeleteSelectedBtn.disabled = true;
            newDeleteSelectedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            
            for (const userId of selectedUsers) {
                await deleteUserAndAssociatedData(userId);
                const row = document.querySelector(`tr[data-userid="${userId}"]`);
                if (row) row.remove();
            }
            
            // Refresh user lists
            await Promise.all([loadUsers(), loadExistingUsers()]);
            alert('Selected users deleted successfully');
        } catch (error) {
            console.error('Error deleting users:', error);
            alert('Error deleting users: ' + error.message);
        } finally {
            newDeleteSelectedBtn.disabled = false;
            newDeleteSelectedBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Selected Users';
            updateDeleteButtonVisibility('user');
        }
    });
}

// Update bulk actions styling for better visibility
// const bulkActionStyles = document.createElement('style');
bulkActionStyles.textContent = `
    .bulk-actions {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #fff;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 3px 15px rgba(0,0,0,0.2);
        display: flex;
        gap: 10px;
        z-index: 1000;
        transition: all 0.3s ease;
    }

    .bulk-actions .danger-btn {
        background: #dc3545;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        min-width: 180px;
        justify-content: center;
    }

    .bulk-actions .danger-btn:hover {
        background: #c82333;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
    }

    .bulk-actions .danger-btn:active {
        transform: translateY(0);
    }

    .bulk-actions .danger-btn:disabled {
        background: #6c757d;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    .bulk-actions .danger-btn i {
        font-size: 1.1em;
    }

    .bulk-actions .selected-count {
        background: rgba(255,255,255,0.2);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.9em;
        margin-left: 4px;
    }
`;

// Remove any existing bulk actions styles and add the new one
document.querySelectorAll('style').forEach(style => {
    if (style.textContent.includes('.bulk-actions')) {
        style.remove();
    }
});
document.head.appendChild(bulkActionStyles);
