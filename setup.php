<?php
/**
 * RCS Canteen - Database Setup
 * Run ONCE to create tables and seed data, then DELETE this file.
 */

require_once 'config.php';

$messages = [];

try {
    $db = new PDO(
        "mysql:host=" . DB_HOST . ";charset=utf8mb4",
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $db->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $db->exec("USE `" . DB_NAME . "`");
    $messages[] = "✅ Database '" . DB_NAME . "' ready.";

    $db->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin','kitchen','store') DEFAULT 'kitchen',
        active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");
    $messages[] = "✅ Table 'users' created.";

    $db->exec("CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        contact_person VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(100),
        category VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");
    $messages[] = "✅ Table 'suppliers' created.";

    $db->exec("CREATE TABLE IF NOT EXISTS ingredients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        unit VARCHAR(20) NOT NULL DEFAULT 'kg',
        category VARCHAR(50) NOT NULL DEFAULT 'Other',
        current_stock DECIMAL(12,2) DEFAULT 0,
        min_stock DECIMAL(12,2) DEFAULT 0,
        avg_cost DECIMAL(12,2) DEFAULT 0,
        supplier_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
        INDEX idx_category (category),
        INDEX idx_name (name)
    ) ENGINE=InnoDB");
    $messages[] = "✅ Table 'ingredients' created.";

    $db->exec("CREATE TABLE IF NOT EXISTS purchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        supplier_id INT,
        invoice_no VARCHAR(50),
        total_amount DECIMAL(12,2) DEFAULT 0,
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_date (date)
    ) ENGINE=InnoDB");
    $messages[] = "✅ Table 'purchases' created.";

    $db->exec("CREATE TABLE IF NOT EXISTS purchase_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_id INT NOT NULL,
        ingredient_id INT NOT NULL,
        qty DECIMAL(12,2) NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        total DECIMAL(12,2) NOT NULL,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB");
    $messages[] = "✅ Table 'purchase_items' created.";

    $db->exec("CREATE TABLE IF NOT EXISTS outward_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        meal_type ENUM('Breakfast','Lunch','Dinner') NOT NULL,
        description VARCHAR(200),
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_date (date)
    ) ENGINE=InnoDB");
    $messages[] = "✅ Table 'outward_entries' created.";

    $db->exec("CREATE TABLE IF NOT EXISTS outward_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entry_id INT NOT NULL,
        ingredient_id INT NOT NULL,
        qty_consumed DECIMAL(12,2) NOT NULL,
        unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
        FOREIGN KEY (entry_id) REFERENCES outward_entries(id) ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB");
    $messages[] = "✅ Table 'outward_items' created.";

    $db->exec("CREATE TABLE IF NOT EXISTS stock_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        ingredient_id INT NOT NULL,
        type ENUM('PURCHASE','CONSUMPTION','WASTAGE','ADJUSTMENT') NOT NULL,
        qty DECIMAL(12,2) NOT NULL,
        unit_price DECIMAL(12,2) DEFAULT 0,
        total_amount DECIMAL(12,2) DEFAULT 0,
        reference_type VARCHAR(20),
        reference_id INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
        INDEX idx_date (date),
        INDEX idx_ingredient (ingredient_id),
        INDEX idx_type (type)
    ) ENGINE=InnoDB");
    $messages[] = "✅ Table 'stock_movements' created.";

    // NEW: Meal Counts
    $db->exec("CREATE TABLE IF NOT EXISTS meal_counts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        breakfast INT DEFAULT 0,
        lunch INT DEFAULT 0,
        dinner INT DEFAULT 0,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_date (date)
    ) ENGINE=InnoDB");
    $messages[] = "✅ Table 'meal_counts' created.";

    // NEW: Expenses
    $db->exec("CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        category VARCHAR(50) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        description TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_date (date),
        INDEX idx_category (category)
    ) ENGINE=InnoDB");
    $messages[] = "✅ Table 'expenses' created.";

    // NEW: Audit Log
    $db->exec("CREATE TABLE IF NOT EXISTS audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        user_name VARCHAR(100),
        action VARCHAR(30) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INT,
        description TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created (created_at),
        INDEX idx_action (action)
    ) ENGINE=InnoDB");
    $messages[] = "✅ Table 'audit_log' created.";

    // NEW: Recipes
    $db->exec("CREATE TABLE IF NOT EXISTS recipes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        meal_type ENUM('Breakfast','Lunch','Dinner') DEFAULT 'Lunch',
        servings INT DEFAULT 1,
        total_cost DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB");
    $messages[] = "✅ Table 'recipes' created.";

    $db->exec("CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipe_id INT NOT NULL,
        ingredient_id INT NOT NULL,
        qty DECIMAL(12,2) NOT NULL,
        unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB");
    $messages[] = "✅ Table 'recipe_ingredients' created.";

    // NEW: Budgets
    $db->exec("CREATE TABLE IF NOT EXISTS budgets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        month VARCHAR(7) NOT NULL,
        category VARCHAR(50) NOT NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_month_cat (month, category)
    ) ENGINE=InnoDB");
    $messages[] = "✅ Table 'budgets' created.";

    // Seed
    $check = $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($check == 0) {
        $db->exec("INSERT INTO users (name, email, password, role) VALUES
            ('Admin User', 'admin@rcs-canteen.com', '" . password_hash('admin123', PASSWORD_DEFAULT) . "', 'admin'),
            ('Kitchen Staff', 'staff@rcs-canteen.com', '" . password_hash('staff123', PASSWORD_DEFAULT) . "', 'kitchen'),
            ('Store Manager', 'store@rcs-canteen.com', '" . password_hash('store123', PASSWORD_DEFAULT) . "', 'store')");
        $messages[] = "✅ Seeded 3 users.";

        $db->exec("INSERT INTO suppliers (name, contact_person, phone, email, category, notes) VALUES
            ('Rajesh Grains', 'Rajesh Patel', '9825012345', 'rajesh@rajeshgrains.in', 'Grains', 'Weekly delivery on Mondays'),
            ('Fresh Meats', 'Imran Khan', '9825023456', 'orders@freshmeats.in', 'Meat', 'Daily delivery before 7 AM'),
            ('Green Valley Veg', 'Suresh Patel', '9825034567', 'info@greenvalley.in', 'Vegetables', 'Fresh produce daily'),
            ('Amul Dairy', 'Mehul Shah', '9825045678', NULL, 'Dairy', 'Daily milk and dairy delivery'),
            ('Spice World', 'Kamal Merchant', '9825056789', NULL, 'Spices', 'Monthly bulk supply')");
        $messages[] = "✅ Seeded 5 suppliers.";

        $db->exec("INSERT INTO ingredients (name, unit, category, current_stock, min_stock, avg_cost, supplier_id) VALUES
            ('Rice (Basmati)', 'kg', 'Grains', 150, 50, 62, 1),
            ('Wheat Flour', 'kg', 'Grains', 200, 80, 38, 1),
            ('Toor Dal', 'kg', 'Grains', 80, 30, 115, 1),
            ('Chicken', 'kg', 'Meat', 40, 15, 210, 2),
            ('Eggs', 'pcs', 'Meat', 500, 200, 6.5, 2),
            ('Onion', 'kg', 'Vegetables', 60, 20, 28, 3),
            ('Potato', 'kg', 'Vegetables', 80, 30, 22, 3),
            ('Tomato', 'kg', 'Vegetables', 40, 15, 32, 3),
            ('Milk', 'litre', 'Dairy', 100, 40, 50, 4),
            ('Ghee', 'kg', 'Dairy', 15, 5, 540, 4),
            ('Cooking Oil', 'litre', 'Oil', 50, 20, 145, NULL),
            ('Turmeric Powder', 'kg', 'Spices', 5, 2, 270, 5),
            ('Red Chilli Powder', 'kg', 'Spices', 4, 2, 310, 5),
            ('Salt', 'kg', 'Spices', 20, 8, 18, NULL),
            ('Sugar', 'kg', 'Grains', 50, 20, 42, NULL),
            ('Tea Leaves', 'kg', 'Beverages', 8, 3, 380, NULL)");
        $messages[] = "✅ Seeded 16 ingredients.";
    } else {
        $messages[] = "ℹ️ Users exist — skipping seed.";
        // Add new columns if upgrading from old version
        try { $db->exec("ALTER TABLE users ADD COLUMN active TINYINT(1) DEFAULT 1"); } catch (Exception $e) {}
    }

    $messages[] = "";
    $messages[] = "🎉 Setup complete! (14 tables)";
    $messages[] = "⚠️ DELETE this setup.php file NOW for security.";
    $messages[] = "";
    $messages[] = "Go to: <a href='login.php' class='text-blue-600 underline font-bold'>Login Page</a>";
    $messages[] = "";
    $messages[] = "Login: admin@rcs-canteen.com / admin123";

} catch (Exception $e) {
    $messages[] = "❌ Error: " . $e->getMessage();
    $messages[] = "Check DB_HOST, DB_NAME, DB_USER, DB_PASS in config.php";
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Setup - RCS Canteen</title>
    <link rel="stylesheet" href="style.css">
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full">
        <h1 class="text-2xl font-bold mb-6">RCS Canteen — Database Setup</h1>
        <?php foreach ($messages as $msg): ?>
            <p class="mb-2"><?= $msg ?></p>
        <?php endforeach; ?>
    </div>
</body>
</html>