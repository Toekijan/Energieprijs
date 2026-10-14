// Eenmalige OAuth-setup voor de Enphase Enlighten API v4.
// Gebruik: npm run enphase:setup
import { createInterface } from "node:readline/promises";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const API = "https://api.enphaseenergy.com";
const REDIRECT = `${API}/oauth/redirect_uri`;
const ENV_FILE = ".env.local";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = async (q) => (await rl.question(q)).trim();

console.log(`
Enphase-koppeling instellen
---------------------------
Maak eerst een app aan op https://developer-v4.enphase.com (gratis "Watt"-plan):
  - Gebruik als Authorization Code Redirect URI:
    ${REDIRECT}
  - Noteer API Key, Client ID en Client Secret.
`);

const apiKey = await ask("API Key: ");
const clientId = await ask("Client ID: ");
const clientSecret = await ask("Client Secret: ");

const authUrl = `${API}/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(REDIRECT)}`;
console.log(`\nOpen deze URL, log in met je Enlighten-account en geef toestemming:\n\n${authUrl}\n`);
const code = await ask("Plak de getoonde autorisatiecode: ");

const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
const tokenRes = await fetch(`${API}/oauth/token?grant_type=authorization_code&redirect_uri=${encodeURIComponent(REDIRECT)}&code=${encodeURIComponent(code)}`, {
  method: "POST",
  headers: { Authorization: `Basic ${basic}` },
});
const token = await tokenRes.json().catch(() => ({}));
if (!tokenRes.ok || !token.access_token) {
  console.error("Token ophalen mislukt:", token);
  process.exit(1);
}

const sysRes = await fetch(`${API}/api/v4/systems?key=${encodeURIComponent(apiKey)}`, {
  headers: { Authorization: `Bearer ${token.access_token}` },
});
const sys = await sysRes.json().catch(() => ({}));
if (!sysRes.ok || !sys.systems?.length) {
  console.error("Systemen ophalen mislukt:", sys);
  process.exit(1);
}

let systemId = sys.systems[0].system_id;
if (sys.systems.length > 1) {
  sys.systems.forEach((s, i) => console.log(`  ${i + 1}. ${s.name} (${s.system_id})`));
  const n = Number(await ask("Welk systeem? nummer: "));
  systemId = sys.systems[n - 1]?.system_id ?? systemId;
}
rl.close();

const vars = {
  ENPHASE_API_KEY: apiKey,
  ENPHASE_CLIENT_ID: clientId,
  ENPHASE_CLIENT_SECRET: clientSecret,
  ENPHASE_SYSTEM_ID: String(systemId),
  ENPHASE_REFRESH_TOKEN: token.refresh_token,
};

let env = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
for (const [k, v] of Object.entries(vars)) {
  const re = new RegExp(`^${k}=.*$`, "m");
  const line = `${k}=${v}`;
  if (re.test(env)) env = env.replace(re, () => line);
  else env += (env && !env.endsWith("\n") ? "\n" : "") + line + "\n";
}
writeFileSync(ENV_FILE, env);
console.log(`\nKlaar: ${Object.keys(vars).length} variabelen opgeslagen in ${ENV_FILE}. Herstart 'npm run dev'.`);
