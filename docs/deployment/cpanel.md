# cPanel Deployment

This project deploys as two public surfaces:

- The Vite frontend is published to the main website document root.
- The Laravel application is uploaded outside the frontend document root and served from an API subdomain whose document root is the Laravel `public` directory.

Example topology:

- `https://youth.example.org` -> frontend document root
- `https://api.youth.example.org` -> `<cpanel-home>/laravel-api/public`

The repository workflow is [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml). It runs tests and builds first, then uploads the backend, runs Laravel maintenance commands over SSH, uploads the frontend, and performs HTTP smoke checks.

## cPanel setup

1. Create the main domain or subdomain for the frontend.
2. Create an API subdomain and set its document root to the deployed Laravel `public` directory, for example `/home/USER/laravel-api/public`.
3. Create a MySQL database and database user in cPanel. Grant the user all required privileges.
4. Confirm SSH access and that the selected PHP CLI version is PHP 8.3 or newer.
5. Confirm Composer is available on the account. If it is not globally available, use the hosting provider's Composer path in the SSH command in the workflow.
6. Set writable permissions for `storage/` and `bootstrap/cache/`.
7. Create the backend `.env` on the server. It must not be uploaded by FTP.

A production backend environment should include values equivalent to:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.youth.example.org
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

Generate the application key once on the server with `php artisan key:generate --show`, then place it in `.env`. Keep the same key for future deployments so existing encrypted data remains readable.

## GitHub Actions secrets

Configure these repository secrets before pushing to `Main`:

- `CPANEL_FTP_SERVER`
- `CPANEL_FTP_USERNAME`
- `CPANEL_FTP_PASSWORD`
- `CPANEL_FRONTEND_DIR`, for example `/public_html/`
- `CPANEL_BACKEND_DIR`, for example `/home/USER/laravel-api/`
- `CPANEL_SSH_HOST`
- `CPANEL_SSH_USERNAME`
- `CPANEL_SSH_PASSWORD`
- `CPANEL_SSH_PORT`, usually `22`
- `VITE_API_BASE_URL`, for example `https://api.youth.example.org`
- `APP_URL`, for example `https://api.youth.example.org`
- `FRONTEND_URL`, for example `https://youth.example.org`

Use GitHub environment protection for the production environment if approval is required before release. Prefer an SSH key over a password when the hosting account supports it; the current workflow follows the existing password-secret convention.

## Release behavior

The workflow intentionally does not upload `.env`, `vendor`, logs, tests, or runtime cache files. On the server it runs:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan db:seed --class=ProgramSeeder --force
php artisan db:seed --class=ProgramFormFieldSeeder --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

`ProgramSeeder` and `ProgramFormFieldSeeder` use idempotent writes. The development organization seeder is deliberately excluded from production deployment.

The frontend includes an Apache `.htaccess` fallback so direct navigation to React Router paths such as `/register` resolves to `index.html`.

## Admin portal and registration review

The admin portal is published with the frontend at `https://youth.example.org/admin`. Its admin-only API allows searching and filtering program registrations and changing their status to `pending`, `approved`, or `rejected`. Public registrations enter the review queue as `pending`.

The deployment migration adds `users.is_admin`, which defaults to `false`. Provision an administrator only after deployment, using a trusted existing account:

```bash
cd /home/USER/laravel-api
php artisan tinker --execute="App\Models\User::where('username', 'ADMIN_USERNAME')->firstOrFail()->forceFill(['is_admin' => true])->save();"
```

Do not make the role assignable from public registration or place administrator passwords/tokens in GitHub Actions secrets. Sign in at `/admin` with that account's username and password. Admin API access requires a Sanctum token and the `is_admin` role; member accounts cannot sign in through the admin login endpoint.

## Common server checks after deployment

After the workflow completes, confirm the Laravel app is healthy from the server itself as well as from GitHub Actions. The fastest checks are:

```bash
cd /home/USER/laravel-api
php artisan --version
php artisan config:show app.url
php artisan storage:link || true
php artisan route:list --path=api
ls -ld storage bootstrap/cache
find storage bootstrap/cache -maxdepth 2 -type d -exec chmod 775 {} \;
```

If a deployment looks successful but the site still returns 500 responses, verify the following:

- `.env` exists and contains the correct production database settings.
- `APP_KEY` was generated with `php artisan key:generate --show` and stored in `.env`.
- `storage/` and `bootstrap/cache/` are writable by the PHP user running the site.
- `composer install --no-dev --optimize-autoloader` completed successfully on the server.
- The database user can connect from `127.0.0.1` or the configured host.

## Troubleshooting

### Frontend loads but the API fails

This usually means one of the following:

- `VITE_API_BASE_URL` points to the wrong origin.
- The API subdomain document root is not the Laravel `public` directory.
- The server `.env` is missing `APP_URL` or has a stale value.

Check the rendered frontend build or browser network tab for a 404 or 500 response. Confirm the API origin resolves to `https://api.youth.example.org` and not the main site domain.

### 500 error on every Laravel route

Run the following on the server:

```bash
cd /home/USER/laravel-api
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
php -d display_errors=1 artisan up
```

If the app still fails, inspect the Laravel log:

```bash
tail -n 200 storage/logs/laravel.log
```

### Frontend route refresh fails with 404

This is expected when the frontend is served from a static document root without rewrite rules. The deployment includes an Apache `.htaccess` file in the built frontend; confirm it was uploaded to the document root and that the host is configured to allow `.htaccess` rewrite rules.

## Rollback approach

A rollback is usually straightforward in cPanel because the frontend is static and the backend is a Git-tracked Laravel app uploaded to a directory on the server.

1. Keep the last known-good backend directory and frontend build archive in a safe place.
2. Upload the previous frontend build to the website document root.
3. Restore the previous Laravel release or redeploy the last successful build to the backend directory.
4. Re-run the server maintenance commands if the previous release includes new migrations or cache files:

```bash
cd /home/USER/laravel-api
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
```

5. Verify `/up`, `/api/v1/programs`, `/admin`, and a protected frontend route such as `/register` still work over HTTPS.

## First deployment checklist

- Verify the API subdomain points to Laravel `public`, not the application root.
- Verify the frontend build has `VITE_API_BASE_URL` set to the API origin.
- Verify `APP_DEBUG=false` and production database credentials.
- Run the workflow manually with `workflow_dispatch`.
- Confirm `/up`, `/api/v1/programs`, and `/register` load over HTTPS.
- Confirm `/admin` loads and an anonymous request to `/api/v1/admin/registrations` is rejected with HTTP 401.
- Provision the first admin from a trusted existing account and verify that it can review and update registration status.
- Submit one controlled Challenge Week registration and confirm the enrollment appears in the database.
- Remove any temporary test registration data after the smoke test.
