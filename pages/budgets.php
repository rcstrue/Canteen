<div id="page-budgets" class="page<?php echo $p===$activePage?' active':''; ?> fade-in">

    <!-- Header -->
    <div class="flex flex-wrap items-center gap-4 mb-6">
        <input type="month" id="bud-month" class="border rounded-lg px-3 py-2 text-sm" value="<?= date('Y-m') ?>" onchange="loadBudgets()">
        <h2 class="text-lg font-bold text-gray-800">Budget Management</h2>
        <div class="ml-auto">
            <button onclick="addBudgetModal()" class="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition">+ Set Budget</button>
        </div>
    </div>

    <!-- Budget vs Actual Report -->
    <div class="bg-white rounded-xl shadow-sm overflow-x-auto mb-6">
        <table class="w-full text-sm min-w-[600px]">
            <thead class="bg-gray-800 text-white">
                <tr>
                    <th class="text-left px-4 py-2 font-medium">Category</th>
                    <th class="text-right px-4 py-2 font-medium">Budget (₹)</th>
                    <th class="text-right px-4 py-2 font-medium">Actual (₹)</th>
                    <th class="text-right px-4 py-2 font-medium">Variance (₹)</th>
                    <th class="text-center px-4 py-2 font-medium">Used %</th>
                </tr>
            </thead>
            <tbody id="budget-report">
                <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            </tbody>
        </table>
    </div>

</div>