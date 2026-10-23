<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LocalChurch;
use Illuminate\Http\JsonResponse;

class LocalChurchController extends Controller
{
    /**
     * Return active local churches for the public registration form.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => LocalChurch::query()
                ->where('is_active', true)
                ->with('parish.deanery')
                ->orderBy('name')
                ->get([
                    'id',
                    'name',
                    'code',
                    'parish_id',
                    'description',
                    'is_active',
                ])
                ->map(fn ($church) => [
                    'id' => $church->id,
                    'name' => $church->name,
                    'code' => $church->code,
                    'description' => $church->description,
                    'parish' => $church->parish ? [
                        'id' => $church->parish->id,
                        'name' => $church->parish->name,
                        'deanery' => $church->parish->deanery ? [
                            'id' => $church->parish->deanery->id,
                            'name' => $church->parish->deanery->name,
                        ] : null,
                    ] : null,
                ]),
        ]);
    }
}
