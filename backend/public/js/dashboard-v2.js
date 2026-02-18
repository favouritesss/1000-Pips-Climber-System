const API_URL = '/api';
let profitChart;

async function fetchDashboardData() {
    const token = localStorage.getItem('token');
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Immediate UI update from local storage with better fallback
    const welcomeNameElement = document.getElementById('welcomeName');
    if (welcomeNameElement) {
        // Prioritize full name -> username -> 'Trader'
        let displayName = 'Trader';
        if (localUser.fullname && localUser.fullname.trim() !== 'undefined') displayName = localUser.fullname;
        else if (localUser.username) displayName = localUser.username;
        welcomeNameElement.innerText = displayName;
    }

    if (localUser.balance !== undefined) {
        const balanceEl = document.getElementById('balance');
        if (balanceEl) balanceEl.innerText = `$${localUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }

    // ... (existing code) ...

    function initProfitChart(transactions) {
        const canvas = document.getElementById('profitChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Generate accurate data from transactions or simulate attractive growth
        let labels = [];
        let dataPoints = [];

        // Check if we have meaningful transaction history (more than just a sign-up bonus)
        if (transactions && transactions.length > 0) {
            // Build chart from actual history
            const sorted = transactions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            let runningBalance = 0;

            // Take last 10 data points or all if less
            const recent = sorted.slice(-15);

            recent.forEach(tx => {
                labels.push(new Date(tx.created_at).toLocaleDateString(undefined, { weekday: 'short' }));
                if (tx.type === 'deposit' || tx.type === 'roi' || tx.type === 'bonus' || tx.type === 'investment') runningBalance += tx.amount;
                if (tx.type === 'withdrawal') runningBalance -= tx.amount;
                dataPoints.push(runningBalance);
            });
        }

        // If data is still empty or overly simple, use the simulation
        if (dataPoints.length === 0) {
            // Cold start simulation (Attractive "Invest Now" curve)
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
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
                        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.25)'); // More transparent
                        return gradient;
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
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
                            label: (context) => `Value: $${context.raw.toFixed(2)}`
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
                        ticks: { color: '#64748B', font: { size: 10, weight: 'bold' }, callback: (value) => '$' + value }
                    }
                }
            }
        });
    }

    function renderTransactions(transactions) {
        const container = document.getElementById('transactionsList');
        container.innerHTML = transactions.length ? '' : '<tr><td colspan="4" class="p-12 text-center text-gray-600 font-bold">Safe keeps empty. No activity found.</td></tr>';
        transactions.forEach(tx => {
            const color = tx.type === 'deposit' || tx.type === 'bonus' || tx.type === 'roi' ? 'text-green-400' : 'text-red-400';
            const icon = tx.type === 'deposit' ? 'fa-arrow-down' : tx.type === 'withdrawal' ? 'fa-arrow-up' : 'fa-gift';

            container.innerHTML += `
    < tr class="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors" >
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
            </tr >
    `;
        });
    }

    async function handleInvestment(planId, amount) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL} /invest/invest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token} `
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
        const res = await fetch(`${API_URL} /invest/deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token} `
            },
            body: JSON.stringify({ amount, method })
        });
        const data = await res.json();
        alert(data.message);
        if (res.ok) fetchDashboardData();
    }

    async function handleWithdrawal(amount, method, wallet) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL} /invest/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token} `
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
