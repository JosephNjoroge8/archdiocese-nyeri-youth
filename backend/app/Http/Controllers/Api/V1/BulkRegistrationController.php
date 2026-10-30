<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BulkRegistrationPreview;
use App\Models\Member;
use App\Models\MemberProgramEnrollment;
use App\Models\Program;
use App\Models\ProgramFormField;
use App\Models\User;
use App\Services\BulkRegistrationService;
use App\Services\MemberSetupLinkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BulkRegistrationController extends Controller
{
    public function preview(Request $request, BulkRegistrationService $bulkRegistrationService): JsonResponse
    {
        $validated = $request->validate([
            'program_id' => ['required', 'integer', 'exists:programs,id'],
            'file' => ['required', 'file', 'max:5120', 'mimes:csv,txt'],
        ]);

        $program = Program::query()
            ->where('is_active', true)
            ->findOrFail($validated['program_id']);

        $preview = $bulkRegistrationService->preview(
            $request->file('file'),
            $program,
        );
        $previewRecord = BulkRegistrationPreview::create([
            'id' => (string) Str::uuid(),
            'admin_user_id' => $request->user()->id,
            'program_id' => $program->id,
            'file_hash' => hash_file('sha256', $request->file('file')->getRealPath()),
            'expires_at' => now()->addMinutes(30),
        ]);

        return response()->json([
            ...$preview,
            'preview_id' => $previewRecord->id,
        ]);
    }

    public function import(
        Request $request,
        BulkRegistrationService $bulkRegistrationService,
        MemberSetupLinkService $memberSetupLinkService,
    ): JsonResponse {
        $validated = $request->validate([
            'program_id' => ['required', 'integer', 'exists:programs,id'],
            'file' => ['required', 'file', 'max:5120', 'mimes:csv,txt'],
            'preview_id' => ['required', 'uuid'],
        ]);

        $program = Program::query()
            ->where('is_active', true)
            ->findOrFail($validated['program_id']);
        $formFieldKeys = ProgramFormField::query()
            ->where('program_id', $program->id)
            ->where('is_active', true)
            ->pluck('field_key')
            ->all();

        $importResult = DB::transaction(function () use (
            $program,
            $formFieldKeys,
            $bulkRegistrationService,
            $memberSetupLinkService,
            $request,
            $validated,
        ): array {
            $previewRecord = BulkRegistrationPreview::query()
                ->whereKey($validated['preview_id'])
                ->where('admin_user_id', $request->user()->id)
                ->lockForUpdate()
                ->first();

            if (
                ! $previewRecord
                || (int) $previewRecord->program_id !== (int) $program->id
                || $previewRecord->consumed_at !== null
                || $previewRecord->expires_at->isPast()
                || ! hash_equals(
                    $previewRecord->file_hash,
                    hash_file('sha256', $request->file('file')->getRealPath()),
                )
            ) {
                throw ValidationException::withMessages([
                    'preview_id' => ['This preview is invalid, expired, already imported, or does not match the uploaded CSV. Preview the file again.'],
                ]);
            }

            $currentPreview = $bulkRegistrationService->preview(
                $request->file('file'),
                $program,
            );
            $results = [];

            foreach ($currentPreview['rows'] as $row) {
                if (! $row['valid']) {
                    continue;
                }

                $data = $row['values'];
                $user = User::create([
                    'name' => $data['full_name'],
                    'username' => $data['username'],
                    'email' => $data['email'] ?? null,
                    'password' => Str::random(64),
                    'password_is_temporary' => true,
                ]);

                $member = Member::create([
                    'uuid' => (string) Str::uuid(),
                    'user_id' => $user->id,
                    'full_name' => $data['full_name'],
                    'phone' => $data['phone'] ?? null,
                    'email' => $data['email'] ?? null,
                    'gender' => $data['gender'] ?? null,
                    'dob' => $data['dob'] ?? null,
                    'local_church_id' => (int) $data['local_church_id'],
                    'membership_no' => $this->generateMembershipNumber(),
                    'status' => 'active',
                ]);

                $extraData = array_filter(
                    array_intersect_key($data, array_flip($formFieldKeys)),
                    fn ($value): bool => $value !== null && $value !== '',
                );

                $enrollment = MemberProgramEnrollment::create([
                    'member_id' => $member->id,
                    'program_id' => $program->id,
                    'extra_data' => $extraData,
                    'registration_date' => now()->toDateString(),
                    'status' => 'pending',
                ]);

                $results[] = [
                    'row' => $row['row'],
                    'full_name' => $member->full_name,
                    'username' => $user->username,
                    'membership_no' => $member->membership_no,
                    'registration_id' => $enrollment->id,
                    'setup_url' => $memberSetupLinkService->create($user),
                ];
            }

            $previewRecord->forceFill(['consumed_at' => now()])->save();

            return [
                'imported' => $results,
                'preview' => $currentPreview,
            ];
        });
        $imported = $importResult['imported'];
        $preview = $importResult['preview'];

        return response()->json([
            'message' => 'Valid rows imported. Distribute the one-time setup links securely.',
            'data' => $imported,
            'meta' => [
                'imported' => count($imported),
                'skipped' => $preview['meta']['invalid'],
                'total' => $preview['meta']['total'],
            ],
            'skipped_rows' => array_values(array_filter(
                $preview['rows'],
                fn (array $row): bool => ! $row['valid'],
            )),
        ], 201);
    }

    private function generateMembershipNumber(): string
    {
        do {
            $number = 'ANY-'.now()->format('Y').'-'.strtoupper(Str::random(8));
        } while (Member::query()->where('membership_no', $number)->exists());

        return $number;
    }
}
