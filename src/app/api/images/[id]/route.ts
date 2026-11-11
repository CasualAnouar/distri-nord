import { getProductImage } from "@/lib/server/data";

// Serves a photo uploaded from the dashboard. Firestore keeps it as a data URL; sending it once
// as a real image (cached for a year, its URL changes with the photo) keeps pages small.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await getProductImage(decodeURIComponent(id));
  const match = image?.match(/^data:(image\/[\w+.-]+);base64,(.+)$/s);
  if (!match) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
