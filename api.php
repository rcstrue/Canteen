<?php
require_once 'config.php';
header('Content-Type: application/json');
if (!isLoggedIn()) { jsonResponse(['error' => 'Unauthorized'], 401); }

$db = getDB();
$user = currentUser();
$action = input('action');

// Audit helper
function audit($db, $userId, $userName, $action, $entity, $entityId, $desc) {
    try {
        $db->prepare("INSERT INTO audit_log (user_id, user_name, action, entity_type, entity_id, description, ip_address) VALUES (?,?,?,?,?,?,?)")
            ->execute([$userId, $userName, $action, $entity, $entityId, $desc, $_SERVER['REMOTE_ADDR'] ?? null]);
    } catch (Exception $e) {}
}

try {
    switch ($action) {

    // ═══ MEAL COUNTS ═════════════════════════════════════════
    case 'get_meal_counts':
        $month = input('month', date('Y-m'));
        $stmt = $db->prepare("SELECT * FROM meal_counts WHERE DATE_FORMAT(date,'%Y-%m') = ? ORDER BY date");
        $stmt->execute([$month]);
        $rows = $stmt->fetchAll(PDO::FETCH_UNIQUE|PDO::FETCH_ASSOC);
        $data = [];
        $daysInMonth = (int)date('t', strtotime($month . '-01'));
        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dateStr = $month . '-' . str_pad($d, 2, '0', STR_PAD_LEFT);
            $data[] = [
                'date' => $dateStr,
                'breakfast' => isset($rows[$dateStr]) ? (int)$rows[$dateStr]['breakfast'] : 0,
                'lunch' => isset($rows[$dateStr]) ? (int)$rows[$dateStr]['lunch'] : 0,
                'dinner' => isset($rows[$dateStr]) ? (int)$rows[$dateStr]['dinner'] : 0,
            ];
        }
        jsonResponse($data);

    case 'save_meal_counts':
        $month = input('month', date('Y-m'));
        $counts = json_decode(input('counts', '[]'), true);
        $upsert = $db->prepare("INSERT INTO meal_counts (date, breakfast, lunch, dinner, created_by) VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE breakfast=VALUES(breakfast), lunch=VALUES(lunch), dinner=VALUES(dinner)");
        foreach ($counts as $c) {
            if ((int)$c['breakfast'] || (int)$c['lunch'] || (int)$c['dinner']) {
                $upsert->execute([$c['date'], (int)$c['breakfast'], (int)$c['lunch'], (int)$c['dinner'], $user['id']]);
            }
        }
        audit($db, $user['id'], $user['name'], 'UPDATE', 'MealCount', null, "Updated meal counts for $month");
        jsonResponse(['success' => true]);

    // ═══ PURCHASES ═════════════════════════════════════════════
    case 'list_purchases':
        $dateFrom = input('date_from'); $dateTo = input('date_to');
        $limit = (int)input('limit', 50); $offset = (int)input('offset', 0);
        $sql = "SELECT p.*, s.name AS supplier_name,
                (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) AS item_count
                FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id WHERE 1=1";
        $params = [];
        if ($dateFrom) { $sql .= " AND p.date >= ?"; $params[] = $dateFrom; }
        if ($dateTo) { $sql .= " AND p.date <= ?"; $params[] = $dateTo; }
        $countSql = preg_replace('/SELECT p\.\*,.*?AS item_count/', 'SELECT COUNT(*)', $sql);
        $countStmt = $db->prepare($countSql); $countStmt->execute($params); $total = (int)$countStmt->fetchColumn();
        $sql .= " ORDER BY p.date DESC, p.id DESC LIMIT $limit OFFSET $offset";
        $stmt = $db->prepare($sql); $stmt->execute($params);
        jsonResponse(['data' => $stmt->fetchAll(), 'total' => $total]);

    case 'add_purchase':
        $db->beginTransaction();
        try {
            $items = json_decode(input('items', '[]'), true);
            if (empty($items)) throw new Exception('Add at least one item');
            $totalAmount = 0;
            foreach ($items as &$item) {
                $item['total'] = round($item['qty'] * $item['unit_price'], 2);
                $totalAmount += $item['total'];
            }
            $stmt = $db->prepare("INSERT INTO purchases (date, supplier_id, invoice_no, total_amount, notes, created_by) VALUES (?,?,?,?,?,?)");
            $stmt->execute([input('date'), input('supplier_id') ?: null, input('invoice_no') ?: null, $totalAmount, input('notes') ?: null, $user['id']]);
            $purchaseId = $db->lastInsertId();
            $stmtItem = $db->prepare("INSERT INTO purchase_items (purchase_id, ingredient_id, qty, unit_price, total) VALUES (?,?,?,?,?)");
            $stmtMovement = $db->prepare("INSERT INTO stock_movements (date, ingredient_id, type, qty, unit_price, total_amount, reference_type, reference_id, notes) VALUES (?,?,'PURCHASE',?,?,?,?,?,?)");
            $stmtStock = $db->prepare("UPDATE ingredients SET current_stock = current_stock + ?, avg_cost = ? WHERE id = ?");
            foreach ($items as $item) {
                $iid = (int)$item['ingredient_id']; $qty = (float)$item['qty']; $up = (float)$item['unit_price']; $tot = round($qty * $up, 2);
                $stmtItem->execute([$purchaseId, $iid, $qty, $up, $tot]);
                $stmtMovement->execute([input('date'), $iid, $qty, $up, $tot, 'PURCHASE', $purchaseId, 'Purchase ' . (input('invoice_no') ?: '')]);
                $ing = $db->prepare("SELECT current_stock, avg_cost FROM ingredients WHERE id = ?"); $ing->execute([$iid]); $row = $ing->fetch();
                $oldVal = $row['current_stock'] * $row['avg_cost']; $newStock = $row['current_stock'] + $qty;
                $newAvg = $newStock > 0 ? round(($oldVal + $tot) / $newStock, 2) : $up;
                $stmtStock->execute([$qty, $newAvg, $iid]);
            }
            $db->commit();
            audit($db, $user['id'], $user['name'], 'CREATE', 'Purchase', $purchaseId, "Purchase " . (input('invoice_no') ?: "#$purchaseId") . " = ₹$totalAmount");
            jsonResponse(['success' => true, 'id' => $purchaseId]);
        } catch (Exception $e) { $db->rollBack(); throw $e; }

    case 'delete_purchase':
        $id = (int)input('id');
        $items = $db->prepare("SELECT ingredient_id, qty FROM purchase_items WHERE purchase_id = ?"); $items->execute([$id]); $itemList = $items->fetchAll();
        $db->beginTransaction();
        try {
            $stmt = $db->prepare("UPDATE ingredients SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ?");
            foreach ($itemList as $item) $stmt->execute([$item['qty'], $item['ingredient_id']]);
            $db->prepare("DELETE FROM stock_movements WHERE reference_type='PURCHASE' AND reference_id=?")->execute([$id]);
            $db->prepare("DELETE FROM purchase_items WHERE purchase_id=?")->execute([$id]);
            $db->prepare("DELETE FROM purchases WHERE id=?")->execute([$id]);
            $db->commit();
            audit($db, $user['id'], $user['name'], 'DELETE', 'Purchase', $id, "Deleted purchase #$id");
            jsonResponse(['success' => true]);
        } catch (Exception $e) { $db->rollBack(); throw $e; }

    // ═══ OUTWARD ════════════════════════════════════════════════
    case 'list_outward':
        $dateFrom = input('date_from'); $dateTo = input('date_to'); $mealType = input('meal_type');
        $limit = (int)input('limit', 50); $offset = (int)input('offset', 0);
        $sql = "SELECT o.*, u.name AS created_by_name FROM outward_entries o LEFT JOIN users u ON u.id = o.created_by WHERE 1=1";
        $params = [];
        if ($dateFrom) { $sql .= " AND o.date >= ?"; $params[] = $dateFrom; }
        if ($dateTo) { $sql .= " AND o.date <= ?"; $params[] = $dateTo; }
        if ($mealType) { $sql .= " AND o.meal_type = ?"; $params[] = $mealType; }
        $countSql = str_replace("SELECT o.*, u.name AS created_by_name", "SELECT COUNT(*)", $sql);
        $cs = $db->prepare($countSql); $cs->execute($params); $total = (int)$cs->fetchColumn();
        $sql .= " ORDER BY o.date DESC, o.id DESC LIMIT $limit OFFSET $offset";
        $stmt = $db->prepare($sql); $stmt->execute($params);
        $data = $stmt->fetchAll();
        $stmtItems = $db->prepare("SELECT oi.*, i.name AS ingredient_name, i.unit FROM outward_items oi JOIN ingredients i ON i.id = oi.ingredient_id WHERE oi.entry_id = ?");
        foreach ($data as &$row) { $stmtItems->execute([$row['id']]); $row['items'] = $stmtItems->fetchAll(); }
        jsonResponse(['data' => $data, 'total' => $total]);

    case 'add_outward':
        $db->beginTransaction();
        try {
            $items = json_decode(input('items', '[]'), true);
            if (empty($items)) throw new Exception('Add at least one item');
            $totalCost = 0;
            foreach ($items as &$item) {
                $item['total_cost'] = round($item['qty_consumed'] * $item['unit_cost'], 2);
                $totalCost += $item['total_cost'];
            }
            $stmt = $db->prepare("INSERT INTO outward_entries (date, meal_type, description, notes, created_by) VALUES (?,?,?,?,?)");
            $stmt->execute([input('date'), input('meal_type'), input('description'), input('notes'), $user['id']]);
            $entryId = $db->lastInsertId();
            $stmtItem = $db->prepare("INSERT INTO outward_items (entry_id, ingredient_id, qty_consumed, unit_cost, total_cost) VALUES (?,?,?,?,?)");
            $stmtMovement = $db->prepare("INSERT INTO stock_movements (date, ingredient_id, type, qty, unit_price, total_amount, reference_type, reference_id, notes) VALUES (?,?,'CONSUMPTION',?,?,?,?,?,?)");
            $stmtStock = $db->prepare("UPDATE ingredients SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ?");
            foreach ($items as $item) {
                $iid = (int)$item['ingredient_id']; $qty = (float)$item['qty_consumed']; $uc = (float)$item['unit_cost']; $tot = round($qty * $uc, 2);
                $stmtItem->execute([$entryId, $iid, $qty, $uc, $tot]);
                $stmtMovement->execute([input('date'), $iid, $qty, $uc, $tot, 'OUTWARD', $entryId, input('description')]);
                $stmtStock->execute([$qty, $iid]);
            }
            $db->commit();
            audit($db, $user['id'], $user['name'], 'CREATE', 'Outward', $entryId, "Outward: " . input('description') . " = ₹$totalCost");
            jsonResponse(['success' => true, 'id' => $entryId, 'total_cost' => $totalCost]);
        } catch (Exception $e) { $db->rollBack(); throw $e; }

    case 'delete_outward':
        $id = (int)input('id');
        $items = $db->prepare("SELECT ingredient_id, qty_consumed FROM outward_items WHERE entry_id = ?"); $items->execute([$id]); $itemList = $items->fetchAll();
        $db->beginTransaction();
        try {
            $stmt = $db->prepare("UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?");
            foreach ($itemList as $item) $stmt->execute([$item['qty_consumed'], $item['ingredient_id']]);
            $db->prepare("DELETE FROM stock_movements WHERE reference_type='OUTWARD' AND reference_id=?")->execute([$id]);
            $db->prepare("DELETE FROM outward_items WHERE entry_id=?")->execute([$id]);
            $db->prepare("DELETE FROM outward_entries WHERE id=?")->execute([$id]);
            $db->commit();
            audit($db, $user['id'], $user['name'], 'DELETE', 'Outward', $id, "Deleted outward #$id");
            jsonResponse(['success' => true]);
        } catch (Exception $e) { $db->rollBack(); throw $e; }

    // ═══ STOCK ══════════════════════════════════════════════════
    case 'get_stock':
        $category = input('category'); $search = input('search'); $lowStock = input('low_stock');
        $sql = "SELECT i.*, s.name AS supplier_name FROM ingredients i LEFT JOIN suppliers s ON s.id = i.supplier_id WHERE 1=1";
        $params = [];
        if ($category && $category !== 'all') { $sql .= " AND i.category = ?"; $params[] = $category; }
        if ($search) { $sql .= " AND i.name LIKE ?"; $params[] = "%$search%"; }
        if ($lowStock === 'true') { $sql .= " AND i.current_stock < i.min_stock"; }
        $sql .= " ORDER BY i.category, i.name";
        $stmt = $db->prepare($sql); $stmt->execute($params);
        jsonResponse($stmt->fetchAll());

    case 'get_stock_movements':
        $ingredientId = input('ingredient_id'); $type = input('type');
        $dateFrom = input('date_from'); $dateTo = input('date_to');
        $limit = (int)input('limit', 200);
        $sql = "SELECT sm.*, i.name AS ingredient_name, i.unit FROM stock_movements sm JOIN ingredients i ON i.id = sm.ingredient_id WHERE 1=1";
        $params = [];
        if ($ingredientId) { $sql .= " AND sm.ingredient_id = ?"; $params[] = $ingredientId; }
        if ($type) { $sql .= " AND sm.type = ?"; $params[] = $type; }
        if ($dateFrom) { $sql .= " AND sm.date >= ?"; $params[] = $dateFrom; }
        if ($dateTo) { $sql .= " AND sm.date <= ?"; $params[] = $dateTo; }
        $sql .= " ORDER BY sm.date DESC, sm.id DESC LIMIT $limit";
        $stmt = $db->prepare($sql); $stmt->execute($params);
        jsonResponse($stmt->fetchAll());

    // ═══ SUPPLIERS CRUD ═══════════════════════════════════════
    case 'list_suppliers':
        $stmt = $db->query("SELECT * FROM suppliers ORDER BY name");
        jsonResponse($stmt->fetchAll());

    case 'add_supplier':
        $stmt = $db->prepare("INSERT INTO suppliers (name, contact_person, phone, email, category, notes) VALUES (?,?,?,?,?,?)");
        $stmt->execute([input('name'), input('contact_person'), input('phone'), input('email'), input('category'), input('notes')]);
        $id = $db->lastInsertId();
        audit($db, $user['id'], $user['name'], 'CREATE', 'Supplier', $id, "Added supplier: " . input('name'));
        jsonResponse(['success' => true, 'id' => $id]);

    case 'edit_supplier':
        $id = (int)input('id');
        $stmt = $db->prepare("UPDATE suppliers SET name=?, contact_person=?, phone=?, email=?, category=?, notes=? WHERE id=?");
        $stmt->execute([input('name'), input('contact_person'), input('phone'), input('email'), input('category'), input('notes'), $id]);
        audit($db, $user['id'], $user['name'], 'UPDATE', 'Supplier', $id, "Updated supplier: " . input('name'));
        jsonResponse(['success' => true]);

    case 'delete_supplier':
        $id = (int)input('id');
        $db->prepare("UPDATE ingredients SET supplier_id = NULL WHERE supplier_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM suppliers WHERE id = ?")->execute([$id]);
        audit($db, $user['id'], $user['name'], 'DELETE', 'Supplier', $id, "Deleted supplier #$id");
        jsonResponse(['success' => true]);

    // ═══ INGREDIENTS CRUD ══════════════════════════════════════
    case 'get_ingredients':
        $stmt = $db->query("SELECT i.*, s.name AS supplier_name FROM ingredients i LEFT JOIN suppliers s ON s.id = i.supplier_id ORDER BY i.category, i.name");
        jsonResponse($stmt->fetchAll());

    case 'add_ingredient':
        $stmt = $db->prepare("INSERT INTO ingredients (name, unit, category, current_stock, min_stock, avg_cost, supplier_id) VALUES (?,?,?,?,?,?,?)");
        $stmt->execute([input('name'), input('unit', 'kg'), input('category', 'Other'), (float)input('current_stock', 0), (float)input('min_stock', 0), (float)input('avg_cost', 0), input('supplier_id') ?: null]);
        $id = $db->lastInsertId();
        audit($db, $user['id'], $user['name'], 'CREATE', 'Ingredient', $id, "Added ingredient: " . input('name'));
        jsonResponse(['success' => true, 'id' => $id]);

    case 'edit_ingredient':
        $id = (int)input('id');
        $stmt = $db->prepare("UPDATE ingredients SET name=?, unit=?, category=?, min_stock=?, avg_cost=?, supplier_id=? WHERE id=?");
        $stmt->execute([input('name'), input('unit'), input('category'), (float)input('min_stock'), (float)input('avg_cost'), input('supplier_id') ?: null, $id]);
        audit($db, $user['id'], $user['name'], 'UPDATE', 'Ingredient', $id, "Updated ingredient: " . input('name'));
        jsonResponse(['success' => true]);

    case 'delete_ingredient':
        $id = (int)input('id');
        $db->prepare("DELETE FROM ingredients WHERE id = ?")->execute([$id]);
        audit($db, $user['id'], $user['name'], 'DELETE', 'Ingredient', $id, "Deleted ingredient #$id");
        jsonResponse(['success' => true]);

    // ═══ EXPENSES ═══════════════════════════════════════════════
    case 'list_expenses':
        $month = input('month');
        $sql = "SELECT e.*, u.name AS created_by_name FROM expenses e LEFT JOIN users u ON u.id = e.created_by WHERE 1=1";
        $params = [];
        if ($month) { $sql .= " AND DATE_FORMAT(e.date,'%Y-%m') = ?"; $params[] = $month; }
        $sql .= " ORDER BY e.date DESC, e.id DESC";
        $stmt = $db->prepare($sql); $stmt->execute($params);
        jsonResponse($stmt->fetchAll());

    case 'add_expense':
        $stmt = $db->prepare("INSERT INTO expenses (date, category, amount, description, created_by) VALUES (?,?,?,?,?)");
        $stmt->execute([input('date'), input('category'), (float)input('amount'), input('description'), $user['id']]);
        $id = $db->lastInsertId();
        audit($db, $user['id'], $user['name'], 'CREATE', 'Expense', $id, input('category') . ": ₹" . input('amount'));
        jsonResponse(['success' => true, 'id' => $id]);

    case 'delete_expense':
        $id = (int)input('id');
        $db->prepare("DELETE FROM expenses WHERE id = ?")->execute([$id]);
        audit($db, $user['id'], $user['name'], 'DELETE', 'Expense', $id, "Deleted expense #$id");
        jsonResponse(['success' => true]);

    // ═══ USERS ══════════════════════════════════════════════════
    case 'list_users':
        if ($user['role'] !== 'admin') jsonResponse(['error' => 'Admin only'], 403);
        $stmt = $db->query("SELECT id, name, email, role, active, created_at FROM users ORDER BY name");
        jsonResponse($stmt->fetchAll());

    case 'add_user':
        if ($user['role'] !== 'admin') jsonResponse(['error' => 'Admin only'], 403);
        $hash = password_hash(input('password', 'user123'), PASSWORD_DEFAULT);
        $stmt = $db->prepare("INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)");
        $stmt->execute([input('name'), input('email'), $hash, input('role', 'kitchen')]);
        audit($db, $user['id'], $user['name'], 'CREATE', 'User', $db->lastInsertId(), "Added user: " . input('email'));
        jsonResponse(['success' => true]);

    case 'edit_user':
        if ($user['role'] !== 'admin') jsonResponse(['error' => 'Admin only'], 403);
        $id = (int)input('id');
        $pw = input('password');
        if ($pw) {
            $hash = password_hash($pw, PASSWORD_DEFAULT);
            $db->prepare("UPDATE users SET name=?, email=?, role=?, active=?, password=? WHERE id=?")->execute([input('name'), input('email'), input('role'), (int)input('active', 1), $hash, $id]);
        } else {
            $db->prepare("UPDATE users SET name=?, email=?, role=?, active=? WHERE id=?")->execute([input('name'), input('email'), input('role'), (int)input('active', 1), $id]);
        }
        audit($db, $user['id'], $user['name'], 'UPDATE', 'User', $id, "Updated user: " . input('email'));
        jsonResponse(['success' => true]);

    case 'delete_user':
        if ($user['role'] !== 'admin') jsonResponse(['error' => 'Admin only'], 403);
        $id = (int)input('id');
        if ($id == $user['id']) jsonResponse(['error' => 'Cannot delete yourself'], 400);
        $db->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);
        audit($db, $user['id'], $user['name'], 'DELETE', 'User', $id, "Deleted user #$id");
        jsonResponse(['success' => true]);

    // ═══ AUDIT LOG ══════════════════════════════════════════════
    case 'list_audit':
        if ($user['role'] !== 'admin') jsonResponse(['error' => 'Admin only'], 403);
        $limit = (int)input('limit', 100);
        $stmt = $db->query("SELECT a.*, u.name AS user_name FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT $limit");
        jsonResponse($stmt->fetchAll());

    // ═══ DASHBOARD / REPORTS ════════════════════════════════════
    case 'get_monthly_report':
        $month = input('month', date('Y-m'));
        $monthStart = $month . '-01';
        $monthEnd = date('Y-m-t', strtotime($monthStart));

        // Stock purchase total for month
        $purchaseTotal = $db->prepare("SELECT COALESCE(SUM(total_amount),0) FROM purchases WHERE date BETWEEN ? AND ?");
        $purchaseTotal->execute([$monthStart, $monthEnd]); $purchaseTotalVal = (float)$purchaseTotal->fetchColumn();

        // Stock used (outward cost) for month
        $usedTotal = $db->prepare("SELECT COALESCE(SUM(oi.total_cost),0) FROM outward_items oi JOIN outward_entries oe ON oe.id = oi.entry_id WHERE oe.date BETWEEN ? AND ?");
        $usedTotal->execute([$monthStart, $monthEnd]); $usedTotalVal = (float)$usedTotal->fetchColumn();

        // Current stock value
        $stockValue = $db->query("SELECT COALESCE(SUM(current_stock * avg_cost), 0) FROM ingredients")->fetchColumn();

        // Meal counts for month
        $mealStmt = $db->prepare("SELECT COALESCE(SUM(breakfast),0), COALESCE(SUM(lunch),0), COALESCE(SUM(dinner),0) FROM meal_counts WHERE date BETWEEN ? AND ?");
        $mealStmt->execute([$monthStart, $monthEnd]); $meals = $mealStmt->fetch();
        $totalBreakfast = (int)$meals[0]; $totalLunch = (int)$meals[1]; $totalDinner = (int)$meals[2];
        $totalMeals = $totalBreakfast + $totalLunch + $totalDinner;

        // Other expenses for month
        $expStmt = $db->prepare("SELECT category, COALESCE(SUM(amount),0) AS total FROM expenses WHERE date BETWEEN ? AND ? GROUP BY category ORDER BY total DESC");
        $expStmt->execute([$monthStart, $monthEnd]); $expenseBreakdown = $expStmt->fetchAll();
        $otherExpenseTotal = array_sum(array_column($expenseBreakdown, 'total'));

        // Totals
        $totalExpenses = $usedTotalVal + $otherExpenseTotal;
        $costPerMeal = $totalMeals > 0 ? round($totalExpenses / $totalMeals, 2) : 0;
        $costPerLunch = $totalLunch > 0 ? round($totalExpenses / $totalLunch, 2) : 0;
        $costPerDinner = $totalDinner > 0 ? round($totalExpenses / $totalDinner, 2) : 0;

        // Low stock
        $lowStock = $db->query("SELECT COUNT(*) FROM ingredients WHERE current_stock < min_stock AND min_stock > 0")->fetchColumn();

        // Recent movements
        $recent = $db->query("SELECT sm.*, i.name AS ingredient_name, i.unit FROM stock_movements sm JOIN ingredients i ON i.id = sm.ingredient_id ORDER BY sm.created_at DESC LIMIT 15")->fetchAll();

        jsonResponse([
            'month' => $month,
            'purchase_total' => $purchaseTotalVal,
            'stock_used' => $usedTotalVal,
            'stock_value' => (float)$stockValue,
            'breakfast' => $totalBreakfast,
            'lunch' => $totalLunch,
            'dinner' => $totalDinner,
            'total_meals' => $totalMeals,
            'expense_breakdown' => $expenseBreakdown,
            'other_expenses' => $otherExpenseTotal,
            'total_expenses' => $totalExpenses,
            'cost_per_meal' => $costPerMeal,
            'cost_per_lunch' => $costPerLunch,
            'cost_per_dinner' => $costPerDinner,
            'low_stock_count' => (int)$lowStock,
            'recent' => $recent,
        ]);

    // ═══ EXPORT CSV ══════════════════════════════════════════════
    case 'export_csv':
        $type = input('type', 'meals');
        $month = input('month', date('Y-m'));
        $filename = "canteen_{$type}_{$month}.csv";
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        $out = fopen('php://output', 'w');
        if ($type === 'meals') {
            fputcsv($out, ['Date', 'Breakfast', 'Lunch', 'Dinner']);
            $stmt = $db->prepare("SELECT date, breakfast, lunch, dinner FROM meal_counts WHERE DATE_FORMAT(date,'%Y-%m') = ? ORDER BY date");
            $stmt->execute([$month]);
            while ($row = $stmt->fetch()) fputcsv($out, $row);
        } elseif ($type === 'purchases') {
            fputcsv($out, ['Date', 'Invoice', 'Supplier', 'Total']);
            $stmt = $db->prepare("SELECT date, invoice_no, (SELECT name FROM suppliers WHERE id=supplier_id) AS supplier, total_amount FROM purchases WHERE DATE_FORMAT(date,'%Y-%m') = ? ORDER BY date");
            $stmt->execute([$month]);
            while ($row = $stmt->fetch()) fputcsv($out, $row);
        } elseif ($type === 'expenses') {
            fputcsv($out, ['Date', 'Category', 'Amount', 'Description']);
            $stmt = $db->prepare("SELECT date, category, amount, description FROM expenses WHERE DATE_FORMAT(date,'%Y-%m') = ? ORDER BY date");
            $stmt->execute([$month]);
            while ($row = $stmt->fetch()) fputcsv($out, $row);
        } elseif ($type === 'stock') {
            fputcsv($out, ['Ingredient', 'Category', 'Current Stock', 'Min Stock', 'Avg Cost', 'Value']);
            $stmt = $db->query("SELECT name, category, current_stock, min_stock, avg_cost, ROUND(current_stock*avg_cost,2) FROM ingredients ORDER BY category, name");
            while ($row = $stmt->fetch()) fputcsv($out, $row);
        }
        fclose($out);
        exit;

    // ═══ PER MEAL COST REPORT ════════════════════════════════
    case 'get_per_meal_report':
        $month = input('month', date('Y-m'));
        $monthStart = $month . '-01';
        $monthEnd = date('Y-m-t', strtotime($monthStart));

        // Get meal counts
        $mealStmt = $db->prepare("SELECT date, breakfast, lunch, dinner FROM meal_counts WHERE date BETWEEN ? AND ? ORDER BY date");
        $mealStmt->execute([$monthStart, $monthEnd]);
        $mealRows = $mealStmt->fetchAll(PDO::FETCH_UNIQUE|PDO::FETCH_ASSOC);

        // Get outward costs grouped by date + meal_type
        $costStmt = $db->prepare("SELECT oe.date, oe.meal_type, COALESCE(SUM(oi.total_cost),0) AS total_cost
            FROM outward_entries oe JOIN outward_items oi ON oi.entry_id = oe.id
            WHERE oe.date BETWEEN ? AND ?
            GROUP BY oe.date, oe.meal_type");
        $costStmt->execute([$monthStart, $monthEnd]);
        $costRows = [];
        while ($r = $costStmt->fetch()) {
            $costRows[$r['date']][$r['meal_type']] = (float)$r['total_cost'];
        }

        // Build daily data
        $daysInMonth = (int)date('t', strtotime($monthStart));
        $data = [];
        $totals = ['breakfast' => 0, 'lunch' => 0, 'dinner' => 0, 'lunch_cost' => 0, 'dinner_cost' => 0, 'breakfast_cost' => 0];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dateStr = $month . '-' . str_pad($d, 2, '0', STR_PAD_LEFT);
            $m = $mealRows[$dateStr] ?? ['breakfast' => 0, 'lunch' => 0, 'dinner' => 0];
            $bf = (int)$m['breakfast']; $ln = (int)$m['lunch']; $dn = (int)$m['dinner'];
            $costs = $costRows[$dateStr] ?? [];
            $bfCost = (float)($costs['Breakfast'] ?? 0);
            $lnCost = (float)($costs['Lunch'] ?? 0);
            $dnCost = (float)($costs['Dinner'] ?? 0);
            $totals['breakfast'] += $bf; $totals['lunch'] += $ln; $totals['dinner'] += $dn;
            $totals['breakfast_cost'] += $bfCost; $totals['lunch_cost'] += $lnCost; $totals['dinner_cost'] += $dnCost;
            $data[] = [
                'date' => $dateStr,
                'breakfast' => $bf, 'lunch' => $ln, 'dinner' => $dn,
                'breakfast_cost' => $bfCost, 'lunch_cost' => $lnCost, 'dinner_cost' => $dnCost,
                'cost_per_breakfast' => $bf > 0 ? round($bfCost / $bf, 2) : 0,
                'cost_per_lunch' => $ln > 0 ? round($lnCost / $ln, 2) : 0,
                'cost_per_dinner' => $dn > 0 ? round($dnCost / $dn, 2) : 0,
            ];
        }
        $totals['total_meals'] = $totals['breakfast'] + $totals['lunch'] + $totals['dinner'];
        $totals['total_cost'] = $totals['breakfast_cost'] + $totals['lunch_cost'] + $totals['dinner_cost'];
        $totals['cost_per_meal'] = $totals['total_meals'] > 0 ? round($totals['total_cost'] / $totals['total_meals'], 2) : 0;
        $totals['cost_per_lunch_avg'] = $totals['lunch'] > 0 ? round($totals['lunch_cost'] / $totals['lunch'], 2) : 0;
        $totals['cost_per_dinner_avg'] = $totals['dinner'] > 0 ? round($totals['dinner_cost'] / $totals['dinner'], 2) : 0;
        jsonResponse(['data' => $data, 'totals' => $totals]);

    // ═══ RECIPES ════════════════════════════════════════════════
    case 'list_recipes':
        $stmt = $db->query("SELECT r.*, (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id) AS ingredient_count FROM recipes r ORDER BY r.name");
        $recipes = $stmt->fetchAll();
        $riStmt = $db->query("SELECT ri.*, i.name AS ingredient_name, i.unit FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id");
        $allRI = $riStmt->fetchAll();
        foreach ($recipes as &$r) {
            $r['ingredients'] = array_values(array_filter($allRI, fn($ri) => $ri['recipe_id'] == $r['id']));
            $r['total_cost'] = array_sum(array_column($r['ingredients'], 'total_cost'));
        }
        jsonResponse($recipes);

    case 'add_recipe':
        $name = input('name'); if (!$name) throw new Exception('Name required');
        $db->prepare("INSERT INTO recipes (name, description, meal_type, servings) VALUES (?,?,?,?)")
            ->execute([$name, input('description'), input('meal_type', 'Lunch'), (int)input('servings', 1)]);
        $id = $db->lastInsertId();
        audit($db, $user['id'], $user['name'], 'CREATE', 'Recipe', $id, "Added recipe: $name");
        jsonResponse(['success' => true, 'id' => $id]);

    case 'edit_recipe':
        $id = (int)input('id');
        $db->prepare("UPDATE recipes SET name=?, description=?, meal_type=?, servings=? WHERE id=?")
            ->execute([input('name'), input('description'), input('meal_type', 'Lunch'), (int)input('servings', 1), $id]);
        audit($db, $user['id'], $user['name'], 'UPDATE', 'Recipe', $id, "Updated recipe: " . input('name'));
        jsonResponse(['success' => true]);

    case 'delete_recipe':
        $id = (int)input('id');
        $db->prepare("DELETE FROM recipe_ingredients WHERE recipe_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM recipes WHERE id = ?")->execute([$id]);
        audit($db, $user['id'], $user['name'], 'DELETE', 'Recipe', $id, "Deleted recipe #$id");
        jsonResponse(['success' => true]);

    case 'add_recipe_ingredient':
        $recipeId = (int)input('recipe_id');
        $ingId = (int)input('ingredient_id');
        $qty = (float)input('qty');
        // Get avg_cost
        $ing = $db->prepare("SELECT avg_cost, unit FROM ingredients WHERE id = ?"); $ing->execute([$ingId]); $row = $ing->fetch();
        $unitCost = (float)$row['avg_cost']; $total = round($qty * $unitCost, 2);
        $db->prepare("INSERT INTO recipe_ingredients (recipe_id, ingredient_id, qty, unit_cost, total_cost) VALUES (?,?,?,?,?)")
            ->execute([$recipeId, $ingId, $qty, $unitCost, $total]);
        // Update recipe total cost
        $newTotal = $db->prepare("SELECT COALESCE(SUM(total_cost),0) FROM recipe_ingredients WHERE recipe_id = ?"); $newTotal->execute([$recipeId]);
        $db->prepare("UPDATE recipes SET total_cost = ? WHERE id = ?")->execute([$newTotal->fetchColumn(), $recipeId]);
        jsonResponse(['success' => true]);

    case 'delete_recipe_ingredient':
        $id = (int)input('id');
        $ri = $db->prepare("SELECT recipe_id FROM recipe_ingredients WHERE id = ?"); $ri->execute([$id]); $rid = $ri->fetchColumn();
        $db->prepare("DELETE FROM recipe_ingredients WHERE id = ?")->execute([$id]);
        $newTotal = $db->prepare("SELECT COALESCE(SUM(total_cost),0) FROM recipe_ingredients WHERE recipe_id = ?"); $newTotal->execute([$rid]);
        $db->prepare("UPDATE recipes SET total_cost = ? WHERE id = ?")->execute([$newTotal->fetchColumn(), $rid]);
        jsonResponse(['success' => true]);

    // ═══ BUDGETS ════════════════════════════════════════════════
    case 'list_budgets':
        $month = input('month');
        $sql = "SELECT b.* FROM budgets b WHERE 1=1";
        $params = [];
        if ($month) { $sql .= " AND b.month = ?"; $params[] = $month; }
        $sql .= " ORDER BY b.month DESC, b.category";
        $stmt = $db->prepare($sql); $stmt->execute($params);
        jsonResponse($stmt->fetchAll());

    case 'upsert_budget':
        $month = input('month'); $category = input('category'); $amount = (float)input('amount', 0);
        if (!$month || !$category) throw new Exception('Month and category required');
        $db->prepare("INSERT INTO budgets (month, category, amount) VALUES (?,?,?) ON DUPLICATE KEY UPDATE amount=VALUES(amount)")
            ->execute([$month, $category, $amount]);
        audit($db, $user['id'], $user['name'], 'UPDATE', 'Budget', null, "Budget $month / $category = ₹$amount");
        jsonResponse(['success' => true]);

    case 'delete_budget':
        $id = (int)input('id');
        $db->prepare("DELETE FROM budgets WHERE id = ?")->execute([$id]);
        jsonResponse(['success' => true]);

    case 'get_budget_report':
        $month = input('month', date('Y-m'));
        $monthStart = $month . '-01';
        $monthEnd = date('Y-m-t', strtotime($monthStart));

        // Budgets for this month
        $bStmt = $db->prepare("SELECT * FROM budgets WHERE month = ?"); $bStmt->execute([$month]); $budgets = $bStmt->fetchAll(PDO::FETCH_UNIQUE|PDO::FETCH_ASSOC);

        // Actual expenses by category
        $eStmt = $db->prepare("SELECT category, COALESCE(SUM(amount),0) AS actual FROM expenses WHERE date BETWEEN ? AND ? GROUP BY category");
        $eStmt->execute([$monthStart, $monthEnd]);
        $actuals = $eStmt->fetchAll(PDO::FETCH_UNIQUE|PDO::FETCH_ASSOC);

        // Total stock used
        $stockUsed = $db->prepare("SELECT COALESCE(SUM(oi.total_cost),0) FROM outward_items oi JOIN outward_entries oe ON oe.id = oi.entry_id WHERE oe.date BETWEEN ? AND ?");
        $stockUsed->execute([$monthStart, $monthEnd]); $stockUsedVal = (float)$stockUsed->fetchColumn();

        $data = [];
        $allCats = array_unique(array_merge(array_keys($budgets), array_keys($actuals), ['Stock Used']));
        $totalBudget = 0; $totalActual = 0;
        foreach ($allCats as $cat) {
            $budget = $cat === 'Stock Used' ? 0 : (float)($budgets[$cat]['amount'] ?? 0);
            $actual = $cat === 'Stock Used' ? $stockUsedVal : (float)($actuals[$cat]['actual'] ?? 0);
            $totalBudget += $budget; $totalActual += $actual;
            $data[] = ['category' => $cat, 'budget' => $budget, 'actual' => $actual, 'variance' => $budget - $actual, 'percent' => $budget > 0 ? round(($actual / $budget) * 100, 1) : ($actual > 0 ? 999 : 0)];
        }
        $data[] = ['category' => 'TOTAL', 'budget' => $totalBudget, 'actual' => $totalActual, 'variance' => $totalBudget - $totalActual, 'percent' => $totalBudget > 0 ? round(($totalActual / $totalBudget) * 100, 1) : 0];
        jsonResponse($data);

    default:
        jsonResponse(['error' => 'Unknown action: ' . $action], 400);
    }
} catch (Exception $e) {
    jsonResponse(['error' => $e->getMessage()], 500);
}
