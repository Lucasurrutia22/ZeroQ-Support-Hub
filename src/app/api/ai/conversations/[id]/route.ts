import { NextResponse } from "next/server";
import { getActingUserOrThrow } from "@/modules/identity/application/get-acting-user";
import { getConversation } from "@/modules/search-ai/application/use-cases/conversations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actingUser = await getActingUserOrThrow().catch(() => null);
  if (!actingUser) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const result = await getConversation(actingUser, id);
  if (!result.ok) {
    const status =
      result.error.code === "forbidden" ? 403 : result.error.code === "not_found" ? 404 : 500;
    return NextResponse.json(
      { error: result.error.code, message: result.error.message },
      { status },
    );
  }

  return NextResponse.json({ conversation: result.value });
}
