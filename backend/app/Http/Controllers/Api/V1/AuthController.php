<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Authenticate a user and issue a Sanctum access token.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'username' => [
                'required',
                'string',
                'max:100',
            ],
            'password' => [
                'required',
                'string',
            ],
        ]);

        $user = User::query()
            ->where('username', $credentials['username'])
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'username' => [
                    'The provided credentials are incorrect.',
                ],
            ]);
        }

        if ($user->password_is_temporary) {
            throw ValidationException::withMessages([
                'username' => ['Set your password using your setup link before signing in.'],
            ]);
        }

        $user->load([
            'member.localChurch.parish.deanery',
            'member.programs',
        ]);

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'member' => $user->member,
            ],
        ]);
    }

    /**
     * Authenticate an administrator without issuing tokens to member accounts.
     */
    public function adminLogin(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'username' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->where('username', $credentials['username'])
            ->first();

        if (! $user || ! $user->is_admin || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['The provided credentials are incorrect.'],
            ]);
        }

        return response()->json([
            'message' => 'Login successful.',
            'token' => $user->createToken('admin-api-token')->plainTextToken,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'is_admin' => true,
            ],
        ]);
    }

    /**
     * Return the authenticated user's profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $user->load([
            'member.localChurch.parish.deanery',
            'member.programs',
        ]);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'member' => $user->member,
            ],
        ]);
    }

    /**
     * Revoke the current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout successful.',
        ]);
    }
}
