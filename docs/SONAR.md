# SonarQube Cloud setup

Status: source configuration and CI workflow prepared; no cloud project or completed scan verified.

1. Open https://sonarcloud.io and sign in with GitHub. Import `wescat1000-ui/Hackathon2026`. Choose **With GitHub Actions** as the analysis method. If automatic analysis was enabled, turn it off before using this workflow.
2. Copy the actual project key and organization key shown by Sonar; do not guess them.
3. In GitHub → repository Settings → Secrets and variables → Actions:
   - Add a secret `SONAR_TOKEN` containing the Sonar analysis token.
   - Add variables `SONAR_PROJECT_KEY` and `SONAR_ORGANIZATION` containing the keys from Sonar.
   - If your Sonar account specifies a different server address, set variable `SONAR_HOST_URL` to that address.
4. Push this workflow, then open GitHub Actions → Tests and Sonar analysis. A missing organization/project skips the Sonar job; that is not a successful scan. A configured project without a token fails with a setup message.
5. Confirm the completed analysis and quality gate in Sonar. A failed quality gate is a real result to investigate; don't describe it as passing.

The workflow tests/builds JavaScript and tests the API with an injected scorer, generates Python coverage, and analyzes the frontend, backend, observability helpers, and original Python scripts. It does not download the language model or connect CI to your local Elasticsearch. Source analysis runs in the development workflow, not the attendee's browser. The VS Code extension is optional and does not replace a verified cloud scan.

Official setup: https://docs.sonarsource.com/sonarqube-cloud/getting-started/github
GitHub Actions: https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/ci-based-analysis/github-actions-for-sonarcloud
