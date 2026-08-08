<?php
require_once 'config.php';

if (isLoggedIn()) {
    header('Location: index.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($email && $password) {
        $stmt = getDB()->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_name'] = $user['name'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = $user['role'];
            header('Location: index.php');
            exit;
        }
    }
    $error = 'Invalid email or password';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - RCS Canteen</title>
    <link rel="stylesheet" href="style.css">
</head>
<body class="bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-xl p-8 w-full max-w-md border-0">
        <div class="text-center mb-6">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <span class="text-3xl">🔥</span>
            </div>
            <h1 class="text-2xl font-bold">RCS Canteen</h1>
            <p class="text-gray-500 mt-1">Management System</p>
        </div>

        <?php if ($error): ?>
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <form method="POST" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="email" required
                    value="admin@rcs-canteen.com"
                    class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" name="password" required
                    placeholder="Enter password"
                    class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition">
            </div>
            <button type="submit"
                class="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 rounded-lg transition">
                Sign In
            </button>
        </form>

        <div class="mt-5 bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
            <p class="font-medium mb-1">Default Credentials:</p>
            <p>Admin: admin@rcs-canteen.com / admin123</p>
            <p>Staff: staff@rcs-canteen.com / staff123</p>
        </div>
    </div>
</body>
</html>
