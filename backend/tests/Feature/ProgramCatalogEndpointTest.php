<?php

namespace Tests\Feature;

use App\Models\Deanery;
use App\Models\LocalChurch;
use App\Models\Parish;
use App\Models\Program;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProgramCatalogEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_programs_and_local_churches_are_publicly_available(): void
    {
        Program::create([
            'code' => 'CHALLENGE_WEEK_2026',
            'name' => 'Challenge Week 2026',
            'description' => 'Registration for Challenge Week 2026.',
            'is_active' => true,
        ]);

        Program::create([
            'code' => 'INACTIVE_PROGRAM',
            'name' => 'Inactive Program',
            'description' => 'Inactive program.',
            'is_active' => false,
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

        LocalChurch::create([
            'parish_id' => $parish->id,
            'name' => 'St. Joseph Local Church',
            'code' => 'ST-JOSEPH',
            'description' => 'Test local church.',
            'is_active' => true,
        ]);

        $programsResponse = $this->getJson('/api/v1/programs');
        $programsResponse
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Challenge Week 2026');

        $churchesResponse = $this->getJson('/api/v1/local-churches');
        $churchesResponse
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'St. Joseph Local Church');
    }
}
