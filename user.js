import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, query, where, onSnapshot, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const typeButtons = document.querySelectorAll('.type-btn');
const statusFilter = document.getElementById('statusFilter');
const contactsData = document.getElementById('contactsData');

let currentUser = null;
let currentContactId = null;

// Authentication State Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'user') {
            currentUser = user;
            userName.textContent = userDoc.data().name || 'User';
            loadContacts('students'); // Default work type
        } else {
            window.location.href = 'index.html';
        }
    } else {
        window.location.href = 'index.html';
    }
});

// Logout Handler
logoutBtn.addEventListener('click', () => {
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

// Load Contacts
async function loadContacts(workType) {
    if (!currentUser) return;

    let q = query(
        collection(db, 'contacts'),
        where('assignedTo', '==', currentUser.uid),
        where('workType', '==', workType)
    );

    if (statusFilter.value) {
        q = query(q, where('status', '==', statusFilter.value));
    }

    onSnapshot(q, (snapshot) => {
        const html = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <div class="contact-card">
                    <div class="contact-info">
                        <div class="contact-name">${data.name}</div>
                        <div class="contact-phone">${data.phone}</div>
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
    window.location.href = `tel:${phone}`;
    await updateContactStatus(contactId, {
        callTime: serverTimestamp(),
        lastUpdated: serverTimestamp()
    });
};

window.sendWhatsApp = async (contactId, phone) => {
    window.open(`https://wa.me/${phone}`, '_blank');
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

// Status Filter Handler
statusFilter.addEventListener('change', () => {
    const activeWorkType = document.querySelector('.type-btn.active').dataset.type;
    loadContacts(activeWorkType);
});