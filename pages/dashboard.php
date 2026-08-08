<?php $curMonth = date('Y-m'); ?>
<div id="page-dashboard" class="page<?php echo $p===$activePage?' active':''; ?> fade-in">

    <!-- Month Selector -->
    <div class="flex flex-wrap items-center gap-4 mb-6">
        <input type="month" id="dash-month" class="border rounded-lg px-3 py-2 text-sm" value="<?= $curMonth ?>" onchange="loadDashboard()">
        <h2 id="dash-label" class="text-lg font-bold text-gray-800">Dashboard</h2>
    </div>

    <!-- ═══ SECTION 1: RCS Per Meal Cost Report (like reference image) ═══ -->
    <div class="mb-6">
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">RCS Per Meal Cost Report</h3>
        <div class="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table class="w-full text-sm min-w-[800px]">
                <thead class="bg-gray-800 text-white">
                    <tr>
                        <th class="text-left px-3 py-2 font-medium">Date</th>
                        <th class="text-center px-2 py-2 font-medium">Breakfast</th>
                        <th class="text-center px-2 py-2 font-medium">Lunch</th>
                        <th class="text-center px-2 py-2 font-medium">Dinner</th>
                        <th class="text-right px-2 py-2 font-medium">B/F Cost</th>
                        <th class="text-right px-2 py-2 font-medium">Lunch Cost</th>
                        <th class="text-right px-2 py-2 font-medium">Dinner Cost</th>
                        <th class="text-right px-2 py-2 font-medium">Cost/Meal</th>
                    </tr>
                </thead>
                <tbody id="d-per-meal-table">
                    <tr><td colspan="8" class="px-4 py-6 text-center text-gray-400">Loading...</td></tr>
                </tbody>
                <tfoot id="d-per-meal-totals"></tfoot>
            </table>
        </div>
    </div>

    <!-- ═══ SECTION 2: Stock & Meal Metrics (like reference image 2) ═══ -->
    <div class="mb-6">
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Stock & Meal Metrics</h3>
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <table class="w-full text-sm">
                <thead class="bg-gray-100">
                    <tr><th class="text-left px-4 py-2 font-medium text-gray-600 w-8">#</th><th class="text-left px-4 py-2 font-medium text-gray-600">Particular</th><th class="text-right px-4 py-2 font-medium text-gray-600">Amount</th></tr>
                </thead>
                <tbody>
                    <tr class="border-t"><td class="px-4 py-2 text-gray-400">1</td><td class="px-4 py-2 font-medium">Total Stock Purchase</td><td class="px-4 py-2 text-right font-semibold" id="d-purchase">₹0</td></tr>
                    <tr class="border-t bg-gray-50"><td class="px-4 py-2 text-gray-400">2</td><td class="px-4 py-2 font-medium">Total Stock Used</td><td class="px-4 py-2 text-right font-semibold" id="d-used">₹0</td></tr>
                    <tr class="border-t"><td class="px-4 py-2 text-gray-400">3</td><td class="px-4 py-2 font-medium">Current Stock Value</td><td class="px-4 py-2 text-right font-semibold" id="d-stock-val">₹0</td></tr>
                    <tr class="border-t bg-gray-50"><td class="px-4 py-2 text-gray-400">4</td><td class="px-4 py-2 font-medium">Total Breakfast Count</td><td class="px-4 py-2 text-right font-semibold" id="d-breakfast">0</td></tr>
                    <tr class="border-t"><td class="px-4 py-2 text-gray-400">5</td><td class="px-4 py-2 font-medium">Total Lunch Count</td><td class="px-4 py-2 text-right font-semibold" id="d-lunch">0</td></tr>
                    <tr class="border-t bg-gray-50"><td class="px-4 py-2 text-gray-400">6</td><td class="px-4 py-2 font-medium">Total Dinner Count</td><td class="px-4 py-2 text-right font-semibold" id="d-dinner">0</td></tr>
                    <tr class="border-t"><td class="px-4 py-2 text-gray-400">7</td><td class="px-4 py-2 font-medium">Cost Per Meal</td><td class="px-4 py-2 text-right font-bold text-amber-600" id="d-cost-meal">₹0.00</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- ═══ SECTION 3: Other Expenses (like reference image 2) ═══ -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Other Expenses</h3>
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <table class="w-full text-sm">
                    <thead class="bg-gray-100">
                        <tr><th class="text-left px-4 py-2 font-medium text-gray-600 w-8">#</th><th class="text-left px-4 py-2 font-medium text-gray-600">Particular</th><th class="text-right px-4 py-2 font-medium text-gray-600">Amount</th></tr>
                    </thead>
                    <tbody id="d-expense-table">
                        <tr><td colspan="3" class="px-4 py-6 text-center text-gray-400">Loading...</td></tr>
                    </tbody>
                    <tfoot id="d-expense-total"></tfoot>
                </table>
            </div>
        </div>

        <!-- ═══ SECTION 4: Summary ═══ -->
        <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Monthly Summary</h3>
            <div class="bg-white rounded-xl shadow-sm overflow-hidden">
                <table class="w-full text-sm">
                    <thead class="bg-gray-100">
                        <tr><th class="text-left px-4 py-2 font-medium text-gray-600 w-8">#</th><th class="text-left px-4 py-2 font-medium text-gray-600">Particular</th><th class="text-right px-4 py-2 font-medium text-gray-600">Amount</th></tr>
                    </thead>
                    <tbody>
                        <tr class="border-t"><td class="px-4 py-2 text-gray-400">1</td><td class="px-4 py-2 font-medium">Total Expenses (Stock + Other)</td><td class="px-4 py-2 text-right font-bold" id="d-summary-total">₹0</td></tr>
                        <tr class="border-t bg-gray-50"><td class="px-4 py-2 text-gray-400">2</td><td class="px-4 py-2 font-medium">Total Meals Served</td><td class="px-4 py-2 text-right font-bold" id="d-summary-meals">0</td></tr>
                        <tr class="border-t"><td class="px-4 py-2 text-gray-400">3</td><td class="px-4 py-2 font-medium">Per Meal Cost</td><td class="px-4 py-2 text-right font-bold text-amber-700 text-lg" id="d-summary-cpm">₹0.00</td></tr>
                    </tbody>
                </table>
            </div>
            <!-- Quick Stats Cards -->
            <div class="grid grid-cols-2 gap-3 mt-4">
                <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                    <p class="text-xs text-red-600 font-medium mb-1">Low Stock Alerts</p>
                    <p id="d-low-stock" class="text-2xl font-bold text-red-700">0</p>
                </div>
                <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                    <p class="text-xs text-emerald-600 font-medium mb-1">Total Meals</p>
                    <p id="d-total-meals" class="text-2xl font-bold text-emerald-700">0</p>
                </div>
            </div>
        </div>
    </div>

    <!-- ═══ SECTION 5: Recent Stock Movements ═══ -->
    <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Stock Movements</h3>
            <button onclick="showMovements()" class="text-xs font-medium text-amber-600 hover:text-amber-700">View All &rarr;</button>
        </div>
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <table class="w-full text-sm">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                        <th class="text-left px-4 py-2 font-medium text-gray-600">Ingredient</th>
                        <th class="text-left px-4 py-2 font-medium text-gray-600">Type</th>
                        <th class="text-right px-4 py-2 font-medium text-gray-600">Qty</th>
                        <th class="text-right px-4 py-2 font-medium text-gray-600">Amount</th>
                    </tr>
                </thead>
                <tbody id="d-recent">
                    <tr><td colspan="5" class="text-center py-6 text-gray-400">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Export Buttons -->
    <div class="flex flex-wrap gap-3">
        <button onclick="exportCSV('meals')" class="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition">Export Meals CSV</button>
        <button onclick="exportCSV('purchases')" class="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition">Export Purchases CSV</button>
        <button onclick="exportCSV('expenses')" class="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition">Export Expenses CSV</button>
        <button onclick="exportCSV('stock')" class="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition">Export Stock CSV</button>
    </div>

</div>
