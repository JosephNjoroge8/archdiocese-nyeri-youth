<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Program;
use Illuminate\Http\JsonResponse;

class ProgramController extends Controller
{
    /**
     * Return all active programs for the public registration catalog.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Program::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get([
                    'id',
                    'code',
                    'name',
                    'description',
                    'is_active',
                ]),
        ]);
    }

    /**
     * Return active form fields for a program.
     */
    public function formFields(Program $program): JsonResponse
    {
        abort_unless($program->is_active, 404);

        return response()->json([
            'program' => [
                'id' => $program->id,
                'code' => $program->code,
                'name' => $program->name,
            ],
            'fields' => $program->formFields()
                ->where('is_active', true)
                ->get([
                    'id',
                    'field_key',
                    'label',
                    'field_type',
                    'is_required',
                    'options',
                    'validation_rules',
                    'display_order',
                ]),
        ]);
    }
}
