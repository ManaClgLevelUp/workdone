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
        // Create auth user using the imported function
        const userCredential = await createUserWithEmailAndPassword(auth, userId.value, userPassword.value);
        
        // Add user to Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: userName.value,
            email: userId.value,
            role: 'user',
            createdAt: serverTimestamp()
        });

        alert('User created successfully');
        createUserForm.reset();
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

function setupProgressListener() {
    if (progressUnsubscribe) {
        progressUnsubscribe();
    }

    if (!progressUser.value) return;

    const q = query(collection(db, 'contacts'), 
        where('assignedTo', '==', progressUser.value),
        where('workType', '==', progressWorkType.value));

    progressUnsubscribe = onSnapshot(q, snapshot => {
        const html = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <tr>
                    <td>${data.name}</td>
                    <td>${data.callTime || '-'}</td>
                    <td>${data.whatsappTime || '-'}</td>
                    <td>${data.status}</td>
                    <td>${data.notes || '-'}</td>
                    <td>${data.lastUpdated ? new Date(data.lastUpdated.toDate()).toLocaleString() : '-'}</td>
                    <td>
                        <button class="edit-btn" onclick="editContact('${doc.id}')">Edit</button>
                        <button class="delete-btn" onclick="deleteContact('${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
        progressData.innerHTML = html;
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