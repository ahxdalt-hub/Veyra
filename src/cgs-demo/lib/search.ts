/**
 * Global search across the local workspace.
 *
 * One deterministic pass over every record type, ranked by field
 * relevance. The command palette renders the results; nothing is indexed
 * remotely because nothing leaves the machine.
 */

import { AppData } from "@/cgs-demo/lib/stages";
import { stage2 } from "@/cgs-demo/lib/workflow";
import { stage3 } from "@/cgs-demo/lib/delivery";

export interface SearchResult {
  id: string;
  /** Entity kind label shown beside the result — "Prospect", "Client", … */
  kind: string;
  title: string;
  subtitle: string;
  /** Route to navigate to, including the ?id= deep link where supported. */
  href: string;
  score: number;
}

const norm = (s: string) => s.trim().toLowerCase();

export function searchWorkspace(data: AppData, query: string, limit = 12): SearchResult[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const s2 = stage2(data);
  const s3 = stage3(data);
  const out: SearchResult[] = [];

  const push = (
    score: number,
    r: Omit<SearchResult, "score">,
  ) => {
    if (score > 0) out.push({ ...r, score });
  };
  /** title match weighs most; every other haystack line is worth less. */
  const rank = (title: string, fields: [string, string][]) => {
    const t = norm(title);
    if (!t) return 0;
    let score = t.startsWith(q) ? 100 : t.includes(q) ? 80 : 0;
    for (const [label, value] of fields) {
      const v = norm(value);
      if (v && v.includes(q)) score += norm(label) === q ? 40 : 20;
    }
    return score;
  };

  /* ACQUIRE — outreach prospects */
  for (const o of s2.outreach) {
    const score = rank(`${o.person} ${o.company}`.trim(), [
      ["person", o.person],
      ["company", o.company],
      ["channel", o.channel],
      ["notes", o.notes],
    ]);
    push(score, {
      id: `outreach-${o.id}`,
      kind: "Prospect",
      title: o.person || o.company,
      subtitle: [o.company, o.channel].filter(Boolean).join(" · "),
      href: `/acquire/outreach?id=${o.id}`,
    });
  }

  /* SELL — opportunities and proposals */
  for (const o of s2.opportunities) {
    const score = rank(o.company || o.prospect, [
      ["prospect", o.prospect],
      ["company", o.company],
      ["offer", o.offerRef],
      ["next action", o.nextAction],
      ["notes", o.notes],
    ]);
    push(score, {
      id: `opportunity-${o.id}`,
      kind: "Opportunity",
      title: o.company || o.prospect,
      subtitle: [o.prospect, o.outcome === "open" ? o.stage : o.outcome].filter(Boolean).join(" · "),
      href: `/sell/opportunities?id=${o.id}`,
    });
  }
  for (const p of s2.proposals) {
    const score = rank(p.company || p.client, [
      ["client", p.client],
      ["company", p.company],
      ["solution", p.solution],
      ["problem", p.problem],
    ]);
    push(score, {
      id: `proposal-${p.id}`,
      kind: "Proposal",
      title: p.company || p.client,
      subtitle: [p.client, p.status].filter(Boolean).join(" · "),
      href: `/sell/proposals?id=${p.id}`,
    });
  }

  /* DELIVER — onboarding records */
  for (const ob of s3.onboardings) {
    const score = rank(ob.company || ob.contact, [
      ["contact", ob.contact],
      ["company", ob.company],
      ["template", ob.templateName],
      ["notes", ob.notes],
      ...ob.tasks.map((t): [string, string] => ["task", t.title]),
    ]);
    push(score, {
      id: `onboarding-${ob.id}`,
      kind: "Onboarding",
      title: ob.company || ob.contact,
      subtitle: [ob.templateName, ob.status].filter(Boolean).join(" · "),
      href: `/deliver/onboarding?id=${ob.id}`,
    });
  }

  /* RETAIN — clients */
  for (const c of s3.clients) {
    const score = rank(c.company || c.contact, [
      ["contact", c.contact],
      ["company", c.company],
      ["offer", c.offerRef],
      ["recent work", c.recentWork],
      ["needs", c.upcomingNeeds],
      ["notes", c.relationshipNotes],
    ]);
    push(score, {
      id: `client-${c.id}`,
      kind: "Client",
      title: c.company || c.contact,
      subtitle: [c.contact, c.status].filter(Boolean).join(" · "),
      href: `/retain/clients?id=${c.id}`,
    });
  }

  /* GROW — growth reviews */
  for (const g of s3.growthReviews) {
    const score = rank(g.label, [
      ["label", g.label],
      ["worked", g.whatWorked],
      ["priorities", g.priorities],
    ]);
    push(score, {
      id: `growth-${g.id}`,
      kind: "Growth review",
      title: g.label || `${g.period} review`,
      subtitle: `${g.startDate} → ${g.endDate}`,
      href: `/grow/reviews?id=${g.id}`,
    });
  }

  /* BUILD modules match by their stored content, linking to the editor */
  for (const [modId, m] of Object.entries(data.modules)) {
    for (const [key, value] of Object.entries(m.fields)) {
      if (typeof value === "string" && norm(value).includes(q)) {
        push(30, {
          id: `build-${modId}`,
          kind: "Build",
          title: value.trim().slice(0, 60),
          subtitle: `Build · ${modId} — ${key}`,
          href: `/build/${modId}`,
        });
        break; // one hit per module is enough
      }
    }
  }

  const seen = new Set<string>();
  return out
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .filter((r) => {
      const key = `${r.kind}:${r.href}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
