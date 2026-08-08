<div id="page-recipes" class="page<?php echo $p===$activePage?' active':''; ?> fade-in">

    <!-- Header -->
    <div class="flex flex-wrap items-center gap-4 mb-6">
        <h2 class="text-lg font-bold text-gray-800">Recipes</h2>
        <div class="ml-auto">
            <button onclick="addRecipeModal()" class="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition">+ Add Recipe</button>
        </div>
    </div>

    <!-- Recipes Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                    <th class="text-left px-4 py-2 font-medium text-gray-600">Meal Type</th>
                    <th class="text-center px-4 py-2 font-medium text-gray-600">Ingredients</th>
                    <th class="text-right px-4 py-2 font-medium text-gray-600">Total Cost</th>
                    <th class="text-center px-4 py-2 font-medium text-gray-600">Action</th>
                </tr>
            </thead>
            <tbody id="recipe-list">
                <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            </tbody>
        </table>
    </div>

</div>