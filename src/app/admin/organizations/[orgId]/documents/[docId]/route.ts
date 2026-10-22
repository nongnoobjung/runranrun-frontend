import type { NextRequest } from "next/server";
import { proxyFile } from "@/lib/file-proxy";

/** Opens an organiser's KYC document for platform staff. */
export async function GET(req: NextRequest, ctx: RouteContext<"/admin/organizations/[orgId]/documents/[docId]">) {
  const { orgId, docId } = await ctx.params;
  return proxyFile(req, `/v1/admin/organizations/${encodeURIComponent(orgId)}/documents/${encodeURIComponent(docId)}/file`, `/organizations/${orgId}`);
}
