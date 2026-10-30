<?php

namespace Tests\Feature;

use App\Models\Deanery;
use App\Models\LocalChurch;
use App\Models\Member;
use App\Models\MemberProgramEnrollment;
use App\Models\Parish;
use App\Models\Program;
use App\Models\ProgramFormField;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class BulkRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private LocalChurch $church;

    private Program $program;

    protected function setUp(): void
    {
        parent::setUp();

        $deanery = Deanery::create([
            'name' => 'Test Deanery',
            'code' => 'TEST-DEANERY',
            'is_active' => true,
        ]);
        $parish = Parish::create([
            'deanery_id' => $deanery->id,
            'name' => 'Test Parish',
            'code' => 'TEST-PARISH',
            'is_active' => true,
        ]);
        $this->church = LocalChurch::create([
            'parish_id' => $parish->id,
            'name' => 'Test Church',
            'code' => 'TEST-CHURCH',
            'is_active' => true,
        ]);
        $this->program = Program::create([
            'code' => 'TEST_PROGRAM',
            'name' => 'Test Program',
            'is_active' => true,
        ]);

        $this->admin = User::create([
            'name' => 'Admin User',
            'username' => 'admin.user',
            'email' => 'admin@example.com',
            'password' => 'Password123!',
        ]);
        $this->admin->forceFill(['is_admin' => true])->save();
    }

    public function test_bulk_preview_reports_row_errors_without_creating_accounts(): void
    {
        $csv = $this->csv([
            ['Ada Youth', 'ada.youth', '', '', '', '', (string) $this->church->id],
            ['Grace Youth', 'invalid username', '', '', '', '', (string) $this->church->id],
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->post('/api/v1/admin/bulk-registrations/preview', [
                'program_id' => $this->program->id,
                'file' => UploadedFile::fake()->createWithContent('members.csv', $csv),
            ], ['Accept' => 'application/json']);

        $response->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('meta.valid', 1)
            ->assertJsonPath('meta.invalid', 1)
            ->assertJsonPath('rows.0.valid', true)
            ->assertJsonPath('rows.1.valid', false);

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('members', 0);
    }

    public function test_bulk_import_creates_only_valid_rows_and_returns_one_time_setup_links(): void
    {
        ProgramFormField::create([
            'program_id' => $this->program->id,
            'field_key' => 'preferred_activity',
            'label' => 'Preferred activity',
            'field_type' => 'text',
            'is_required' => true,
            'is_active' => true,
            'validation_rules' => ['string', 'max:80'],
        ]);
        $csv = $this->csv([
            ['Ada Youth', 'ada.youth', '0712345678', '', 'female', '2005-04-12', (string) $this->church->id, 'music'],
            ['Grace Youth', 'grace.youth', '', 'shared@example.com', '', '', (string) $this->church->id, ''],
            ['Joseph Youth', 'joseph.youth', '', 'shared@example.com', '', '', (string) $this->church->id, 'service'],
        ], ['full_name', 'username', 'phone', 'email', 'gender', 'dob', 'local_church_id', 'preferred_activity']);

        $file = UploadedFile::fake()->createWithContent('members.csv', $csv);
        $previewResponse = $this->actingAs($this->admin, 'sanctum')
            ->post('/api/v1/admin/bulk-registrations/preview', [
                'program_id' => $this->program->id,
                'file' => $file,
            ], ['Accept' => 'application/json']);

        $previewResponse->assertOk();
        $previewId = $previewResponse->json('preview_id');

        $response = $this->actingAs($this->admin, 'sanctum')
            ->post('/api/v1/admin/bulk-registrations/import', [
                'program_id' => $this->program->id,
                'file' => $file,
                'preview_id' => $previewId,
            ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('meta.imported', 2)
            ->assertJsonPath('meta.skipped', 1)
            ->assertJsonPath('data.0.username', 'ada.youth');

        $setupUrl = $response->json('data.0.setup_url');
        parse_str((string) parse_url($setupUrl, PHP_URL_QUERY), $query);
        $token = $query['token'] ?? '';

        $this->assertSame(64, strlen($token));
        $this->assertDatabaseCount('members', 2);
        $this->assertDatabaseHas('users', [
            'username' => 'ada.youth',
            'email' => null,
            'password_is_temporary' => true,
        ]);
        $this->assertDatabaseHas('users', [
            'username' => 'joseph.youth',
            'email' => 'shared@example.com',
        ]);

        $enrollment = MemberProgramEnrollment::with('member.user')->firstOrFail();
        $this->assertSame('music', $enrollment->extra_data['preferred_activity']);
        $this->assertSame('pending', $enrollment->status);
        $this->assertTrue(Hash::check('not-the-setup-password', $enrollment->member->user->password) === false);
        $this->assertDatabaseHas('member_setup_tokens', [
            'user_id' => $enrollment->member->user_id,
            'token_hash' => hash('sha256', $token),
        ]);

        $enrollment->member->user->forceFill([
            'password' => Hash::make('TemporaryPassword123!'),
        ])->save();

        $this->postJson('/api/v1/auth/login', [
            'username' => 'ada.youth',
            'password' => 'TemporaryPassword123!',
        ])->assertUnprocessable();

        $this->postJson('/api/v1/auth/first-login', [
            'token' => $token,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])->assertOk();

        $this->assertDatabaseHas('users', [
            'username' => 'ada.youth',
            'password_is_temporary' => false,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'username' => 'ada.youth',
            'password' => 'NewPassword123!',
        ])->assertOk();

        $this->postJson('/api/v1/auth/first-login', [
            'token' => $token,
            'password' => 'AnotherPassword123!',
            'password_confirmation' => 'AnotherPassword123!',
        ])->assertUnprocessable();

        $this->actingAs($this->admin, 'sanctum')
            ->post('/api/v1/admin/bulk-registrations/import', [
                'program_id' => $this->program->id,
                'file' => $file,
                'preview_id' => $previewId,
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('preview_id');
    }

    public function test_bulk_import_cannot_run_without_a_matching_preview(): void
    {
        $file = UploadedFile::fake()->createWithContent('members.csv', $this->csv([
            ['Ada Youth', 'ada.youth', '', '', '', '', (string) $this->church->id],
        ]));

        $this->actingAs($this->admin, 'sanctum')
            ->post('/api/v1/admin/bulk-registrations/import', [
                'program_id' => $this->program->id,
                'file' => $file,
                'preview_id' => (string) Str::uuid(),
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('preview_id');

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('members', 0);
    }

    public function test_bulk_import_rejects_csv_content_that_differs_from_the_preview(): void
    {
        $previewFile = UploadedFile::fake()->createWithContent('members.csv', $this->csv([
            ['Ada Youth', 'ada.youth', '', '', '', '', (string) $this->church->id],
        ]));
        $preview = $this->actingAs($this->admin, 'sanctum')
            ->post('/api/v1/admin/bulk-registrations/preview', [
                'program_id' => $this->program->id,
                'file' => $previewFile,
            ], ['Accept' => 'application/json'])
            ->assertOk();

        $changedFile = UploadedFile::fake()->createWithContent('members.csv', $this->csv([
            ['Grace Youth', 'grace.youth', '', '', '', '', (string) $this->church->id],
        ]));

        $this->actingAs($this->admin, 'sanctum')
            ->post('/api/v1/admin/bulk-registrations/import', [
                'program_id' => $this->program->id,
                'file' => $changedFile,
                'preview_id' => $preview->json('preview_id'),
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('preview_id');

        $this->assertDatabaseCount('members', 0);
    }

    public function test_bulk_import_requires_admin_access(): void
    {
        $csv = $this->csv([
            ['Ada Youth', 'ada.youth', '', '', '', '', (string) $this->church->id],
        ]);

        $this->post('/api/v1/admin/bulk-registrations/preview', [
            'program_id' => $this->program->id,
            'file' => UploadedFile::fake()->createWithContent('members.csv', $csv),
        ], ['Accept' => 'application/json'])->assertUnauthorized();
    }

    public function test_admin_can_regenerate_a_pending_setup_link(): void
    {
        $user = User::create([
            'name' => 'Imported Youth',
            'username' => 'imported.youth',
            'password' => Str::random(64),
            'password_is_temporary' => true,
        ]);
        $member = Member::create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $user->id,
            'full_name' => 'Imported Youth',
            'local_church_id' => $this->church->id,
            'membership_no' => 'ANY-2026-IMPORTED',
            'status' => 'active',
        ]);
        $enrollment = MemberProgramEnrollment::create([
            'member_id' => $member->id,
            'program_id' => $this->program->id,
            'registration_date' => now()->toDateString(),
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/registrations/{$enrollment->id}/setup-link")
            ->assertOk();

        parse_str((string) parse_url($response->json('setup_url'), PHP_URL_QUERY), $query);
        $this->assertDatabaseHas('member_setup_tokens', [
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $query['token']),
        ]);
    }

    private function csv(array $rows, array $headers = [
        'full_name',
        'username',
        'phone',
        'email',
        'gender',
        'dob',
        'local_church_id',
    ]): string
    {
        $stream = fopen('php://temp', 'r+');
        fputcsv($stream, $headers);
        foreach ($rows as $row) {
            fputcsv($stream, $row);
        }
        rewind($stream);

        return stream_get_contents($stream);
    }
}
