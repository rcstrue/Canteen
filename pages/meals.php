<div id="page-meals" class="page<?php echo $p===$activePage?' active':''; ?> fade-in">

    <!-- Header -->
    <div class="flex flex-wrap items-center gap-4 mb-6">
        <input type="month" id="meal-month" class="border rounded-lg px-3 py-2 text-sm" value="<?= date('Y-m') ?>" onchange="loadMeals()">
        <h2 id="meal-label" class="text-lg font-bold text-gray-800">Meal Count</h2>
        <div class="ml-auto">
            <button onclick="saveMeals()" class="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition">Save</button>
        </div>
    </div>

    <!-- Meals Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th class="text-left px-3 py-2 font-medium text-gray-600 w-1/4">Date</th>
                    <th class="text-center px-2 py-2 font-medium text-gray-600 w-1/4">Breakfast</th>
                    <th class="text-center px-2 py-2 font-medium text-gray-600 w-1/4">Lunch</th>
                    <th class="text-center px-2 py-2 font-medium text-gray-600 w-1/4">Dinner</th>
                </tr>
            </thead>
            <tbody id="meal-table">
                <!-- Rows populated by JavaScript -->
            </tbody>
            <tfoot>
                <tr id="meal-totals">
                    <td colspan="4" class="px-3 py-2 font-bold bg-gray-50 border-t-2 text-center text-gray-500">Loading...</td>
                </tr>
            </tfoot>
        </table>
    </div>

</div>
