<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
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
                'exists:local_churches,id',
            ],

            'program_id' => [
                'required',
                'integer',
                'exists:programs,id',
            ],

            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ];
    }
}
