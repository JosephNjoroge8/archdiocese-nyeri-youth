<?php

namespace App\Services;

use App\Models\MemberSetupToken;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MemberSetupLinkService
{
    public function create(User $user): string
    {
        $plainTextToken = Str::random(64);

        DB::transaction(function () use ($user, $plainTextToken): void {
            MemberSetupToken::query()
                ->where('user_id', $user->id)
                ->whereNull('used_at')
                ->delete();

            MemberSetupToken::create([
                'user_id' => $user->id,
                'token_hash' => hash('sha256', $plainTextToken),
                'expires_at' => now()->addDays(7),
            ]);
        });

        $frontendUrl = rtrim((string) config('services.frontend_url', config('app.url')), '/');

        return $frontendUrl.'/set-password?token='.urlencode($plainTextToken);
    }
}
