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

// KPI hooks
const kpiRow = document.getElementById('kpiRow');
const kpiAvgWpm = document.getElementById('kpiAvgWpm');
const kpiAcc = document.getElementById('kpiAcc');
const kpiGames = document.getElementById('kpiGames');
const kpiLast = document.getElementById('kpiLast');

// chart grid + cards
const chartsGrid = document.getElementById('chartsGrid');
const qualityCard = document.getElementById('qualityCard');
const qualityChart = document.getElementById('qualityChart');
const accuracyCompareCard = document.getElementById('accuracyCompareCard');
const accuracyCompareChart = document.getElementById('accuracyCompareChart');
const reactionCard = document.getElementById('reactionCard');
const reactionChart = document.getElementById('reactionChart');
const sessionsCard = document.getElementById('sessionsCard');
const sessionsChart = document.getElementById('sessionsChart');
const typeRushCard = document.getElementById('typeRushCard');
const typeRushChart = document.getElementById('typeRushChart');
const keyCatchCard = document.getElementById('keyCatchCard');
const keyCatchChart = document.getElementById('keyCatchChart');
const sequenceSparkCard = document.getElementById('sequenceSparkCard');
const sequenceSparkChart = document.getElementById('sequenceSparkChart');

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
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle UI update
    } catch (error) {
        showError(getErrorMessage(error.code));
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
});

// Handle logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
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
    loadingMessage.classList.remove('hidden');
    statsContent.innerHTML = '';
    kpiRow.classList.add('hidden');
    chartsGrid.classList.add('hidden');
    allFieldsWrap.classList.add('hidden');
    noStatsMessage.classList.add('hidden');

    [
        qualityCard,
        accuracyCompareCard,
        reactionCard,
        sessionsCard,
        typeRushCard,
        keyCatchCard,
        sequenceSparkCard
    ].forEach(card => { if (card) card.classList.add('hidden'); });

    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            loadingMessage.classList.add('hidden');
            noStatsMessage.classList.remove('hidden');
            return;
        }

        const userData = userSnap.data();
        const stats = (userData && userData.stats && typeof userData.stats === 'object')
            ? userData.stats
            : null;

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

// Display stats in the dashboard
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

    // Grouped stats table at the bottom
    buildStatGroups(stats);
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
// Build grouped stats as tables (bottom section)
function buildStatGroups(stats) {
    statsContent.innerHTML = '';

    const groups = [
        {
            id: 'overview',
            title: 'Player Overview',
            keys: ['userName', 'birthday', 'lastPlayed', 'totalGamesPlayed']
        },
        {
            id: 'speed',
            title: 'Speed (WPM)',
            keys: ['averageWpm', 'bestWpm']
        },
        {
            id: 'accuracy',
            title: 'Accuracy',
            keys: ['averageAccuracy', 'bestAccuracy']
        },
        {
            id: 'errors',
            title: 'Errors & Mistakes',
            keys: ['averageMistakesPerGame', 'totalMistakes']
        },
        {
            id: 'reaction',
            title: 'Reaction Time',
            keys: ['averageReactionTime', 'bestReactionTime']
        },

        {
            id: 'scores',
            title: 'Sequence Spark',
            keys: ['bestKeyCatchScore', 'bestSequenceScore']
        },

        {
            id: 'sessions',
            title: 'Sessions by Game',
            keys: ['typeRushSessions', 'keyCatchSessions', 'sequenceSparkSessions']
        },
        {
            id: 'keystrokes',
            title: 'Keystrokes',
            keys: ['totalKeystrokes']
        }
    ];

    const usedKeys = new Set();
    let groupsAdded = 0;

    // Build groups in the defined order
    for (const group of groups) {
        const rows = [];

        for (const key of group.keys) {
            if (key in stats) {
                usedKeys.add(key);
                rows.push({
                    label: formatLabel(key),
                    value: formatValue(stats[key], key)
                });
            }
        }

        if (!rows.length) continue;

        const groupDiv = document.createElement('section');
        groupDiv.className = 'stat-group';

        const heading = document.createElement('h3');
        heading.className = 'stat-group-title';
        heading.textContent = group.title;
        groupDiv.appendChild(heading);

        const table = document.createElement('table');
        table.className = 'stat-table';

        const tbody = document.createElement('tbody');
        rows.forEach(row => {
            const tr = document.createElement('tr');

            const tdLabel = document.createElement('td');
            tdLabel.className = 'stat-label-cell';
            tdLabel.textContent = row.label;

            const tdValue = document.createElement('td');
            tdValue.className = 'stat-value-cell';
            tdValue.textContent = row.value;

            tr.appendChild(tdLabel);
            tr.appendChild(tdValue);
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        groupDiv.appendChild(table);
        statsContent.appendChild(groupDiv);

        groupsAdded++;
    }

    // Any leftover keys
    const leftoverKeys = Object.keys(stats).filter(k => !usedKeys.has(k));
    if (leftoverKeys.length) {
        const groupDiv = document.createElement('section');
        groupDiv.className = 'stat-group';

        const heading = document.createElement('h3');
        heading.className = 'stat-group-title';
        heading.textContent = 'Other';
        groupDiv.appendChild(heading);

        const table = document.createElement('table');
        table.className = 'stat-table';
        const tbody = document.createElement('tbody');

        leftoverKeys.sort().forEach(key => {
            const tr = document.createElement('tr');

            const tdLabel = document.createElement('td');
            tdLabel.className = 'stat-label-cell';
            tdLabel.textContent = formatLabel(key);

            const tdValue = document.createElement('td');
            tdValue.className = 'stat-value-cell';
            tdValue.textContent = formatValue(stats[key], key);

            tr.appendChild(tdLabel);
            tr.appendChild(tdValue);
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        groupDiv.appendChild(table);
        statsContent.appendChild(groupDiv);

        groupsAdded++;
    }

    if (groupsAdded > 0) {
        allFieldsWrap.classList.remove('hidden');
    } else {
        allFieldsWrap.classList.add('hidden');
    }
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


function pct(v) { if (v === null || v === undefined) return NaN; const n = Number(v); return n <= 1 ? n * 100 : n; }
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

/* bar chart */
function renderBars(el, labels, values, {
    height = 240, color = '#7c3aed', pad = 44, gap = 16, textColor = '#111827'
} = {}) {
    if (!el) return;
    el.innerHTML = '';
    if (!labels.length || labels.length !== values.length) return;

    const width = el.clientWidth || 640;
    const max = Math.max(...values, 1);
    const barWidth = (width - pad * 2 - gap * (labels.length - 1)) / labels.length;

    const ticks = 4;
    const yTicks = Array.from({length: ticks+1}, (_,i)=> (max/ticks)*i)
        .map(v => {
            const y = height - pad - (v / max) * (height - pad * 2);
            return `
                <line x1="${pad}" y1="${y}" x2="${width-pad}" y2="${y}" stroke="#e5e7eb"/>
                <text x="${pad - 10}" y="${y+6}" text-anchor="end" font-size="13" fill="#6b7280">${Math.round(v)}</text>
            `;
        }).join('');

    const bars = values.map((v, i) => {
        const x = pad + i * (barWidth + gap);
        const h = (v / max) * (height - pad * 2);
        const y = height - pad - h;
        const label = labels[i];
        return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="10" fill="${color}" />
            <text x="${x + barWidth/2}" y="${y - 10}" text-anchor="middle" font-size="16" fill="${textColor}" font-weight="900">${v}</text>
            <text x="${x + barWidth/2}" y="${height - pad + 30}" text-anchor="middle" font-size="14" fill="#111827" font-weight="900">${label}</text>
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

/* line chart (for WPM over time) */
function renderLine(el, series, {
    height = 240, color = '#f97316', fill = 'rgba(249,115,22,0.15)', pad = 44, dotR = 5
} = {}) {
    if (!el) return;
    el.innerHTML = '';
    if (!series.length) return;

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

    const ticks = 4;
    const yTicks = Array.from({length: ticks+1}, (_,i)=>niceMin + (range)*i/ticks)
        .map(v => {
            const y = scaleY(v);
            return `
                <line x1="${pad}" y1="${y}" x2="${width-pad}" y2="${y}" stroke="#e5e7eb"/>
                <text x="${pad - 10}" y="${y+6}" text-anchor="end" font-size="13" fill="#6b7280">${v.toFixed(1)}</text>
            `;
        }).join('');

    const xLabels = [0, Math.floor((series.length-1)/2), series.length-1]
        .filter((v,i,a)=>a.indexOf(v)===i)
        .map(i => {
            const x = pad + i * stepX;
            const lab = String(series[i].x);
            return `<text x="${x}" y="${height - pad + 28}" text-anchor="middle" font-size="12" fill="#6b7280">${lab}</text>`;
        }).join('');

    const dots = pts.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="${dotR}" fill="#ffffff" stroke="${color}" stroke-width="3"></circle>`).join('');

    el.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        ${yTicks}
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#cbd5e1"/>
        ${xLabels}
        <path d="${area}" fill="${fill}" />
        <path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
      </svg>
    `;
}

/* donut chart for Accuracy: two circles (Average vs Best) */
function renderAccuracyDonut(el, avgPct, bestPct) {
    if (!el) return;
    el.innerHTML = '';

    if (!Number.isFinite(avgPct) || !Number.isFinite(bestPct)) return;

    const width = 260;
    const height = 150;
    const r = 40;
    const cx1 = 70;
    const cx2 = 190;
    const cy = 70;
    const C = 2 * Math.PI * r;

    function circleSegment(valuePct, color, cx) {
        const v = Math.max(0, Math.min(100, valuePct));
        const len = C * (v / 100);
        return `
            <circle cx="${cx}" cy="${cy}" r="${r}"
                    fill="none" stroke="#e5e7eb" stroke-width="10"/>
            <circle cx="${cx}" cy="${cy}" r="${r}"
                    fill="none" stroke="${color}" stroke-width="10"
                    stroke-linecap="round"
                    transform="rotate(-90 ${cx} ${cy})"
                    stroke-dasharray="${len} ${C - len}"/>
        `;
    }

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
        ${circleSegment(avgPct, '#60a5fa', cx1)}
        ${circleSegment(bestPct, '#22c55e', cx2)}

        <text x="${cx1}" y="${cy+4}" text-anchor="middle"
              font-size="12" fill="#374151" font-weight="900">
          ${avgPct.toFixed(1)}%
        </text>
        <text x="${cx2}" y="${cy+4}" text-anchor="middle"
              font-size="12" fill="#374151" font-weight="900">
          ${bestPct.toFixed(1)}%
        </text>

        <text x="${cx1}" y="${height-20}" text-anchor="middle"
              font-size="12" fill="#6b7280">Average</text>
        <text x="${cx2}" y="${height-20}" text-anchor="middle"
              font-size="12" fill="#6b7280">Best</text>
      </svg>
    `;

    el.innerHTML = svg;
}


function buildCharts(stats) {
    const avgWpm = num(stats.averageWpm);
    const avgAccPct = pct(stats.averageAccuracy);
    const avgMistakesPerGame = num(stats.averageMistakesPerGame);

    const bestAcc = num(stats.bestAccuracy);
    const bestWpm = num(stats.bestWpm);

    const totalGames = int(stats.totalGamesPlayed);
    const typeRushSessions = int(stats.typeRushSessions);
    const keyCatchSessions = int(stats.keyCatchSessions);
    const sequenceSparkSessions = int(stats.sequenceSparkSessions);

    const bestKeyCatchScore = num(stats.bestKeyCatchScore);
    const bestSequenceScore = num(stats.bestSequenceScore);
    const totalKeystrokes = int(stats.totalKeystrokes);
    const totalMistakes = int(stats.totalMistakes);

    // --- Overall Typing Quality
    let avgKeysPerGame = NaN;
    if (Number.isFinite(totalKeystrokes) && Number.isFinite(totalGames) && totalGames > 0) {
        avgKeysPerGame = totalKeystrokes / totalGames;
    }

    const qualityLabels = [];
    const qualityValues = [];

    if (Number.isFinite(avgAccPct) && avgAccPct > 0) {
        qualityLabels.push('Accuracy %');
        qualityValues.push(Number(avgAccPct.toFixed(1)));
    }
    if (Number.isFinite(avgMistakesPerGame) && avgMistakesPerGame > 0) {
        qualityLabels.push('Mistakes / Game');
        qualityValues.push(Number(avgMistakesPerGame.toFixed(2)));
    }
    if (Number.isFinite(avgKeysPerGame) && avgKeysPerGame > 0) {
        qualityLabels.push('Key Presses / Game');
        qualityValues.push(Number(avgKeysPerGame.toFixed(1)));
    }

    if (qualityLabels.length) {
        renderBars(
            qualityChart,
            qualityLabels,
            qualityValues,
            { color: '#10b981' }
        );
        qualityCard.classList.remove('hidden');
    }

    // --- Accuracy: Best vs Average (DONUT)
    if (Number.isFinite(avgAccPct) && Number.isFinite(bestAcc)) {
        const bestAccPct = pct(bestAcc);
        renderAccuracyDonut(
            accuracyCompareChart,
            Number(avgAccPct.toFixed(1)),
            Number(bestAccPct.toFixed(1))
        );
        accuracyCompareCard.classList.remove('hidden');
    }

    // --- WPM Over Time line chart ---
    const wpmHistorySeries = normalizeSeries(
        stats.wpmHistory ||
        stats.wpmByDate ||
        stats.wpmSeries ||
        null
    );

    let wpmSeries = [];

    if (wpmHistorySeries.length >= 2) {
        wpmSeries = wpmHistorySeries.map(p => ({
            x: p.x,
            y: Number(p.y)
        }));
    } else if (Number.isFinite(avgWpm) && Number.isFinite(bestWpm)) {
        wpmSeries = [
            { x: 'Average', y: Number(avgWpm.toFixed(1)) },
            { x: 'Best',    y: Number(bestWpm.toFixed(1)) }
        ];
    }

    if (wpmSeries.length >= 2) {
        renderLine(reactionChart, wpmSeries, {
            color: '#f97316',
            fill: 'rgba(249,115,22,0.12)'
        });
        reactionCard.classList.remove('hidden');
    }

    // --- Sessions by Game
    const sessionValues = [typeRushSessions, keyCatchSessions, sequenceSparkSessions]
        .map(v => Number.isFinite(v) ? v : 0);
    const totalSessions = sessionValues.reduce((a,b)=>a+b,0);

    if (totalSessions > 0) {
        renderBars(
            sessionsChart,
            ['Type Rush', 'Key Catch', 'Sequence Spark'],
            sessionValues,
            { color: '#7c3aed' }
        );
        sessionsCard.classList.remove('hidden');
    }

    // --- Type Rush Overview (Sessions + Avg WPM)
    if (Number.isFinite(typeRushSessions) && typeRushSessions > 0 &&
        Number.isFinite(avgWpm) && avgWpm > 0) {
        renderBars(
            typeRushChart,
            ['Sessions', 'Avg WPM'],
            [typeRushSessions, Number(avgWpm.toFixed(1))],
            { color: '#6366f1' }
        );
        typeRushCard.classList.remove('hidden');
    }

    // --- Key Catch Overview (Sessions + Best Score)
    const kcLabels = [];
    const kcValues = [];
    if (Number.isFinite(keyCatchSessions) && keyCatchSessions > 0) {
        kcLabels.push('Sessions');
        kcValues.push(keyCatchSessions);
    }
    if (Number.isFinite(bestKeyCatchScore) && bestKeyCatchScore > 0) {
        kcLabels.push('Best Score');
        kcValues.push(Number(bestKeyCatchScore.toFixed(0)));
    }
    if (kcLabels.length) {
        renderBars(
            keyCatchChart,
            kcLabels,
            kcValues,
            { color: '#ec4899' }
        );
        keyCatchCard.classList.remove('hidden');
    }

    // --- Sequence Spark Overview
    const seqLabels = [];
    const seqValues = [];

    if (Number.isFinite(sequenceSparkSessions) && sequenceSparkSessions > 0) {
        seqLabels.push('Sessions');
        seqValues.push(sequenceSparkSessions);
    }
    if (Number.isFinite(bestSequenceScore) && bestSequenceScore > 0) {
        seqLabels.push('Best Score');
        seqValues.push(Number(bestSequenceScore.toFixed(0)));
    }
    if (Number.isFinite(totalKeystrokes) && totalKeystrokes > 0) {
        seqLabels.push('Keystrokes');
        seqValues.push(totalKeystrokes);
    }
    if (Number.isFinite(totalMistakes) && totalMistakes > 0) {
        seqLabels.push('Mistakes');
        seqValues.push(totalMistakes);
    }

    if (seqLabels.length) {
        renderBars(
            sequenceSparkChart,
            seqLabels,
            seqValues,
            { color: '#0ea5e9' }
        );
        sequenceSparkCard.classList.remove('hidden');
    }

    const cards = [
        qualityCard,
        accuracyCompareCard,
        reactionCard,
        sessionsCard,
        typeRushCard,
        keyCatchCard,
        sequenceSparkCard
    ];
    const anyVisible = cards.some(card => card && !card.classList.contains('hidden'));
    if (anyVisible) {
        chartsGrid.classList.remove('hidden');
    } else {
        chartsGrid.classList.add('hidden');
    }
}
