<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MemberSetupToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class MemberSetupController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'size:64'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        DB::transaction(function () use ($validated): void {
            $setupToken = MemberSetupToken::query()
                ->where('token_hash', hash('sha256', $validated['token']))
                ->whereNull('used_at')
                ->where('expires_at', '>', now())
                ->lockForUpdate()
                ->first();

            if (! $setupToken || ! $setupToken->user->password_is_temporary) {
                throw ValidationException::withMessages([
                    'token' => ['This setup link is invalid, expired, or already used.'],
                ]);
            }

            $setupToken->user->forceFill([
                'password' => Hash::make($validated['password']),
                'password_is_temporary' => false,
            ])->save();

            $setupToken->forceFill(['used_at' => now()])->save();

            MemberSetupToken::query()
                ->where('user_id', $setupToken->user_id)
                ->whereNull('used_at')
                ->where('id', '!=', $setupToken->id)
                ->update(['used_at' => now()]);
        });

        return response()->json([
            'message' => 'Password set successfully. You can now sign in.',
        ]);
    }
}
