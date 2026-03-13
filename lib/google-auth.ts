import { google } from "googleapis";

/**
 * Creates an authenticated Google Auth client using a service account.
 * Memoised — the heavy JWT/key parsing only happens once per process.
 */
let _auth: InstanceType<typeof google.auth.GoogleAuth> | null = null;

export function getGoogleAuth() {
  if (_auth) return _auth;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env vars. " +
        "Copy .env.local.example to .env.local and fill in your service account credentials."
    );
  }

  _auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key,
    },
    scopes: [
      "https://www.googleapis.com/auth/analytics.readonly",
      "https://www.googleapis.com/auth/webmasters.readonly",
    ],
  });

  return _auth;
}
