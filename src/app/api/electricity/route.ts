import { fetchElectricityPrices } from "@/lib/energyzero";

export const revalidate = 300;

export async function GET() {
  const now = new Date();
  const start = new Date(now.getTime() - 26 * 3600 * 1000);
  const end = new Date(now.getTime() + 50 * 3600 * 1000);

  try {
    const points = await fetchElectricityPrices(start, end);
    return Response.json({
      points,
      source: "EnergyZero (EPEX Day Ahead)",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout bij ophalen stroomprijzen.";
    return Response.json({ error: message }, { status: 502 });
  }
}
