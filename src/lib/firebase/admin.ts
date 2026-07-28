import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let adminApp: App | null = null;

function parseServiceAccount(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
      console.error(
        "[firebase-admin] FIREBASE_SERVICE_ACCOUNT_KEY JSON is missing required fields."
      );
      return null;
    }
    // .env often stores literal \n — normalize to real newlines for the PEM key.
    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch (err) {
    console.error(
      "[firebase-admin] FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON:",
      err
    );
    return null;
  }
}

function getAdminApp(): App | null {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) return null;

  adminApp = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  return adminApp;
}

/** Server-only FCM messaging, or null if Admin SDK is not configured. */
export function getAdminMessaging(): Messaging | null {
  const app = getAdminApp();
  if (!app) return null;
  return getMessaging(app);
}
