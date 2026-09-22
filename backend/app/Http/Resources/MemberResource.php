<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'membership_no' => $this->membership_no,

            'full_name' => $this->full_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'gender' => $this->gender,
            'dob' => $this->dob?->toDateString(),

            'status' => $this->status,

            'local_church' => $this->whenLoaded(
                'localChurch',
                fn () => [
                    'id' => $this->localChurch->id,
                    'name' => $this->localChurch->name,
                    'code' => $this->localChurch->code,
                ]
            ),

            'programs' => $this->whenLoaded(
                'programs',
                fn () => $this->programs->map(fn ($program) => [
                    'id' => $program->id,
                    'code' => $program->code,
                    'name' => $program->name,
                    'status' => $program->pivot->status,
                    'registration_date' => $program->pivot->registration_date,
                ])
            ),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
