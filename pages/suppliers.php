<div id="page-suppliers" class="page<?php echo $p===$activePage?' active':''; ?> fade-in">

    <!-- Header -->
    <div class="flex flex-wrap items-center gap-4 mb-6">
        <h2 class="text-lg font-bold text-gray-800">Suppliers</h2>
        <div class="ml-auto">
            <button onclick="addSupplierModal()" class="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition">+ Add Supplier</button>
        </div>
    </div>

    <!-- Suppliers Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Contact Person</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Phone</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Email</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Category</th>
                    <th class="text-center px-4 py-2 font-medium text-gray-600">Action</th>
                </tr>
            </thead>
            <tbody id="supplier-list">
                <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            </tbody>
        </table>
    </div>

</div>
