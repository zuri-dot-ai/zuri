import { getFirebasePublicConfig } from "@/lib/firebase/config";

export const runtime = "nodejs";

/** Firebase JS SDK major.minor.patch — keep in sync with package.json `firebase`. */
const FIREBASE_COMPAT_VERSION = "12.16.0";

/**
 * Serves Firebase Messaging init for service workers, with NEXT_PUBLIC_* config
 * injected at request time so public/sw.js does not hardcode project keys.
 */
export async function GET() {
  const config = getFirebasePublicConfig();
  if (!config) {
    return new Response(
      "/* Firebase public config missing — set NEXT_PUBLIC_FIREBASE_* */\n",
      {
        status: 503,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const body = `
importScripts(
  "https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_VERSION}/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/${FIREBASE_COMPAT_VERSION}/firebase-messaging-compat.js"
);

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const title =
    (payload.notification && payload.notification.title) ||
    (payload.data && payload.data.title) ||
    "Zuri";
  const options = {
    body:
      (payload.notification && payload.notification.body) ||
      (payload.data && payload.data.body) ||
      "",
    icon: "/Zuri_Logo.png",
    badge: "/Zuri_Favicon.png",
    data: {
      url:
        (payload.data && payload.data.url) ||
        (payload.fcmOptions && payload.fcmOptions.link) ||
        "/",
    },
  };
  self.registration.showNotification(title, options);
});
`.trimStart();

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
      "Service-Worker-Allowed": "/",
    },
  });
}
