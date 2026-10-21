import "server-only";
import { NextResponse } from "next/server";
import { getToken } from "./session";

const plain = (message: string, status: number) => new NextResponse(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

/**
 * Streams a private file (a KYC document) from the API. The browser never holds the API token or a direct file URL:
 * this adds the token from the session cookie, the API checks who is asking, and nothing along the way may cache it.
 */
export async function proxyFile(req: Request, apiPath: string, back: string): Promise<NextResponse> {
  const token = await getToken();
  if (!token) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(back)}`, req.url));
  const apiUrl = process.env.API_URL?.replace(/\/$/, "");
  if (!apiUrl) return plain("API_URL is not set", 500);

  let res: Response;
  try {
    res = await fetch(`${apiUrl}${apiPath}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  } catch {
    return plain("ระบบไม่ตอบสนอง ลองใหม่อีกครั้ง", 503);
  }
  if (res.status === 401) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(back)}`, req.url));
  if (!res.ok) return plain(res.status === 403 ? "บทบาทของคุณเปิดเอกสารนี้ไม่ได้" : res.status === 404 ? "ไม่พบเอกสาร" : "เปิดเอกสารไม่สำเร็จ ลองใหม่อีกครั้ง", res.status);

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/octet-stream",
      "content-disposition": res.headers.get("content-disposition") ?? "inline",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
