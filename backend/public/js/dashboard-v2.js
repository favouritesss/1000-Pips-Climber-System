const API_URL = '/api';
let profitChart;

function initProfitChart(transactions) {
    // If Chart.js isn't loaded yet, retry after 500ms
    if (typeof Chart === 'undefined') {
        setTimeout(() => initProfitChart(transactions), 500);
        return;
    }

    const canvas = document.getElementById('profitChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let labels = [];
    let dataPoints = [];

    if (transactions && transactions.length > 0) {
        const sorted = [...transactions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        let runningBalance = 0;
        const recent = sorted.slice(-15);
        recent.forEach(tx => {
            labels.push(new Date(tx.created_at).toLocaleDateString(undefined, { weekday: 'short' }));
            if (['deposit', 'roi', 'bonus', 'investment'].includes(tx.type)) runningBalance += tx.amount;
            if (tx.type === 'withdrawal') runningBalance -= tx.amount;
            dataPoints.push(parseFloat(runningBalance.toFixed(2)));
        });
    }

    // Always fall back to simulation if no data
    if (dataPoints.length === 0) {
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        dataPoints = [0, 120, 350, 480, 800, 1200, 1850];
    }

    if (profitChart) profitChart.destroy();

    profitChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Portfolio Value',
                data: dataPoints,
                borderColor: '#3B82F6',
                borderWidth: 3,
                pointBackgroundColor: '#3B82F6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.4,
                fill: true,
                backgroundColor: function (context) {
                    var chart = context.chart;
                    var chartCtx = chart.ctx;
                    var chartArea = chart.chartArea;
                    if (!chartArea) return 'rgba(59,130,246,0.1)';
                    var gradient = chartCtx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
                    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.25)');
                    return gradient;
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function (context) { return 'Value: $' + context.raw.toFixed(2); }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748B', font: { size: 10, weight: 'bold' } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: {
                        color: '#64748B',
                        font: { size: 10, weight: 'bold' },
                        callback: function (value) { return '$' + value; }
                    }
                }
            }
        }
    });
}

function renderInvestments(investments) {
    const container = document.getElementById('investmentsList');
    if (!container) return;
    if (!investments || investments.length === 0) {
        container.innerHTML = '<div class="glass-card text-center text-gray-500 font-bold py-10">No active investment plans yet.</div>';
        return;
    }
    container.innerHTML = '';
    investments.forEach(inv => {
        container.innerHTML += `
            <div class="glass-card flex items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <i class="fas fa-rocket"></i>
                    </div>
                    <div>
                        <p class="text-sm font-black text-white">${inv.plan_name || 'Investment Plan'}</p>
                        <p class="text-[10px] text-gray-500 uppercase font-bold mt-0.5">
                            Allocation: $${inv.amount.toFixed(2)} | ROI: ${inv.roi_percentage}%
                        </p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-xl font-extrabold text-green-400">+$${inv.roi_accrued.toFixed(2)}</span>
                    <p class="text-[10px] text-gray-500 mt-1 uppercase font-bold">Matures: ${new Date(inv.end_date).toLocaleDateString()}</p>
                </div>
            </div>
        `;
    });
}

function renderTransactions(transactions) {
    const container = document.getElementById('transactionsList');
    if (!container) return;
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<tr><td colspan="4" class="p-12 text-center text-gray-600 font-bold">No activity found.</td></tr>';
        return;
    }
    container.innerHTML = '';
    transactions.forEach(tx => {
        const color = ['deposit', 'bonus', 'roi'].includes(tx.type) ? 'text-green-400' : 'text-red-400';
        const icon = tx.type === 'deposit' ? 'fa-arrow-down' : tx.type === 'withdrawal' ? 'fa-arrow-up' : 'fa-gift';
        container.innerHTML += `
            <tr class="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors">
                <td class="px-6 py-4 text-xs font-bold text-gray-400">${new Date(tx.created_at).toLocaleDateString()}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-[10px]">
                            <i class="fas ${icon}"></i>
                        </div>
                        <span class="text-sm font-bold text-white capitalize">${tx.type}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-sm font-extrabold ${color}">${tx.type === 'withdrawal' ? '-' : '+'}$${tx.amount.toFixed(2)}</td>
                <td class="px-6 py-4 text-center">
                    <span class="inline-flex px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${tx.status === 'approved' || tx.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : tx.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}">
                        ${tx.status}
                    </span>
                </td>
            </tr>
        `;
    });
}

function setDisplayName(user) {
    const welcomeNameElement = document.getElementById('welcomeName');
    const usernameEl = document.getElementById('username');
    if (!user) return;

    let displayName = 'Valued Member';
    if (user.fullname && user.fullname.trim() !== '' && user.fullname.trim() !== 'undefined') {
        displayName = user.fullname.trim();
    } else if (user.username && user.username.trim() !== '') {
        displayName = user.username.trim();
    }

    if (welcomeNameElement) welcomeNameElement.innerText = displayName;
    if (usernameEl) usernameEl.innerText = user.username || displayName;
}

async function fetchDashboardData() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Immediately show data from localStorage while we fetch fresh data
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    setDisplayName(localUser);

    const balanceEl = document.getElementById('balance');
    if (balanceEl && localUser.balance !== undefined) {
        balanceEl.innerText = '$' + parseFloat(localUser.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    }

    // Always show chart immediately with simulation (will be replaced with real data if available)
    initProfitChart([]);

    try {
        // Fetch fresh profile
        const profileRes = await fetch(API_URL + '/auth/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!profileRes.ok) {
            if (profileRes.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
            }
            return;
        }

        const user = await profileRes.json();
        localStorage.setItem('user', JSON.stringify(user));

        // Update UI with fresh data
        setDisplayName(user);

        if (balanceEl) balanceEl.innerText = '$' + parseFloat(user.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

        const earningsEl = document.getElementById('earnings');
        if (earningsEl) earningsEl.innerText = '$' + parseFloat(user.earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

        const bonusEl = document.getElementById('bonus');
        if (bonusEl) bonusEl.innerText = '$' + parseFloat(user.referral_bonus || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

        // Fetch investments
        const invRes = await fetch(API_URL + '/invest/investments', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (invRes.ok) {
            const investments = await invRes.json();
            renderInvestments(investments);
        }

        // Fetch transactions and update chart with real data
        const transRes = await fetch(API_URL + '/invest/transactions', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (transRes.ok) {
            const transactions = await transRes.json();
            if (transactions && transactions.length > 0) {
                initProfitChart(transactions);
            }
            renderTransactions(transactions);
        }

        // Poll for balance updates every 5 seconds
        setInterval(async function () {
            try {
                const r = await fetch(API_URL + '/auth/profile', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (r.ok) {
                    const u = await r.json();
                    localStorage.setItem('user', JSON.stringify(u));
                    if (balanceEl) balanceEl.innerText = '$' + parseFloat(u.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
                }
            } catch (e) { }
        }, 5000);

    } catch (err) {
        console.error('Dashboard error:', err);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Start on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchDashboardData);
} else {
    fetchDashboardData();
}
