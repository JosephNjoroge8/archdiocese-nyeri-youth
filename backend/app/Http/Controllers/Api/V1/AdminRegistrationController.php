<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MemberProgramEnrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminRegistrationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:pending,approved,rejected'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $registrations = MemberProgramEnrollment::query()
            ->with([
                'member.user',
                'member.localChurch.parish',
                'program',
            ])
            ->when(
                $filters['status'] ?? null,
                fn ($query, string $status) => $query->where('status', $status),
            )
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->whereHas('member', function ($memberQuery) use ($search): void {
                    $memberQuery->where(function ($memberQuery) use ($search): void {
                        $memberQuery
                            ->where('full_name', 'like', "%{$search}%")
                            ->orWhere('membership_no', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhereHas('user', fn ($userQuery) => $userQuery
                                ->where('username', 'like', "%{$search}%"));
                    });
                });
            })
            ->latest('registration_date')
            ->latest('id')
            ->paginate(20);

        return response()->json([
            'data' => $registrations->getCollection()->map(fn (MemberProgramEnrollment $registration): array => [
                'id' => $registration->id,
                'status' => $registration->status,
                'registration_date' => $registration->registration_date->toDateString(),
                'program' => [
                    'id' => $registration->program->id,
                    'name' => $registration->program->name,
                ],
                'member' => [
                    'id' => $registration->member->id,
                    'full_name' => $registration->member->full_name,
                    'membership_no' => $registration->member->membership_no,
                    'username' => $registration->member->user->username,
                    'phone' => $registration->member->phone,
                    'email' => $registration->member->email,
                    'local_church' => $registration->member->localChurch->name,
                    'parish' => $registration->member->localChurch->parish->name,
                ],
            ]),
            'meta' => [
                'current_page' => $registrations->currentPage(),
                'last_page' => $registrations->lastPage(),
                'total' => $registrations->total(),
            ],
        ]);
    }

    public function update(Request $request, MemberProgramEnrollment $registration): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:pending,approved,rejected'],
        ]);

        DB::transaction(fn () => $registration->update([
            'status' => $validated['status'],
        ]));

        return response()->json([
            'message' => 'Registration status updated.',
            'data' => [
                'id' => $registration->id,
                'status' => $registration->status,
            ],
        ]);
    }
}
