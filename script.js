// Firebase imports from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase configuration - replace with your project's config
// Get this from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const userEmail = document.getElementById('userEmail');
const statsContainer = document.getElementById('statsContainer');
const loadingMessage = document.getElementById('loadingMessage');
const statsContent = document.getElementById('statsContent');
const noStatsMessage = document.getElementById('noStatsMessage');

// Handle login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Clear previous errors
    hideError();
    
    // Disable button during login
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    
    try {
        // Sign in with Firebase Auth
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle UI update
    } catch (error) {
        // Handle login errors
        showError(getErrorMessage(error.code));
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
});

// Handle logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        // onAuthStateChanged will handle UI update
    } catch (error) {
        console.error('Logout error:', error);
        showError('Failed to logout. Please try again.');
    }
});

// Monitor authentication state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        showDashboard(user);
        loadUserStats(user.uid);
    } else {
        // User is signed out
        showLogin();
    }
});

// Show login screen
function showLogin() {
    loginScreen.classList.remove('hidden');
    dashboardScreen.classList.add('hidden');
    loginForm.reset();
    hideError();
}

// Show dashboard screen
function showDashboard(user) {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    userEmail.textContent = user.email;
}

// Load user stats from Firestore
async function loadUserStats(uid) {
    // Show loading state
    loadingMessage.classList.remove('hidden');
    statsContent.classList.add('hidden');
    noStatsMessage.classList.add('hidden');
    
    try {
        // Reference to the user document
        // Path: users/{uid}
        // The stats are stored as a field in this document
        // If your Firestore structure uses a subcollection (users/{uid}/stats/{docId}),
        // modify this code to use: doc(db, 'users', uid, 'stats', 'yourDocId')
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            // Check if stats field exists in the user document
            // The stats field contains all the gameplay statistics
            if (userData.stats && typeof userData.stats === 'object') {
                displayStats(userData.stats);
            } else {
                // No stats found
                loadingMessage.classList.add('hidden');
                noStatsMessage.classList.remove('hidden');
            }
        } else {
            // User document doesn't exist
            loadingMessage.classList.add('hidden');
            noStatsMessage.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        loadingMessage.classList.add('hidden');
        showError('Failed to load stats. Please refresh the page.');
    }
}

// Display stats in the dashboard
function displayStats(statsData) {
    // Hide loading, show stats
    loadingMessage.classList.add('hidden');
    statsContent.classList.remove('hidden');
    
    // Clear previous stats
    statsContent.innerHTML = '';
    
    // Iterate through all key-value pairs in the stats document
    const entries = Object.entries(statsData);
    
    if (entries.length === 0) {
        noStatsMessage.classList.remove('hidden');
        statsContent.classList.add('hidden');
        return;
    }
    
    // Create stat items for each key-value pair
    entries.forEach(([key, value]) => {
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';
        
        const label = document.createElement('div');
        label.className = 'stat-label';
        label.textContent = formatLabel(key);
        
        const statValue = document.createElement('div');
        statValue.className = 'stat-value';
        statValue.textContent = formatValue(value);
        
        statItem.appendChild(label);
        statItem.appendChild(statValue);
        statsContent.appendChild(statItem);
    });
}

// Format stat label (convert camelCase to Title Case)
function formatLabel(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

// Format stat value based on type
function formatValue(value) {
    if (typeof value === 'number') {
        // Format numbers with commas if needed
        if (Number.isInteger(value)) {
            return value.toLocaleString();
        } else {
            // Round decimals to 2 places
            return parseFloat(value.toFixed(2)).toLocaleString();
        }
    }
    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }
    if (value === null || value === undefined) {
        return 'N/A';
    }
    return String(value);
}

// Show error message
function showError(message) {
    loginError.textContent = message;
    loginError.classList.add('show');
}

// Hide error message
function hideError() {
    loginError.classList.remove('show');
}

// Convert Firebase error codes to user-friendly messages
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/invalid-email': 'Invalid email address.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

