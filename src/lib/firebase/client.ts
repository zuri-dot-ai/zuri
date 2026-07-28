"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";
import { getFirebasePublicConfig } from "./config";

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;

  if (app) return app;

  const config = getFirebasePublicConfig();
  if (!config) {
    console.error(
      "[firebase] Missing NEXT_PUBLIC_FIREBASE_* env vars — cannot init client."
    );
    return null;
  }

  app = getApps().length > 0 ? getApps()[0]! : initializeApp(config);
  return app;
}

/** Browser-only Firebase Messaging instance, or null if unsupported / unconfigured. */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (messaging) return messaging;

  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  messaging = getMessaging(firebaseApp);
  return messaging;
}
