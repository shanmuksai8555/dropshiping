import 'server-only';
import { createSign } from 'node:crypto';
import { sheetsConfig } from './env';

// Google Sheets append via a service account, with a hand-signed RS256 JWT (no googleapis dependency).
// Share the sheet with GOOGLE_SERVICE_ACCOUNT_EMAIL as an Editor.

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');

let cached: { token: string; exp: number } | null = null;

async function accessToken(email: string, key: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(key))}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !j.access_token) throw new Error(`Google token error ${res.status}${j.error ? `: ${j.error}` : ''}`);
  cached = { token: j.access_token, exp: now + (j.expires_in ?? 3600) };
  return j.access_token;
}

export const isSheetsConfigured = () => sheetsConfig() !== null;

/** Appends one row. valueInputOption=RAW so nothing the visitor typed is ever evaluated as a formula. */
export async function appendLeadRow(row: string[]) {
  const cfg = sheetsConfig();
  if (!cfg) throw new Error('Google Sheets is not configured');
  const token = await accessToken(cfg.email, cfg.key);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cfg.sheetId)}/values/${encodeURIComponent(cfg.range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Sheets append failed: ${res.status}`);
}
