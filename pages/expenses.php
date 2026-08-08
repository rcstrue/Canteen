<div id="page-expenses" class="page<?php echo $p===$activePage?' active':''; ?> fade-in">

    <!-- Header -->
    <div class="flex flex-wrap items-center gap-4 mb-6">
        <input type="month" id="exp-month" class="border rounded-lg px-3 py-2 text-sm" value="<?= date('Y-m') ?>" onchange="loadExpenses()">
        <h2 class="text-lg font-bold text-gray-800">Expenses</h2>
    </div>

    <!-- Add Expense Form -->
    <div class="bg-white rounded-xl shadow-sm p-4 mb-6">
        <form id="exp-form" onsubmit="event.preventDefault();addExpense()" class="flex flex-wrap items-end gap-3">
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Date</label>
                <input type="date" name="date" required class="border rounded-lg px-3 py-2 text-sm w-40">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select name="category" required class="border rounded-lg px-3 py-2 text-sm w-44">
                    <option value="">Select...</option>
                    <option value="Canteen Salary">Canteen Salary</option>
                    <option value="Gas">Gas</option>
                    <option value="Wood">Wood</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Water">Water</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Transport">Transport</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Amount (₹)</label>
                <input type="number" name="amount" step="0.01" min="0" required placeholder="0" class="border rounded-lg px-3 py-2 text-sm w-28">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <input type="text" name="description" placeholder="Optional note" class="border rounded-lg px-3 py-2 text-sm w-44">
            </div>
            <div>
                <button type="submit" class="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition">Add Expense</button>
            </div>
        </form>
    </div>

    <!-- Expenses Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Category</th>
                    <th class="text-right px-4 py-2 font-medium text-gray-600">Amount</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Description</th>
                    <th class="text-center px-4 py-2 font-medium text-gray-600">Action</th>
                </tr>
            </thead>
            <tbody id="expense-list">
                <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            </tbody>
        </table>
    </div>

</div>
