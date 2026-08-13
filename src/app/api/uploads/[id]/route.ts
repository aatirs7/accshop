import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { uploads } from "@/lib/db/schema";

export const runtime = "nodejs";

/** Serves an uploaded image from the database by id. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const row = await db.query.uploads.findFirst({ where: eq(uploads.id, id) });
  if (!row) return new Response("Not found", { status: 404 });

  const body = new Uint8Array(row.data);
  return new Response(body, {
    headers: {
      "Content-Type": row.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
