# cPanel Deployment

This project deploys as two public surfaces:

- The Vite frontend is published to the main website document root.
- The Laravel application is uploaded outside the frontend document root and served from an API subdomain whose document root is the Laravel `public` directory.

Example topology:

- `https://youth.example.org` -> frontend document root
- `https://api.youth.example.org` -> `<cpanel-home>/laravel-api/public`

The repository workflow is [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml). It runs tests, builds the frontend and production Composer dependencies, commits those build outputs to the `production` branch, then calls the cPanel API to pull that branch and run [`.cpanel.yml`](../../.cpanel.yml). Deployment does not use SSH or FTP.

## cPanel setup

1. Create the main domain or subdomain for the frontend.
2. Create an API subdomain and set its document root to the deployed Laravel `public` directory, for example `/home/USER/laravel-api/public`.
3. Create a MySQL database and database user in cPanel. Grant the user all required privileges.
4. Confirm the cPanel account's CLI PHP version is PHP 8.3 or newer and that `php` is available to cPanel deployment tasks.
5. In cPanel Git Version Control, clone the repository into a path such as `/home/USER/repositories/archdiocese-nyeri-youth` and select the `production` branch. Record that full repository path for the `CPANEL_REPO_PATH` secret.
6. Edit [`.cpanel.yml`](../../.cpanel.yml) on the source branch and replace both path placeholders with the actual Laravel application directory and frontend document root. Keep the Laravel API subdomain's document root pointed at the Laravel directory's `public/` folder.
7. Set writable permissions for `storage/` and `bootstrap/cache/` in cPanel File Manager.
8. Create the backend `.env` in the Laravel application directory using cPanel File Manager. It must not be committed or copied from the repository.

The Laravel migration history in this repository was consolidated for fresh databases. Do not deploy it over a database that has already run the previous migration files until a data-preserving migration plan has been prepared.

A production backend environment should include values equivalent to:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.youth.example.org
FRONTEND_URL=https://youth.example.org
APP_KEY=base64:GENERATE_A_UNIQUE_KEY

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=CPANEL_DATABASE
DB_USERNAME=CPANEL_DATABASE_USER
DB_PASSWORD=CPANEL_DATABASE_PASSWORD

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
- `CPANEL_USER`, the cPanel account username
- `CPANEL_API_TOKEN`, a cPanel API token permitted to use Version Control update and deployment functions
- `CPANEL_REPO_PATH`, the full path of the cPanel Git repository
- `VITE_API_BASE_URL`, for example `https://api.youth.example.org`

Keep the cPanel token in GitHub Actions secrets; never put it in the repository or a URL. Add the repository Actions variable `CPANEL_DEPLOY_ENABLED=true` only after the production branch, cPanel repository, secrets, and both `.cpanel.yml` paths are configured. Until then, pushes still run tests and the deployment job remains skipped. Require environment approval if you want to review deployments before they run.

## Release behavior

The workflow commits the production Composer `vendor/` directory and the built frontend assets to the `production` branch. It does not include `.env`, `node_modules`, or tests. cPanel deployment copies `backend/` into the Laravel application directory and `frontend/dist/` into the frontend document root. It then runs:

```bash
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

The workflow does not seed or reset production data.

The frontend includes an Apache `.htaccess` fallback so direct navigation to React Router paths such as `/register` resolves to `index.html`.

## Admin portal and registration review

The admin portal is published with the frontend at `https://youth.example.org/admin`. Its admin-only API allows searching and filtering program registrations and changing their status to `pending`, `approved`, or `rejected`. Public registrations enter the review queue as `pending`.

Administrators can import up to 500 members from a CSV at a time. Download the template in the admin portal; required columns are `full_name`, `username`, and `local_church_id`. Local church IDs are available from `/api/v1/local-churches`. The selected program's active configured fields are included as additional columns. Preview validates each row and issues an admin-bound, 30-minute preview that can only import the exact same file once. Import revalidates the rows, creates accounts only for valid rows, and skips invalid rows. Existing usernames are never linked automatically. Email and phone are optional and may be shared.

Imported accounts receive a random temporary password and cannot sign in until they use a one-time setup link. The admin portal returns those links once after import and lets administrators regenerate links for accounts that have not set a password. Links expire after seven days. Since setup links are not emailed, administrators must distribute the downloaded links securely. Set `FRONTEND_URL` in the backend `.env` so links point to the website's `/set-password` page rather than the API host.

The `users` table includes `is_admin`, which defaults to `false`. Provision an administrator only after deployment, using a trusted existing account:

```bash
cd /home/USER/laravel-api
php artisan tinker --execute="App\Models\User::where('username', 'ADMIN_USERNAME')->firstOrFail()->forceFill(['is_admin' => true])->save();"
```

Do not make the role assignable from public registration or place administrator passwords/tokens in GitHub Actions secrets. Sign in at `/admin` with that account's username and password. Admin API access requires a Sanctum token and the `is_admin` role; member accounts cannot sign in through the admin login endpoint.

## Common cPanel checks after deployment

After the workflow completes, confirm the Laravel health endpoint and frontend URL in a browser. If a deployment looks successful but the site returns 500 responses, use cPanel File Manager and the cPanel error/log views to verify:

- `.env` exists and contains the correct production database settings.
- `APP_KEY` was generated with `php artisan key:generate --show` and stored in `.env`.
- `storage/` and `bootstrap/cache/` are writable by the PHP user running the site.
- the Git Version Control update and deployment task both completed successfully.
- `backend/vendor/` and `frontend/dist/` are present in the `production` branch.
- The database user can connect from `127.0.0.1` or the configured host.

## Troubleshooting

### Frontend loads but the API fails

This usually means one of the following:

- `VITE_API_BASE_URL` points to the wrong origin.
- The API subdomain document root is not the Laravel `public` directory.
- The server `.env` is missing `APP_URL` or has a stale value.

Check the rendered frontend build or browser network tab for a 404 or 500 response. Confirm the API origin resolves to `https://api.youth.example.org` and not the main site domain.

### 500 error on every Laravel route

Review the cPanel deployment task output and the Laravel log at `storage/logs/laravel.log` using cPanel File Manager.

### Frontend route refresh fails with 404

This is expected when the frontend is served from a static document root without rewrite rules. The deployment includes an Apache `.htaccess` file in the built frontend; confirm it was uploaded to the document root and that the host is configured to allow `.htaccess` rewrite rules.

## Rollback approach

The `production` branch contains each deployed build as a normal commit. To roll back, revert the relevant build commit through GitHub (do not force-push), then use cPanel Git Version Control to update the repository and run its deployment task. Verify `/up`, `/api/v1/programs`, `/admin`, and a protected frontend route such as `/register` still work over HTTPS. Database migrations that have already run may not be reversible by restoring an earlier code build.

## First deployment checklist

- Verify the API subdomain points to Laravel `public`, not the application root.
- Verify the frontend build has `VITE_API_BASE_URL` set to the API origin.
- Verify `APP_DEBUG=false` and production database credentials.
- Set the GitHub Actions variable `CPANEL_DEPLOY_ENABLED=true` only after all cPanel paths and secrets are set, then run the workflow with `workflow_dispatch`.
- Confirm `/up`, `/api/v1/programs`, and `/register` load over HTTPS.
- Confirm `/admin` loads and an anonymous request to `/api/v1/admin/registrations` is rejected with HTTP 401.
- Provision the first admin from a trusted existing account and verify that it can review and update registration status.
- Submit one controlled Challenge Week registration and confirm the enrollment appears in the database.
- Remove any temporary test registration data after the smoke test.
