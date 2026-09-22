<?php

namespace Database\Seeders;

use App\Models\Program;
use Illuminate\Database\Seeder;

class ProgramSeeder extends Seeder
{
    public function run(): void
    {
        $programs = [
            [
                'code' => 'YOUTH_IN_PARISHES',
                'name' => 'Youth in Parishes',
                'description' => 'Registration and management of youth within parishes.',
            ],
            [
                'code' => 'JUNIOR_YOUTH',
                'name' => 'Junior Youth',
                'description' => 'Registration and management of Junior Youth.',
            ],
            [
                'code' => 'NICCA',
                'name' => 'NICCA',
                'description' => 'Registration for Catholic students in universities, colleges and TVET institutions.',
            ],
            [
                'code' => 'SECONDARY_SCHOOL_YOUTH',
                'name' => 'Youth in Secondary Schools',
                'description' => 'Registration and management of youth in secondary schools.',
            ],
            [
                'code' => 'CAREER_GUIDANCE',
                'name' => 'Career Guidance',
                'description' => 'Career guidance and related youth registration.',
            ],
            [
                'code' => 'CHALLENGE_WEEK_2026',
                'name' => 'Challenge Week 2026',
                'description' => 'Registration for Challenge Week 2026.',
            ],
        ];

        foreach ($programs as $program) {
            Program::updateOrCreate(
                ['code' => $program['code']],
                $program
            );
        }
    }
}
