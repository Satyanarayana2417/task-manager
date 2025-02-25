// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyByossKPMu832CmH6krQvvgyYp2HZ6DDgg",
    authDomain: "notepad-ebdf1.firebaseapp.com",
    projectId: "notepad-ebdf1",
    storageBucket: "notepad-ebdf1.firebasestorage.app",
    messagingSenderId: "622859632750",
    appId: "1:622859632750:web:1c0f9c17c0701eea88667f",
    measurementId: "G-F82HTRSPXE"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const appContainer = document.getElementById('appContainer');
const newNoteForm = document.getElementById('newNoteForm');
const notesGrid = document.getElementById('notesGrid');
const searchNotes = document.getElementById('searchNotes');
const themeToggle = document.getElementById('themeToggle');

// Load notes immediately when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadNotes();
});

// Notes CRUD Operations
async function loadNotes() {
    try {
        notesGrid.innerHTML = '<div class="loading-notes">Loading notes...</div>';

        const notesRef = db.collection('notes')
            .orderBy('timestamp', 'desc');

        const unsubscribe = notesRef.onSnapshot((snapshot) => {
            notesGrid.innerHTML = '';

            if (snapshot.empty) {
                notesGrid.innerHTML = '<div class="no-notes">No notes yet. Create your first note!</div>';
                return;
            }

            snapshot.forEach((doc) => {
                const note = doc.data();
                createNoteElement(doc.id, note);
            });
        }, (error) => {
            console.error("Error loading notes: ", error);
            notesGrid.innerHTML = `
                <div class="notes-error">
                    <p>Error loading notes: ${error.message}</p>
                    <button onclick="loadNotes()" class="btn-secondary">Try Again</button>
                </div>
            `;
        });

        return unsubscribe;
    } catch (error) {
        console.error("Error setting up notes listener: ", error);
        notesGrid.innerHTML = `
            <div class="notes-error">
                <p>Error loading notes: ${error.message}</p>
                <button onclick="loadNotes()" class="btn-secondary">Try Again</button>
            </div>
        `;
    }
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function createNoteElement(id, note) {
    const noteElement = document.createElement('div');
    noteElement.className = 'note-card';
    noteElement.setAttribute('data-note-id', id);

    const safeTitle = escapeHtml(note.title);
    const safeDescription = escapeHtml(note.description);

    noteElement.innerHTML = `
        <div class="note-header">
            <h3 class="note-title" data-editable="false">${safeTitle}</h3>
            <div class="note-actions">
                <button onclick="copyNote('${id}')" class="btn-icon" title="Copy">
                    <i class="fas fa-copy"></i>
                </button>
                <button onclick="editNote('${id}')" class="btn-icon edit-btn" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteNote('${id}')" class="btn-icon" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="note-content" data-editable="false">${safeDescription}</div>
        <div class="edit-actions" style="display: none;">
            <button onclick="saveEdit('${id}')" class="btn-primary save-btn">Save</button>
            <button onclick="cancelEdit('${id}')" class="btn-secondary cancel-btn">Cancel</button>
        </div>
    `;

    notesGrid.appendChild(noteElement);
}

function cancelEdit(id) {
    const noteCard = document.querySelector(`[data-note-id="${id}"]`);
    const titleElement = noteCard.querySelector('.note-title');
    const contentElement = noteCard.querySelector('.note-content');
    const editActions = noteCard.querySelector('.edit-actions');
    const regularActions = noteCard.querySelector('.note-actions');
    
    // Restore original content
    titleElement.textContent = titleElement.getAttribute('data-original');
    contentElement.textContent = contentElement.getAttribute('data-original');
    
    // Reset editing state
    titleElement.setAttribute('contenteditable', 'false');
    contentElement.setAttribute('contenteditable', 'false');
    titleElement.setAttribute('data-editable', 'false');
    contentElement.setAttribute('data-editable', 'false');
    
    editActions.style.display = 'none';
    regularActions.style.display = 'flex';
    noteCard.classList.remove('editing');
}

async function saveEdit(id) {
    const noteCard = document.querySelector(`[data-note-id="${id}"]`);
    const titleElement = noteCard.querySelector('.note-title');
    const contentElement = noteCard.querySelector('.note-content');
    const editActions = noteCard.querySelector('.edit-actions');
    const regularActions = noteCard.querySelector('.note-actions');
    
    const newTitle = titleElement.textContent.trim();
    const newContent = contentElement.textContent.trim();
    
    if (!newTitle || !newContent) {
        alert('Title and content cannot be empty');
        return;
    }
    
    try {
        await db.collection('notes').doc(id).update({
            title: newTitle,
            description: newContent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Reset editing state
        titleElement.setAttribute('contenteditable', 'false');
        contentElement.setAttribute('contenteditable', 'false');
        titleElement.setAttribute('data-editable', 'false');
        contentElement.setAttribute('data-editable', 'false');
        
        editActions.style.display = 'none';
        regularActions.style.display = 'flex';
        noteCard.classList.remove('editing');
    } catch (error) {
        console.error("Error updating note: ", error);
        alert('Error saving changes. Please try again.');
    }
}

newNoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titleInput = document.getElementById('noteTitle');
    const descriptionInput = document.getElementById('noteDescription');

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!title || !description) {
        alert('Please fill in both title and description');
        return;
    }

    try {
        const submitButton = newNoteForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = 'Saving...';

        await db.collection('notes').add({
            title,
            description,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        newNoteForm.reset();
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;

        const successMessage = document.createElement('div');
        successMessage.className = 'alert alert-success';
        successMessage.textContent = 'Note saved successfully!';
        newNoteForm.appendChild(successMessage);
        setTimeout(() => successMessage.remove(), 3000);

    } catch (error) {
        console.error("Error saving note: ", error);
        alert('Error saving note. Please try again.');
    }
});

async function deleteNote(id) {
    if (confirm('Are you sure you want to delete this note?')) {
        try {
            await db.collection('notes').doc(id).delete();
        } catch (error) {
            alert(error.message);
        }
    }
}

function copyNote(id) {
    const noteContent = document.querySelector(`[data-note-id="${id}"] .note-content`).textContent;
    navigator.clipboard.writeText(noteContent)
        .then(() => alert('Note copied to clipboard!'))
        .catch(err => alert('Failed to copy note'));
}

function editNote(id) {
    const noteCard = document.querySelector(`[data-note-id="${id}"]`);
    const titleElement = noteCard.querySelector('.note-title');
    const contentElement = noteCard.querySelector('.note-content');
    const editActions = noteCard.querySelector('.edit-actions');
    const regularActions = noteCard.querySelector('.note-actions');
    
    // Store original content for cancel functionality
    titleElement.setAttribute('data-original', titleElement.textContent);
    contentElement.setAttribute('data-original', contentElement.textContent);
    
    // Make elements editable
    titleElement.setAttribute('contenteditable', 'true');
    contentElement.setAttribute('contenteditable', 'true');
    titleElement.setAttribute('data-editable', 'true');
    contentElement.setAttribute('data-editable', 'true');
    
    // Show/hide appropriate buttons
    editActions.style.display = 'flex';
    regularActions.style.display = 'none';
    
    // Add editing class for styling
    noteCard.classList.add('editing');
    
    // Focus on title
    titleElement.focus();
}

// Search Functionality
searchNotes.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const noteCards = notesGrid.querySelectorAll('.note-card');

    noteCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const content = card.querySelector('.note-content').textContent.toLowerCase();

        if (title.includes(searchTerm) || content.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

// Theme Toggle
function setTheme(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = `<i class="fas fa-${isDark ? 'sun' : 'moon'}"></i>`;
}

themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    setTheme(!isDark);
});

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme === 'dark');

// Drag and Drop Functionality
let draggedNote = null;

function enableDragAndDrop() {
    const noteCards = document.querySelectorAll('.note-card');

    noteCards.forEach(card => {
        card.setAttribute('draggable', true);

        card.addEventListener('dragstart', (e) => {
            draggedNote = card;
            card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
            draggedNote = null;
            card.classList.remove('dragging');
        });

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedNote && draggedNote !== card) {
                const rect = card.getBoundingClientRect();
                const midpoint = (rect.bottom - rect.top) / 2;
                const mouseY = e.clientY - rect.top;

                if (mouseY < midpoint) {
                    notesGrid.insertBefore(draggedNote, card);
                } else {
                    notesGrid.insertBefore(draggedNote, card.nextSibling);
                }
            }
        });
    });
}

// Error Handling Utility
function handleError(error, context = '') {
    console.error(`Error ${context}:`, error);
    alert(`An error occurred ${context ? 'while ' + context : ''}: ${error.message}`);
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Add loading state
    const loading = document.createElement('div');
    loading.id = 'loading';
    loading.className = 'loading';
    loading.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loading);

    loadNotes().catch(error => handleError(error, 'loading notes'));

    // Enable drag and drop after notes are loaded
    notesGrid.addEventListener('DOMNodeInserted', () => {
        enableDragAndDrop();
    });

    loading.style.display = 'none';
});

