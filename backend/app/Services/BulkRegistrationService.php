<?php

namespace App\Services;

use App\Models\Program;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BulkRegistrationService
{
    private const SHARED_COLUMNS = [
        'full_name',
        'username',
        'phone',
        'email',
        'gender',
        'dob',
        'local_church_id',
    ];

    public function preview(UploadedFile $file, Program $program): array
    {
        $formFields = $program->formFields()->where('is_active', true)->get();
        $allowedColumns = array_values(array_unique([
            ...self::SHARED_COLUMNS,
            ...$formFields->pluck('field_key')->all(),
        ]));

        $handle = fopen($file->getRealPath(), 'rb');
        if ($handle === false) {
            throw ValidationException::withMessages([
                'file' => ['The uploaded CSV could not be read.'],
            ]);
        }

        try {
            $headers = fgetcsv($handle, null, ',', '"', '\\');
            if ($headers === false) {
                throw ValidationException::withMessages([
                    'file' => ['The CSV file is empty.'],
                ]);
            }

            $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $headers[0]);
            $headers = array_map(fn ($header): string => trim((string) $header), $headers);

            if (count($headers) !== count(array_unique($headers))) {
                throw ValidationException::withMessages([
                    'file' => ['The CSV contains duplicate column names.'],
                ]);
            }

            $missingColumns = array_diff(['full_name', 'username', 'local_church_id'], $headers);
            if ($missingColumns !== []) {
                throw ValidationException::withMessages([
                    'file' => ['Missing required columns: '.implode(', ', $missingColumns).'.'],
                ]);
            }

            $unknownColumns = array_diff($headers, $allowedColumns);
            if ($unknownColumns !== []) {
                throw ValidationException::withMessages([
                    'file' => ['Unsupported columns: '.implode(', ', $unknownColumns).'.'],
                ]);
            }

            $rows = [];
            $seenUsernames = [];
            $lineNumber = 1;

            while (($values = fgetcsv($handle, null, ',', '"', '\\')) !== false) {
                $lineNumber++;
                if ($values === [null] || (count($values) === 1 && trim((string) $values[0]) === '')) {
                    continue;
                }

                if (count($rows) >= 500) {
                    throw ValidationException::withMessages([
                        'file' => ['A CSV may contain no more than 500 data rows.'],
                    ]);
                }

                $data = [];
                $errors = [];

                if (count($values) !== count($headers)) {
                    $errors['_row'][] = 'The number of values does not match the CSV columns.';
                } else {
                    $data = array_combine($headers, array_map(
                        fn ($value): ?string => trim((string) $value) === '' ? null : trim((string) $value),
                        $values,
                    ));

                    $validator = Validator::make($data, $this->rules($formFields->all()));
                    if ($validator->fails()) {
                        $errors = $validator->errors()->toArray();
                    }

                    $username = strtolower((string) ($data['username'] ?? ''));
                    if ($username !== '' && isset($seenUsernames[$username])) {
                        $errors['username'][] = 'This username is duplicated in the CSV.';
                    }
                    if ($username !== '') {
                        $seenUsernames[$username] = true;
                    }
                }

                $rows[] = [
                    'row' => $lineNumber,
                    'values' => $data,
                    'valid' => $errors === [],
                    'errors' => $errors,
                ];
            }

            if ($rows === []) {
                throw ValidationException::withMessages([
                    'file' => ['The CSV contains no data rows.'],
                ]);
            }

            return [
                'rows' => $rows,
                'meta' => [
                    'total' => count($rows),
                    'valid' => count(array_filter($rows, fn (array $row): bool => $row['valid'])),
                    'invalid' => count(array_filter($rows, fn (array $row): bool => ! $row['valid'])),
                ],
            ];
        } finally {
            fclose($handle);
        }
    }

    private function rules(array $formFields): array
    {
        $rules = [
            'full_name' => ['required', 'string', 'max:255'],
            'username' => [
                'required',
                'string',
                'min:3',
                'max:100',
                'regex:/^[A-Za-z0-9._-]+$/',
                Rule::unique('users', 'username'),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'gender' => ['nullable', 'string', 'max:30'],
            'dob' => ['nullable', 'date', 'before_or_equal:today'],
            'local_church_id' => [
                'required',
                'integer',
                Rule::exists('local_churches', 'id')->where('is_active', true),
            ],
        ];

        foreach ($formFields as $field) {
            $fieldRules = array_values(array_filter(
                $field->validation_rules ?? [],
                fn (string $rule): bool => ! in_array($rule, ['required', 'nullable', 'sometimes'], true),
            ));
            if ($field->field_type === 'select' && is_array($field->options)) {
                $options = array_column($field->options, 'value');
                if ($options !== []) {
                    $fieldRules[] = Rule::in($options);
                }
            }
            $rules[$field->field_key] = [
                $field->is_required ? 'required' : 'nullable',
                ...$fieldRules,
            ];
        }

        return $rules;
    }
}
