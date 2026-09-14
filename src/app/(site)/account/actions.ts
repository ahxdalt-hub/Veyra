"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import {
  supabaseAdminConfigured,
  supabaseAuthConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import { claimPurchasesForUser } from "@/lib/fulfillment";
import { getProduct } from "@/lib/products";
import { USERNAME_RE } from "@/lib/username";

/**
 * Account server actions. All ownership checks run server-side: actions
 * resolve the user from the session cookie (never from client input),
 * and every query goes through the session client so RLS is the
 * enforcement layer.
 */

/* ------------------------------------------------------------------ */
/* Sign in — email OR username                                         */
/* ------------------------------------------------------------------ */

/** Same format the database enforces (profiles_username_format). */
export type SignInState = { error?: string };

/**
 * Password sign-in with either an email address or a username.
 *
 * The username → email resolution happens here with the service-role
 * key, never in the browser: no client can fish emails out of the
 * profiles table, and the password is verified by Supabase Auth
 * immediately after, so the lookup alone grants nothing. Every failure
 * returns the same generic message to avoid account enumeration.
 */
export async function signInWithPasswordAction(
  identifier: string,
  password: string
): Promise<SignInState> {
  if (!supabaseAuthConfigured()) {
    return { error: "Customer accounts aren't enabled on this deployment." };
  }
  const trimmed = identifier.trim();
  if (!trimmed || !password) {
    return { error: "Enter your email or username and your password." };
  }

  let email = trimmed.toLowerCase();

  if (!email.includes("@")) {
    if (!USERNAME_RE.test(email)) {
      return {
        error:
          "That email and password don't match an account. Please try again.",
      };
    }
    if (!supabaseAdminConfigured()) {
      return {
        error:
          "Signing in with a username isn't available right now — please use your email address.",
      };
    }
    const admin = createClient(supabaseUrl()!, supabaseServiceRoleKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("username", email)
      .maybeSingle();
    if (!profile) {
      return {
        error:
          "That username and password don't match an account. Please try again.",
      };
    }
    const { data: authUser, error: userError } =
      await admin.auth.admin.getUserById(profile.id);
    if (userError || !authUser.user?.email) {
      console.error(
        "[account] username lookup failed:",
        userError?.message ?? "no email on user"
      );
      return { error: "Something went wrong. Please try again." };
    }
    email = authUser.user.email;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user?.email) {
    const message = (error?.message ?? "").toLowerCase();
    if (message.includes("confirm")) {
      return {
        error:
          "Please confirm your email first — check your inbox for the confirmation link.",
      };
    }
    return {
      error:
        "That email and password don't match an account. Please try again.",
    };
  }

  // Session cookies are set by the SSR client above; claim any guest
  // purchases keyed to this verified email while we're here.
  await claimPurchasesForUser(data.user.id, data.user.email);
  for (const path of [
    "/account",
    "/account/orders",
    "/account/library",
    "/account/licences",
  ]) {
    revalidatePath(path);
  }
  return {};
}

export async function signOutAction() {
  if (supabaseAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

/** Link any guest purchases to the signed-in account (verified email). */
export async function claimPurchasesAction() {
  const user = await getSessionUser();
  if (!user?.email) return;
  await claimPurchasesForUser(user.id, user.email);
  for (const path of [
    "/account",
    "/account/orders",
    "/account/library",
    "/account/licences",
  ]) {
    revalidatePath(path);
  }
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export type ProfileFormState = { saved?: boolean; error?: string };

const NAME_MAX = 120;

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();

  if (fullName.length > NAME_MAX || businessName.length > NAME_MAX) {
    return { error: `Names must be ${NAME_MAX} characters or fewer.` };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      business_name: businessName || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("[account] profile update failed:", error);
    return { error: "We couldn't save your details. Please try again." };
  }

  revalidatePath("/account");
  revalidatePath("/account/settings");
  return { saved: true };
}

/* ------------------------------------------------------------------ */
/* Password                                                            */
/* ------------------------------------------------------------------ */

export type PasswordFormState = { saved?: boolean; error?: string };

const MIN_PASSWORD = 8;

export async function updatePasswordAction(
  _prev: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD) {
    return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
  }
  if (password !== confirm) {
    return { error: "The two passwords don't match." };
  }

  const supabase = await createSupabaseServerClient();
  // Runs against the session's own credentials — a user can only ever
  // update their own password.
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[account] password update failed:", error.message);
    return {
      error: "We couldn't update your password. Please try again.",
    };
  }
  return { saved: true };
}

/* ------------------------------------------------------------------ */
/* Seat management                                                     */
/* ------------------------------------------------------------------ */

export type SeatState = { message?: string; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SEAT_EMAIL_MAX = 254;

/**
 * Invite a team member to one of the purchased seats. Ownership and the
 * seat ceiling are enforced twice: here (read the caller's entitlement,
 * count assignments) and by RLS on the insert itself — a tampered
 * request can never seat more users than were purchased.
 */
export async function inviteSeatAction(
  entitlementId: string,
  rawEmail: string
): Promise<SeatState> {
  if (!UUID_RE.test(entitlementId)) {
    return { error: "That request couldn't be validated. Please try again." };
  }
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  const email = rawEmail.trim().toLowerCase();
  if (!email.includes("@") || email.length > SEAT_EMAIL_MAX || !EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address for the seat." };
  }

  const supabase = await createSupabaseServerClient();

  // RLS scopes this read to the caller's own entitlements.
  const { data: entitlement } = await supabase
    .from("entitlements")
    .select("id, seats, email, status")
    .eq("id", entitlementId)
    .maybeSingle();

  if (!entitlement || entitlement.status !== "active") {
    return { error: "We couldn't find that product in your library." };
  }

  const { data: assignments } = await supabase
    .from("seat_assignments")
    .select("seat_number, email")
    .eq("entitlement_id", entitlement.id);

  const taken = (assignments ?? []).filter((a) => a.seat_number !== null).length;
  if (taken >= entitlement.seats) {
    return {
      error: `All ${entitlement.seats} seats are in use. Deactivate a seat or purchase another seat to invite more users.`,
    };
  }

  if ((assignments ?? []).some((a) => a.email === email)) {
    return { error: "That email already holds a seat on this licence." };
  }

  // Next free seat number — the unique constraint and RLS make an
  // over-ceiling insert impossible even under a race.
  const used = new Set((assignments ?? []).map((a) => a.seat_number));
  let seatNumber = 1;
  while (used.has(seatNumber)) seatNumber += 1;

  const { error } = await supabase.from("seat_assignments").insert({
    entitlement_id: entitlement.id,
    seat_number: seatNumber,
    email,
    status: "invited",
  });

  if (error) {
    console.error("[account] seat invite failed:", error);
    return { error: "We couldn't assign that seat. Please try again." };
  }

  revalidatePath("/account/licences");
  revalidatePath("/account/library");
  return {
    message: `Seat ${seatNumber} assigned to ${email}. They appear as Active once they sign in with that address.`,
  };
}

/**
 * Deactivate a seat — releasing it back to the pool so it can be given
 * to someone else. The purchaser's own seat (seat 1) stays: it is the
 * licence anchor and can't be released while the licence is active.
 */
export async function deactivateSeatAction(
  assignmentId: string
): Promise<SeatState> {
  if (!UUID_RE.test(assignmentId)) {
    return { error: "That request couldn't be validated. Please try again." };
  }
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  const supabase = await createSupabaseServerClient();

  // RLS: only rows on the caller's entitlements are visible.
  const { data: assignment } = await supabase
    .from("seat_assignments")
    .select("id, seat_number, email, entitlement_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) {
    return { error: "We couldn't find that seat on your licence." };
  }

  // The entitlement is reachable separately (RLS-scoped again).
  const { data: entitlement } = await supabase
    .from("entitlements")
    .select("email, status")
    .eq("id", assignment.entitlement_id)
    .maybeSingle();

  if (!entitlement || entitlement.status !== "active") {
    return { error: "We couldn't find that seat on your licence." };
  }
  if (assignment.seat_number === 1 && assignment.email === entitlement.email) {
    return {
      error:
        "Your own seat stays active while the licence is active — it's the licence anchor.",
    };
  }

  const { error } = await supabase
    .from("seat_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    console.error("[account] seat deactivate failed:", error);
    return { error: "We couldn't release that seat. Please try again." };
  }

  revalidatePath("/account/licences");
  revalidatePath("/account/library");
  return { message: "Seat released — it's available to assign again." };
}

/**
 * Reassign a seat to a different email. The seat stays occupied; only
 * the person using it changes. The invited user becomes Active when
 * they sign in with the new address.
 */
export async function reassignSeatAction(
  assignmentId: string,
  rawEmail: string
): Promise<SeatState> {
  if (!UUID_RE.test(assignmentId)) {
    return { error: "That request couldn't be validated. Please try again." };
  }
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > SEAT_EMAIL_MAX) {
    return { error: "Enter a valid email address for the seat." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: assignment } = await supabase
    .from("seat_assignments")
    .select("id, seat_number, email, entitlement_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) {
    return { error: "We couldn't find that seat on your licence." };
  }

  // Duplicate guard — one seat per email on a licence.
  const { data: siblings } = await supabase
    .from("seat_assignments")
    .select("id, email")
    .eq("entitlement_id", assignment.entitlement_id);
  if ((siblings ?? []).some((s) => s.email === email && s.id !== assignmentId)) {
    return { error: "That email already holds a seat on this licence." };
  }

  const { error } = await supabase
    .from("seat_assignments")
    .update({ email, status: "invited", user_id: null, updated_at: new Date().toISOString() })
    .eq("id", assignmentId);

  if (error) {
    console.error("[account] seat reassign failed:", error);
    return { error: "We couldn't reassign that seat. Please try again." };
  }

  revalidatePath("/account/licences");
  revalidatePath("/account/library");
  return {
    message: `Seat ${assignment.seat_number} reassigned to ${email}. They appear as Active once they sign in with that address.`,
  };
}

export type RedeliveryState = { message?: string; error?: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requestRedeliveryAction(
  entitlementId: string
): Promise<RedeliveryState> {
  if (!UUID_RE.test(entitlementId)) {
    return { error: "That request couldn't be validated. Please try again." };
  }
  const user = await getSessionUser();
  if (!user?.email) {
    return { error: "Your session expired — please sign in again." };
  }

  const supabase = await createSupabaseServerClient();

  // RLS guarantees this read returns only the caller's entitlements;
  // the explicit .eq("id") scopes it to the requested one.
  const { data: entitlement } = await supabase
    .from("entitlements")
    .select("id, product_slug, status")
    .eq("id", entitlementId)
    .maybeSingle();

  if (!entitlement || entitlement.status !== "active") {
    return {
      error: "We couldn't find that product in your library.",
    };
  }

  const product = getProduct(entitlement.product_slug);
  const version = product?.version ?? null;
  const productName = product?.name ?? entitlement.product_slug;

  // Gentle throttle: one request per entitlement per day.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("redelivery_requests")
    .select("id")
    .eq("entitlement_id", entitlement.id)
    .gt("created_at", since)
    .limit(1)
    .maybeSingle();

  if (recent) {
    return {
      message:
        "You've already requested this recently — it's being handled. Nothing more to do right now.",
    };
  }

  const { error } = await supabase.from("redelivery_requests").insert({
    user_id: user.id,
    entitlement_id: entitlement.id,
    product_slug: entitlement.product_slug,
    product_version: version,
  });

  if (error) {
    console.error("[account] re-delivery request failed:", error);
    return {
      error: "We couldn't record your request. Please try again shortly.",
    };
  }

  return {
    message: version
      ? `Request received — version ${version} of ${productName} will be delivered to ${user.email}.`
      : `Request received — ${productName} will be delivered to ${user.email}.`,
  };
}
