<div id="page-users" class="page<?php echo $p===$activePage?' active':''; ?> fade-in">

    <!-- Header -->
    <div class="flex flex-wrap items-center gap-4 mb-6">
        <h2 class="text-lg font-bold text-gray-800">User Management</h2>
        <div class="ml-auto">
            <button onclick="addUserModal()" class="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition">+ Add User</button>
        </div>
    </div>

    <!-- Users Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Email</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Role</th>
                    <th class="text-center px-4 py-2 font-medium text-gray-600">Active</th>
                    <th class="text-center px-4 py-2 font-medium text-gray-600">Action</th>
                </tr>
            </thead>
            <tbody id="user-list">
                <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            </tbody>
        </table>
    </div>

</div>
