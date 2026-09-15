# Energieprijs Monitor

Webapp die realtime inzicht geeft in de Nederlandse dynamische **day-ahead**
stroom- en gastarieven, en laat zien wanneer stroom en gas het goedkoopst
zijn.

## Databron

De app haalt de kale groothandelsmarktprijzen op bij de gratis, publieke
(ongeautoriseerde) API van EnergyZero:

- **Stroom**: `usageType=1` — EPEX Day Ahead, per uur, in €/kWh.
- **Gas**: `usageType=3` — day-ahead, per dag, in €/m³.

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

- **Huidige stroomprijs** (huidig uur), incl. vergelijking met het
  daggemiddelde ("voordelig" / "gemiddeld" / "duur").
- **Uurgrafiek stroom** voor vandaag en (zodra gepubliceerd, doorgaans vanaf
  ~15:00 uur) morgen, met kleurgradiënt goedkoop→duur en het huidige uur
  gemarkeerd.
- **Goedkoopste aaneengesloten periode** van 1–8 uur (instelbaar), handig om
  bv. de wasmachine, EV-lader of warmtepomp te plannen.
- **Gasprijs** van vandaag plus een historische grafiek (afgelopen dagen +
  eerstvolgende dag), met de goedkoopste dag gemarkeerd.
- Automatische verversing elke 5 minuten, plus een handmatige
  ververs-knop.
- Instellingen (opslag/BTW) worden lokaal in je browser opgeslagen
  (`localStorage`) — er wordt niets naar een server verstuurd.

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
- `src/app/api/electricity/route.ts`, `src/app/api/gas/route.ts` —
  API-routes die als proxy dienen (voorkomt CORS-problemen in de browser en
  cachen de respons 5 minuten).
- `src/lib/priceUtils.ts` — tijdzone-bewuste (Europe/Amsterdam)
  berekeningen: huidig prijspunt, goedkoopste/duurste moment, goedkoopste
  aaneengesloten blok, BTW/opslag-toepassing.
- `src/lib/usePrices.ts`, `src/lib/useSettings.ts` — client-side hooks voor
  data ophalen/verversen en persoonlijke instellingen.
- `src/components/*` — dashboardonderdelen (kaarten, grafieken,
  instellingenpaneel).

## Deployen

De app is een standaard Next.js-project en kan zonder aanpassingen op
bijvoorbeeld [Vercel](https://vercel.com/new) gezet worden.
