// Public build marker. Reports which git commit the LIVE Worker is running,
// so `npm run deploy` can prove the deploy actually shipped HEAD (see
// scripts/deploy.mjs -> verifyLiveDeploy). A green "Deployed veyra" log line is
// not proof: a deploy once succeeded while shipping code from five minutes
// before the commit it was blamed on, which read as a phantom cache bug.
//
// The commit SHA is baked in at build time via NEXT_PUBLIC_BUILD_COMMIT.
// Exposing a short SHA is not sensitive; it is a version marker only.

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    service: "veyra",
    commit: process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "unknown",
  });
}
