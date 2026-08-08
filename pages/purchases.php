<div id="page-purchases" class="page<?php echo $p===$activePage?' active':''; ?> fade-in">

    <h2 class="text-lg font-bold text-gray-800 mb-4">Purchase Entry</h2>

    <!-- Add Purchase Form -->
    <div class="bg-white rounded-xl shadow-sm p-4 mb-6">
        <!-- Row 1: Date, Invoice, Supplier, Notes -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Date</label>
                <input type="date" id="p-date" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Invoice No</label>
                <input type="text" id="p-invoice" placeholder="INV-001" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Supplier</label>
                <select id="p-supplier" class="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select supplier...</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <input type="text" id="p-notes" placeholder="Optional" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
        </div>

        <!-- Items Section -->
        <div class="border rounded-lg overflow-hidden mb-4">
            <div class="flex items-center justify-between bg-gray-100 px-4 py-2">
                <span class="text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</span>
                <button onclick="addPurchaseRow()" class="text-xs font-medium text-amber-600 hover:text-amber-700">+ Add Item</button>
            </div>
            <!-- Header Row -->
            <div id="p-items">
                <div class="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 text-xs font-medium text-gray-500">
                    <div class="col-span-5">Ingredient</div>
                    <div class="col-span-2">Qty</div>
                    <div class="col-span-2">Price (₹)</div>
                    <div class="col-span-2 text-right">Total</div>
                    <div class="col-span-1"></div>
                </div>
            </div>
        </div>

        <!-- Footer: Total + Actions -->
        <div class="flex flex-wrap items-center justify-between gap-3">
            <span id="p-total" class="text-sm font-semibold text-gray-700">Total: ₹0</span>
            <div class="flex gap-2">
                <button onclick="clearPurchaseForm()" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Clear</button>
                <button id="btn-save-purchase" onclick="savePurchase()" class="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium">Save Purchase</button>
            </div>
        </div>
    </div>

    <!-- Purchase History -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="flex flex-wrap items-center gap-3 px-4 py-3 border-b">
            <span class="text-xs font-semibold text-gray-600 uppercase tracking-wider">Purchase History</span>
            <div class="ml-auto flex items-center gap-2">
                <label class="text-xs text-gray-500">From:</label>
                <input type="date" id="p-from" class="border rounded-lg px-2 py-1 text-xs" onchange="loadPurchases()">
                <label class="text-xs text-gray-500">To:</label>
                <input type="date" id="p-to" class="border rounded-lg px-2 py-1 text-xs" onchange="loadPurchases()">
            </div>
        </div>
        <table class="w-full text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Invoice</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Supplier</th>
                    <th class="text-center px-4 py-2 font-medium text-gray-600">Items</th>
                    <th class="text-right px-4 py-2 font-medium text-gray-600">Total</th>
                    <th class="text-center px-4 py-2 font-medium text-gray-600">Action</th>
                </tr>
            </thead>
            <tbody id="purchase-list">
                <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            </tbody>
        </table>
    </div>

</div>
