import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getCustomerDetail } from "@/lib/admin/data";
import { insertAuditEvent } from "@/lib/admin/notifications";

/**
 * GET /admin/api/customers?email=… — the customer detail projection for
 * the admin drawer. Session-guarded; email is the customer business key
 * (validated server-side by the data layer).
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const email = new URL(request.url).searchParams.get("email") ?? "";
  if (!email || email.length > 254) {
    return NextResponse.json({ error: "Invalid customer key." }, { status: 422 });
  }
  try {
    const detail = await getCustomerDetail(email);
    if (!detail) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    await insertAuditEvent("customer.view", {
      entity: "customer",
      entityId: detail.customer.key,
    });
    return NextResponse.json({ detail });
  } catch (err) {
    console.error("[admin-api] customer detail failed:", err);
    return NextResponse.json(
      { error: "Could not load the customer." },
      { status: 502 }
    );
  }
}
