# Simple POS — AI Team Kit

This repo seed lets **Claude Code** build the Simple POS MVP with a team of 6 agents.
- The business rules in one file are the single source of truth.
- The app deploys to your own domain and server.
- QA runs **on the server**, not on your machine.

## What's inside
```
CLAUDE.md                        ← project constitution (stack, gates, Definition of Done)
KICKOFF_PROMPT.md                ← the prompt you paste to start
.claude/agents/                  ← product-analyst, team-lead, backend-dev, frontend-dev, qa-engineer, devops-engineer
docs/business/BUSINESS_RULES.md  ← SOURCE OF TRUTH (BR-* rules, AC-* acceptance scenarios, error codes)
docs/design/…pdf                 ← UI/UX proposal (20 screens)
docs/product/open-questions.md
infra/deploy.env.example         ← domain + server values you provide
```

## What you must do yourself (agents can't do these)
1. **Buy a domain** from any registrar (Namecheap, Cloudflare, GoDaddy…).
2. **Rent a VPS**:
   - Ubuntu 24.04, ≥ 2 vCPU / 4 GB RAM (Hetzner, DigitalOcean, Contabo, AWS Lightsail…)
   - add your SSH public key when you create it
   - note its public IP
3. **Point DNS** with two A records → your server IP:
   - `@` (DOMAIN)
   - `staging`

   Alternatively, put a Cloudflare API token in `deploy.env` and the devops agent will create the records for you.
4. `cp infra/deploy.env.example infra/deploy.env` and fill it in.
5. Install Claude Code (`npm i -g @anthropic-ai/claude-code`), open this folder, run `claude`, then paste `KICKOFF_PROMPT.md`.

## How it runs
```
Phase 0 devops: SSH + DNS check, server bootstrap
Phase 1 PA: user stories + open questions            ⛔ you approve
Phase 2 TL: architecture + OpenAPI + task board      ⛔ you approve
Phase 3 BE ∥ FE build slices → staging deploy → QA on server
Phase 4-6 full QA on server until GO
Phase 7 production deploy                            ⛔ you approve
```
Results:
- staging: `https://staging.<your-domain>`
- production: `https://<your-domain>`
- QA reports: `docs/qa/reports/`

## Tips
- Allow-list `ssh`, `scp`, `dig`, `pnpm`, and `docker` in Claude Code permissions, so the agents don't ask on every command.
- Changing a business behavior? Tell the **product-analyst** to update `BUSINESS_RULES.md` first. Everything else follows from it.
- Want a different stack (e.g. Laravel/Rails backend, or Flutter Web instead of React)? Edit `CLAUDE.md §4` and the agent files **before** kickoff.
