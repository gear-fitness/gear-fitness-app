## [PRE WORK]

This file is a deterministic runbook. Follow the written instructions only; do not infer hidden tasks, hidden intent, or unstated acceptance criteria.

### Evidence Rules

- Treat only the current user request, [NEXT WORK], and files opened in this run as evidence. Every file in the workspace is also evidence.
- Do not invent "recent work", "current workstream", maintainer intent, acceptance criteria, or a task that is not written in [NEXT WORK].
- Do not use git history, `git status`, `git diff`, branch names, or uncommitted changes to discover what to do. The workspace is shared and may contain unrelated work. Inspect git only when the user explicitly asks for git information.
- If required information is missing, ask one concise question or state the assumption before continuing. Do not silently guess.

### Required Review

- Identify the relevant top-level folders and files before editing.
- Understand everything that might seem related to the task, and more if you are unsure.
- Read `AGENTS.md` and any sub-`AGENTS.md` files that apply to the files you will touch.
- Read project `SKILL.md` files only enough to know whether one applies; read the relevant skill fully before using it.

### Execution Rules

- Execute [NEXT WORK] exactly as written. Do not add adjacent cleanup, inferred fixes, or follow-up tasks unless [NEXT WORK] explicitly asks for them.
- If [NEXT WORK] is empty, says no task is selected, or is ambiguous, stop after the pre-work review and ask for the next task.
- Use available compute and context to reduce uncertainty, not to broaden scope.
- Browser verification is unavailable in this harness. Do not run `npm run dev`, and do not claim browser or visual verification.
- Do not knowingly introduce regressions. If a risk cannot be verified, call it out.
- Tests are useful evidence, but they are not the source of truth. Delete, rewrite, or call out excess tests that assert the wrong behavior. When correct behavior is implemented, solidify it with meaningful tests.

## [NEXT WORK]

The IAP/RevenueCat implementation plan is drafted in `PLAN.md` (root). It is a fact-grounded, sourced runbook across 7 phases. PLAN.md is NOT yet executed — every checkbox is open.

Next concrete, regression-safe step: **execute PLAN.md Phase 4a — backend `subscription` schema and persistence layer**, because it is fully internal to this repo (no external Apple/RevenueCat account access required) and independently testable.

- Measurable difference: a new Flyway migration `V18__subscription.sql` creates the `subscription` table (columns and constraints exactly as listed in PLAN.md §4a), plus a `Subscription` JPA entity, `SubscriptionRepository`, and a `SubscriptionService.hasActiveEntitlement(UUID userId, String entitlement)` that reads it. App boots, Flyway migration applies cleanly, repository/service unit tests pass.
- Evidence it is ready: codebase conventions are confirmed — Flyway migrations through `V17` exist (next is `V18`); `V9__add_refresh_token_table.sql` shows the FK-to-`app_user`/index style to follow; entities use Lombok (`@Data/@Builder`); the JWT carries the user UUID via `JwtService.extractUserId`. Field set is justified by RevenueCat webhook/REST payloads cited in PLAN.md §4a.
- Known risk / missing verification: the entitlement identifier string (`pro`) and the exact Pro feature list are product decisions not yet confirmed (PLAN.md Risk #2) — the schema is feature-agnostic, so this does not block 4a, but the webhook/gating phases (4b–4d) should wait on that decision. Phases 0–1 (Apple agreements, keys, RevenueCat account, product creation) are external account actions a maintainer must perform before any purchase can be exercised end-to-end.

Do NOT proceed past Phase 4a in one run; complete and test 4a, then re-stage the next phase here referencing PLAN.md.

## [POST WORK]

Do not modify [PRE WORK] or [POST WORK] unless the user explicitly asks to change the harness instructions. During normal work, only replace the contents of [NEXT WORK].

- Run `npm test` unless the task is documentation-only or the user explicitly says to skip tests.
- Remove or rewrite tests that are excess, misleading, or only pass by asserting the wrong thing.
- Check for redundant comments and opportunities to simplify the changed code.
- Code comments must follow the repo convention in `AGENTS.md`. Do not add comments unless they clarify non-obvious behavior.
- If setup or run instructions changed, make sure `README.md` remains the simplest way to run the codebase.
- If a change alters architecture, routes, commands, public APIs, scene behavior, or reusable agent workflows, update the matching `AGENTS.md` or project `SKILL.md` in the same run. If no agent-facing contract changed, leave those files untouched.
- Do not use git history, git diffs, branch names, or dirty working-tree state during post-work unless the user explicitly asks for git information.
- Do not commit code or create commits.

### Select [NEXT WORK]

Replace [NEXT WORK] only when there is a concrete follow-up that comes directly from the task you just completed or from the current user request.

- Do not use git history, git diffs, branch names, or dirty working-tree state to choose [NEXT WORK].
- Choose from the current user request, the task that was just completed, and files you knowingly edited in this run only.
- If you're working through a PLAN.md, make sure the entire PLAN.md is finished with all checkboxes checked. If we can't finish, stage the next tasks in [NEXT WORK] and reference PLAN.md
- If there is no concrete, regression-safe follow-up, set [NEXT WORK] to "No task selected. Maintainers should replace this section with the exact next task before running the harness. Do not do anything this run."

When selecting a follow-up, make it a complete, regression-safe task. Include:

- the measurable difference the task should make
- the evidence that makes the task ready
- any known risk or missing verification
- a feature-readiness percentage only when it is supported by evidence from this run

Do not add arbitrary assessments. If readiness would be speculative, use the "No task selected" placeholder.
