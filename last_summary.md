# Last Summary

## Session: Deploy backend API to AWS Elastic Beanstalk

- Installed Python 3.12.10 via winget (was not present on the system).
- Installed EB CLI 3.27.3 via pip.
- Initialized EB application `pixiekat-api` in `main/server` with Node.js 24 platform, region `ap-south-1`.
- Created `.ebextensions/healthcheck.config` to set the application health check URL to `/api/health`.
- Created single-instance environment `pixiekat-api-prod` (t3.micro, single instance).
- Set all 18 environment variables from `main/server/.env` via `aws elasticbeanstalk update-environment` (used a PowerShell script to parse `.env` and generate the JSON option-settings file; script was cleaned up after use).
- Verified `/api/health` endpoint returns `{ ok: true, service: 'pixiekat-admin-proxy' }` over HTTP.

## URLs

- **API (direct HTTP):** `http://pixiekat-api-prod.eba-p22mabr9.ap-south-1.elasticbeanstalk.com/api`
- **Main frontend:** `https://main.d2qve07e257e1q.amplifyapp.com`
- **Admin frontend:** `https://admin.d2qve07e257e1q.amplifyapp.com`

EB environment variables `FRONTEND_URL` and `CORS_ORIGINS` updated to match the Amplify URLs.

## HTTPS / Mixed Content Fix

CloudFront was attempted but the AWS account needs verification for CloudFront resources. Instead, added an Amplify rewrite/proxy rule to `amplify.yml` that proxies `/api/*` from both Amplify frontends to the EB HTTP endpoint. This avoids mixed content (HTTPS page → HTTP API) because the browser sees same-origin requests.

The `amplify.yml` change needs to be committed and pushed to trigger a redeploy of both Amplify branches.

## Next steps for the user

1. Commit and push the `amplify.yml` change to trigger redeploy of both Amplify branches.
2. Set `VITE_API_BASE_URL=/api` on the **admin** Amplify branch environment variables (so axios uses relative URLs instead of localhost fallback). The main branch doesn't need this (it already defaults to relative).
3. After both branches redeploy, test the player verification on the main site.
4. For production HTTPS on the API itself (not proxied), consider contacting AWS Support to verify the account for CloudFront, or adding a load balancer with ACM cert to the EB environment.
5. Future server code deploys: `cd main/server && eb deploy`.
