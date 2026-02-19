var API_URL = '/api';
let adminDataInitialized = false;
let allUsers = [];

async function fetchAdminData() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/admin-login.html';
        return;
    }
    try {
        const profileRes = await fetch(`${API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!profileRes.ok) {
            console.error('Admin profile verify failed:', profileRes.status);
            window.location.href = '/admin-login.html';
            return;
        }

        const user = await profileRes.json();

        if (user.role !== 'admin') {
            alert('Access denied. This area is reserved for administrators.');
            window.location.href = '/admin-login.html';
            return;
        }

        const statsRes = await fetch(`${API_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!statsRes.ok) throw new Error('Failed to fetch admin statistics');
        const stats = await statsRes.json();

        document.getElementById('totalUsers').innerText = stats.totalUsers;
        document.getElementById('totalDeposits').innerText = `$${stats.totalDeposits.toFixed(2)}`;
        document.getElementById('totalWithdrawals').innerText = `$${stats.totalWithdrawals.toFixed(2)}`;
        document.getElementById('revenue').innerText = `$${stats.revenue.toFixed(2)}`;

        const pendingRes = await fetch(`${API_URL}/admin/transactions/pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const pending = await pendingRes.json();
        renderPendingTransactions(pending);

        const usersRes = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allUsers = await usersRes.json();
        renderUsers(allUsers);

        const allTxRes = await fetch(`${API_URL}/admin/transactions/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const allTx = await allTxRes.json();
        renderAllTransactions(allTx);

        const invRes = await fetch(`${API_URL}/admin/investments/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const investments = await invRes.json();
        renderInvestments(investments);

    } catch (err) {
        console.error(err);
    }
}

function renderPendingTransactions(transactions) {
    const list = document.getElementById('pendingTransactionsList');
    const noMsg = document.getElementById('noPendingMessage');

    if (!transactions.length) {
        list.innerHTML = '';
        noMsg.classList.remove('hidden');
        return;
    }

    noMsg.classList.add('hidden');
    list.innerHTML = '';

    transactions.forEach(tx => {
        list.innerHTML += `
            <div class="bg-slate-900 border border-slate-800 p-5 rounded-3xl hover:border-primary/30 transition-all group">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                            <i class="fas ${tx.type === 'deposit' ? 'fa-arrow-down' : 'fa-arrow-up'} text-xs"></i>
                        </div>
                        <div>
                            <p class="text-xs font-black text-white">${tx.username}</p>
                            <p class="text-[10px] text-slate-500 uppercase tracking-widest">${tx.type}</p>
                        </div>
                    </div>
                    <p class="text-lg font-black text-white">$${tx.amount.toLocaleString()}</p>
                </div>
                <p class="text-[10px] text-slate-500 line-clamp-1 mb-4 italic">"${tx.description || 'No description provided'}"</p>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="approveTx(${tx.id})" class="py-2.5 bg-green-500/10 text-green-500 rounded-xl text-xs font-bold hover:bg-green-500 hover:text-white transition-all">Approve</button>
                    <button onclick="rejectTx(${tx.id})" class="py-2.5 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all">Reject</button>
                </div>
            </div>
        `;
    });
}

function renderUsers(users) {
    const container = document.getElementById('usersList');
    container.innerHTML = users.length ? '' : '<tr><td colspan="5" class="p-10 text-center text-slate-600 font-bold italic">No explorers found in the registry...</td></tr>';

    users.forEach(user => {
        container.innerHTML += `
            <tr class="group hover:bg-white/[0.02] transition-colors">
                <td class="p-6">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-black text-primary">
                            ${user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p class="text-sm font-black text-white mb-0.5">${user.username}</p>
                            <p class="text-xs text-slate-500 font-medium">${user.id}</p>
                        </div>
                    </div>
                </td>
                <td class="p-6">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Verified</p>
                    <p class="text-xs text-slate-500 font-mono">${user.email}</p>
                </td>
                <td class="p-6">
                    <p class="text-lg font-black text-white">$${user.balance.toLocaleString()}</p>
                </td>
                <td class="p-6">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}">
                        <span class="w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-green-400' : 'bg-red-500'}"></span>
                        ${user.status}
                    </span>
                </td>
                <td class="p-6 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button onclick="openFundModal(${user.id}, '${user.username}')" class="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/10">
                            Fund
                        </button>
                        <button onclick="toggleUserStatus(${user.id}, '${user.status === 'active' ? 'inactive' : 'active'}')" class="p-2 text-slate-500 hover:text-white transition-colors">
                            <i class="fas ${user.status === 'active' ? 'fa-ban' : 'fa-check'}"></i>
                        </button>
                        <button onclick="deleteUser(${user.id})" class="p-2 text-slate-700 hover:text-red-500 transition-colors">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

function renderInvestments(investments) {
    const container = document.getElementById('investmentsList');
    container.innerHTML = investments.length ? '' : '<tr><td colspan="5" class="p-10 text-center text-slate-600 font-bold italic">No active contracts found...</td></tr>';

    investments.forEach(inv => {
        container.innerHTML += `
            <tr class="group hover:bg-white/[0.02] transition-colors">
                <td class="p-6 text-sm font-bold text-white">${inv.username}</td>
                <td class="p-6">
                    <span class="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-black uppercase">${inv.plan_name}</span>
                </td>
                <td class="p-6 text-sm font-black text-white">$${inv.amount.toLocaleString()}</td>
                <td class="p-6 text-sm font-black text-green-400">$${inv.roi_accrued.toLocaleString()}</td>
                <td class="p-6">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${inv.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-500'}">
                        ${inv.status}
                    </span>
                </td>
            </tr>
        `;
    });
}

function renderAllTransactions(transactions) {
    const container = document.getElementById('allTransactionsList');
    container.innerHTML = transactions.length ? '' : '<tr><td colspan="5" class="p-10 text-center text-slate-600 font-bold italic">No activity recorded...</td></tr>';

    transactions.forEach(tx => {
        const date = new Date(tx.created_at).toLocaleString();
        container.innerHTML += `
            <tr class="group hover:bg-white/[0.02] transition-colors">
                <td class="p-6 text-xs text-slate-500 font-mono">${date}</td>
                <td class="p-6 text-sm font-bold text-white">${tx.username}</td>
                <td class="p-6 text-xs font-black uppercase tracking-widest text-slate-400">${tx.type}</td>
                <td class="p-6 text-sm font-black ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}">
                    ${tx.type === 'deposit' ? '+' : '-'}$${tx.amount.toLocaleString()}
                </td>
                <td class="p-6">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${tx.status === 'approved' ? 'bg-green-500/10 text-green-400' : tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}">
                        ${tx.status}
                    </span>
                </td>
            </tr>
        `;
    });
}

// Make this function global for inline onclick
window.openFundModal = function (userId, username) {
    const alpineEl = document.querySelector('[x-data]');
    if (alpineEl && alpineEl.__x) {
        const data = alpineEl.__x.$data;
        data.selectedUser = { id: userId, username: username };
        data.fundMode = 'add';
        data.showFundModal = true;
        data.fundAmount = '';
        setTimeout(() => {
            const input = document.querySelector('input[x-model="fundAmount"]');
            if (input) input.focus();
        }, 100);
    } else {
        console.error('Alpine component not found');
        alert('Error: Admin dashboard component not initialized.');
    }
}

function closeFundModal() {
    const alpineEl = document.querySelector('[x-data]');
    if (alpineEl && alpineEl.__x) {
        alpineEl.__x.$data.showFundModal = false;
        alpineEl.__x.$data.fundAmount = '';
    }
}

async function executeFunding() {
    const userId = document.getElementById('fundUserId').value;
    const amount = document.getElementById('fundAmount').value;

    if (!amount || isNaN(amount) || amount <= 0) {
        alert('Please enter a valid positive amount');
        return;
    }

    const token = localStorage.getItem('token');
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = 'Processing...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/admin/users/fund`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId, amount: parseFloat(amount) })
        });

        const data = await res.json();
        if (res.ok) {
            closeFundModal();
            fetchAdminData();
        } else {
            alert(data.message || 'Error funding account');
        }
    } catch (err) {
        console.error(err);
        alert('Network error. Please try again.');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function approveTx(id) {
    if (!confirm('Approve this transaction?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/admin/transactions/approve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
    });
    if (res.ok) fetchAdminData();
}

async function rejectTx(id) {
    if (!confirm('Reject this transaction?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/admin/transactions/reject`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
    });
    if (res.ok) fetchAdminData();
}

async function toggleUserStatus(id, newStatus) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/admin/users/status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, status: newStatus })
    });
    if (res.ok) fetchAdminData();
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this user? This cannot be undone.')) return;

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/admin/users/delete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
    });

    if (res.ok) fetchAdminData();
}

function handleSearch(query) {
    const filtered = allUsers.filter(u =>
        u.username.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
    );
    renderUsers(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAdminData();
    const searchInput = document.querySelector('input[placeholder="Search users..."]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    }
});
