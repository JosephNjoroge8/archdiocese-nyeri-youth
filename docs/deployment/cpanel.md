# cPanel Deployment

This cPanel setup serves the frontend and Laravel API from one domain:

- `https://system.quovadisyouthhub.org` -> `/home/shemidig7/laravel-api/public`
- The Vite frontend is copied into Laravel's `public` directory, and Laravel handles API requests under `/api`.

The repository workflow is [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml). It runs tests, builds the frontend and production Composer dependencies, commits those build outputs to the `production` branch, then calls the cPanel API to pull that branch and run [`.cpanel.yml`](../../.cpanel.yml). Deployment does not use SSH or FTP.

## cPanel setup

1. Point `system.quovadisyouthhub.org` at the cPanel account and set its document root to `/home/shemidig7/laravel-api/public`. Do not use `public_html` for this domain.
2. Create a MySQL database named `shemidig7_youthhub` and database user `shemidig7_youthhub` in cPanel. Grant the user all required privileges and record its password for the server `.env`.
3. Confirm the cPanel account's CLI PHP version is PHP 8.4.1 or newer and that `php` is available to cPanel deployment tasks.
4. In cPanel Git Version Control, clone the repository into a path such as `/home/shemidig7/repositories/archdiocese-nyeri-youth` and select the `production` branch. Record that full repository path for the `CPANEL_REPO_PATH` secret.
5. Set writable permissions for `/home/shemidig7/laravel-api/storage/` and `/home/shemidig7/laravel-api/bootstrap/cache/` in cPanel File Manager.
6. Create `/home/shemidig7/laravel-api/.env` using cPanel File Manager. It must not be committed or copied from the repository.

The Laravel migration history in this repository was consolidated for fresh databases. Do not deploy it over a database that has already run the previous migration files until a data-preserving migration plan has been prepared.

A production backend environment should include values equivalent to:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://system.quovadisyouthhub.org
FRONTEND_URL=https://system.quovadisyouthhub.org
APP_KEY=base64:GENERATE_A_UNIQUE_KEY

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=shemidig7_youthhub
DB_USERNAME=shemidig7_youthhub
DB_PASSWORD=SET_THE_CPANEL_DATABASE_PASSWORD

SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local
```

Generate the application key once using a trusted local Laravel environment with `php artisan key:generate --show`, then place it in `.env` using cPanel File Manager. Keep the same key for future deployments so existing encrypted data remains readable.

## GitHub setup

The current remote source branch is `Main` (capital M); the workflow runs tests for pull requests and pushes to that branch. Protect `Main` by requiring a pull request and the `Test and build` status check. Create a `production` branch from `Main` in GitHub before the first deployment. Do not force-push it: each workflow run adds a normal build commit.

Create a GitHub environment named `production` and add these environment secrets:

- `CPANEL_HOST`, for example `yourdomain.com` (without a scheme or port)
- `CPANEL_USER`, the cPanel account username `shemidig7`
- `CPANEL_API_TOKEN`, a cPanel API token permitted to use Version Control update and deployment functions
- `CPANEL_REPO_PATH`, the full path of the cPanel Git repository
- `VITE_API_BASE_URL`, set to `https://system.quovadisyouthhub.org` so the frontend calls the API on the same origin

Keep the cPanel token in GitHub Actions secrets; never put it in the repository or a URL. Add the repository Actions variable `CPANEL_DEPLOY_ENABLED=true` only after the production branch, cPanel repository, and secrets are configured. Until then, pushes still run tests and the deployment job remains skipped. Require environment approval if you want to review deployments before they run.

## Release behavior

The workflow commits the production Composer `vendor/` directory and the built frontend assets to the `production` branch. It does not include `.env`, `node_modules`, or tests. cPanel deployment copies `backend/` into the Laravel application directory and `frontend/dist/` into its `public/` directory, then restores Laravel's `.htaccess` so API and frontend routes are handled by Laravel. It then runs:

```bash
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

The workflow does not seed or reset production data.

Laravel serves the built `index.html` for frontend routes such as `/register`; API routes under `/api` and Laravel's `/up` health endpoint are not sent to the frontend.

## Admin portal and registration review

The admin portal is published with the frontend at `https://system.quovadisyouthhub.org/admin`. Its admin-only API allows searching and filtering program registrations and changing their status to `pending`, `approved`, or `rejected`. Public registrations enter the review queue as `pending`.

Administrators can import up to 500 members from a CSV at a time. Download the template in the admin portal; required columns are `full_name`, `username`, and `local_church_id`. Local church IDs are available from `/api/v1/local-churches`. The selected program's active configured fields are included as additional columns. Preview validates each row and issues an admin-bound, 30-minute preview that can only import the exact same file once. Import revalidates the rows, creates accounts only for valid rows, and skips invalid rows. Existing usernames are never linked automatically. Email and phone are optional and may be shared.

Imported accounts receive a random temporary password and cannot sign in until they use a one-time setup link. The admin portal returns those links once after import and lets administrators regenerate links for accounts that have not set a password. Links expire after seven days. Since setup links are not emailed, administrators must distribute the downloaded links securely. Set `FRONTEND_URL` in the backend `.env` so links point to the website's `/set-password` page rather than the API host.

The `users` table includes `is_admin`, which defaults to `false`. Provision an administrator only after deployment, using a trusted existing account:

```bash
cd /home/shemidig7/laravel-api
php artisan tinker --execute="App\Models\User::where('username', 'ADMIN_USERNAME')->firstOrFail()->forceFill(['is_admin' => true])->save();"
```

Do not make the role assignable from public registration or place administrator passwords/tokens in GitHub Actions secrets. Sign in at `/admin` with that account's username and password. Admin API access requires a Sanctum token and the `is_admin` role; member accounts cannot sign in through the admin login endpoint.

## Common cPanel checks after deployment

After the workflow completes, confirm `https://system.quovadisyouthhub.org/up` and the frontend URL in a browser. If a deployment looks successful but the site returns 500 responses, use cPanel File Manager and the cPanel error/log views to verify:

- `.env` exists and contains the correct production database settings.
- `APP_KEY` was generated with `php artisan key:generate --show` and stored in `.env`.
- `storage/` and `bootstrap/cache/` are writable by the PHP user running the site.
- the Git Version Control update and deployment task both completed successfully.
- `backend/vendor/` and `frontend/dist/` are present in the `production` branch.
- The database user can connect from `127.0.0.1` or the configured host.

## Troubleshooting

### Frontend loads but the API fails

This usually means one of the following:

- `VITE_API_BASE_URL` points to the wrong origin; it should be `https://system.quovadisyouthhub.org`.
- The domain document root is not `/home/shemidig7/laravel-api/public`.
- The server `.env` is missing `APP_URL` or has a stale value.

Check the rendered frontend build or browser network tab for a 404 or 500 response. Confirm API requests go to `https://system.quovadisyouthhub.org/api/...`.

### 500 error on every Laravel route

Review the cPanel deployment task output and the Laravel log at `storage/logs/laravel.log` using cPanel File Manager.

### Frontend route refresh fails with 404

The deployment restores Laravel's `.htaccess` after copying the frontend build. Confirm the domain document root is `/home/shemidig7/laravel-api/public` and that the host allows `.htaccess` rewrite rules.

## Rollback approach

The `production` branch contains each deployed build as a normal commit. To roll back, revert the relevant build commit through GitHub (do not force-push), then use cPanel Git Version Control to update the repository and run its deployment task. Verify `/up`, `/api/v1/programs`, `/admin`, and a protected frontend route such as `/register` still work over HTTPS. Database migrations that have already run may not be reversible by restoring an earlier code build.

## First deployment checklist

- Verify `system.quovadisyouthhub.org` points to `/home/shemidig7/laravel-api/public`.
- Verify the frontend build has `VITE_API_BASE_URL` set to `https://system.quovadisyouthhub.org`.
- Verify `APP_DEBUG=false` and production database credentials.
- Set the GitHub Actions variable `CPANEL_DEPLOY_ENABLED=true` only after cPanel and GitHub settings are ready, then run the workflow with `workflow_dispatch`.
- Confirm `/up`, `/api/v1/programs`, and `/register` load over HTTPS.
- Confirm `/admin` loads and an anonymous request to `/api/v1/admin/registrations` is rejected with HTTP 401.
- Provision the first admin from a trusted existing account and verify that it can review and update registration status.
- Submit one controlled Challenge Week registration and confirm the enrollment appears in the database.
- Remove any temporary test registration data after the smoke test.
