import { proxyPublicFile } from "@/lib/file-proxy";

/** Public event images (cover, gallery, pictures in the description, route maps), for anyone. */
export async function GET(_req: Request, ctx: RouteContext<"/media/event-images/[file]">) {
  const { file } = await ctx.params;
  return proxyPublicFile(`/v1/media/event-images/${encodeURIComponent(file)}`);
}
