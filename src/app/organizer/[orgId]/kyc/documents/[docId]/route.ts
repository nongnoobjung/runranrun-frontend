import type { NextRequest } from "next/server";
import { proxyFile } from "@/lib/file-proxy";

/** Opens one of the team's KYC documents; the API lets the team's owners and admins through. */
export async function GET(req: NextRequest, ctx: RouteContext<"/organizer/[orgId]/kyc/documents/[docId]">) {
  const { orgId, docId } = await ctx.params;
  return proxyFile(req, `/v1/org/${encodeURIComponent(orgId)}/kyc/documents/${encodeURIComponent(docId)}/file`, `/${orgId}/kyc`);
}
