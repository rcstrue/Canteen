<div id="page-stock" class="page<?php echo $p===$activePage?' active':''; ?> fade-in">

    <h2 class="text-lg font-bold text-gray-800 mb-4">Stock Reports</h2>

    <!-- Filter Bar -->
    <div class="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div class="flex flex-wrap items-center gap-4">
            <div class="flex-1 min-w-[200px]">
                <input type="text" id="s-search" placeholder="Search ingredients..." class="w-full border rounded-lg px-3 py-2 text-sm" oninput="loadStock()">
            </div>
            <div>
                <select id="s-category" class="border rounded-lg px-3 py-2 text-sm" onchange="loadStock()">
                    <option value="">All Categories</option>
                </select>
            </div>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" id="s-low-only" class="rounded border-gray-300 text-amber-600" onchange="loadStock()">
                <span class="text-gray-700">Low Stock Only</span>
            </label>
            <button onclick="showMovements()" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">View Movements</button>
        </div>
    </div>

    <!-- Stock Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Ingredient</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Category</th>
                    <th class="text-right px-4 py-2 font-medium text-gray-600">Current Stock</th>
                    <th class="text-right px-4 py-2 font-medium text-gray-600">Min Stock</th>
                    <th class="text-right px-4 py-2 font-medium text-gray-600">Avg Cost</th>
                    <th class="text-right px-4 py-2 font-medium text-gray-600">Stock Value</th>
                    <th class="text-center px-4 py-2 font-medium text-gray-600">Status</th>
                </tr>
            </thead>
            <tbody id="stock-table">
                <tr><td colspan="7" class="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            </tbody>
        </table>
    </div>

</div>
