# GitHub → kingkonference → Radar

## Observed in Radar

The team's namespace is `team-kingkonference`. Its `app` Deployment uses a starter `node:22-alpine` image, mounted `app-code` ConfigMap, port 8080, `/healthz` and `/readyz` probes, and an Argo CD tracking annotation. It is not currently running the Rally frontend/scoring API. Radar's scoped GitOps view returned no applications, so the repository source and deployment permissions were not verified. No cluster resources were changed.

## Prepared in this repository

- `Dockerfile`: builds React and serves it through the Python API on port 8080. Production browser requests use the same origin, not localhost on the visitor's computer. CPU-only model dependencies; no local credentials, database, or virtual environment are copied.
- `.github/workflows/container.yml`: manually triggered image build/publish to `ghcr.io/wescat1000-ui/hackathon2026:<commit-sha>`. It does not deploy to a cluster. This workflow must be committed/pushed before it appears in GitHub Actions; manual workflows may need to exist on the default branch first.
- `deploy/eks/rally.yaml`: proposed team Deployment/Service/PVC. One replica plus persistent storage keeps SQLite scores consistent. The starter's 128 MiB limit is too small for the embedding model; the proposed limit is 2 GiB, subject to team quota approval.

## Access needed from the hackathon organizers

Ask: “How do we deploy our private GitHub repository wescat1000-ui/Hackathon2026 to namespace team-kingkonference? Is there a deployment portal or Argo CD repository connection? If not, can we receive namespace-scoped kubeconfig access, registry instructions, and the app URL/route?”

Do not paste kubeconfig, registry tokens, or cloud credentials in chat. Store secrets through the organizer-approved mechanism. Radar sign-in alone does not configure local kubectl access.

## Remaining deployment steps

1. Confirm the deployment mechanism, namespace quotas, storage class, and who controls the existing Argo CD application. If Argo manages the starter, change its Git source rather than making manual edits that it may revert.
2. Commit/push this code, build the image with the manual GitHub workflow, and verify the published image digest. This has not been built or published yet.
3. Arrange private GHCR image-pull access (or use the organizer's registry). No registry token is embedded in these files.
4. Provide a cloud-reachable Elasticsearch endpoint as secret `rally-elasticsearch`: ELASTIC_URL plus ELASTIC_API_KEY, or ELASTIC_USERNAME/ELASTIC_PASSWORD. A cloud Pod cannot reach this Mac's `localhost:9200` or Wi-Fi-only address. The existing local Elasticsearch setup remains untouched. Choose shared/cloud Elasticsearch or an organizer-approved in-cluster instance before deployment.
5. Index all catalog transcripts against that Elasticsearch instance using `python -m backend.index_speech` with the same image/model and secrets. Do not assume local index data exists in the cloud.
6. Replace COMMIT_SHA with the built immutable image tag. Integrate the proposed manifest into the approved GitOps path, retain/verify the organizer's route, and deploy only to the assigned namespace. Don't blindly apply over the existing controller-managed starter.
7. Verify Pod readiness, app URL, talk selection, a real scoring request, persistent leaderboard, and the deployed image in Radar. Health probes check HTTP readiness, not Elasticsearch availability or model quality.

## Current limitations

No cloud deployment is claimed. The container recipe is prepared; the full model image has not been built in this session. Full Elasticsearch cloud configuration, deployment access, private-registry pull permissions, and route wiring remain required. The app still uses demo browser identities; cloud publication needs an appropriate access boundary. Sonar and Dash0 setup are separate from deployment.
