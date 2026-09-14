import { fetchGasPrices } from "@/lib/easyenergy";

export const revalidate = 300;

export async function GET() {
  const now = new Date();
  const start = new Date(now.getTime() - 8 * 24 * 3600 * 1000);
  const end = new Date(now.getTime() + 2 * 24 * 3600 * 1000);

  try {
    const points = await fetchGasPrices(start, end);
    return Response.json({
      points,
      source: "easyEnergy LEBA (EEX gas day-ahead)",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout bij ophalen gasprijzen.";
    return Response.json({ error: message }, { status: 502 });
  }
}
