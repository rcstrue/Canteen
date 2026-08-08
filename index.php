<?php
require_once 'config.php';
requireLogin();
$user = currentUser();
$isAdmin = $user['role'] === 'admin';
$page = input('p', 'dashboard');
$pages = ['dashboard','meals','purchases','outward','stock','suppliers','ingredients','expenses','budgets','users','audit'];
if (!in_array($page, $pages)) $page = 'dashboard';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RCS Canteen Management</title>
    <link rel="stylesheet" href="style.css">
    <style>
        .sidebar-link{transition:all .15s}.sidebar-link:hover,.sidebar-link.active{background:rgba(245,158,11,.1);color:#d97706}
        .fade-in{animation:fadeIn .2s ease-out}@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .page{display:none}.page.active{display:block}
        @media(max-width:768px){#sidebar{transform:translateX(-100%);position:fixed;z-index:40;height:100vh}#sidebar.open{transform:translateX(0)}#overlay{display:none}#overlay.open{display:block;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:35}}
        .toast{animation:slideIn .3s ease-out,fadeOut .3s ease-in 2.7s forwards}@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes fadeOut{from{opacity:1}to{opacity:0}}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}input[type=number]{-moz-appearance:textfield}
        .glass-card{background:rgba(255,255,255,.9);backdrop-filter:blur(12px);border:1px solid rgba(229,231,235,.6);box-shadow:0 4px 24px rgba(0,0,0,.06)}
        .week-btn{padding:6px 16px;border-radius:8px;font-size:13px;font-weight:600;transition:all .15s;cursor:pointer;border:1px solid #e5e7eb;background:#fff;color:#374151}
        .week-btn:hover{background:#f3f4f6;border-color:#d1d5db}
        .week-btn.active{background:#111827;color:#fff;border-color:#111827}
        .stat-card{border-radius:16px;padding:20px 24px;position:relative;overflow:hidden}
        .stat-card::before{content:'';position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;opacity:.08}
        .stat-card.amber{background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fde68a}.stat-card.amber::before{background:#d97706}
        .stat-card.emerald{background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #a7f3d0}.stat-card.emerald::before{background:#059669}
        .stat-card.rose{background:linear-gradient(135deg,#fff1f2,#ffe4e6);border:1px solid #fecdd3}.stat-card.rose::before{background:#e11d48}
        .stat-card.sky{background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1px solid #bae6fd}.stat-card.sky::before{background:#0284c7}
        .stat-card.violet{background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1px solid #ddd6fe}.stat-card.violet::before{background:#7c3aed}
    </style>
</head>
<body class="bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 antialiased">

<div id="toast-container" class="fixed top-4 right-4 z-50 space-y-2"></div>
<div id="overlay" onclick="toggleSidebar()"></div>

<div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside id="sidebar" class="w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 shrink-0">
        <div class="p-4 border-b border-gray-200">
            <div class="flex items-center gap-2">
                <span class="text-2xl">🔥</span>
                <div><h1 class="font-bold text-lg leading-tight">RCS Canteen</h1><p class="text-xs text-gray-500">Management System</p></div>
            </div>
        </div>
        <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto">
            <a href="#" onclick="showPage('dashboard')" class="sidebar-link<?php echo $page==='dashboard'?' active':''; ?> flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium" data-page="dashboard"><span>📊</span> Dashboard</a>
            <a href="#" onclick="showPage('meals')" class="sidebar-link<?php echo $page==='meals'?' active':''; ?> flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium" data-page="meals"><span>🍽️</span> Meal Count</a>
            <a href="#" onclick="showPage('purchases')" class="sidebar-link<?php echo $page==='purchases'?' active':''; ?> flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium" data-page="purchases"><span>🛒</span> Purchase Entry</a>
            <a href="#" onclick="showPage('outward')" class="sidebar-link<?php echo $page==='outward'?' active':''; ?> flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium" data-page="outward"><span>📤</span> Outward Entry</a>
            <a href="#" onclick="showPage('stock')" class="sidebar-link<?php echo $page==='stock'?' active':''; ?> flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium" data-page="stock"><span>📦</span> Stock Reports</a>
            <div class="border-t my-2"></div>
            <p class="px-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Master Data</p>
            <a href="#" onclick="showPage('suppliers')" class="sidebar-link<?php echo $page==='suppliers'?' active':''; ?> flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium" data-page="suppliers"><span>🏪</span> Suppliers</a>
            <a href="#" onclick="showPage('ingredients')" class="sidebar-link<?php echo $page==='ingredients'?' active':''; ?> flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium" data-page="ingredients"><span>🥕</span> Ingredients</a>
            <a href="#" onclick="showPage('expenses')" class="sidebar-link<?php echo $page==='expenses'?' active':''; ?> flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium" data-page="expenses"><span>💰</span> Expenses</a>
            <a href="#" onclick="showPage('budgets')" class="sidebar-link<?php echo $page==='budgets'?' active':''; ?> flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium" data-page="budgets"><span>📊</span> Budgets</a>
            <?php if ($isAdmin): ?>
            <div class="border-t my-2"></div>
            <p class="px-3 text-xs text-gray-400 font-medium uppercase tracking-wider">Admin</p>
            <a href="#" onclick="showPage('users')" class="sidebar-link<?php echo $page==='users'?' active':''; ?> flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium" data-page="users"><span>👥</span> Users</a>
            <a href="#" onclick="showPage('audit')" class="sidebar-link<?php echo $page==='audit'?' active':''; ?> flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium" data-page="audit"><span>📋</span> Audit Log</a>
            <?php endif; ?>
        </nav>
        <div class="p-3 border-t border-gray-200">
            <div class="px-3 py-2 mb-1"><p class="text-sm font-medium"><?= htmlspecialchars($user['name']) ?></p><p class="text-xs text-gray-500 capitalize"><?= $user['role'] ?></p></div>
            <a href="logout.php" class="sidebar-link flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"><span>🚪</span> Logout</a>
        </div>
    </aside>

    <main class="flex-1 overflow-y-auto">
        <div class="md:hidden flex items-center gap-3 p-4 border-b bg-white">
            <button onclick="toggleSidebar()" class="p-2 rounded-lg hover:bg-gray-100">☰</button>
            <h1 class="font-bold">RCS Canteen</h1>
        </div>
        <div class="p-4 md:p-6 lg:p-8">
            <?php
$activePage = $page;
$allPages = ['dashboard','meals','purchases','outward','stock','suppliers','ingredients','expenses','budgets','users','audit'];
foreach ($allPages as $p): if (!$isAdmin && in_array($p, ['users','audit'])) continue; ?>
<?php include "pages/$p.php"; ?>
<?php endforeach; ?>
        </div>
    </main>
</div>

<!-- Modal for stock movements -->
<div id="movements-modal" class="fixed inset-0 bg-black/40 z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div class="p-4 border-b flex justify-between items-center"><h3 class="font-semibold">Stock Movements</h3><button onclick="document.getElementById('movements-modal').classList.add('hidden')" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>
        <div class="overflow-auto flex-1">
            <table class="w-full text-sm"><thead class="bg-gray-50 sticky top-0"><tr><th class="text-left px-4 py-2">Date</th><th class="text-left px-4 py-2">Ingredient</th><th class="text-left px-4 py-2">Type</th><th class="text-right px-4 py-2">Qty</th><th class="text-right px-4 py-2">Amount</th><th class="text-left px-4 py-2">Notes</th></tr></thead><tbody id="movements-table"></tbody></table>
        </div>
    </div>
</div>

<!-- Generic Edit Modal -->
<div id="edit-modal" class="fixed inset-0 bg-black/40 z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div class="p-4 border-b flex justify-between items-center"><h3 class="font-semibold" id="edit-modal-title">Edit</h3><button onclick="document.getElementById('edit-modal').classList.add('hidden')" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>
        <div class="p-4" id="edit-modal-body"></div>
    </div>
</div>

<script>
let ingredients = [], suppliers = [], _pmrData = null;
const INR = n => '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits: 0});
const INR2 = n => '₹' + Number(n).toFixed(2);
const ING_CATEGORIES = ['Grains','Vegetables','Meat','Dairy','Oil','Spices','Beverages','Pulses','Fruits','Dry Fruits','Other'];
const catOpts = (sel='') => ING_CATEGORIES.map(c => '<option' + (c===sel?' selected':'') + '>' + c + '</option>').join('');

async function api(action, data = {}) {
    const form = new FormData();
    form.append('action', action);
    for (const [k, v] of Object.entries(data)) { form.append(k, Array.isArray(v) ? JSON.stringify(v) : v); }
    const res = await fetch('api.php', { method: 'POST', body: form });
    return res.json();
}

function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = 'toast px-4 py-3 rounded-lg shadow-lg text-sm font-medium ' + (type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white');
    el.textContent = msg; document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('page-' + page);
    if (el) el.classList.add('active');
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const link = document.querySelector('[data-page="' + page + '"]');
    if (link) link.classList.add('active');
    toggleSidebar(false);
    const loaders = { dashboard: loadDashboard, meals: loadMeals, purchases: loadPurchases, outward: loadOutward, stock: loadStock, suppliers: loadSuppliers, ingredients: loadIngredients, expenses: loadExpenses, budgets: loadBudgets, users: loadUsers, audit: loadAudit };
    if (loaders[page]) loaders[page]();
}

function toggleSidebar(force) {
    const sb = document.getElementById('sidebar'), ov = document.getElementById('overlay');
    const open = force !== undefined ? force : !sb.classList.contains('open');
    sb.classList.toggle('open', open); ov.classList.toggle('open', open);
}

// ═══ DASHBOARD ═════════════════════════════════════════════════
let _dashWeek = 1;
function getWeeksInMonth(month) {
    const daysInMonth = new Date(parseInt(month.slice(0,4)), parseInt(month.slice(5)), 0).getDate();
    const weeks = [];
    let w = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const ds = month + '-' + String(d).padStart(2,'0');
        w.push(ds);
        const dow = new Date(ds + 'T00:00:00').getDay();
        if (dow === 0 || d === daysInMonth) { weeks.push(w); w = []; }
    }
    if (w.length) weeks.push(w);
    return weeks;
}
function changeWeek(dir) {
    const month = document.getElementById('dash-month').value;
    const weeks = getWeeksInMonth(month);
    _dashWeek = Math.max(1, Math.min(weeks.length, _dashWeek + dir));
    renderWeekTable();
}
function selectWeek(n) { _dashWeek = n; renderWeekTable(); }

async function loadDashboard() {
    const month = document.getElementById('dash-month').value;
    const [s, pmr] = await Promise.all([api('get_monthly_report', { month }), api('get_per_meal_report', { month })]);
    _pmrData = pmr;
    const monthLabel = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    document.getElementById('dash-label').textContent = monthLabel;
    document.getElementById('d-purchase').textContent = INR(s.purchase_total);
    document.getElementById('d-purchase2').textContent = INR(s.purchase_total);
    document.getElementById('d-used').textContent = INR(s.stock_used);
    document.getElementById('d-used2').textContent = INR(s.stock_used);
    document.getElementById('d-stock-val').textContent = INR(s.stock_value);
    document.getElementById('d-breakfast').textContent = s.breakfast.toLocaleString('en-IN');
    document.getElementById('d-lunch').textContent = s.lunch.toLocaleString('en-IN');
    document.getElementById('d-dinner').textContent = s.dinner.toLocaleString('en-IN');
    document.getElementById('d-total-meals').textContent = s.total_meals.toLocaleString('en-IN');
    document.getElementById('d-cost-meal').textContent = INR2(s.cost_per_meal);
    document.getElementById('d-low-stock').textContent = s.low_stock_count;
    // Week nav
    const weeks = getWeeksInMonth(month);
    _dashWeek = Math.min(_dashWeek, weeks.length);
    const navEl = document.getElementById('d-week-nav');
    if (navEl) {
        navEl.innerHTML = '<button class="week-btn" onclick="changeWeek(-1)">◀ Prev</button>' +
            weeks.map((w, i) => '<button class="week-btn' + (i+1===_dashWeek?' active':'') + '" onclick="selectWeek(' + (i+1) + ')">W' + (i+1) + '</button>').join('') +
            '<button class="week-btn" onclick="changeWeek(1)">Next ▶</button>';
    }
    renderWeekTable();
    // Other Expenses
    const eTbody = document.getElementById('d-expense-table');
    if (s.expense_breakdown.length) {
        let rowNum = 1;
        eTbody.innerHTML = s.expense_breakdown.map(e => '<tr class="border-t"><td class="px-4 py-2 text-gray-400">' + (rowNum++) + '</td><td class="px-4 py-2 font-medium">' + e.category + '</td><td class="px-4 py-2 text-right">' + INR(e.total) + '</td></tr>').join('');
        document.getElementById('d-expense-total').innerHTML = '<tr class="border-t-2 font-bold bg-gray-50"><td class="px-4 py-2"></td><td class="px-4 py-2">Total Other Expenses</td><td class="px-4 py-2 text-right">' + INR(s.other_expenses) + '</td></tr>';
    } else { eTbody.innerHTML = '<tr><td colspan="3" class="px-4 py-6 text-center text-gray-400">No expenses this month</td></tr>'; document.getElementById('d-expense-total').innerHTML = ''; }
    document.getElementById('d-summary-total').textContent = INR(s.total_expenses);
    document.getElementById('d-summary-meals').textContent = s.total_meals.toLocaleString('en-IN');
    document.getElementById('d-summary-cpm').textContent = INR2(s.cost_per_meal);
    // Recent movements
    const rm = document.getElementById('d-recent');
    if (!s.recent.length) { rm.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-gray-400">No movements yet</td></tr>'; return; }
    rm.innerHTML = s.recent.map(m => '<tr class="border-t hover:bg-gray-50"><td class="px-4 py-2">' + m.date + '</td><td class="px-4 py-2 font-medium">' + m.ingredient_name + '</td><td class="px-4 py-2"><span class="px-2 py-0.5 rounded text-xs font-medium ' + (m.type==='PURCHASE'?'bg-emerald-100 text-emerald-700':m.type==='CONSUMPTION'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-700') + '">' + m.type + '</span></td><td class="px-4 py-2 text-right">' + m.qty + ' ' + (m.unit||'') + '</td><td class="px-4 py-2 text-right">' + INR(m.total_amount) + '</td></tr>').join('');
}

function renderWeekTable() {
    if (!_pmrData) return;
    const month = document.getElementById('dash-month').value;
    const weeks = getWeeksInMonth(month);
    const weekDates = weeks[_dashWeek - 1] || [];
    const dateSet = new Set(weekDates);
    const weekRows = _pmrData.data.filter(d => dateSet.has(d.date));
    const pmTbody = document.getElementById('d-per-meal-table');
    pmTbody.innerHTML = weekRows.map(d => {
        const hasData = d.breakfast || d.lunch || d.dinner;
        const dateObj = new Date(d.date + 'T00:00:00');
        const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });
        const isToday = d.date === new Date().toISOString().slice(0, 10);
        const totalMeals = d.breakfast + d.lunch + d.dinner;
        const totalCost = d.breakfast_cost + d.lunch_cost + d.dinner_cost;
        const cpm = totalMeals > 0 ? totalCost / totalMeals : 0;
        const rowClass = isToday ? 'bg-amber-50' : (!hasData ? 'text-gray-300' : 'hover:bg-gray-50');
        return '<tr class="border-t ' + rowClass + '"><td class="px-3 py-2 text-sm font-medium">' + d.date.slice(8) + ' <span class="text-gray-400 text-xs font-normal">' + dayName + '</span></td><td class="px-2 py-2 text-center text-sm">' + (d.breakfast || '') + '</td><td class="px-2 py-2 text-center text-sm">' + (d.lunch || '') + '</td><td class="px-2 py-2 text-center text-sm">' + (d.dinner || '') + '</td><td class="px-2 py-2 text-right text-xs">' + (d.breakfast_cost ? INR(d.breakfast_cost) : '—') + '</td><td class="px-2 py-2 text-right text-xs">' + (d.lunch_cost ? INR(d.lunch_cost) : '—') + '</td><td class="px-2 py-2 text-right text-xs">' + (d.dinner_cost ? INR(d.dinner_cost) : '—') + '</td><td class="px-2 py-2 text-right text-xs font-bold ' + (cpm > 0 ? 'text-amber-700' : 'text-gray-300') + '">' + (cpm > 0 ? INR2(cpm) : '—') + '</td></tr>';
    }).join('');
    // Week sub-totals
    let wb=0,wl=0,wd=0,wbc=0,wlc=0,wdc=0;
    weekRows.forEach(d => { wb+=d.breakfast; wl+=d.lunch; wd+=d.dinner; wbc+=d.breakfast_cost; wlc+=d.lunch_cost; wdc+=d.dinner_cost; });
    const wt = wb+wl+wd, wc = wbc+wlc+wdc, wcpm = wt > 0 ? wc/wt : 0;
    document.getElementById('d-per-meal-totals').innerHTML = '<tr class="border-t-2 border-gray-800 bg-gray-100 font-bold"><td class="px-3 py-2 text-sm">Week ' + _dashWeek + ' Total</td><td class="px-2 py-2 text-center text-sm">' + wb + '</td><td class="px-2 py-2 text-center text-sm">' + wl + '</td><td class="px-2 py-2 text-center text-sm">' + wd + '</td><td class="px-2 py-2 text-right text-sm">' + (wbc?INR(wbc):'') + '</td><td class="px-2 py-2 text-right text-sm">' + (wlc?INR(wlc):'') + '</td><td class="px-2 py-2 text-right text-sm">' + (wdc?INR(wdc):'') + '</td><td class="px-2 py-2 text-right text-sm text-amber-700">' + (wcpm>0?INR2(wcpm):'') + '</td></tr>';
}

// ═══ MEAL COUNTS ══════════════════════════════════════════════
async function loadMeals() {
    const month = document.getElementById('meal-month').value;
    const data = await api('get_meal_counts', { month });
    const monthLabel = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    document.getElementById('meal-label').textContent = monthLabel;
    const tbody = document.getElementById('meal-table');
    let totalB = 0, totalL = 0, totalD = 0;
    tbody.innerHTML = data.map(d => {
        totalB += d.breakfast; totalL += d.lunch; totalD += d.dinner;
        const dateObj = new Date(d.date + 'T00:00:00');
        const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });
        const isToday = d.date === new Date().toISOString().slice(0, 10);
        return '<tr class="border-t ' + (isToday ? 'bg-amber-50' : '') + '"><td class="px-3 py-1.5 text-sm">' + d.date.slice(8) + '<span class="text-gray-400 ml-1">' + dayName + '</span></td><td class="px-2 py-1.5"><input type="number" min="0" class="w-full border rounded px-2 py-1 text-sm text-center" data-date="' + d.date + '" data-meal="breakfast" value="' + (d.breakfast || '') + '"></td><td class="px-2 py-1.5"><input type="number" min="0" class="w-full border rounded px-2 py-1 text-sm text-center" data-date="' + d.date + '" data-meal="lunch" value="' + (d.lunch || '') + '"></td><td class="px-2 py-1.5"><input type="number" min="0" class="w-full border rounded px-2 py-1 text-sm text-center" data-date="' + d.date + '" data-meal="dinner" value="' + (d.dinner || '') + '"></td></tr>';
    }).join('');
    document.getElementById('meal-totals').innerHTML = '<td colspan="4" class="px-3 py-2 font-bold bg-gray-50 border-t-2">Total: ' + totalB + ' Breakfast | ' + totalL + ' Lunch | ' + totalD + ' Dinner | <span class="text-amber-600">' + (totalB+totalL+totalD) + ' Total</span></td>';
}

async function saveMeals() {
    const inputs = document.querySelectorAll('#meal-table input[type=number]');
    const countsMap = {};
    inputs.forEach(inp => {
        const date = inp.dataset.date, meal = inp.dataset.meal, val = parseInt(inp.value) || 0;
        if (!countsMap[date]) countsMap[date] = { date, breakfast: 0, lunch: 0, dinner: 0 };
        countsMap[date][meal] = val;
    });
    const counts = Object.values(countsMap);
    const res = await api('save_meal_counts', { month: document.getElementById('meal-month').value, counts });
    if (res.success) toast('Meal counts saved!'); else toast(res.error || 'Failed', 'error');
}

// ═══ PURCHASES ════════════════════════════════════════════════
function addPurchaseRow() {
    const c = document.getElementById('p-items');
    const row = document.createElement('div');
    row.className = 'grid grid-cols-12 gap-2 px-4 py-2 border-t items-center';
    row.innerHTML = '<select class="col-span-5 border rounded px-2 py-1.5 text-sm p-ingredient" onchange="updatePurchaseTotals()"><option value="">Select</option>' + ingredients.map(i => '<option value="' + i.id + '">' + i.name + ' (' + i.unit + ')</option>').join('') + '</select><input type="number" step="0.01" min="0" class="col-span-2 border rounded px-2 py-1.5 text-sm p-qty" placeholder="Qty" oninput="updatePurchaseTotals()"><input type="number" step="0.01" min="0" class="col-span-2 border rounded px-2 py-1.5 text-sm p-price" placeholder="Price" oninput="updatePurchaseTotals()"><div class="col-span-2 text-right font-medium text-sm p-rowtotal">₹0</div><button onclick="this.parentElement.remove();updatePurchaseTotals()" class="text-red-400 hover:text-red-600">✕</button>';
    c.appendChild(row);
}

function updatePurchaseTotals() {
    let total = 0;
    document.querySelectorAll('#p-items > div:not(:first-child)').forEach(row => {
        const q = parseFloat(row.querySelector('.p-qty')?.value) || 0, p = parseFloat(row.querySelector('.p-price')?.value) || 0, t = q * p;
        row.querySelector('.p-rowtotal').textContent = INR(t); total += t;
    });
    document.getElementById('p-total').textContent = 'Total: ' + INR(total);
}

function clearPurchaseForm() {
    document.getElementById('p-invoice').value = ''; document.getElementById('p-notes').value = '';
    document.getElementById('p-items').innerHTML = '<div class="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 text-xs font-medium text-gray-500"><div class="col-span-5">Ingredient</div><div class="col-span-2">Qty</div><div class="col-span-2">Price (₹)</div><div class="col-span-2 text-right">Total</div><div class="col-span-1"></div></div>';
    for (let i = 0; i < 5; i++) addPurchaseRow();
    updatePurchaseTotals();
}

async function savePurchase() {
    const items = [];
    document.querySelectorAll('#p-items > div:not(:first-child)').forEach(row => {
        const id = row.querySelector('.p-ingredient')?.value, q = parseFloat(row.querySelector('.p-qty')?.value), p = parseFloat(row.querySelector('.p-price')?.value);
        if (id && q > 0 && p > 0) items.push({ ingredient_id: id, qty: q, unit_price: p });
    });
    if (!items.length) return toast('Add items with valid data', 'error');
    const btn = document.getElementById('btn-save-purchase'); btn.disabled = true; btn.textContent = 'Saving...';
    const res = await api('add_purchase', { date: document.getElementById('p-date').value, supplier_id: document.getElementById('p-supplier').value, invoice_no: document.getElementById('p-invoice').value, notes: document.getElementById('p-notes').value, items });
    btn.disabled = false; btn.textContent = 'Save Purchase';
    if (res.success) { toast('Purchase saved!'); clearPurchaseForm(); loadPurchases(); } else toast(res.error || 'Failed', 'error');
}

async function loadPurchases() {
    const res = await api('list_purchases', { date_from: document.getElementById('p-from')?.value, date_to: document.getElementById('p-to')?.value });
    const tbody = document.getElementById('purchase-list');
    if (!res.data?.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-400">No purchases</td></tr>'; return; }
    tbody.innerHTML = res.data.map(p => '<tr class="border-t hover:bg-gray-50"><td class="px-4 py-2">' + p.date + '</td><td class="px-4 py-2 font-medium">' + (p.invoice_no||'—') + '</td><td class="px-4 py-2">' + (p.supplier_name||'—') + '</td><td class="px-4 py-2 text-center">' + p.item_count + '</td><td class="px-4 py-2 text-right font-medium">' + INR(p.total_amount) + '</td><td class="px-4 py-2 text-center"><button onclick="deletePurchase(' + p.id + ')" class="text-red-500 hover:text-red-700 text-xs">Delete</button></td></tr>').join('');
}

async function deletePurchase(id) { if (!confirm('Delete this purchase?')) return; const r = await api('delete_purchase', { id }); if (r.success) { toast('Deleted'); loadPurchases(); } else toast(r.error||'Failed','error'); }

// ═══ OUTWARD ══════════════════════════════════════════════════
function addOutwardRow() {
    const c = document.getElementById('o-items');
    const row = document.createElement('div');
    row.className = 'grid grid-cols-12 gap-2 px-4 py-2 border-t items-center';
    row.innerHTML = '<select class="col-span-5 border rounded px-2 py-1.5 text-sm o-ingredient" onchange="onOutwardIngChange(this)"><option value="">Select</option>' + ingredients.map(i => '<option value="' + i.id + '" data-cost="' + i.avg_cost + '">' + i.name + ' (' + i.unit + ') — Stock: ' + i.current_stock + '</option>').join('') + '</select><input type="number" step="0.01" min="0" class="col-span-2 border rounded px-2 py-1.5 text-sm o-qty" placeholder="Qty" oninput="updateOutwardTotals()"><input type="number" step="0.01" min="0" class="col-span-2 border rounded px-2 py-1.5 text-sm o-cost" placeholder="Cost" oninput="updateOutwardTotals()"><div class="col-span-2 text-right font-medium text-sm o-rowtotal">₹0</div><button onclick="this.parentElement.remove();updateOutwardTotals()" class="text-red-400 hover:text-red-600">✕</button>';
    c.appendChild(row);
}

function onOutwardIngChange(sel) { const opt = sel.options[sel.selectedIndex]; if (opt.dataset.cost) sel.closest('div').querySelector('.o-cost').value = opt.dataset.cost; updateOutwardTotals(); }

function updateOutwardTotals() {
    let total = 0;
    document.querySelectorAll('#o-items > div:not(:first-child)').forEach(row => {
        const q = parseFloat(row.querySelector('.o-qty')?.value) || 0, c = parseFloat(row.querySelector('.o-cost')?.value) || 0;
        row.querySelector('.o-rowtotal').textContent = INR(q * c); total += q * c;
    });
    document.getElementById('o-total').textContent = 'Total Cost: ' + INR(total);
}

function clearOutwardForm() {
    document.getElementById('o-desc').value = ''; document.getElementById('o-notes').value = '';
    document.getElementById('o-items').innerHTML = '<div class="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 text-xs font-medium text-gray-500"><div class="col-span-5">Ingredient</div><div class="col-span-2">Qty Used</div><div class="col-span-2">Unit Cost</div><div class="col-span-2 text-right">Total</div><div class="col-span-1"></div></div>';
    for (let i = 0; i < 5; i++) addOutwardRow();
    updateOutwardTotals();
}

async function saveOutward() {
    const desc = document.getElementById('o-desc').value.trim();
    const items = [];
    document.querySelectorAll('#o-items > div:not(:first-child)').forEach(row => {
        const id = row.querySelector('.o-ingredient')?.value, q = parseFloat(row.querySelector('.o-qty')?.value), c = parseFloat(row.querySelector('.o-cost')?.value);
        if (id && q > 0) items.push({ ingredient_id: id, qty_consumed: q, unit_cost: c || 0 });
    });
    if (!items.length) return toast('Add items', 'error');
    const btn = document.getElementById('btn-save-outward'); btn.disabled = true; btn.textContent = 'Saving...';
    const res = await api('add_outward', { date: document.getElementById('o-date').value, meal_type: document.getElementById('o-meal').value, description: desc, notes: document.getElementById('o-notes').value, items });
    btn.disabled = false; btn.textContent = 'Save Outward';
    if (res.success) { toast('Outward saved!'); clearOutwardForm(); loadOutward(); } else toast(res.error || 'Failed', 'error');
}

async function loadOutward() {
    const res = await api('list_outward', { date_from: document.getElementById('o-from')?.value, date_to: document.getElementById('o-to')?.value });
    const tbody = document.getElementById('outward-list');
    if (!res.data?.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-400">No outward entries</td></tr>'; return; }
    tbody.innerHTML = res.data.map(e => '<tr class="border-t hover:bg-gray-50"><td class="px-4 py-2">' + e.date + '</td><td class="px-4 py-2"><span class="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">' + e.meal_type + '</span></td><td class="px-4 py-2 font-medium">' + (e.description||'—') + '</td><td class="px-4 py-2 text-center">' + (e.items||[]).length + '</td><td class="px-4 py-2 text-right font-medium">' + INR((e.items||[]).reduce((s,i)=>s+parseFloat(i.total_cost),0)) + '</td><td class="px-4 py-2 text-center"><button onclick="deleteOutward(' + e.id + ')" class="text-red-500 hover:text-red-700 text-xs">Delete</button></td></tr>').join('');
}

async function deleteOutward(id) { if (!confirm('Delete and restore stock?')) return; const r = await api('delete_outward', { id }); if (r.success) { toast('Deleted'); loadOutward(); } else toast(r.error||'Failed','error'); }

// ═══ STOCK ════════════════════════════════════════════════════
async function loadStock() {
    const search = document.getElementById('s-search')?.value;
    const category = document.getElementById('s-category')?.value;
    const lowStock = document.getElementById('s-low-only')?.checked;
    const res = await api('get_stock', { search, category, low_stock: lowStock ? 'true' : '' });
    const tbody = document.getElementById('stock-table');
    if (!res?.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-400">No ingredients found</td></tr>'; return; }
    tbody.innerHTML = res.map(i => {
        const low = i.min_stock > 0 && i.current_stock < i.min_stock;
        return '<tr class="border-t hover:bg-gray-50 ' + (low ? 'bg-red-50' : '') + '"><td class="px-4 py-2 font-medium">' + i.name + '</td><td class="px-4 py-2"><span class="px-2 py-0.5 rounded text-xs bg-gray-100">' + i.category + '</span></td><td class="px-4 py-2 text-right font-medium ' + (low?'text-red-600':'') + '">' + i.current_stock + ' ' + i.unit + '</td><td class="px-4 py-2 text-right text-gray-500">' + i.min_stock + '</td><td class="px-4 py-2 text-right">' + INR(i.avg_cost) + '</td><td class="px-4 py-2 text-right font-medium">' + INR(i.current_stock * i.avg_cost) + '</td><td class="px-4 py-2 text-center">' + (low ? '<span class="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 font-medium">LOW</span>' : '<span class="text-emerald-600">✓</span>') + '</td></tr>';
    }).join('');
}

async function showMovements() {
    document.getElementById('movements-modal').classList.remove('hidden');
    const res = await api('get_stock_movements', { limit: 300 });
    const tbody = document.getElementById('movements-table');
    if (!res?.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-400">No movements</td></tr>'; return; }
    tbody.innerHTML = res.map(m => '<tr class="border-t hover:bg-gray-50"><td class="px-4 py-2">' + m.date + '</td><td class="px-4 py-2 font-medium">' + m.ingredient_name + '</td><td class="px-4 py-2"><span class="px-2 py-0.5 rounded text-xs ' + (m.type==='PURCHASE'?'bg-emerald-100 text-emerald-700':m.type==='CONSUMPTION'?'bg-red-100 text-red-700':'bg-gray-100') + '">' + m.type + '</span></td><td class="px-4 py-2 text-right">' + m.qty + ' ' + (m.unit||'') + '</td><td class="px-4 py-2 text-right">' + INR(m.total_amount) + '</td><td class="px-4 py-2 text-gray-500 text-xs truncate max-w-xs">' + (m.notes||'') + '</td></tr>').join('');
}

function exportCSV(type) { window.location.href = 'api.php?action=export_csv&type=' + type + '&month=' + document.getElementById('dash-month').value; }

// ═══ SUPPLIERS ═══════════════════════════════════════════════
async function loadSuppliers() {
    const res = await api('list_suppliers');
    const tbody = document.getElementById('supplier-list');
    if (!res?.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-400">No suppliers</td></tr>'; return; }
    tbody.innerHTML = res.map(s => '<tr class="border-t hover:bg-gray-50"><td class="px-4 py-2 font-medium">' + s.name + '</td><td class="px-4 py-2">' + (s.contact_person||'—') + '</td><td class="px-4 py-2">' + (s.phone||'—') + '</td><td class="px-4 py-2">' + (s.email||'—') + '</td><td class="px-4 py-2"><span class="px-2 py-0.5 rounded text-xs bg-gray-100">' + (s.category||'—') + '</span></td><td class="px-4 py-2 text-center"><button onclick="editSupplier(' + s.id + ')" class="text-blue-600 hover:text-blue-800 text-xs mr-2">Edit</button><button onclick="deleteSupplier(' + s.id + ',\'' + s.name.replace(/'/g, "\\'") + '\')"  class="text-red-500 hover:text-red-700 text-xs">Delete</button></td></tr>').join('');
}

async function saveSupplier(form, id) {
    const data = Object.fromEntries(new FormData(form));
    const res = id ? await api('edit_supplier', { ...data, id }) : await api('add_supplier', data);
    if (res.success) { toast(id ? 'Updated' : 'Added'); document.getElementById('edit-modal').classList.add('hidden'); loadSuppliers(); } else toast(res.error || 'Failed', 'error');
}

function editSupplier(id) {
    const row = document.querySelector('[onclick="editSupplier(' + id + ')"]').closest('tr');
    const cells = row.querySelectorAll('td');
    document.getElementById('edit-modal-title').textContent = 'Edit Supplier';
    document.getElementById('edit-modal-body').innerHTML = '<form onsubmit="event.preventDefault();saveSupplier(this,' + id + ')"><div class="space-y-3"><div><label class="block text-xs font-medium mb-1">Name *</label><input name="name" required value="' + cells[0].textContent.trim() + '" class="w-full border rounded px-3 py-2 text-sm"></div><div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-medium mb-1">Contact Person</label><input name="contact_person" value="' + (cells[1].textContent.trim()==='—'?'':cells[1].textContent.trim()) + '" class="w-full border rounded px-3 py-2 text-sm"></div><div><label class="block text-xs font-medium mb-1">Phone</label><input name="phone" value="' + (cells[2].textContent.trim()==='—'?'':cells[2].textContent.trim()) + '" class="w-full border rounded px-3 py-2 text-sm"></div></div><div><label class="block text-xs font-medium mb-1">Email</label><input name="email" value="' + (cells[3].textContent.trim()==='—'?'':cells[3].textContent.trim()) + '" class="w-full border rounded px-3 py-2 text-sm"></div><div><label class="block text-xs font-medium mb-1">Category</label><input name="category" value="' + (cells[4].textContent.trim()==='—'?'':cells[4].textContent.trim()) + '" class="w-full border rounded px-3 py-2 text-sm"></div><div><label class="block text-xs font-medium mb-1">Notes</label><textarea name="notes" rows="2" class="w-full border rounded px-3 py-2 text-sm"></textarea></div></div><div class="flex justify-end gap-2 mt-4"><button type="button" onclick="document.getElementById(\'edit-modal\').classList.add(\'hidden\')" class="px-4 py-2 text-sm border rounded-lg">Cancel</button><button type="submit" class="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg">Save</button></div></form>';
    document.getElementById('edit-modal').classList.remove('hidden');
}

function addSupplierModal() {
    document.getElementById('edit-modal-title').textContent = 'Add Supplier';
    document.getElementById('edit-modal-body').innerHTML = '<form onsubmit="event.preventDefault();saveSupplier(this,0)"><div class="space-y-3"><div><label class="block text-xs font-medium mb-1">Name *</label><input name="name" required class="w-full border rounded px-3 py-2 text-sm"></div><div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-medium mb-1">Contact Person</label><input name="contact_person" class="w-full border rounded px-3 py-2 text-sm"></div><div><label class="block text-xs font-medium mb-1">Phone</label><input name="phone" class="w-full border rounded px-3 py-2 text-sm"></div></div><div><label class="block text-xs font-medium mb-1">Category</label><input name="category" class="w-full border rounded px-3 py-2 text-sm"></div></div><div class="flex justify-end gap-2 mt-4"><button type="button" onclick="document.getElementById(\'edit-modal\').classList.add(\'hidden\')" class="px-4 py-2 text-sm border rounded-lg">Cancel</button><button type="submit" class="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg">Add</button></div></form>';
    document.getElementById('edit-modal').classList.remove('hidden');
}

async function deleteSupplier(id, name) { if (!confirm('Delete ' + name + '?')) return; const r = await api('delete_supplier', { id }); if (r.success) { toast('Deleted'); loadSuppliers(); } else toast(r.error||'Failed','error'); }

// ═══ INGREDIENTS ═════════════════════════════════════════════
async function loadIngredients() {
    const res = await api('get_ingredients');
    ingredients = res;
    const tbody = document.getElementById('ingredient-list');
    if (!res?.length) { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-400">No ingredients</td></tr>'; return; }
    tbody.innerHTML = res.map(i => '<tr class="border-t hover:bg-gray-50"><td class="px-4 py-2 font-medium">' + i.name + '</td><td class="px-4 py-2"><span class="px-2 py-0.5 rounded text-xs bg-gray-100">' + i.category + '</span></td><td class="px-4 py-2">' + i.unit + '</td><td class="px-4 py-2 text-right">' + i.current_stock + '</td><td class="px-4 py-2 text-right">' + i.min_stock + '</td><td class="px-4 py-2 text-right">' + INR(i.avg_cost) + '</td><td class="px-4 py-2 text-center"><button onclick="editIngredient(' + i.id + ')" class="text-blue-600 text-xs mr-2">Edit</button><button onclick="deleteIngredient(' + i.id + ')" class="text-red-500 text-xs">Delete</button></td></tr>').join('');
}

async function saveIngredient(form, id) {
    const data = Object.fromEntries(new FormData(form));
    const res = id ? await api('edit_ingredient', { ...data, id }) : await api('add_ingredient', data);
    if (res.success) { toast(id ? 'Updated' : 'Added'); document.getElementById('edit-modal').classList.add('hidden'); loadIngredients(); } else toast(res.error || 'Failed', 'error');
}

function editIngredient(id) {
    const row = document.querySelector('[onclick="editIngredient(' + id + ')"]').closest('tr');
    const c = row.querySelectorAll('td');
    document.getElementById('edit-modal-title').textContent = 'Edit Ingredient';
    document.getElementById('edit-modal-body').innerHTML = '<form onsubmit="event.preventDefault();saveIngredient(this,' + id + ')"><div class="space-y-3"><div><label class="block text-xs font-medium mb-1">Name *</label><input name="name" required value="' + c[0].textContent.trim() + '" class="w-full border rounded px-3 py-2 text-sm"></div><div class="grid grid-cols-3 gap-3"><div><label class="block text-xs font-medium mb-1">Unit</label><input name="unit" value="' + c[2].textContent.trim() + '" class="w-full border rounded px-3 py-2 text-sm"></div><div><label class="block text-xs font-medium mb-1">Category</label><select name="category" class="w-full border rounded px-3 py-2 text-sm">' + catOpts(c[1].textContent.trim()) + '</select></div><div><label class="block text-xs font-medium mb-1">Min Stock</label><input name="min_stock" type="number" step="0.01" value="' + c[4].textContent.trim() + '" class="w-full border rounded px-3 py-2 text-sm"></div></div><div><label class="block text-xs font-medium mb-1">Avg Cost (₹)</label><input name="avg_cost" type="number" step="0.01" value="' + c[5].textContent.trim().replace(/[₹,]/g,'') + '" class="w-full border rounded px-3 py-2 text-sm"></div></div><div class="flex justify-end gap-2 mt-4"><button type="button" onclick="document.getElementById(\'edit-modal\').classList.add(\'hidden\')" class="px-4 py-2 text-sm border rounded-lg">Cancel</button><button type="submit" class="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg">Save</button></div></form>';
    document.getElementById('edit-modal').classList.remove('hidden');
}

function addIngredientModal() {
    document.getElementById('edit-modal-title').textContent = 'Add Ingredient';
    document.getElementById('edit-modal-body').innerHTML = '<form onsubmit="event.preventDefault();saveIngredient(this,0)"><div class="space-y-3"><div><label class="block text-xs font-medium mb-1">Name *</label><input name="name" required class="w-full border rounded px-3 py-2 text-sm"></div><div class="grid grid-cols-3 gap-3"><div><label class="block text-xs font-medium mb-1">Unit</label><input name="unit" value="kg" class="w-full border rounded px-3 py-2 text-sm"></div><div><label class="block text-xs font-medium mb-1">Category</label><select name="category" class="w-full border rounded px-3 py-2 text-sm">' + catOpts('Other') + '</select></div><div><label class="block text-xs font-medium mb-1">Min Stock</label><input name="min_stock" type="number" step="0.01" class="w-full border rounded px-3 py-2 text-sm"></div></div></div><div class="flex justify-end gap-2 mt-4"><button type="button" onclick="document.getElementById(\'edit-modal\').classList.add(\'hidden\')" class="px-4 py-2 text-sm border rounded-lg">Cancel</button><button type="submit" class="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg">Add</button></div></form>';
    document.getElementById('edit-modal').classList.remove('hidden');
}

async function deleteIngredient(id) { if (!confirm('Delete? Stock movements will also be deleted.')) return; const r = await api('delete_ingredient', { id }); if (r.success) { toast('Deleted'); loadIngredients(); } else toast(r.error||'Failed','error'); }

// ═══ EXPENSES ════════════════════════════════════════════════
async function loadExpenses() {
    const month = document.getElementById('exp-month').value;
    const res = await api('list_expenses', { month });
    const tbody = document.getElementById('expense-list');
    if (!res?.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">No expenses</td></tr>'; return; }
    const total = res.reduce((s, e) => s + parseFloat(e.amount), 0);
    tbody.innerHTML = res.map(e => '<tr class="border-t hover:bg-gray-50"><td class="px-4 py-2">' + e.date + '</td><td class="px-4 py-2"><span class="px-2 py-0.5 rounded text-xs bg-gray-100">' + e.category + '</span></td><td class="px-4 py-2 text-right font-medium">' + INR(e.amount) + '</td><td class="px-4 py-2 text-gray-500">' + (e.description||'') + '</td><td class="px-4 py-2 text-center"><button onclick="deleteExpense(' + e.id + ')" class="text-red-500 text-xs">Delete</button></td></tr>').join('') + '<tr class="border-t-2 font-bold bg-gray-50"><td colspan="2" class="px-4 py-2">Total</td><td class="px-4 py-2 text-right">' + INR(total) + '</td><td colspan="2"></td></tr>';
}

async function addExpense() {
    const data = Object.fromEntries(new FormData(document.getElementById('exp-form')));
    if (!data.date || !data.amount || !data.category) return toast('Fill date, category, amount', 'error');
    const res = await api('add_expense', data);
    if (res.success) { toast('Expense added'); document.getElementById('exp-form').reset(); loadExpenses(); } else toast(res.error || 'Failed', 'error');
}

async function deleteExpense(id) { if (!confirm('Delete?')) return; const r = await api('delete_expense', { id }); if (r.success) { toast('Deleted'); loadExpenses(); } else toast(r.error||'Failed','error'); }

// ═══ USERS ════════════════════════════════════════════════════
async function loadUsers() {
    const res = await api('list_users');
    const tbody = document.getElementById('user-list');
    if (!res?.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">No users</td></tr>'; return; }
    tbody.innerHTML = res.map(u => '<tr class="border-t hover:bg-gray-50"><td class="px-4 py-2 font-medium">' + u.name + '</td><td class="px-4 py-2">' + u.email + '</td><td class="px-4 py-2"><span class="px-2 py-0.5 rounded text-xs ' + (u.role==='admin'?'bg-red-100 text-red-700':'bg-gray-100') + '">' + u.role + '</span></td><td class="px-4 py-2 text-center">' + (u.active ? '✅' : '❌') + '</td><td class="px-4 py-2 text-center"><button onclick="editUser(' + u.id + ')" class="text-blue-600 text-xs mr-2">Edit</button>' + (u.id!=1?'<button onclick="deleteUser(' + u.id + ')" class="text-red-500 text-xs">Delete</button>':'') + '</td></tr>').join('');
}

function editUser(id) {
    const row = document.querySelector('[onclick="editUser(' + id + ')"]').closest('tr');
    const c = row.querySelectorAll('td');
    document.getElementById('edit-modal-title').textContent = 'Edit User';
    document.getElementById('edit-modal-body').innerHTML = '<form onsubmit="event.preventDefault();saveUser(this,' + id + ')"><div class="space-y-3"><div><label class="block text-xs font-medium mb-1">Name</label><input name="name" value="' + c[0].textContent.trim() + '" class="w-full border rounded px-3 py-2 text-sm"></div><div><label class="block text-xs font-medium mb-1">Email</label><input name="email" value="' + c[1].textContent.trim() + '" class="w-full border rounded px-3 py-2 text-sm"></div><div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-medium mb-1">Role</label><select name="role" class="w-full border rounded px-3 py-2 text-sm"><option' + (c[2].textContent.trim()==='admin'?' selected':'') + '>admin</option><option' + (c[2].textContent.trim()==='kitchen'?' selected':'') + '>kitchen</option><option' + (c[2].textContent.trim()==='store'?' selected':'') + '>store</option></select></div><div><label class="block text-xs font-medium mb-1">Active</label><select name="active" class="w-full border rounded px-3 py-2 text-sm"><option value="1"' + (c[3].textContent.trim()==='✅'?' selected':'') + '>Active</option><option value="0"' + (c[3].textContent.trim()!='✅'?' selected':'') + '>Disabled</option></select></div></div><div><label class="block text-xs font-medium mb-1">New Password (leave blank to keep)</label><input name="password" type="password" class="w-full border rounded px-3 py-2 text-sm" placeholder="Leave blank"></div></div><div class="flex justify-end gap-2 mt-4"><button type="button" onclick="document.getElementById(\'edit-modal\').classList.add(\'hidden\')" class="px-4 py-2 text-sm border rounded-lg">Cancel</button><button type="submit" class="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg">Save</button></div></form>';
    document.getElementById('edit-modal').classList.remove('hidden');
}

function addUserModal() {
    document.getElementById('edit-modal-title').textContent = 'Add User';
    document.getElementById('edit-modal-body').innerHTML = '<form onsubmit="event.preventDefault();saveUser(this,0)"><div class="space-y-3"><div><label class="block text-xs font-medium mb-1">Name *</label><input name="name" required class="w-full border rounded px-3 py-2 text-sm"></div><div><label class="block text-xs font-medium mb-1">Email *</label><input name="email" type="email" required class="w-full border rounded px-3 py-2 text-sm"></div><div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-medium mb-1">Role</label><select name="role" class="w-full border rounded px-3 py-2 text-sm"><option>kitchen</option><option>store</option><option>admin</option></select></div><div><label class="block text-xs font-medium mb-1">Password *</label><input name="password" type="password" required class="w-full border rounded px-3 py-2 text-sm"></div></div></div><div class="flex justify-end gap-2 mt-4"><button type="button" onclick="document.getElementById(\'edit-modal\').classList.add(\'hidden\')" class="px-4 py-2 text-sm border rounded-lg">Cancel</button><button type="submit" class="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg">Add</button></div></form>';
    document.getElementById('edit-modal').classList.remove('hidden');
}

async function saveUser(form, id) {
    const data = Object.fromEntries(new FormData(form));
    const res = id ? await api('edit_user', { ...data, id }) : await api('add_user', data);
    if (res.success) { toast(id ? 'Updated' : 'Added'); document.getElementById('edit-modal').classList.add('hidden'); loadUsers(); } else toast(res.error || 'Failed', 'error');
}

async function deleteUser(id) { if (!confirm('Delete this user?')) return; const r = await api('delete_user', { id }); if (r.success) { toast('Deleted'); loadUsers(); } else toast(r.error||'Failed','error'); }

// ═══ BUDGETS ══════════════════════════════════════════════════
async function loadBudgets() {
    const month = document.getElementById('bud-month').value;
    const res = await api('get_budget_report', { month });
    const tbody = document.getElementById('budget-report');
    tbody.innerHTML = res.map(r => {
        const isTotal = r.category === 'TOTAL';
        const overBudget = r.percent > 100 && r.budget > 0;
        const barColor = isTotal ? 'bg-gray-800' : overBudget ? 'bg-red-500' : r.percent > 80 ? 'bg-amber-500' : 'bg-emerald-500';
        const barWidth = r.percent > 100 ? 100 : r.percent;
        return '<tr class="border-t ' + (isTotal ? 'bg-gray-100 font-bold' : '') + ' ' + (overBudget ? 'bg-red-50' : '') + '"><td class="px-4 py-2 font-medium">' + r.category + '</td><td class="px-4 py-2 text-right">' + INR(r.budget) + '</td><td class="px-4 py-2 text-right">' + INR(r.actual) + '</td><td class="px-4 py-2 text-right ' + (r.variance < 0 ? 'text-red-600' : 'text-emerald-600') + '">' + (r.variance < 0 ? '-' : '') + INR(Math.abs(r.variance)) + '</td><td class="px-4 py-2"><div class="flex items-center gap-2"><div class="flex-1 bg-gray-200 rounded-full h-2"><div class="' + barColor + ' h-2 rounded-full" style="width:' + Math.min(barWidth,100) + '%"></div></div><span class="text-xs font-medium ' + (overBudget ? 'text-red-600' : '') + '">' + (r.percent > 900 ? '—' : r.percent + '%') + '</span></div></td></tr>';
    }).join('');
}

function addBudgetModal() {
    document.getElementById('edit-modal-title').textContent = 'Set Budget';
    document.getElementById('edit-modal-body').innerHTML = '<form onsubmit="event.preventDefault();saveBudget(this)"><div class="space-y-3"><div><label class="block text-xs font-medium mb-1">Month *</label><input name="month" type="month" required value="' + (document.getElementById('bud-month')?.value || '') + '" class="w-full border rounded px-3 py-2 text-sm"></div><div><label class="block text-xs font-medium mb-1">Category *</label><select name="category" required class="w-full border rounded px-3 py-2 text-sm"><option value="">Select...</option><option>Canteen Salary</option><option>Gas</option><option>Wood</option><option>Electricity</option><option>Water</option><option>Maintenance</option><option>Transport</option><option>Other</option></select></div><div><label class="block text-xs font-medium mb-1">Budget Amount (₹) *</label><input name="amount" type="number" step="0.01" min="0" required placeholder="0" class="w-full border rounded px-3 py-2 text-sm"></div></div><div class="flex justify-end gap-2 mt-4"><button type="button" onclick="document.getElementById(\'edit-modal\').classList.add(\'hidden\')" class="px-4 py-2 text-sm border rounded-lg">Cancel</button><button type="submit" class="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg">Save Budget</button></div></form>';
    document.getElementById('edit-modal').classList.remove('hidden');
}

async function saveBudget(form) {
    const data = Object.fromEntries(new FormData(form));
    const res = await api('upsert_budget', data);
    if (res.success) { toast('Budget saved'); document.getElementById('edit-modal').classList.add('hidden'); loadBudgets(); } else toast(res.error || 'Failed', 'error');
}

// ═══ AUDIT ════════════════════════════════════════════════════
async function loadAudit() {
    const res = await api('list_audit');
    const tbody = document.getElementById('audit-list');
    if (!res?.length) { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400">No audit logs</td></tr>'; return; }
    tbody.innerHTML = res.map(a => '<tr class="border-t hover:bg-gray-50"><td class="px-4 py-2 text-xs text-gray-500">' + a.created_at + '</td><td class="px-4 py-2 font-medium">' + (a.user_name||'System') + '</td><td class="px-4 py-2"><span class="px-2 py-0.5 rounded text-xs font-medium ' + (a.action==='CREATE'?'bg-emerald-100 text-emerald-700':a.action==='DELETE'?'bg-red-100 text-red-700':a.action==='UPDATE'?'bg-blue-100 text-blue-700':'bg-gray-100') + '">' + a.action + '</span></td><td class="px-4 py-2 text-sm">' + (a.description||'') + '</td></tr>').join('');
}

// ═══ INIT ═════════════════════════════════════════════════════
async function init() {
    const [ingRes, supRes] = await Promise.all([api('get_ingredients'), api('list_suppliers')]);
    ingredients = ingRes; suppliers = supRes;
    const sel = document.getElementById('p-supplier');
    if (sel) sel.innerHTML = '<option value="">Select supplier...</option>' + suppliers.map(s => '<option value="' + s.id + '">' + s.name + '</option>').join('');
    // Populate stock category dropdown
    const catSel = document.getElementById('s-category');
    if (catSel) {
        const cats = [...new Set(ingredients.map(i => i.category))].sort();
        catSel.innerHTML = '<option value="">All Categories</option>' + cats.map(c => '<option value="' + c + '">' + c + '</option>').join('');
    }
    const today = new Date().toISOString().slice(0, 10);
    const pd = document.getElementById('p-date'); if (pd && !pd.value) pd.value = today;
    const od = document.getElementById('o-date'); if (od && !od.value) od.value = today;
    showPage('<?= $page ?>');
}
init();
</script>
</body>
</html>
