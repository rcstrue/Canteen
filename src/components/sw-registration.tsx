"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CheckCircle2, CloudOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Subscribe to the browser's online/offline events using useSyncExternalStore.
 * This avoids the react-hooks/set-state-in-effect lint rule.
 */
function subscribeOnline(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

/**
 * Registers the service worker for PWA offline support.
 * Also shows a small toast when the app is ready for offline use,
 * and an offline indicator when the network drops.
 */
export function ServiceWorkerRegistration() {
  const [updateReady, setUpdateReady] = useState(false);
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    // Only register in production to avoid HMR conflicts in dev
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        // Listen for new service worker waiting to activate
        const handleUpdate = () => {
          if (registration?.waiting) {
            setUpdateReady(true);
          }
        };

        registration.addEventListener("updatefound", handleUpdate);
        if (registration.waiting) setUpdateReady(true);

        // Listen for controller change (new SW took over)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          // Page will reload automatically; nothing to do here
        });
      } catch (err) {
        // Silent fail — PWA is an enhancement, not a requirement
        console.warn("[PWA] SW registration failed:", err);
      }
    };

    register();
  }, []);

  const applyUpdate = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage("SKIP_WAITING");
          // The controllerchange event will reload the page
          setTimeout(() => window.location.reload(), 500);
        } else {
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      {/* Update ready banner */}
      <AnimatePresence>
        {updateReady && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-full border border-amber-200 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur dark:border-amber-800/50 dark:bg-stone-900/95"
            role="alert"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <p className="font-semibold leading-tight text-foreground">
                Update available
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                A new version of RCS Canteen is ready.
              </p>
            </div>
            <button
              onClick={applyUpdate}
              className="ml-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
            >
              Reload
            </button>
            <button
              onClick={() => setUpdateReady(false)}
              className="ml-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss update notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-1/2 top-4 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full border border-red-200 bg-red-50/95 px-4 py-2 shadow-lg backdrop-blur dark:border-red-800/50 dark:bg-red-950/90"
            role="alert"
          >
            <CloudOff className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              You&apos;re offline — changes may not save
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
