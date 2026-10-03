# Energieprijs Monitor

Webapp die realtime inzicht geeft in de Nederlandse dynamische **day-ahead**
stroom- en gastarieven, en laat zien wanneer stroom en gas het goedkoopst
zijn.

## Databron

De app haalt de kale groothandelsmarktprijzen op bij de gratis, publieke
(ongeautoriseerde) API van EnergyZero:

- **Stroom**: `usageType=1`, `interval=3` — EPEX Day Ahead, per kwartier (96 prijzen/dag, de marktstandaard sinds 1 januari 2026), in €/kWh.
- **Gas**: `usageType=3`, `interval=4` — day-ahead, per dag, in €/m³ (gas kent geen kwartierprijzen).

Dit zijn dezelfde marktprijzen waar leveranciers zoals Vattenfall (o.a. bij
FlexPrijs/dynamische contracten) hun inkoop op baseren. De opgehaalde prijs
is **excl. BTW, energiebelasting en leveranciersopslag**. In het paneel
"Instellingen" op de dashboardpagina kun je zelf jouw opslag (€/kWh en
€/m³, excl. BTW) en het BTW-percentage invullen, gebaseerd op je eigen
contract of jaarnota — de app vult hier bewust niets automatisch voor in,
om geen onjuiste tarieven te suggereren.

> Let op: dit is geen officiële/gedocumenteerde API en geen dienst van of
> advies namens Vattenfall of een andere leverancier. De app dient ter
> indicatie van marktontwikkelingen; controleer altijd je eigen contract en
> jaarafrekening voor de tarieven die daadwerkelijk voor jou gelden.
>
> Deze app gebruikte oorspronkelijk de publieke tarieven-API van easyEnergy,
> maar die is sinds mei 2026 volledig uit de lucht (easyEnergy is
> overgestapt op een mobiele app en biedt geen open API meer aan). De app
> is daarom overgezet op de publieke API van EnergyZero
> (`src/lib/energyzero.ts`), die dezelfde soort day-ahead data levert.

## Functionaliteit

- **Huidige stroomprijs** (huidig kwartier), incl. vergelijking met het
  daggemiddelde ("voordelig" / "gemiddeld" / "duur").
- **Kwartiergrafiek stroom** voor vandaag en (zodra gepubliceerd, doorgaans
  vanaf ~15:00 uur) morgen, met kleurgradiënt goedkoop→duur en het huidige
  kwartier gemarkeerd.
- **Prijzentabel** met alle kwartierprijzen van de dag, sorteerbaar op tijd
  of op prijs (laag → hoog).
- **Goedkoopste aaneengesloten periode** van 15 minuten tot 8 uur
  (instelbaar), handig om bv. de wasmachine, EV-lader of warmtepomp te
  plannen.
- **Gasprijs** van vandaag plus een historische grafiek (afgelopen dagen +
  eerstvolgende dag), met de goedkoopste dag gemarkeerd. Gas kent geen
  kwartierprijzen en blijft daarom per dag.
- Automatische verversing elke 5 minuten, plus een handmatige
  ververs-knop.
- **Zonnepanelen** (optioneel, Enphase): huidig vermogen, opwek vandaag en
  een kwartiergrafiek met "zelfvoorzienende" kwartieren gemarkeerd — zie
  "Zonnepanelen (Enphase)" hieronder.
- Instellingen (opslag/BTW) worden lokaal in je browser opgeslagen
  (`localStorage`) — er wordt niets naar een server verstuurd.

## Zonnepanelen (Enphase)

Optioneel: koppel je Enphase-zonnepanelen om naast de prijzen ook je opwek te
zien, en te zien welke kwartieren je opwek je geschatte huisverbruik dekt
("zelfvoorzienend" — zie hieronder voor de beperking hiervan).

> Deze koppeling is geschreven op basis van Enphase's publieke documentatie
> en kon niet live getest worden in de omgeving waarin deze app gebouwd is
> (geen netwerktoegang tot Enphase vanuit die sandbox). Test de koppeling na
> het invullen van de env-variabelen; meld het als een stap niet klopt.

### Setup

1. Maak een gratis developer-account op <https://developer-v4.enphase.com>.
2. Maak daar een "application" aan → je krijgt een **Client ID** en **Client
   Secret**.
3. Abonneer je op een plan (het gratis **Watt**-plan is voldoende om te
   starten, maar heeft een beperkt aantal API-calls per maand — zie
   "Beperkingen" hieronder) → je krijgt een **API Key**.
4. Zorg dat jouw zonnepanelensysteem gekoppeld is aan je account op
   <https://enlighten.enphaseenergy.com> (zo niet, dan heb je geen systemen
   om te koppelen).
5. Run het meegeleverde hulpscript, dat je door de eenmalige
   OAuth-koppeling leidt:

   ```bash
   npm run enphase:setup
   ```

   Dit script vraagt je Client ID/Secret/API Key, laat je inloggen bij
   Enphase in de browser en ruilt de autorisatiecode om voor tokens. Het
   print aan het eind de env-variabelen die je moet instellen.

6. Zet die variabelen in `.env.local` (lokaal — zie `.env.local.example`)
   of bij je hosting-provider (bv. Vercel → Project Settings →
   Environment Variables), en herstart de app.

### Beperkingen

- **Alleen opwek, geen verbruik**: dit systeem meet alleen wat je panelen
  opwekken, niet je werkelijke huisverbruik. "Zelfvoorzienend" is daarom een
  schatting: kwartieren waarin je opwek minstens het **geschatte
  huisverbruik** haalt dat je zelf instelt bij Instellingen (standaard
  400 W) — geen meting van je daadwerkelijke verbruik.
- **refresh_token verloopt** (doorgaans na ~1 maand): als de
  zonnepanelen-sectie na een tijdje weer "niet gekoppeld" toont, draai
  `npm run enphase:setup` opnieuw en werk `ENPHASE_REFRESH_TOKEN` bij. Er is
  geen database om een automatisch vernieuwd refresh_token blijvend op te
  slaan.
- **Rate limits**: het gratis Watt-plan heeft een beperkt aantal calls per
  maand. De app vraagt daarom maar elke 15 minuten nieuwe data op
  (i.p.v. de 5 minuten van de prijzen-API's). Verhoog dit niet zonder je
  Enphase-abonnement te checken.

## Starten

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Productie build

```bash
npm run build
npm run start
```

## Architectuur

- `src/lib/energyzero.ts` — server-side fetch + normalisatie van de
  EnergyZero-tarieven.
- `src/lib/enphase.ts` — server-side OAuth-tokenbeheer + fetch van
  Enphase-productietelemetrie.
- `src/app/api/electricity/route.ts`, `src/app/api/gas/route.ts`,
  `src/app/api/solar/route.ts` — API-routes die als proxy dienen (voorkomt
  CORS-problemen in de browser en cachen de respons).
- `src/lib/priceUtils.ts` — tijdzone-bewuste (Europe/Amsterdam)
  berekeningen: huidig prijspunt, goedkoopste/duurste moment, goedkoopste
  aaneengesloten blok, BTW/opslag-toepassing. Generiek over elk puntentype
  met een `timestamp`-veld, dus ook bruikbaar voor de zonnepanelendata.
- `src/lib/usePrices.ts`, `src/lib/useSolarData.ts`, `src/lib/useSettings.ts`
  — client-side hooks voor data ophalen/verversen en persoonlijke
  instellingen.
- `src/components/*` — dashboardonderdelen (kaarten, grafieken,
  instellingenpaneel).
- `scripts/enphase-setup.mjs` — eenmalig CLI-hulpscript voor de
  OAuth-koppeling met Enphase.

## Deployen

De app is een standaard Next.js-project en kan zonder aanpassingen op
bijvoorbeeld [Vercel](https://vercel.com/new) gezet worden.
