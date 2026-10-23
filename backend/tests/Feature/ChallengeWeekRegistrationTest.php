<?php

namespace Tests\Feature;

use App\Models\Deanery;
use App\Models\LocalChurch;
use App\Models\MemberProgramEnrollment;
use App\Models\Parish;
use App\Models\Program;
use App\Models\ProgramFormField;
use Database\Seeders\ProgramFormFieldSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChallengeWeekRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_challenge_week_registration_stores_program_specific_fields_in_extra_data(): void
    {
        $program = Program::create([
            'code' => 'CHALLENGE_WEEK_2026',
            'name' => 'Challenge Week 2026',
            'description' => 'Registration for Challenge Week 2026.',
            'is_active' => true,
        ]);

        $this->seed(ProgramFormFieldSeeder::class);

        ProgramFormField::create([
            'program_id' => $program->id,
            'field_key' => 'registration_track',
            'label' => 'Registration track',
            'field_type' => 'text',
            'is_required' => false,
            'is_active' => true,
            'validation_rules' => ['nullable', 'string', 'max:80'],
            'display_order' => 80,
        ]);

        $deanery = Deanery::create([
            'name' => 'Nyeri Central Deanery',
            'code' => 'NYERI-CENTRAL',
            'description' => 'Test deanery.',
            'is_active' => true,
        ]);

        $parish = Parish::create([
            'deanery_id' => $deanery->id,
            'name' => 'St. Mary Parish',
            'code' => 'ST-MARY-NYERI',
            'description' => 'Test parish.',
            'is_active' => true,
        ]);

        $localChurch = LocalChurch::create([
            'parish_id' => $parish->id,
            'name' => 'St. Joseph Local Church',
            'code' => 'ST-JOSEPH',
            'description' => 'Test local church.',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/members', [
            'full_name' => 'Grace Wambui',
            'username' => 'grace.challenge',
            'phone' => '0711223344',
            'email' => 'grace@example.com',
            'gender' => 'female',
            'dob' => '2008-02-14',
            'local_church_id' => $localChurch->id,
            'program_id' => $program->id,
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'preferred_activity' => 'music',
            'emergency_contact_name' => 'Mary Wambui',
            'emergency_contact_phone' => '0722334455',
            'medical_notes' => 'No allergies',
            'consent' => true,
            'registration_track' => 'Community service',
        ]);

        $response->assertCreated();

        $enrollment = MemberProgramEnrollment::query()
            ->where('program_id', $program->id)
            ->firstOrFail();

        $this->assertSame('music', $enrollment->extra_data['preferred_activity']);
        $this->assertSame('Mary Wambui', $enrollment->extra_data['emergency_contact_name']);
        $this->assertTrue($enrollment->extra_data['consent']);
        $this->assertSame('Community service', $enrollment->extra_data['registration_track']);
    }
}
