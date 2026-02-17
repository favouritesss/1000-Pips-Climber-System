const API_URL = '/api';
let profitChart;

async function fetchDashboardData() {
    const token = localStorage.getItem('token');
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Immediate UI update from local storage
    const welcomeNameElement = document.getElementById('welcomeName');
    if (welcomeNameElement) {
        const fullName = (localUser.fullname && localUser.fullname.trim() !== '') ? localUser.fullname : (localUser.username || 'Trader');
        welcomeNameElement.innerText = fullName;
    }
    if (localUser.balance !== undefined) {
        const balanceEl = document.getElementById('balance');
        if (balanceEl) balanceEl.innerText = `$${localUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
    if (localUser.username) {
        const usernameEl = document.getElementById('username');
        if (usernameEl) usernameEl.innerText = localUser.username;
    }

    try {
        console.log('Fetching fresh profile data...');
        const profileRes = await fetch(`${API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!profileRes.ok) throw new Error('Session expired or server unreachable');

        const user = await profileRes.json();
        console.log('Profile loaded:', user.username);

        // Update local storage and UI with fresh data
        localStorage.setItem('user', JSON.stringify(user));

        const balanceEl = document.getElementById('balance');
        if (balanceEl) balanceEl.innerText = `$${(user.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        const earningsEl = document.getElementById('earnings');
        if (earningsEl) earningsEl.innerText = `$${(user.earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        const bonusEl = document.getElementById('bonus');
        if (bonusEl) bonusEl.innerText = `$${(user.referral_bonus || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        const usernameEl = document.getElementById('username');
        if (usernameEl) usernameEl.innerText = user.username || 'User';

        if (welcomeNameElement) {
            const fullName = (user.fullname && user.fullname.trim() !== '') ? user.fullname : (user.username || 'Trader');
            welcomeNameElement.innerText = fullName;
        }

        const invRes = await fetch(`${API_URL}/invest/investments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const investments = await invRes.json();
        renderInvestments(investments);

        const transRes = await fetch(`${API_URL}/invest/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const transactions = await transRes.json();
        initProfitChart(transactions);
        startLiveUpdates();
        setInterval(pollBalance, 5000); // Check for new funds every 5 seconds

    } catch (err) {
        console.error(err);
    }
}

async function pollBalance() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const profileRes = await fetch(`${API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!profileRes.ok) return;

        const user = await profileRes.json();

        // Only update if changed to avoid UI flickering
        const currentBalance = document.getElementById('balance').innerText.replace(/[^0-9.-]+/g, "");
        if (parseFloat(currentBalance) !== user.balance) {
            document.getElementById('balance').innerText = `$${user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
            localStorage.setItem('user', JSON.stringify(user));

            // Refresh transactions too if balance changed
            const transRes = await fetch(`${API_URL}/invest/transactions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const transactions = await transRes.json();
            renderTransactions(transactions);
        }
    } catch (e) { console.error(e); }
}

function startLiveUpdates() {
    // Simulate live profit curve fluctuations
    setInterval(() => {
        if (profitChart && profitChart.data.datasets[0].data.length > 0) {
            const lastVal = profitChart.data.datasets[0].data[profitChart.data.datasets[0].data.length - 1];
            const change = (Math.random() - 0.4) * 5; // Slight upward bias
            profitChart.data.datasets[0].data[profitChart.data.datasets[0].data.length - 1] = lastVal + change;
            profitChart.update('none'); // Update without full animation for "live" feel
        }
    }, 3000);
}

function initProfitChart(transactions) {
    const ctx = document.getElementById('profitChart').getContext('2d');

    // Simple profit simulation based on transactions or static for demo
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [120, 190, 300, 500, 200, 300, 450]; // Mock data for trend

    if (profitChart) profitChart.destroy();

    profitChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Earnings Growth',
                data: data,
                borderColor: '#3B82F6',
                borderWidth: 4,
                pointBackgroundColor: '#3B82F6',
                pointBorderColor: 'rgba(255,255,255,0.5)',
                pointRadius: 6,
                pointHoverRadius: 8,
                tension: 0.4,
                fill: true,
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return null;
                    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
                    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
                    return gradient;
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1E293B',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: (val) => `$${val.raw.toFixed(2)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748B', font: { weight: 'bold' } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#64748B', font: { weight: 'bold' } }
                }
            }
        }
    });
}

function renderInvestments(investments) {
    const container = document.getElementById('investmentsList');
    container.innerHTML = investments.length ? '' : `
        <div class="glass p-8 rounded-3xl text-center">
            <i class="fas fa-folder-open text-gray-700 text-4xl mb-4"></i>
            <p class="text-gray-500 font-bold">No active growth plans detected</p>
            <p class="text-xs text-gray-600 mt-2">Start your first investment to see it here.</p>
        </div>
    `;
    investments.forEach(inv => {
        container.innerHTML += `
            <div class="glass glass-hover p-6 rounded-[1.5rem] border border-gray-800/50 flex justify-between items-center transition-all">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <i class="fas fa-bolt"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-white text-lg">${inv.plan_name} Contract</h4>
                        <p class="text-[10px] text-gray-500 uppercase tracking-widest font-extrabold mt-1">
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
    container.innerHTML = transactions.length ? '' : '<tr><td colspan="4" class="p-12 text-center text-gray-600 font-bold">Safe keeps empty. No activity found.</td></tr>';
    transactions.forEach(tx => {
        const color = tx.type === 'deposit' || tx.type === 'bonus' || tx.type === 'roi' ? 'text-green-400' : 'text-red-400';
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

async function handleInvestment(planId, amount) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/invest/invest`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan_id: planId, amount })
    });
    const data = await res.json();
    if (res.ok) {
        fetchDashboardData();
    } else {
        alert(data.message);
    }
}

async function handleDeposit(amount, method) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/invest/deposit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount, method })
    });
    const data = await res.json();
    alert(data.message);
    if (res.ok) fetchDashboardData();
}

async function handleWithdrawal(amount, method, wallet) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/invest/withdraw`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount, method, wallet_address: wallet })
    });
    const data = await res.json();
    alert(data.message);
    if (res.ok) fetchDashboardData();
}

// Execute immediately if DOM is already loaded, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchDashboardData);
} else {
    fetchDashboardData();
}
