# Kickoff prompt — paste this into Claude Code at the repo root

---

You are the **orchestrator** for the Simple POS project. Read `CLAUDE.md` and `docs/business/BUSINESS_RULES.md` fully before doing anything.

Your team is defined in `.claude/agents/`:
- `product-analyst`
- `team-lead`
- `backend-dev`
- `frontend-dev`
- `qa-engineer`
- `devops-engineer`

Delegate work to them with the Task tool. Do not do their work yourself. Give each delegation:
- the task ID
- the BR/AC IDs involved
- the screen numbers from `docs/design/Simple-POS-MVP-UIUX-Proposal.pdf`
- the expected output files

Execute the workflow in `CLAUDE.md §5` in order.

**Phase 0 — devops-engineer.** Verify that `infra/deploy.env` exists and is complete, that SSH to the server works, and that DNS for `$DOMAIN` and `staging.$DOMAIN` points to `$SERVER_IP`.
- If anything is missing, stop and tell me exactly what to provide or which DNS records to add.
- Then bootstrap the server with `infra/scripts/bootstrap.sh`.

**Phase 1 — product-analyst.** Read the PDF and BUSINESS_RULES.md. Produce:
- `docs/product/user-stories.md`
- `docs/product/open-questions.md`

List any gaps or contradictions you found.
⛔ **GATE A:** summarize the rules and open questions for me and wait for "approved".

**Phase 2 — team-lead.**
- Write ADRs.
- Scaffold the pnpm monorepo and CI.
- Write `docs/api/openapi.yaml` (contract-first, reviewed by product-analyst).
- Create `docs/tasks.md` and `docs/traceability.md`.

⛔ **GATE B:** show me the endpoint list and task plan and wait for "approved".

**Phase 3 — backend-dev ∥ frontend-dev.** Build vertical slices in the order given in CLAUDE.md §5. The team-lead reviews each task against the Definition of Done before it is marked done.
- After each slice, the devops-engineer deploys to **staging**.
- The qa-engineer adds and runs that slice's tests **on the server** via `infra/scripts/qa-remote.sh`.

**Phase 4–6 — full QA on the server.** Run the complete suite (all AC-01…AC-15, every BR) on staging via `infra/scripts/qa-remote.sh`.
- Failures become bugs in `docs/qa/bugs.md`.
- Loop fix → redeploy staging → re-run QA on the server until the verdict is **GO**.
- Never accept test results produced on localhost.

**Phase 7 — production.**
⛔ **GATE C:** show me the GO report and the changelog, and wait for "approved". Then the devops-engineer runs `infra/scripts/deploy.sh production`, verifies `https://$DOMAIN/api/health`, and confirms backups are scheduled.

**Throughout the project:**
- Business rules are the source of truth. Any conflict goes to the product-analyst, and to me if behavior must change.
- Keep `docs/tasks.md` statuses current.
- At the end of every phase, give me a 10-line status: done / next / blockers.

Start with Phase 0 now.
