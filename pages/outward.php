<div id="page-outward" class="page<?php echo $p===$activePage?' active':''; ?> fade-in">

    <h2 class="text-lg font-bold text-gray-800 mb-4">Outward Entry</h2>

    <!-- Add Outward Form -->
    <div class="bg-white rounded-xl shadow-sm p-4 mb-6">
        <!-- Row 1: Date, Meal Type, Description, Notes -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Date</label>
                <input type="date" id="o-date" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Meal Type</label>
                <select id="o-meal" class="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch" selected>Lunch</option>
                    <option value="Dinner">Dinner</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <input type="text" id="o-desc" placeholder="e.g. Daily lunch preparation" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <input type="text" id="o-notes" placeholder="Optional" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
        </div>

        <!-- Items Section -->
        <div class="border rounded-lg overflow-hidden mb-4">
            <div class="flex items-center justify-between bg-gray-100 px-4 py-2">
                <span class="text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</span>
                <button onclick="addOutwardRow()" class="text-xs font-medium text-amber-600 hover:text-amber-700">+ Add Item</button>
            </div>
            <!-- Header Row -->
            <div id="o-items">
                <div class="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 text-xs font-medium text-gray-500">
                    <div class="col-span-5">Ingredient</div>
                    <div class="col-span-2">Qty Used</div>
                    <div class="col-span-2">Unit Cost</div>
                    <div class="col-span-2 text-right">Total</div>
                    <div class="col-span-1"></div>
                </div>
            </div>
        </div>

        <!-- Footer: Total + Actions -->
        <div class="flex flex-wrap items-center justify-between gap-3">
            <span id="o-total" class="text-sm font-semibold text-gray-700">Total Cost: ₹0</span>
            <div class="flex gap-2">
                <button onclick="clearOutwardForm()" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Clear</button>
                <button id="btn-save-outward" onclick="saveOutward()" class="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium">Save Outward</button>
            </div>
        </div>
    </div>

    <!-- Outward History -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b">
            <span class="text-xs font-semibold text-gray-600 uppercase tracking-wider">Outward History</span>
            <div class="ml-auto flex items-center gap-2">
                <label class="text-xs text-gray-500">From:</label>
                <input type="date" id="o-from" class="border rounded-lg px-2 py-1 text-xs" onchange="loadOutward()">
                <label class="text-xs text-gray-500">To:</label>
                <input type="date" id="o-to" class="border rounded-lg px-2 py-1 text-xs" onchange="loadOutward()">
            </div>
        </div>
        <table class="w-full text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Meal</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Description</th>
                    <th class="text-center px-4 py-2 font-medium text-gray-600">Items</th>
                    <th class="text-right px-4 py-2 font-medium text-gray-600">Total</th>
                    <th class="text-center px-4 py-2 font-medium text-gray-600">Action</th>
                </tr>
            </thead>
            <tbody id="outward-list">
                <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            </tbody>
        </table>
    </div>

</div>
