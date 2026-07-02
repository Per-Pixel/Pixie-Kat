# AWS Deployment

This repo has three deployable pieces:

- `main`: public Vite/React frontend
- `admin`: admin Vite/React frontend
- `main/server`: Node/Express API for privileged Supabase and provider operations

Recommended AWS setup:

- Host `main` and `admin` with AWS Amplify Hosting.
- Host `main/server` with AWS Elastic Beanstalk.
- Keep Supabase as the database/auth/storage provider.

AWS docs used for this setup:

- Amplify supports monorepo build specs with one `applications` list and an `appRoot` per app.
- Elastic Beanstalk supports Node.js/Express deployments, custom start commands with `Procfile`, and a `PORT` environment variable behind its NGINX reverse proxy.
- S3 plus CloudFront is also valid for static React SPAs, but Amplify is simpler for Git-based deploys.

## 1. Deploy The API

Use AWS Elastic Beanstalk for `main/server`.

1. Install the AWS EB CLI.
2. Open a terminal in `main/server`.
3. Run `eb init` and choose the Node.js platform.
4. Run `eb create pixiekat-api-prod`.
5. Set the health check path to `/api/health` in the Elastic Beanstalk environment health settings or load balancer target group.
6. Add environment variables from `main/server/.env.example.aws`.
7. Deploy with `eb deploy`.

Use plain text env vars for non-secrets:

```env
NODE_ENV=production
FRONTEND_URL=https://pixiekat.com
CORS_ORIGINS=https://pixiekat.com,https://admin.pixiekat.com
SUPABASE_URL=https://your-project-ref.supabase.co
SC_COUNTRY=in
SC_ALLOW_TEST_ORDER=false
```

Store secrets in Elastic Beanstalk environment properties or AWS Secrets Manager/SSM Parameter Store:

```env
SUPABASE_SERVICE_ROLE_KEY=...
SMILECODE_API_KEY=...
SMILECODE_CLIENT_ID=...
SMILECODE_SECRET=...
SC_EMAIL=...
SC_UID=...
SC_KEY=...
```

After Elastic Beanstalk deploys, copy its HTTPS environment URL. You will use it as:

```env
VITE_API_BASE_URL=https://your-elastic-beanstalk-url.elasticbeanstalk.com/api
```

## 2. Deploy The Main Frontend

Create an Amplify app for `main`.

1. In AWS Amplify Hosting, create a new app from the same Git repository.
2. Select "My app is a monorepo".
3. Set app root to `main`.
4. Amplify will use the root `amplify.yml`.
5. Add these environment variables:

```env
AMPLIFY_MONOREPO_APP_ROOT=main
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Build command: `npm run build`

Build output: `dist`

## 3. Deploy The Admin Frontend

Create a second Amplify app for `admin`.

1. Use the same Git repository.
2. Select "My app is a monorepo".
3. Set app root to `admin`.
4. Add these environment variables:

```env
AMPLIFY_MONOREPO_APP_ROOT=admin
VITE_API_BASE_URL=https://your-elastic-beanstalk-url.elasticbeanstalk.com/api
VITE_APP_NAME=PixieKat Admin
VITE_APP_VERSION=1.0.0
VITE_MAIN_SITE_URL=https://pixiekat.com
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Build command: `npm run build`

Build output: `dist`

## 4. Configure Domains

Suggested domains:

```text
pixiekat.com          -> Amplify main app
admin.pixiekat.com    -> Amplify admin app
api.pixiekat.com      -> Elastic Beanstalk API custom domain
```

After the custom domains are live, update:

```env
# Elastic Beanstalk
FRONTEND_URL=https://pixiekat.com
CORS_ORIGINS=https://pixiekat.com,https://admin.pixiekat.com

# Admin Amplify app
VITE_API_BASE_URL=https://api.pixiekat.com/api
VITE_MAIN_SITE_URL=https://pixiekat.com
```

Also update Supabase Auth:

```text
Site URL: https://pixiekat.com
Redirect URLs:
https://pixiekat.com/**
https://admin.pixiekat.com/**
```

## 5. Quick Production Checklist

- Supabase migrations in `supabase/migrations` have been applied.
- First admin user has `profiles.role = 'admin'`.
- Elastic Beanstalk `/api/health` returns JSON.
- Admin `VITE_API_BASE_URL` points to the deployed API, not localhost.
- Elastic Beanstalk `CORS_ORIGINS` includes both frontend domains.
- Supabase service role key is only configured on Elastic Beanstalk.
- Supabase anon key is the only Supabase key exposed to `main` and `admin`.
