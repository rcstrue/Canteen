"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Mail, Lock, Loader2, Eye, EyeOff, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/components/auth/auth-provider";

export function LoginView() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.ok) {
        setError(
          result.error === "CredentialsSignin"
            ? "Invalid email or password. Please try again."
            : result.error ?? "Login failed. Please try again."
        );
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-stone-950 p-4">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-800/20" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl dark:bg-orange-800/20" />
        <div className="absolute left-1/2 top-1/3 h-60 w-60 -translate-x-1/2 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-700/10" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Main Card */}
        <div className="overflow-hidden rounded-2xl border border-amber-200/60 bg-white/80 shadow-xl shadow-amber-900/10 backdrop-blur-sm dark:border-amber-800/30 dark:bg-stone-900/80 dark:shadow-amber-900/20">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600" />

          <div className="px-8 py-8 sm:px-10">
            {/* Logo & Branding */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mb-8 text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/30">
                <Flame className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                RCS Canteen
              </h1>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <ChefHat className="h-3.5 w-3.5" />
                Stock & Cost Management
              </p>
            </motion.div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </div>
              </motion.div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@rcs.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-white/60 dark:bg-stone-800/60 border-amber-200/60 dark:border-amber-800/30 focus-visible:ring-amber-500/40"
                    disabled={isSubmitting || isLoading}
                    autoComplete="email"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-white/60 dark:bg-stone-800/60 border-amber-200/60 dark:border-amber-800/30 focus-visible:ring-amber-500/40"
                    disabled={isSubmitting || isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked === true)
                    }
                    className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <Button
                  type="submit"
                  className="h-11 w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-700 transition-all duration-200 font-semibold"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-amber-200/60 dark:border-amber-800/30" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white/80 dark:bg-stone-900/80 px-3 text-muted-foreground">
                  Default Credentials
                </span>
              </div>
            </div>

            {/* Demo credentials hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-3 dark:border-amber-800/30 dark:bg-amber-950/20"
            >
              <div className="flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    i
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground/80">Quick Access</p>
                  <p className="mt-0.5">
                    Email:{" "}
                    <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      admin@rcs.com
                    </code>
                  </p>
                  <p className="mt-0.5">
                    Password:{" "}
                    <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      admin123
                    </code>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="border-t border-amber-200/40 bg-amber-50/30 px-8 py-4 dark:border-amber-800/20 dark:bg-amber-950/10">
            <p className="text-center text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">RCS Canteen</span>{" "}
              © 2026 · Dahej Industrial Contract
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
