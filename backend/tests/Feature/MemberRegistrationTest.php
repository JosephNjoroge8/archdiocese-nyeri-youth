<?php

namespace Tests\Feature;

use App\Models\Deanery;
use App\Models\LocalChurch;
use App\Models\Member;
use App\Models\Parish;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private int $localChurchId;
    private int $programId;

    protected function setUp(): void
    {
        parent::setUp();

        $deanery = Deanery::create([
            'name' => 'Test Deanery',
            'code' => 'TEST-DEANERY',
            'description' => 'Test deanery.',
            'is_active' => true,
        ]);

        $parish = Parish::create([
            'deanery_id' => $deanery->id,
            'name' => 'Test Parish',
            'code' => 'TEST-PARISH',
            'description' => 'Test parish.',
            'is_active' => true,
        ]);

        $localChurch = LocalChurch::create([
            'parish_id' => $parish->id,
            'name' => 'Test Local Church',
            'code' => 'TEST-CHURCH',
            'description' => 'Test local church.',
            'is_active' => true,
        ]);

        $program = Program::create([
            'code' => 'TEST_PROGRAM',
            'name' => 'Test Program',
            'description' => 'Test program.',
            'status' => 'active',
        ]);

        $this->localChurchId = $localChurch->id;
        $this->programId = $program->id;
    }

    private function registrationPayload(array $overrides = []): array
    {
        return array_merge([
            'full_name' => 'Test Youth Member',
            'username' => 'test.youth',
            'phone' => '0712345678',
            'email' => 'test.member@example.com',
            'gender' => 'male',
            'dob' => '2005-06-20',
            'local_church_id' => $this->localChurchId,
            'program_id' => $this->programId,
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ], $overrides);
    }

    public function test_member_registers_successfully(): void
    {
        $response = $this->postJson(
            '/api/v1/members',
            $this->registrationPayload()
        );

        $response
            ->assertCreated()
            ->assertJsonPath('data.full_name', 'Test Youth Member');

        $this->assertDatabaseCount('members', 1);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_multiple_members_can_share_the_same_email(): void
    {
        $this->postJson(
            '/api/v1/members',
            $this->registrationPayload([
                'username' => 'first.member',
            ])
        )->assertCreated();

        $this->postJson(
            '/api/v1/members',
            $this->registrationPayload([
                'full_name' => 'Second Youth Member',
                'username' => 'second.member',
            ])
        )->assertCreated();

        $this->assertDatabaseCount('users', 2);

        $this->assertSame(
            2,
            User::where('email', 'test.member@example.com')->count()
        );
    }

    public function test_multiple_members_can_share_the_same_phone(): void
    {
        $this->postJson(
            '/api/v1/members',
            $this->registrationPayload([
                'username' => 'first.member',
            ])
        )->assertCreated();

        $this->postJson(
            '/api/v1/members',
            $this->registrationPayload([
                'full_name' => 'Second Youth Member',
                'username' => 'second.member',
            ])
        )->assertCreated();

        $this->assertSame(
            2,
            Member::where('phone', '0712345678')->count()
        );
    }

    public function test_duplicate_username_is_rejected(): void
    {
        $this->postJson(
            '/api/v1/members',
            $this->registrationPayload()
        )->assertCreated();

        $response = $this->postJson(
            '/api/v1/members',
            $this->registrationPayload([
                'full_name' => 'Second Youth Member',
            ])
        );

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['username']);

        $this->assertDatabaseCount('users', 1);
    }

    public function test_membership_numbers_are_unique(): void
    {
        $this->postJson(
            '/api/v1/members',
            $this->registrationPayload([
                'username' => 'first.member',
            ])
        )->assertCreated();

        $this->postJson(
            '/api/v1/members',
            $this->registrationPayload([
                'full_name' => 'Second Youth Member',
                'username' => 'second.member',
            ])
        )->assertCreated();

        $members = Member::all();

        $this->assertCount(2, $members);
        $this->assertNotSame(
            $members[0]->membership_no,
            $members[1]->membership_no
        );
    }

    public function test_password_is_not_exposed_in_response(): void
    {
        $response = $this->postJson(
            '/api/v1/members',
            $this->registrationPayload()
        )->assertCreated();

        $data = $response->json('data');

        $this->assertArrayNotHasKey('password', $data);
        $this->assertArrayNotHasKey('password_confirmation', $data);
    }

    public function test_invalid_registration_data_is_rejected(): void
    {
        $response = $this->postJson(
            '/api/v1/members',
            [
                'full_name' => '',
                'username' => 'ab',
                'email' => 'not-an-email',
                'dob' => '2030-01-01',
                'local_church_id' => 999999,
                'program_id' => 999999,
                'password' => 'short',
                'password_confirmation' => 'different',
            ]
        );

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'full_name',
                'username',
                'email',
                'dob',
                'local_church_id',
                'program_id',
                'password',
            ]);

        $this->assertDatabaseCount('members', 0);
        $this->assertDatabaseCount('users', 0);
    }
}
