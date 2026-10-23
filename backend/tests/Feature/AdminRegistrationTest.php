<?php

namespace Tests\Feature;

use App\Models\Deanery;
use App\Models\LocalChurch;
use App\Models\Member;
use App\Models\MemberProgramEnrollment;
use App\Models\Parish;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private MemberProgramEnrollment $registration;

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
        $church = LocalChurch::create([
            'parish_id' => $parish->id,
            'name' => 'Test Church',
            'code' => 'TEST-CHURCH',
            'is_active' => true,
        ]);
        $program = Program::create([
            'code' => 'TEST_PROGRAM',
            'name' => 'Test Program',
            'status' => 'active',
        ]);

        $this->admin = User::create([
            'name' => 'Admin User',
            'username' => 'admin.user',
            'email' => 'admin@example.com',
            'password' => 'Password123!',
        ]);
        $this->admin->forceFill(['is_admin' => true])->save();

        $memberUser = User::create([
            'name' => 'Test Youth Member',
            'username' => 'test.youth',
            'email' => 'youth@example.com',
            'password' => 'Password123!',
        ]);
        $member = Member::create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $memberUser->id,
            'full_name' => 'Test Youth Member',
            'phone' => '0712345678',
            'email' => 'youth@example.com',
            'local_church_id' => $church->id,
            'membership_no' => 'ANY-2026-TEST1234',
            'status' => 'active',
        ]);
        $this->registration = MemberProgramEnrollment::create([
            'member_id' => $member->id,
            'program_id' => $program->id,
            'registration_date' => now()->toDateString(),
            'status' => 'pending',
        ]);
    }

    public function test_admin_registration_endpoints_require_admin_access(): void
    {
        $this->getJson('/api/v1/admin/registrations')->assertUnauthorized();

        $member = User::where('username', 'test.youth')->firstOrFail();
        $this->actingAs($member, 'sanctum')
            ->getJson('/api/v1/admin/registrations')
            ->assertForbidden();
    }

    public function test_admin_login_only_issues_tokens_to_admins(): void
    {
        $this->postJson('/api/v1/admin/auth/login', [
            'username' => 'test.youth',
            'password' => 'Password123!',
        ])->assertUnprocessable();

        $this->postJson('/api/v1/admin/auth/login', [
            'username' => 'admin.user',
            'password' => 'Password123!',
        ])->assertOk()
            ->assertJsonPath('user.is_admin', true)
            ->assertJsonStructure(['token', 'token_type']);
    }

    public function test_admin_can_search_and_filter_registrations(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/registrations?search=TEST1234&status=pending')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.member.full_name', 'Test Youth Member')
            ->assertJsonPath('data.0.program.name', 'Test Program')
            ->assertJsonPath('data.0.status', 'pending');
    }

    public function test_admin_can_update_registration_status(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson('/api/v1/admin/registrations/'.$this->registration->id, [
                'status' => 'approved',
            ])->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('member_program_enrollments', [
            'id' => $this->registration->id,
            'status' => 'approved',
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->patchJson('/api/v1/admin/registrations/'.$this->registration->id, [
                'status' => 'active',
            ])->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }
}
