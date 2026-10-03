#!/usr/bin/env node
// Eenmalig hulpscript om je Enphase-systeem te koppelen aan deze app.
// Doorloopt de OAuth2 authorization_code-flow en print de env-variabelen
// die je in .env.local (lokaal) of je hosting-provider (bv. Vercel) moet
// zetten. Dit script is geschreven op basis van Enphase's publieke
// documentatie en kon niet live getest worden tijdens het bouwen van deze
// app — meld het gerust als een stap niet overeenkomt met wat je ziet.
//
// Voorbereiding (eenmalig, via de browser):
// 1. Maak een gratis developer-account op https://developer-v4.enphase.com
// 2. Maak een "application" aan -> je krijgt een Client ID en Client Secret.
// 3. Abonneer je (gratis "Watt"-plan is voldoende om te starten) -> je
//    krijgt een API Key.
// 4. Zorg dat je zelf (als systeemeigenaar) bent ingelogd op
//    https://enlighten.enphaseenergy.com zodat je zonnepanelensysteem
//    daar gekoppeld is aan je account.
//
// Run dit script met: npm run enphase:setup

import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const TOKEN_URL = "https://api.enphaseenergy.com/oauth/token";
const AUTHORIZE_URL = "https://api.enphaseenergy.com/oauth/authorize";
const API_BASE = "https://api.enphaseenergy.com/api/v4";
// Enphase's eigen "toon de code op het scherm"-redirect, handig voor scripts
// die geen lokale webserver willen opzetten.
const REDIRECT_URI = "https://api.enphaseenergy.com/oauth/redirect_uri";

const rl = readline.createInterface({ input: stdin, output: stdout });

async function ask(question) {
  const answer = await rl.question(question);
  return answer.trim();
}

async function main() {
  console.log("\n=== Enphase-koppeling opzetten ===\n");
  console.log("Zorg dat je al een developer-app + API key hebt aangemaakt op https://developer-v4.enphase.com\n");

  const clientId = await ask("Client ID: ");
  const clientSecret = await ask("Client Secret: ");
  const apiKey = await ask("API Key: ");

  const authorizeUrl = `${AUTHORIZE_URL}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  console.log("\nOpen deze URL in je browser, log in met je Enlighten-account en keur de koppeling goed:\n");
  console.log(`  ${authorizeUrl}\n`);
  console.log("Na goedkeuren toont Enphase een pagina met een korte code. Kopieer die hieronder.\n");

  const code = await ask("Code: ");

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", redirect_uri: REDIRECT_URI, code }),
  });

  if (!tokenRes.ok) {
    console.error(`\nFout bij ophalen tokens: HTTP ${tokenRes.status}`);
    console.error(await tokenRes.text());
    process.exitCode = 1;
    rl.close();
    return;
  }

  const tokenBody = await tokenRes.json();
  const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = tokenBody;

  if (!accessToken || !refreshToken) {
    console.error("\nOnverwacht antwoord van Enphase (geen access_token/refresh_token):");
    console.error(JSON.stringify(tokenBody, null, 2));
    process.exitCode = 1;
    rl.close();
    return;
  }

  console.log(`\nTokens ontvangen (access_token geldig ${Math.round((expiresIn ?? 3600) / 60)} min, refresh_token meestal ~1 maand).`);

  let systemId = "";
  try {
    const systemsRes = await fetch(`${API_BASE}/systems?key=${encodeURIComponent(apiKey)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (systemsRes.ok) {
      const systemsBody = await systemsRes.json();
      const systems = systemsBody?.systems ?? systemsBody?.items ?? [];
      if (Array.isArray(systems) && systems.length > 0) {
        console.log("\nGevonden systemen:");
        for (const s of systems) {
          console.log(`  - system_id: ${s.system_id ?? s.id}  (${s.name ?? "naam onbekend"})`);
        }
        systemId = String(systems[0].system_id ?? systems[0].id ?? "");
      } else {
        console.log("\nGeen systemen gevonden via /systems — vul system_id handmatig in (te vinden in de Enlighten-app onder Systeeminstellingen).");
      }
    } else {
      console.log(`\nKon /systems niet ophalen (HTTP ${systemsRes.status}) — vul system_id handmatig in.`);
    }
  } catch (err) {
    console.log(`\nKon /systems niet ophalen (${err instanceof Error ? err.message : err}) — vul system_id handmatig in.`);
  }

  console.log("\n=== Zet deze variabelen in .env.local (lokaal) of je hosting-provider ===\n");
  console.log(`ENPHASE_CLIENT_ID=${clientId}`);
  console.log(`ENPHASE_CLIENT_SECRET=${clientSecret}`);
  console.log(`ENPHASE_API_KEY=${apiKey}`);
  console.log(`ENPHASE_REFRESH_TOKEN=${refreshToken}`);
  console.log(`ENPHASE_SYSTEM_ID=${systemId || "<vul hier je system_id in>"}`);
  console.log("\nHet refresh_token is geldig voor ongeveer een maand. Als de zonnepanelen-sectie na verloop van tijd weer 'niet gekoppeld' meldt, draai dit script opnieuw.\n");

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
  rl.close();
});
