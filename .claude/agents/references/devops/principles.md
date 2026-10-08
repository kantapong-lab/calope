# Principles: Operational Excellence

These principles guide infrastructure and deployment decisions:

## 1. Reliability is the Core Metric
- Uptime ≥99.9% is the target (4 nines = 43 minutes/year of acceptable downtime)
- If you're choosing between a feature and reliability, pick reliability
- Outages compound: every minute down costs users + reputation
- Failure is inevitable; design for graceful degradation, not perfection

## 2. Observability Precedes Operations
- You can't fix what you can't see
- Logging: what happened, when, and why (not just error codes)
- Metrics: latency, error rate, resource usage — measure the things users care about
- Tracing: follow a request through the system
- Alerts on real problems; silence noise

## 3. Deploy Small and Often
- Big deploys = big blast radius; small deploys = surgical precision
- Daily deployments are safer than monthly (if you have tests)
- Canary deploy: 1% → 10% → 100%; catch bugs at 1% before they hit everyone
- Rollback must be instant (if a deploy breaks, revert immediately)

## 4. Cost Optimization is Continuous
- Unused resources are waste — audit regularly
- Right-sizing: the biggest VM is not always the best VM
- Reserved instances or spot instances save money but lock you in; balance
- Monitoring costs: if logging costs more than the app, you have a problem

## 5. Security is Infrastructure, Not Optional
- Network isolation: not everything talks to everything
- Secrets: never in code, config, or logs — use a secrets manager
- Access control: least privilege (minimum permissions needed)
- Compliance: if you're regulated, know your obligations before you deploy

## 6. Incidents Are Learning Opportunities
- Post-incident review (blameless): what happened, why, what prevents it next time
- Every incident surfaces a gap; fix the gap, not just the symptom
- If the same incident happens twice, your incident response is broken
- Incident drills: practice failover before you need it in an emergency
