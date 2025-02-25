document.addEventListener('DOMContentLoaded', function() {
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCSBHIRIgbXOZBlyLPXj1mInyh1zEa_Mjk",
    authDomain: "task-manager-c5a34.firebaseapp.com",
    projectId: "task-manager-c5a34",
    storageBucket: "task-manager-c5a34.firebasestorage.app",
    messagingSenderId: "567912800185",
    appId: "1:567912800185:web:e2515d993bfad26dd0e068",
    measurementId: "G-XBCH81NXBL"
  };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // DOM Elements
    const authPages = document.getElementById('authPages');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const showSignupLink = document.getElementById('showSignup');
    const showLoginLink = document.getElementById('showLogin');
    const logoutBtn = document.getElementById('logoutBtn');
    const container = document.querySelector('.container');
    const taskForm = document.getElementById('taskForm');
    const taskModal = document.getElementById('taskModal');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const tasksContainer = document.querySelector('.tasks-container');
    const searchInput = document.getElementById('searchTask');
    const menuItems = document.querySelectorAll('.menu li');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const navToggle = document.querySelector('.nav-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    const notesContainer = document.querySelector('.notes-container');
    const noteModal = document.getElementById('noteModal');
    const noteForm = document.getElementById('noteForm');
    const addNoteBtn = document.getElementById('addNoteBtn');
    let editingNoteId = null;

    let currentSection = 'today';
    let editingTaskId = null;
    let currentUser = null;

    // Event Listeners
    addTaskBtn.addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Add New Task';
        taskForm.reset();
        editingTaskId = null;
        taskModal.style.display = 'block';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === taskModal) {
            taskModal.style.display = 'none';
        }
    });

    // Task Form Submit
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const taskData = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            dueDate: new Date(document.getElementById('taskDate').value).toISOString(),
            category: document.getElementById('taskCategory').value,
            important: document.getElementById('taskImportant').checked,
            completed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            userId: currentUser.uid
        };

        try {
            if (editingTaskId) {
                await db.collection('tasks').doc(editingTaskId).update(taskData);
            } else {
                await db.collection('tasks').add(taskData);
            }
            taskModal.style.display = 'none';
            taskForm.reset();
            loadTasks();
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Error saving task. Please try again.');
        }
    });

    // Menu Section Selection
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            console.log('Menu item clicked:', item.getAttribute('data-section')); // Debug log
            
            // Update active state
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            currentSection = item.getAttribute('data-section');
            
            // Handle container visibility
            const tasksContainer = document.querySelector('.tasks-container');
            const notesContainer = document.querySelector('.notes-container');
            
            console.log('Switching to section:', currentSection); // Debug log
            
            if (currentSection === 'notes') {
                console.log('Showing notes container'); // Debug log
                tasksContainer.style.display = 'none';
                notesContainer.style.display = 'block';
                notesContainer.classList.remove('hidden');
                loadNotes(); // Load notes content
            } else {
                console.log('Showing tasks container'); // Debug log
                notesContainer.style.display = 'none';
                tasksContainer.style.display = 'block';
                loadTasks(); // Load tasks content
            }
        });
    });

    // Load Tasks Based on Section
    async function loadTasks() {
        console.log('Loading tasks for section:', currentSection); // Debugging log
        tasksContainer.innerHTML = '<div class="loading">Loading tasks...</div>';

        try {
            let query = db.collection('tasks').where('userId', '==', currentUser.uid);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Filter tasks based on current section
            switch (currentSection) {
                case 'today':
                    query = query.where('dueDate', '>=', today.toISOString())
                               .where('dueDate', '<', tomorrow.toISOString());
                    break;
                case 'upcoming':
                    query = query.where('dueDate', '>=', tomorrow.toISOString());
                    break;
                case 'personal':
                    query = query.where('category', '==', 'personal');
                    break;
                case 'professional':
                    query = query.where('category', '==', 'professional');
                    break;
                case 'completed':
                    query = query.where('completed', '==', true);
                    break;
                case 'scheduled':
                    query = query.orderBy('dueDate', 'asc')
                               .where('dueDate', '>=', today.toISOString());
                    break;
            }

            console.log('Query parameters:', query); // Debugging log

            const snapshot = await query.get();

            if (snapshot.empty) {
                console.log('No tasks found'); // Debugging log
                tasksContainer.innerHTML = '<div class="no-tasks">No tasks found</div>';
                return;
            }

            tasksContainer.innerHTML = '';
            snapshot.forEach(doc => {
                const task = { id: doc.id, ...doc.data() };
                console.log('Task found:', task); // Debugging log
                renderTask(task);
            });

        } catch (error) {
            console.error('Error loading tasks:', error);
            tasksContainer.innerHTML = '<div class="error">Error loading tasks. Please try again.</div>';
        }
    }

    // Render Individual Task
    function renderTask(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.important ? 'important' : ''} ${task.completed ? 'completed' : ''}`;
        taskElement.setAttribute('data-id', task.id);

        const dueDate = new Date(task.dueDate);

        taskElement.innerHTML = `
            <div class="task-content">
                <h3 class="task-title">${task.title}</h3>
                <p class="task-description">${task.description}</p>
                <div class="task-meta">
                    <span class="task-date">
                        <i class="fas fa-clock"></i> ${dueDate.toLocaleString()}
                    </span>
                    <span class="task-category">
                        <i class="fas ${task.category === 'personal' ? 'fa-user' : 'fa-briefcase'}"></i>
                        ${task.category}
                    </span>
                </div>
            </div>
            <div class="task-actions">
                <button onclick="toggleComplete('${task.id}')" class="complete-btn">
                    <i class="fas ${task.completed ? 'fa-times-circle' : 'fa-check-circle'}"></i>
                </button>
                <button onclick="editTask('${task.id}')" class="edit-btn">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteTask('${task.id}')" class="delete-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Add swipe functionality
        let touchStartX = 0;
        let touchEndX = 0;

        taskElement.addEventListener('touchstart', e => {
            touchStartX = e.touches[0].clientX;
        });

        taskElement.addEventListener('touchmove', e => {
            touchEndX = e.touches[0].clientX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 5) {
                taskElement.style.transform = `translateX(${-diff}px)`;
            }
        });

        taskElement.addEventListener('touchend', e => {
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 100) {
                deleteTask(task.id);
            } else {
                taskElement.style.transform = '';
            }
        });

        tasksContainer.appendChild(taskElement);
    }

    // Toggle Task Completion
    async function toggleComplete(taskId) {
        console.log('Toggling completion for task with ID:', taskId); // Debugging log
        try {
            const taskRef = db.collection('tasks').doc(taskId);
            const doc = await taskRef.get();
            if (!doc.exists) {
                throw new Error('Task not found');
            }
            const task = doc.data();
            console.log('Task data:', task); // Debugging log
            const newStatus = !task.completed;
            
            await taskRef.update({
                completed: newStatus
            });
            
            loadTasks();
        } catch (error) {
            console.error('Error toggling task:', error);
            alert('Error updating task. Please try again.');
        }
    }

    // Edit Task
    async function editTask(taskId) {
        console.log('Editing task with ID:', taskId); // Debugging log
        try {
            const doc = await db.collection('tasks').doc(taskId).get();
            if (!doc.exists) {
                throw new Error('Task not found');
            }
            const task = doc.data();
            console.log('Task data:', task); // Debugging log
            
            document.getElementById('modalTitle').textContent = 'Edit Task';
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description;
            document.getElementById('taskDate').value = new Date(task.dueDate).toISOString().slice(0, 16);
            document.getElementById('taskCategory').value = task.category;
            document.getElementById('taskImportant').checked = task.important;
            
            editingTaskId = taskId;
            taskModal.style.display = 'block';
        } catch (error) {
            console.error('Error editing task:', error);
            alert('Error loading task. Please try again.');
        }
    }

    // Attach functions to the window object to make them globally accessible
    window.toggleComplete = toggleComplete;
    window.editTask = editTask;
    window.deleteTask = deleteTask;

    // Delete Task
    async function deleteTask(taskId) {
        console.log('Deleting task with ID:', taskId); // Debugging log
        try {
            await db.collection('tasks').doc(taskId).delete();
            loadTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Error deleting task. Please try again.');
        }
    }

    // Clear All Tasks
    clearAllBtn.addEventListener('click', async () => {
        console.log('Clear All Tasks button clicked'); // Debugging log
        if (confirm('Are you sure you want to clear all completed tasks?')) {
            try {
                const snapshot = await db.collection('tasks')
                    .where('userId', '==', currentUser.uid)
                    .where('completed', '==', true)
                    .get();

                if (snapshot.empty) {
                    console.log('No completed tasks found'); // Debugging log
                    alert('No completed tasks to clear.');
                    return;
                }

                const batch = db.batch();
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                
                console.log('Completed tasks cleared'); // Debugging log
                loadTasks();
            } catch (error) {
                console.error('Error clearing tasks:', error);
                alert('Error clearing tasks. Please try again.');
            }
        }
    });

    // Search Tasks
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const tasks = document.querySelectorAll('.task-item');
        
        tasks.forEach(task => {
            const title = task.querySelector('.task-title').textContent.toLowerCase();
            const description = task.querySelector('.task-description').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                task.style.display = 'flex';
            } else {
                task.style.display = 'none';
            }
        });
    });

    // Check if logoutBtn exists before adding event listener
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await firebase.auth().signOut();
                window.location.href = 'index.html'; // Redirect to login page after logout
            } catch (error) {
                console.error('Logout error:', error);
                alert('Error logging out. Please try again.');
            }
        });
    }

    // Check user authentication on index2.html load
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'index.html'; // Redirect to login page if not authenticated
        } else {
            currentUser = user;
            console.log('User authenticated:', currentUser); // Debugging log
            loadTasks(); // Only load tasks if the user is authenticated
            checkUrlParameters(); // Check if we should show notes section
        }
    });

    // Mobile Navigation
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    navToggle.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    // Close sidebar when clicking a menu item on mobile
    if (window.innerWidth <= 768) {
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        });
    }

    // Close sidebar when resizing to desktop view
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    });

    // Show success message on signup
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;

            try {
                await firebase.auth().createUserWithEmailAndPassword(email, password);
                alert('Signup successful! Please log in.');
                window.location.href = 'index.html'; // Redirect to login page after signup
            } catch (error) {
                console.error('Signup error:', error);
                alert('Error signing up. Please try again.');
            }
        });
    }
    // Note Functions
async function loadNotes() {
    console.log('loadNotes called'); // Debug log
    const notesGrid = document.querySelector('.notes-grid');
    if (!notesGrid) {
        console.error('Notes grid not found');
        return;
    }
    
    notesGrid.innerHTML = '<div class="loading">Loading notes...</div>';

    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('No authenticated user');
        }

        const snapshot = await db.collection('notes')
            .where('userId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .get();

        console.log('Notes found:', snapshot.size); // Debug log

        if (snapshot.empty) {
            notesGrid.innerHTML = `
                <div class="no-notes">
                    <i class="fas fa-sticky-note"></i>
                    <em>Create your first note</em>
                </div>
            `;
            return;
        }

        notesGrid.innerHTML = '';
        snapshot.forEach(doc => {
            const note = { id: doc.id, ...doc.data() };
            console.log('Rendering note:', note); // Debug log
            renderNote(note);
        });
    } catch (error) {
        console.error('Error loading notes:', error);
        notesGrid.innerHTML = '<div class="error">Error loading notes: ' + error.message + '</div>';
    }
}

function renderNote(note) {
    const noteElement = document.createElement('div');
    noteElement.className = 'note-card';
    noteElement.innerHTML = `
        <h3 class="note-title">${note.title}</h3>
        <div class="note-content">${note.description}</div>
        <div class="note-timestamp">
            ${new Date(note.timestamp?.toDate()).toLocaleString()}
        </div>
        <div class="note-actions">
            <button onclick="copyNote('${note.id}')" title="Copy">
                <i class="fas fa-copy"></i>
            </button>
            <button onclick="editNote('${note.id}')" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteNote('${note.id}')" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    document.querySelector('.notes-grid').appendChild(noteElement);
}

// Add Note Form Handler
noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const noteData = {
        title: document.getElementById('noteTitle').value,
        description: document.getElementById('noteDescription').value,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        userId: currentUser.uid
    };

    try {
        if (editingNoteId) {
            await db.collection('notes').doc(editingNoteId).update(noteData);
        } else {
            await db.collection('notes').add(noteData);
        }
        noteModal.style.display = 'none';
        noteForm.reset();
        loadNotes();
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Error saving note. Please try again.');
    }
});

// CRUD Operations
async function editNote(noteId) {
    try {
        const doc = await db.collection('notes').doc(noteId).get();
        if (!doc.exists) return;
        
        const note = doc.data();
        document.getElementById('noteModalTitle').textContent = 'Edit Note';
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteDescription').value = note.description;
        
        editingNoteId = noteId;
        noteModal.style.display = 'block';
    } catch (error) {
        console.error('Error editing note:', error);
        alert('Error loading note. Please try again.');
    }
}

async function deleteNote(noteId) {
    if (confirm('Are you sure you want to delete this note?')) {
        try {
            await db.collection('notes').doc(noteId).delete();
            loadNotes();
        } catch (error) {
            console.error('Error deleting note:', error);
            alert('Error deleting note. Please try again.');
        }
    }
}

async function copyNote(noteId) {
    try {
        const doc = await db.collection('notes').doc(noteId).get();
        if (!doc.exists) return;
        
        const note = doc.data();
        const content = `${note.title}\n\n${note.description}`;
        await navigator.clipboard.writeText(content);
        alert('Note copied to clipboard!');
    } catch (error) {
        console.error('Error copying note:', error);
        alert('Error copying note. Please try again.');
    }
}

function closeNoteModal() {
    noteModal.style.display = 'none';
    noteForm.reset();
    editingNoteId = null;
}

// Add Toast notification function
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }, 100);
}

// Add Note Button Click Handler - single implementation
addNoteBtn.addEventListener('click', () => {
    window.location.href = 'notepad.html'; // Redirect to notepad page
});

// Close note modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === noteModal) {
        noteModal.style.display = 'none';
    }
});

// Make functions globally accessible
window.editNote = editNote;
window.deleteNote = deleteNote;
window.copyNote = copyNote;
window.closeNoteModal = closeNoteModal;
window.showToast = showToast;
window.closeNotepad = function() {
    window.location.href = 'index2.html';
};
window.loadNotes = loadNotes; // Make loadNotes accessible to notepad.html

    // Check URL parameters for section
    function checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const section = urlParams.get('section');
        
        if (section === 'notes') {
            menuItems.forEach(item => {
                if (item.getAttribute('data-section') === 'notes') {
                    item.click(); // Trigger click on notes section
                }
            });
            // Clear the URL parameter
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

});