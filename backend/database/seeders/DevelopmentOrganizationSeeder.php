<?php

namespace Database\Seeders;

use App\Models\Deanery;
use App\Models\Parish;
use App\Models\LocalChurch;
use Illuminate\Database\Seeder;

class DevelopmentOrganizationSeeder extends Seeder
{
    public function run(): void
    {
        $deanery = Deanery::updateOrCreate(
            ['code' => 'NYERI-CENTRAL'],
            [
                'name' => 'Nyeri Central Deanery',
                'description' => 'Development deanery for local testing.',
                'is_active' => true,
            ]
        );

        $parish = Parish::updateOrCreate(
            [
                'deanery_id' => $deanery->id,
                'code' => 'ST-MARY-NYERI',
            ],
            [
                'name' => 'St. Mary Parish',
                'description' => 'Development parish for local testing.',
                'is_active' => true,
            ]
        );

        LocalChurch::updateOrCreate(
            [
                'parish_id' => $parish->id,
                'code' => 'ST-JOSEPH',
            ],
            [
                'name' => 'St. Joseph Local Church',
                'description' => 'Development local church for local testing.',
                'is_active' => true,
            ]
        );
    }
}
