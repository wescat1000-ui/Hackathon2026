# Skyhook Radar integration

Radar: https://github.com/skyhook-io/radar

Status: Radar CLI installation and a Kubernetes gateway manifest are prepared. No Kubernetes cluster is configured on this Mac, so no monitored Rally workload has been deployed or verified yet. Installing Radar alone is not a completed integration.

Radar monitors Kubernetes resources; it is not a browser SDK or geolocation API. To make it useful to this app without moving the existing model/Elasticsearch setup, deploy the small `rally-gateway` workload and route frontend requests through it:

Frontend → Kubernetes Service / gateway → existing FastAPI API on this Mac → Elasticsearch.

## Local Docker Desktop cluster

1. Set up a Kubernetes cluster in Docker Desktop. Docker currently has about 4 GiB available and Elasticsearch/Kibana use most of it, so allocate adequate memory before enabling Kubernetes. Leave the working app running as it is until the cluster is ready.
2. Confirm the local context exists: `kubectl config get-contexts`. Use the exact local context explicitly for all deployment commands. The commands below assume `docker-desktop`; don't run them against a shared/production context.
3. The backend must remain listening on `0.0.0.0:8000`. The manifest uses Docker Desktop's `host.docker.internal` to reach it from Kubernetes. A different cluster needs a reachable backend address substituted in the ConfigMap.
4. Apply only the Rally resources:

```sh
kubectl --context docker-desktop apply -f deploy/kubernetes/rally-gateway.yaml
kubectl --context docker-desktop -n rally rollout status deployment/rally-gateway
kubectl --context docker-desktop -n rally port-forward service/rally-gateway 18000:8000
```

5. In a separate terminal, check `curl http://127.0.0.1:18000/api/health` and `curl http://127.0.0.1:18000/api/talks`. Confirm a real submission works through the gateway before changing the frontend.
6. Set `VITE_API_ORIGIN=http://127.0.0.1:18000` in `.env.local`, restart Vite, and verify scores/leaderboard. The API's existing frontend CORS origins still apply. Keep the port-forward terminal open.
7. Start Radar against the intended local kubeconfig/context. Do not change context on behalf of other work. Radar uses the current kubeconfig context; confirm that it is your local cluster first:

```sh
kubectl config current-context
$HOME/.local/bin/kubectl-radar --namespace rally --no-browser --mcp-read-only --disable-exec --disable-local-terminal
```

Open http://127.0.0.1:9280. In Radar, show the Rally gateway Deployment, Pod, Service, readiness, logs, and topology. Submit notes in Rally to demonstrate that requests go through the monitored workload. Radar does not replace Dash0's application traces or Elasticsearch's vector matching.

The gateway consumes no note bodies in its logs; do not add request-body logging. Keep Radar on its default loopback listener. Read-only MCP: http://127.0.0.1:9280/mcp-readonly. Do not connect it to an AI client without choosing that access separately.

## What's still required

A real Kubernetes cluster, successful gateway rollout, requests routed through it, and a verified Radar UI. The current direct API path stays operational while these steps are pending. No cluster credentials or secrets are stored in the manifests.
