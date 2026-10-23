<?php

namespace Tests\Feature;

use App\Models\Program;
use App\Models\ProgramFormField;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProgramFormFieldsEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_program_form_fields_are_available_without_authentication(): void
    {
        $program = Program::create([
            'code' => 'TEST_PROGRAM',
            'name' => 'Test Program',
            'description' => 'Test program.',
            'is_active' => true,
        ]);

        ProgramFormField::create([
            'program_id' => $program->id,
            'field_key' => 'gender',
            'label' => 'Gender',
            'field_type' => 'select',
            'is_required' => false,
            'is_active' => true,
            'options' => [
                ['value' => 'male', 'label' => 'Male'],
                ['value' => 'female', 'label' => 'Female'],
            ],
            'validation_rules' => ['nullable', 'string'],
            'display_order' => 10,
        ]);

        ProgramFormField::create([
            'program_id' => $program->id,
            'field_key' => 'dob',
            'label' => 'Date of Birth',
            'field_type' => 'date',
            'is_required' => false,
            'is_active' => true,
            'options' => null,
            'validation_rules' => ['nullable', 'date'],
            'display_order' => 20,
        ]);

        $response = $this->getJson("/api/v1/programs/{$program->id}/form-fields");

        $response
            ->assertOk()
            ->assertJsonPath('program.id', $program->id)
            ->assertJsonPath('program.name', 'Test Program')
            ->assertJsonCount(2, 'fields');

        $this->assertSame('gender', $response->json('fields.0.field_key'));
        $this->assertSame('dob', $response->json('fields.1.field_key'));
    }

    public function test_form_fields_are_not_available_for_inactive_programs(): void
    {
        $program = Program::create([
            'code' => 'INACTIVE_PROGRAM',
            'name' => 'Inactive Program',
            'description' => 'Inactive program.',
            'is_active' => false,
        ]);

        $this->getJson("/api/v1/programs/{$program->id}/form-fields")
            ->assertNotFound();
    }
}
