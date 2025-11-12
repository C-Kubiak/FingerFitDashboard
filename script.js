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
const loadingMessage = document.getElementById('loadingMessage');
const statsContent = document.getElementById('statsContent');
const noStatsMessage = document.getElementById('noStatsMessage');

// KPI & chart hooks
const kpiRow = document.getElementById('kpiRow');
const kpiAvgWpm = document.getElementById('kpiAvgWpm');
const kpiAcc = document.getElementById('kpiAcc');
const kpiGames = document.getElementById('kpiGames');
const kpiLast = document.getElementById('kpiLast');

const chartsGrid = document.getElementById('chartsGrid');
const lineChart = document.getElementById('lineChart');
const lineSubtitle = document.getElementById('lineSubtitle');
const barChart = document.getElementById('barChart');
const allFieldsWrap = document.getElementById('allFieldsWrap');

// login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    hideError();
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    try {
        // Sign in with Firebase Auth
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle UI update
    } catch (error) {
        // login errors
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
        showDashboard(user);
        loadUserStats(user.uid);
    } else {
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
    statsContent.innerHTML = '';
    kpiRow.classList.add('hidden');
    chartsGrid.classList.add('hidden');
    allFieldsWrap.classList.add('hidden');
    noStatsMessage.classList.add('hidden');
    
    try {
        // Reference to the user document
        // Path: users/{uid}
        // The stats are stored as a field in this document
        // If your Firestore structure uses a subcollection (users/{uid}/stats/{docId}),
        // modify this code to use: doc(db, 'users', uid, 'stats', 'yourDocId')
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            loadingMessage.classList.add('hidden');
            noStatsMessage.classList.remove('hidden');
            return;
        }

        const userData = userSnap.data();
        // Check if stats field exists in the user document
        // The stats field contains all the gameplay statistics
        const stats = (userData && userData.stats && typeof userData.stats === 'object') ? userData.stats : null;
        if (!stats) {
            loadingMessage.classList.add('hidden');
            noStatsMessage.classList.remove('hidden');
            return;
        }

        displayStats(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
        loadingMessage.classList.add('hidden');
        showError('Failed to load stats. Please refresh the page.');
    }
}

// Display stats in the dashboard (clean version)
function displayStats(stats) {
    loadingMessage.classList.add('hidden');

    // KPIs
    const avgWpm = num(stats.averageWpm);
    const acc = pct(stats.averageAccuracy);
    const games = int(stats.totalGamesPlayed);
    const lastPlayed = toDateTime(stats.lastPlayed);

    kpiAvgWpm.textContent = isNaN(avgWpm) ? '—' : avgWpm.toFixed(1);
    kpiAcc.textContent = isNaN(acc) ? '—' : `${acc.toFixed(1)}%`;
    kpiGames.textContent = isNaN(games) ? '—' : games.toLocaleString();
    kpiLast.textContent = lastPlayed || '—';
    kpiRow.classList.remove('hidden');

    // Charts
    buildCharts(stats);

    // Collapsible “All fields”
    const entries = Object.entries(stats);
    if (entries.length) {
        entries.sort(([a],[b]) => a.localeCompare(b));
        entries.forEach(([key, value]) => {
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            const label = document.createElement('div');
            label.className = 'stat-label';
            label.textContent = formatLabel(key);
            const statValue = document.createElement('div');
            statValue.className = 'stat-value';
            statValue.textContent = formatValue(value, key);
            statItem.appendChild(label);
            statItem.appendChild(statValue);
            statsContent.appendChild(statItem);
        });
        allFieldsWrap.classList.remove('hidden');
    }
}

function formatLabel(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
}
function formatValue(value, key = "") {
    if (value === null || value === undefined) return 'N/A';
    if (/(lastPlayed|birthday)/i.test(key)) return toDateTime(value) || 'N/A';
    if (typeof value === 'number') {
        if (/reactionTime/i.test(key)) return `${value.toFixed(2)}`;
        if (/accuracy/i.test(key)) return `${pct(value).toFixed(2)}`;
        if (/wpm/i.test(key)) return value.toFixed(2);
        if (Number.isInteger(value)) return value.toLocaleString();
        return parseFloat(value.toFixed(2)).toLocaleString();
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
}
function showError(message) { loginError.textContent = message; loginError.classList.add('show'); }
function hideError() { loginError.classList.remove('show'); }
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

// ===== tiny charting + data =====
function pct(v) { if (v === null || v === undefined) return NaN; const n=Number(v); return n<=1? n*100 : n; }
function num(v) { return Number(v); }
function int(v) { return Number.isFinite(+v) ? Math.trunc(+v) : NaN; }

function toDate(value) {
    try {
        if (typeof value === 'number') return new Date(value > 1e12 ? value : value * 1000);
        const d = new Date(String(value));
        return isNaN(d.getTime()) ? null : d;
    } catch { return null; }
}
function toDateTime(value) {
    const d = toDate(value);
    return d ? d.toISOString().slice(0,19).replace('T',' ') : null;
}
function normalizeSeries(maybe) {
    if (!maybe) return [];
    if (Array.isArray(maybe)) {
        if (maybe.length && typeof maybe[0] === 'number') {
            return maybe.map((y, i) => ({ x: i + 1, y: Number(y) }));
        }
        return maybe.map((p, i) => {
            const x = p.t ?? p.x ?? i + 1;
            const y = p.v ?? p.y ?? 0;
            return { x, y: Number(y) };
        });
    }
    if (typeof maybe === 'object') {
        return Object.keys(maybe).sort().map(k => ({ x: k, y: Number(maybe[k]) }));
    }
    return [];
}

function renderLine(el, series, {
    height = 240, color = '#1d4ed8', fill = 'rgba(29,78,216,0.15)', pad = 44, dotR = 5
} = {}) {
    if (!el) return;
    el.innerHTML = '';
    if (!series.length) { el.innerHTML = `<div class="chart-empty">No history yet</div>`; return; }

    const width = el.clientWidth || 640;
    const ys = series.map(p => p.y);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const niceMin = Math.floor(min);
    const niceMax = Math.ceil(max);
    const range = (niceMax - niceMin) || 1;

    const stepX = (width - pad * 2) / Math.max(1, series.length - 1);
    const scaleY = v => height - pad - ((v - niceMin) / range) * (height - pad * 2);

    const pts = series.map((p, i) => [pad + i * stepX, scaleY(p.y)]);
    const d = pts.map((p,i) => i ? `L ${p[0]} ${p[1]}` : `M ${p[0]} ${p[1]}`).join(' ');
    const area = `${d} L ${pad + (series.length-1)*stepX} ${height-pad} L ${pad} ${height-pad} Z`;

    const ticks = 5;
    const yTicks = Array.from({length: ticks+1}, (_,i)=>niceMin + (range)*i/ticks)
        .map(v => {
            const y = scaleY(v);
            return `
                <line x1="${pad}" y1="${y}" x2="${width-pad}" y2="${y}" stroke="#e5e7eb"/>
                <text x="${pad - 10}" y="${y+6}" text-anchor="end" font-size="15" fill="#111827" font-weight="900">${v.toFixed(0)}</text>
            `;
        }).join('');

    const xLabels = [0, Math.floor((series.length-1)/2), series.length-1]
        .filter((v,i,a)=>a.indexOf(v)===i)
        .map(i => {
            const x = pad + i * stepX;
            const lab = String(series[i].x);
            return `<text x="${x}" y="${height - pad + 28}" text-anchor="middle" font-size="14" fill="#111827" font-weight="900">${lab}</text>`;
        }).join('');

    const dots = pts.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="${dotR}" fill="#ffffff" stroke="${color}" stroke-width="4"></circle>`).join('');

    el.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        ${yTicks}
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#cbd5e1"/>
        ${xLabels}
        <path d="${area}" fill="${fill}" />
        <path d="${d}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
      </svg>
    `;
}

function renderBars(el, labels, values, {
    height = 240, color = '#7c3aed', pad = 44, gap = 16, textColor = '#111827'
} = {}) {
    if (!el) return;
    el.innerHTML = '';
    if (!labels.length || labels.length !== values.length) { el.innerHTML = `<div class="chart-empty">No session data yet</div>`; return; }

    const width = el.clientWidth || 640;
    const max = Math.max(...values, 1);
    const barWidth = (width - pad * 2 - gap * (labels.length - 1)) / labels.length;

    const ticks = 4;
    const yTicks = Array.from({length: ticks+1}, (_,i)=> (max/ticks)*i)
        .map(v => {
            const y = height - pad - (v / max) * (height - pad * 2);
            return `
                <line x1="${pad}" y1="${y}" x2="${width-pad}" y2="${y}" stroke="#e5e7eb"/>
                <text x="${pad - 10}" y="${y+6}" text-anchor="end" font-size="15" fill="#111827" font-weight="900">${Math.round(v)}</text>
            `;
        }).join('');

    const bars = values.map((v, i) => {
        const x = pad + i * (barWidth + gap);
        const h = (v / max) * (height - pad * 2);
        const y = height - pad - h;
        const label = labels[i];
        return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="10" fill="${color}" />
            <text x="${x + barWidth/2}" y="${y - 10}" text-anchor="middle" font-size="18" fill="${textColor}" font-weight="900">${v}</text>
            <text x="${x + barWidth/2}" y="${height - pad + 30}" text-anchor="middle" font-size="15" fill="#111827" font-weight="900">${label}</text>
        `;
    }).join('');

    el.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        ${yTicks}
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#cbd5e1"/>
        ${bars}
      </svg>
    `;
}

function buildCharts(stats) {
    const wpmSeries = normalizeSeries(
        stats.wpmHistory || stats.wpmByDate || stats.wpmSeries || null
    );
    const accSeries = normalizeSeries(
        stats.accuracyHistory || stats.accuracyByDate || stats.accuracySeries || null
    ).map(p => ({ x: p.x, y: pct(p.y) }));

    let lineData = wpmSeries.length ? wpmSeries
                 : accSeries.length ? accSeries
                 : (Number.isFinite(stats.averageWpm) ? [{x:'Now', y:Number(stats.averageWpm)}] : []);

    lineSubtitle.textContent = wpmSeries.length ? '(WPM)' : accSeries.length ? '(Accuracy %)' : '(No history yet)';
    renderLine(lineChart, lineData);

    const tr = Number(stats.typeRushSessions ?? 0);
    const kc = Number(stats.keyCatchSessions ?? 0);
    const ss = Number(stats.sequenceSparkSessions ?? 0);
    const sessionsByWeek = stats.sessionsByWeek ? normalizeSeries(stats.sessionsByWeek) : [];

    if (sessionsByWeek.length) {
        renderBars(barChart, sessionsByWeek.map(p=>String(p.x)), sessionsByWeek.map(p=>Number(p.y)));
    } else {
        renderBars(barChart, ['Type Rush','Key Catch','Sequence'], [tr,kc,ss]);
    }

    chartsGrid.classList.remove('hidden');
}

