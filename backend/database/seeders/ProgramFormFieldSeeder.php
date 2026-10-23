<?php

namespace Database\Seeders;

use App\Models\Program;
use App\Models\ProgramFormField;
use Illuminate\Database\Seeder;

class ProgramFormFieldSeeder extends Seeder
{
    public function run(): void
    {
        $programs = Program::query()
            ->whereIn('code', [
                'YOUTH_IN_PARISHES',
                'JUNIOR_YOUTH',
                'NICCA',
                'SECONDARY_SCHOOL_YOUTH',
                'CAREER_GUIDANCE',
                'CHALLENGE_WEEK_2026',
            ])
            ->get()
            ->keyBy('code');

        $sharedFields = [
            [
                'field_key' => 'gender',
                'label' => 'Gender',
                'field_type' => 'select',
                'is_required' => false,
                'options' => [
                    ['value' => 'male', 'label' => 'Male'],
                    ['value' => 'female', 'label' => 'Female'],
                    ['value' => 'other', 'label' => 'Other'],
                    ['value' => 'prefer_not_to_say', 'label' => 'Prefer not to say'],
                ],
                'validation_rules' => [
                    'nullable',
                    'string',
                    'max:30',
                ],
                'display_order' => 10,
            ],
            [
                'field_key' => 'dob',
                'label' => 'Date of Birth',
                'field_type' => 'date',
                'is_required' => false,
                'options' => null,
                'validation_rules' => [
                    'nullable',
                    'date',
                    'before_or_equal:today',
                ],
                'display_order' => 20,
            ],
        ];

        $challengeWeekFields = [
            [
                'field_key' => 'preferred_activity',
                'label' => 'Preferred activity',
                'field_type' => 'text',
                'is_required' => true,
                'options' => null,
                'validation_rules' => [
                    'required',
                    'string',
                    'max:255',
                ],
                'display_order' => 30,
            ],
            [
                'field_key' => 'emergency_contact_name',
                'label' => 'Emergency contact name',
                'field_type' => 'text',
                'is_required' => true,
                'options' => null,
                'validation_rules' => [
                    'required',
                    'string',
                    'max:255',
                ],
                'display_order' => 40,
            ],
            [
                'field_key' => 'emergency_contact_phone',
                'label' => 'Emergency contact phone',
                'field_type' => 'text',
                'is_required' => true,
                'options' => null,
                'validation_rules' => [
                    'required',
                    'string',
                    'max:30',
                ],
                'display_order' => 50,
            ],
            [
                'field_key' => 'medical_notes',
                'label' => 'Medical notes (optional)',
                'field_type' => 'textarea',
                'is_required' => false,
                'options' => null,
                'validation_rules' => [
                    'nullable',
                    'string',
                    'max:1000',
                ],
                'display_order' => 60,
            ],
            [
                'field_key' => 'consent',
                'label' => 'I agree to the Challenge Week participation terms and safeguarding requirements.',
                'field_type' => 'checkbox',
                'is_required' => true,
                'options' => null,
                'validation_rules' => [
                    'required',
                    'boolean',
                ],
                'display_order' => 70,
            ],
        ];

        foreach ($programs as $program) {
            $fields = $sharedFields;

            if ($program->code === 'CHALLENGE_WEEK_2026') {
                $fields = array_merge($fields, $challengeWeekFields);
            }

            foreach ($fields as $field) {
                ProgramFormField::updateOrCreate(
                    [
                        'program_id' => $program->id,
                        'field_key' => $field['field_key'],
                    ],
                    [
                        ...$field,
                        'is_active' => true,
                    ],
                );
            }
        }
    }
}
