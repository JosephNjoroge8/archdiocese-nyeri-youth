<?php

namespace App\Http\Requests;

use App\Models\Program;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'full_name' => [
                'required',
                'string',
                'max:255',
            ],

            'username' => [
                'required',
                'string',
                'min:3',
                'max:100',
                'regex:/^[A-Za-z0-9._-]+$/',
                'unique:users,username',
            ],

            'phone' => [
                'nullable',
                'string',
                'max:30',
            ],

            'email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'gender' => [
                'nullable',
                'string',
                'max:30',
            ],

            'dob' => [
                'nullable',
                'date',
                'before_or_equal:today',
            ],

            'local_church_id' => [
                'required',
                'integer',
                Rule::exists('local_churches', 'id')->where('is_active', true),
            ],

            'program_id' => [
                'required',
                'integer',
                Rule::exists('programs', 'id')->where('is_active', true),
            ],

            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],

            'preferred_activity' => ['nullable', 'string', 'max:255'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30'],
            'medical_notes' => ['nullable', 'string', 'max:1000'],
            'consent' => ['nullable', 'boolean'],
        ];

        $programId = $this->integer('program_id');

        if ($programId > 0) {
            $program = Program::query()->with('formFields')->find($programId);

            if ($program) {
                foreach ($program->formFields()->where('is_active', true)->get() as $field) {
                    $fieldRules = $field->validation_rules ?? [];

                    if ($field->is_required) {
                        $fieldRules = array_merge(['required'], $fieldRules);
                    } else {
                        $fieldRules = array_merge(['nullable'], $fieldRules);
                    }

                    $rules[$field->field_key] = $fieldRules;
                }
            }
        }

        return $rules;
    }
}
