<?php $curMonth = date('Y-m'); ?>
<div id="page-dashboard" class="page<?php echo $p===$activePage?' active':''; ?> fade-in">

    <!-- Month Selector -->
    <div class="flex flex-wrap items-center gap-4 mb-6">
        <input type="month" id="dash-month" class="border rounded-lg px-3 py-2 text-sm" value="<?= $curMonth ?>" onchange="loadDashboard()">
        <h2 id="dash-label" class="text-lg font-bold text-gray-800">Dashboard</h2>
    </div>

    <!-- ═══ Stat Cards ═══ -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div class="stat-card sky">
            <p class="text-xs font-semibold text-sky-700 uppercase tracking-wider mb-1">Total Purchase</p>
            <p class="text-xl font-bold text-gray-900" id="d-purchase">₹0</p>
        </div>
        <div class="stat-card amber">
            <p class="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Stock Used</p>
            <p class="text-xl font-bold text-gray-900" id="d-used">₹0</p>
        </div>
        <div class="stat-card emerald">
            <p class="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Total Meals</p>
            <p class="text-xl font-bold text-gray-900" id="d-total-meals">0</p>
        </div>
        <div class="stat-card violet">
            <p class="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-1">Cost / Meal</p>
            <p class="text-xl font-bold text-gray-900" id="d-cost-meal">₹0.00</p>
        </div>
        <div class="stat-card rose">
            <p class="text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1">Low Stock</p>
            <p class="text-xl font-bold text-gray-900" id="d-low-stock">0</p>
        </div>
    </div>

    <!-- ═══ Per Meal Cost Report (Week-wise) ═══ -->
    <div class="mb-6">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">RCS Per Meal Cost Report</h3>
            <div id="d-week-nav" class="flex items-center gap-2 flex-wrap"></div>
        </div>
        <div class="glass-card rounded-xl overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-sm min-w-[780px]">
                    <thead>
                        <tr class="bg-gray-900 text-white">
                            <th class="text-left px-3 py-2.5 font-semibold">Date</th>
                            <th class="text-center px-2 py-2.5 font-semibold">Breakfast</th>
                            <th class="text-center px-2 py-2.5 font-semibold">Lunch</th>
                            <th class="text-center px-2 py-2.5 font-semibold">Dinner</th>
                            <th class="text-right px-2 py-2.5 font-semibold">B/F Cost</th>
                            <th class="text-right px-2 py-2.5 font-semibold">Lunch Cost</th>
                            <th class="text-right px-2 py-2.5 font-semibold">Dinner Cost</th>
                            <th class="text-right px-2 py-2.5 font-semibold">Cost/Meal</th>
                        </tr>
                    </thead>
                    <tbody id="d-per-meal-table">
                        <tr><td colspan="8" class="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                    </tbody>
                    <tfoot id="d-per-meal-totals"></tfoot>
                </table>
            </div>
        </div>
    </div>

    <!-- ═══ Two Column: Metrics + Summary ═══ -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Stock & Meal Metrics -->
        <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Stock & Meal Metrics</h3>
            <div class="glass-card rounded-xl overflow-hidden">
                <table class="w-full text-sm">
                    <thead class="bg-gray-100"><tr><th class="text-left px-4 py-2 font-medium text-gray-600 w-8">#</th><th class="text-left px-4 py-2 font-medium text-gray-600">Particular</th><th class="text-right px-4 py-2 font-medium text-gray-600">Amount</th></tr></thead>
                    <tbody>
                        <tr class="border-t"><td class="px-4 py-2.5 text-gray-400">1</td><td class="px-4 py-2.5 font-medium">Total Stock Purchase</td><td class="px-4 py-2.5 text-right font-semibold" id="d-purchase2">₹0</td></tr>
                        <tr class="border-t bg-gray-50/50"><td class="px-4 py-2.5 text-gray-400">2</td><td class="px-4 py-2.5 font-medium">Total Stock Used</td><td class="px-4 py-2.5 text-right font-semibold" id="d-used2">₹0</td></tr>
                        <tr class="border-t"><td class="px-4 py-2.5 text-gray-400">3</td><td class="px-4 py-2.5 font-medium">Current Stock Value</td><td class="px-4 py-2.5 text-right font-semibold" id="d-stock-val">₹0</td></tr>
                        <tr class="border-t bg-gray-50/50"><td class="px-4 py-2.5 text-gray-400">4</td><td class="px-4 py-2.5 font-medium">Total Breakfast</td><td class="px-4 py-2.5 text-right font-semibold" id="d-breakfast">0</td></tr>
                        <tr class="border-t"><td class="px-4 py-2.5 text-gray-400">5</td><td class="px-4 py-2.5 font-medium">Total Lunch</td><td class="px-4 py-2.5 text-right font-semibold" id="d-lunch">0</td></tr>
                        <tr class="border-t bg-gray-50/50"><td class="px-4 py-2.5 text-gray-400">6</td><td class="px-4 py-2.5 font-medium">Total Dinner</td><td class="px-4 py-2.5 text-right font-semibold" id="d-dinner">0</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Summary + Expenses -->
        <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Monthly Summary</h3>
            <div class="glass-card rounded-xl overflow-hidden mb-4">
                <table class="w-full text-sm">
                    <thead class="bg-gray-100"><tr><th class="text-left px-4 py-2 font-medium text-gray-600 w-8">#</th><th class="text-left px-4 py-2 font-medium text-gray-600">Particular</th><th class="text-right px-4 py-2 font-medium text-gray-600">Amount</th></tr></thead>
                    <tbody>
                        <tr class="border-t"><td class="px-4 py-2.5 text-gray-400">1</td><td class="px-4 py-2.5 font-medium">Total Expenses</td><td class="px-4 py-2.5 text-right font-bold" id="d-summary-total">₹0</td></tr>
                        <tr class="border-t bg-gray-50/50"><td class="px-4 py-2.5 text-gray-400">2</td><td class="px-4 py-2.5 font-medium">Total Meals Served</td><td class="px-4 py-2.5 text-right font-bold" id="d-summary-meals">0</td></tr>
                        <tr class="border-t"><td class="px-4 py-2.5 text-gray-400">3</td><td class="px-4 py-2.5 font-medium">Per Meal Cost</td><td class="px-4 py-2.5 text-right font-bold text-amber-700 text-lg" id="d-summary-cpm">₹0.00</td></tr>
                    </tbody>
                </table>
            </div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Other Expenses</h3>
            <div class="glass-card rounded-xl overflow-hidden">
                <table class="w-full text-sm">
                    <thead class="bg-gray-100"><tr><th class="text-left px-4 py-2 font-medium text-gray-600 w-8">#</th><th class="text-left px-4 py-2 font-medium text-gray-600">Category</th><th class="text-right px-4 py-2 font-medium text-gray-600">Amount</th></tr></thead>
                    <tbody id="d-expense-table"><tr><td colspan="3" class="px-4 py-6 text-center text-gray-400">Loading...</td></tr></tbody>
                    <tfoot id="d-expense-total"></tfoot>
                </table>
            </div>
        </div>
    </div>

    <!-- ═══ Recent Stock Movements ═══ -->
    <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Stock Movements</h3>
            <button onclick="showMovements()" class="text-xs font-medium text-amber-600 hover:text-amber-700">View All →</button>
        </div>
        <div class="glass-card rounded-xl overflow-hidden">
            <table class="w-full text-sm">
                <thead class="bg-gray-50"><tr><th class="text-left px-4 py-2 font-medium text-gray-600">Date</th><th class="text-left px-4 py-2 font-medium text-gray-600">Ingredient</th><th class="text-left px-4 py-2 font-medium text-gray-600">Type</th><th class="text-right px-4 py-2 font-medium text-gray-600">Qty</th><th class="text-right px-4 py-2 font-medium text-gray-600">Amount</th></tr></thead>
                <tbody id="d-recent"><tr><td colspan="5" class="text-center py-6 text-gray-400">Loading...</td></tr></tbody>
            </table>
        </div>
    </div>

    <!-- Export -->
    <div class="flex flex-wrap gap-3 mb-8">
        <button onclick="exportCSV('meals')" class="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition">Export Meals CSV</button>
        <button onclick="exportCSV('purchases')" class="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition">Export Purchases CSV</button>
        <button onclick="exportCSV('expenses')" class="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition">Export Expenses CSV</button>
        <button onclick="exportCSV('stock')" class="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition">Export Stock CSV</button>
    </div>

</div>