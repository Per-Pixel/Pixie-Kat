# Last Summary

AWS deployment of the PixieKat application in p-southeast-1 has been completed.

## Completed

- Set git user to Koala-codes05 <rishij906@gmail.com> and pushed current changes to origin/main.
- Created S3 deployment bucket: pixiekat-deploy-147826551459-ap-southeast-1.
- Created Elastic Beanstalk application pixiekat-api and environment pixiekat-api-prod-v2 (URL: https://pixiekat-api-prod-v2.eba-dfqagmaq.ap-southeast-1.elasticbeanstalk.com).
- Created default EB IAM roles/instance profiles: ws-elasticbeanstalk-ec2-role and ws-elasticbeanstalk-service-role.
- Fixed source bundle ZIP path separators and uploaded corrected version 3.
- Updated EB environment to run on Node.js 22 to avoid Supabase WebSocket issues.
- Created Amplify app pixiekat-main ($appId) with branches main and dmin.
- Built and deployed main and dmin frontends to Amplify.
- Updated API FRONTEND_URL and CORS_ORIGINS to the Amplify URLs.
- Enabled basic auth on the dmin branch with username pixiekat-admin.
- Removed temporary .deployment scripts and config files.

## Live URLs

- **Main frontend (public):** https://main.d8mwmwzadn7qk.amplifyapp.com
- **Admin frontend (basic auth required):** https://admin.d8mwmwzadn7qk.amplifyapp.com
  - Username: pixiekat-admin
  - Temporary password: $adminPassword
- **API backend:** https://pixiekat-api-prod-v2.eba-dfqagmaq.ap-southeast-1.elasticbeanstalk.com/api
  - Health check: https://pixiekat-api-prod-v2.eba-dfqagmaq.ap-southeast-1.elasticbeanstalk.com/api/health

## Security notes

1. The admin frontend is protected by basic auth, but you should change the password in the AWS Amplify console as soon as possible.
2. Several sensitive values (Supabase service role key, SmileCode/Smilecoin credentials) were accidentally exposed in chat output during earlier CLI errors. Rotate the Supabase service role key in the Supabase dashboard. Contact SmileCode support if the SmileCode keys need rotation. The SC_KEY cannot be regenerated here.
3. Consider enabling AWS WAF and HTTPS-only redirects on the main site once a custom domain is attached.
4. The EB security group currently allows HTTP/HTTPS from the internet (needed for the public API health check and Amplify origins). Restrict it further if you add a custom domain or WAF.

## Manual follow-up

1. Change the Amplify admin branch password (Amplify Console > PixieKat > Branches > admin > Access control).
2. In the Supabase dashboard, rotate SUPABASE_SERVICE_ROLE_KEY and update it in the EB environment if you rotate it.
3. Attach custom domains in Route 53/Amplify if needed.
4. Delete local main/dist and dmin/dist build folders; they are gitignored and were created for this deployment.