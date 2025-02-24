import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut,
    createUserWithEmailAndPassword 
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
    onSnapshot,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    setDoc,
    writeBatch // Add this import
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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

// Create User Handler
createUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, userId.value, userPassword.value);
        
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: userName.value,
            email: userId.value,
            phone: userPhone.value,
            role: 'user',
            createdAt: serverTimestamp()
        });

        alert('User created successfully');
        createUserForm.reset();
        loadExistingUsers(); // Refresh users list
    } catch (error) {
        alert('Error creating user: ' + error.message);
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

window.deleteUser = async (userId) => {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            await deleteDoc(doc(db, 'users', userId));
            loadExistingUsers(); // Refresh the list
        } catch (error) {
            alert('Error deleting user: ' + error.message);
        }
    }
};

// Work Assignment Handlers
addSingleContact.addEventListener('click', async () => {
    if (!selectUser.value || !contactName.value || !contactPhone.value) {
        alert('Please fill all fields');
        return;
    }

    try {
        await addDoc(collection(db, 'contacts'), {
            name: contactName.value,
            phone: contactPhone.value,
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
            // Handle tab-separated and colon-separated formats
            const parts = line.includes(':') ? line.split(':') : line.split('\t');
            return parts.map(item => item.trim());
        })
        .filter(([name, phone]) => name && phone);

    try {
        const batch = writeBatch(db);
        
        contacts.forEach(([name, phone]) => {
            const newDocRef = doc(collection(db, 'contacts'));
            batch.set(newDocRef, {
                name,
                phone,
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
    window.location.href = `tel:${phone}`;
    await updateDoc(doc(db, 'contacts', contactId), {
        adminCallTime: serverTimestamp(),
        lastUpdated: serverTimestamp()
    });
};

window.adminSendWhatsApp = async (contactId, phone) => {
    window.open(`https://wa.me/${phone}`, '_blank');
    await updateDoc(doc(db, 'contacts', contactId), {
        adminWhatsappTime: serverTimestamp(),
        lastUpdated: serverTimestamp()
    });
};

function setupProgressListener() {
    if (progressUnsubscribe) {
        progressUnsubscribe();
    }

    if (!progressUser.value) return;

    const q = query(collection(db, 'contacts'), 
        where('assignedTo', '==', progressUser.value),
        where('workType', '==', progressWorkType.value));

    progressUnsubscribe = onSnapshot(q, async (snapshot) => {
        // Get user details for contact
        const userDoc = await getDoc(doc(db, 'users', progressUser.value));
        const userData = userDoc.data();
        
        const userContactHtml = `
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

        const tableHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Contact Details</th>
                        <th>Actions</th>
                        <th>Status</th>
                        <th>Notes</th>
                        <th>Last Updated</th>
                        <th>Manage</th>
                    </tr>
                </thead>
                <tbody>
                    ${snapshot.docs.map(doc => {
                        const data = doc.data();
                        return `
                            <tr>
                                <td>
                                    <div class="contact-name">${data.name}</div>
                                    <div class="contact-phone">${data.phone}</div>
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
                                <td>${data.status || 'Not Called'}</td>
                                <td>${data.notes || '-'}</td>
                                <td>${data.lastUpdated ? new Date(data.lastUpdated.toDate()).toLocaleString() : '-'}</td>
                                <td>
                                    <button class="edit-btn" onclick="editContact('${doc.id}')">Edit</button>
                                    <button class="delete-btn" onclick="deleteContact('${doc.id}')">Delete</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        progressData.innerHTML = userContactHtml + '<div class="progress-table">' + tableHtml + '</div>';
    });
}

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