<div id="page-audit" class="page<?php echo $p===$activePage?' active':''; ?> fade-in">

    <!-- Header -->
    <div class="flex flex-wrap items-center gap-4 mb-6">
        <h2 class="text-lg font-bold text-gray-800">Audit Log</h2>
    </div>

    <!-- Audit Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Timestamp</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">User</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Action</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Description</th>
                </tr>
            </thead>
            <tbody id="audit-list">
                <tr><td colspan="4" class="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            </tbody>
        </table>
    </div>

</div>
