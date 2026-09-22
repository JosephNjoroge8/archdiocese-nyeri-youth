<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMemberRequest;
use App\Http\Resources\MemberResource;
use App\Models\Member;
use App\Models\MemberProgramEnrollment;
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

            MemberProgramEnrollment::create([
                'member_id' => $member->id,
                'program_id' => $request->integer('program_id'),
                'registration_date' => now()->toDateString(),
                'status' => 'active',
            ]);

            return $member;
        });

        $member->load([
            'localChurch',
            'programs',
        ]);

        return new MemberResource($member);
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
