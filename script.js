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

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCynNZ2XC9B4L8PFrQVEU6xjuUsJR7ZMm0",
    authDomain: "fingerfitstats.firebaseapp.com",
    projectId: "fingerfitstats",
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
        const userRef = doc(db, 'users', uid);   // get the user document from Firestore
        const userSnap = await getDoc(userRef);  // wait until it loads

        // Check if the document actually exists
        if (userSnap.exists()) {
            const userData = userSnap.data();  // get the user data from Firestore

            // Check if userData has a stats object
            if (userData.stats && typeof userData.stats === 'object') {
                // Try to find a sessions array inside stats
                const sessions = Array.isArray(userData.stats.sessions) ? userData.stats.sessions : [];

                // Hide the "loading" message
                loadingMessage.classList.add('hidden');

                // If there are sessions, show the charts
                if (sessions.length) {
                    statsContent.classList.remove('hidden');
                    renderProgress(sessions); // <-- new chart function (shows graphs)
                } 
                // If there are no sessions, show normal stats instead
                else {
                    statsContent.classList.remove('hidden');
                    displayStats(userData.stats);
                }
            } 
            // If there is no stats object in Firestore
            else {
                loadingMessage.classList.add('hidden');
                noStatsMessage.classList.remove('hidden');  // show "No stats found"
            }
        } 
        // If the user document does not exist
        else {
            loadingMessage.classList.add('hidden');
            noStatsMessage.classList.remove('hidden');
        }
    } 
    // If something goes wrong while getting the data
    catch (error) {
        console.error('Error loading stats:', error);
        loadingMessage.classList.add('hidden');
        showError('Failed to load stats. Please refresh the page.'); // show error message
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
// ===== Charts and table visualizations =====

// Helper to make SVG elements
function svg(tag, attrs={}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
  return el;
}

// Format percent display
function pct(p){ return p==null ? "—" : `${Math.round(Number(p)*100)}%`; }

// Build the charts + table area
function renderProgress(sessions){
  statsContent.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.display = "grid";
  wrap.style.gap = "10px";
  statsContent.appendChild(wrap);

  wrap.appendChild(title("WPM Over Time"));
  wrap.appendChild(wpmLine(sessions));

  wrap.appendChild(title("Accuracy & Errors"));
  wrap.appendChild(accErrBars(sessions));

  wrap.appendChild(title("Session Details"));
  wrap.appendChild(tableSimple(sessions));
}

// Simple section title
function title(t){
  const h=document.createElement("h2");
  h.textContent=t;
  h.style.fontSize="18px";
  h.style.color="#333";
  return h;
}

// Table of all sessions
function tableSimple(rows){
  const t=document.createElement("table");
  t.className="data-table";
  t.innerHTML = `
    <thead><tr><th>Date</th><th>WPM</th><th>Accuracy</th><th>Reaction</th><th>Errors</th></tr></thead>
    <tbody>${rows.map(r=>`
      <tr>
        <td>${r.date??""}</td>
        <td>${r.wpm??""}</td>
        <td>${pct(r.accuracy)}</td>
        <td>${r.reactionMs!=null ? (r.reactionMs/1000).toFixed(1)+'s' : '—'}</td>
        <td>${r.errors??""}</td>
      </tr>
    `).join("")}</tbody>`;
  return t;
}

// Line chart for WPM
function wpmLine(rows){
  const w=600,h=220,p=28;
  const el=svg("svg",{viewBox:`0 0 ${w} ${h}`});
  if(!rows.length) return el;

  const xs=rows.map(r=>new Date(r.date).getTime());
  const ys=rows.map(r=>Number(r.wpm||0));
  const x0=Math.min(...xs), x1=Math.max(...xs);
  const y0=Math.min(...ys), y1=Math.max(...ys);
  const sx=t=>p+((t-x0)/Math.max(1,x1-x0))*(w-2*p);
  const sy=v=>(h-p)-((v-y0)/Math.max(1,y1-y0))*(h-2*p);

  const g=svg("g");
  for(let i=0;i<=4;i++){
    const gy=p+i*((h-2*p)/4);
    g.appendChild(svg("line",{x1:p,x2:w-p,y1:gy,y2:gy,class:"grid"}));
  }
  el.appendChild(g);

  const d=rows.map((r,i)=>`${i?'L':'M'} ${sx(new Date(r.date).getTime())} ${sy(r.wpm||0)}`).join(" ");
  el.appendChild(svg("path",{d,class:"line"}));

  rows.forEach(r=>{
    const cx=sx(new Date(r.date).getTime()), cy=sy(r.wpm||0);
    el.appendChild(svg("circle",{cx,cy,r:3,class:"dot"}));
  });
  return el;
}

// Bar chart for Accuracy & Errors
function accErrBars(rows){
  const w=600,h=220,p=28;
  const el=svg("svg",{viewBox:`0 0 ${w} ${h}`});
  if(!rows.length) return el;

  const xs=rows.map(r=>new Date(r.date).getTime());
  const errs=rows.map(r=>Number(r.errors||0));
  const x0=Math.min(...xs), x1=Math.max(...xs);
  const e1=Math.max(1,...errs);

  const sx=t=>p+((t-x0)/Math.max(1,x1-x0))*(w-2*p);
  const syA=v=>(h-p)-(v*(h-2*p));
  const syE=v=>(h-p)-((v/e1)*(h-2*p));
  const bw=Math.max(6,(w-2*p)/Math.max(1,rows.length)*0.6);

  const g=svg("g");
  for(let i=0;i<=4;i++){
    const gy=p+i*((h-2*p)/4);
    g.appendChild(svg("line",{x1:p,x2:w-p,y1:gy,y2:gy,class:"grid"}));
  }
  el.appendChild(g);

  rows.forEach(r=>{
    const xc=sx(new Date(r.date).getTime());
    const ay=syA(Number(r.accuracy)||0), ah=(h-p)-ay;
    const ey=syE(Number(r.errors)||0),   eh=(h-p)-ey;
    el.appendChild(svg("rect",{x:xc-bw-2,y:ay,width:bw,height:Math.max(0,ah),class:"barA"}));
    el.appendChild(svg("rect",{x:xc+2,y:ey,width:bw,height:Math.max(0,eh),class:"barB"}));
  });
  return el;
}

