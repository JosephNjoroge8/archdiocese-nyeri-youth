<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMemberRequest;
use App\Http\Resources\MemberResource;
use App\Models\Member;
use App\Models\MemberProgramEnrollment;
use App\Models\ProgramFormField;
use App\Models\Program;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MemberController extends Controller
{
    public function store(StoreMemberRequest $request): MemberResource
    {
        $member = DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->string('full_name')->toString(),
                'username' => $request->string('username')->toString(),
                'email' => $request->input('email'),
                'password' => $request->input('password'),
            ]);

            $member = Member::create([
                'uuid' => (string) Str::uuid(),
                'user_id' => $user->id,
                'full_name' => $request->string('full_name')->toString(),
                'phone' => $request->input('phone'),
                'email' => $request->input('email'),
                'gender' => $request->input('gender'),
                'dob' => $request->input('dob'),
                'local_church_id' => $request->integer('local_church_id'),
                'membership_no' => $this->generateMembershipNumber(),
                'status' => 'active',
            ]);

            $extraData = $this->extractProgramExtraData($request);

            MemberProgramEnrollment::create([
                'member_id' => $member->id,
                'program_id' => $request->integer('program_id'),
                'extra_data' => $extraData,
                'registration_date' => now()->toDateString(),
                'status' => 'pending',
            ]);

            return $member;
        });

        $member->load([
            'localChurch',
            'programs',
        ]);

        return new MemberResource($member);
    }

    private function extractProgramExtraData(StoreMemberRequest $request): array
    {
        $programId = $request->integer('program_id');

        $fallbackKeys = [
            'preferred_activity',
            'emergency_contact_name',
            'emergency_contact_phone',
            'medical_notes',
            'consent',
            'guardian_name',
            'guardian_phone',
            'school_name',
            'class_or_form',
            'career_interest',
        ];

        $allowedKeys = ProgramFormField::query()
            ->where('program_id', $programId)
            ->where('is_active', true)
            ->pluck('field_key')
            ->all();

        if (empty($allowedKeys)) {
            $allowedKeys = $fallbackKeys;
        }

        $extraData = [];

        foreach ($allowedKeys as $key) {
            if ($request->exists($key)) {
                $value = $request->input($key);

                if ($value === null || $value === '') {
                    continue;
                }

                if (is_string($value) && strtolower($value) === 'true') {
                    $value = true;
                }

                if ($key === 'consent' || str_contains($key, 'consent')) {
                    $value = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                    if ($value === null) {
                        continue;
                    }
                }

                $extraData[$key] = $value;
            }
        }

        return $extraData;
    }

    private function generateMembershipNumber(): string
    {
        do {
            $number = 'ANY-' . now()->format('Y') . '-' . strtoupper(
                Str::random(8)
            );
        } while (Member::where('membership_no', $number)->exists());

        return $number;
    }
}
