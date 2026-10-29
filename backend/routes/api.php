<?php

use App\Http\Controllers\Api\V1\AdminRegistrationController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BulkRegistrationController;
use App\Http\Controllers\Api\V1\LocalChurchController;
use App\Http\Controllers\Api\V1\MemberController;
use App\Http\Controllers\Api\V1\MemberSetupController;
use App\Http\Controllers\Api\V1\ProgramController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public routes
    Route::get('/programs', [ProgramController::class, 'index']);
    Route::get('/local-churches', [LocalChurchController::class, 'index']);
    Route::post('/members', [MemberController::class, 'store']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/admin/auth/login', [AuthController::class, 'adminLogin'])->middleware('throttle:6,1');
    Route::post('/auth/first-login', [MemberSetupController::class, 'store'])->middleware('throttle:6,1');
    Route::get('/programs/{program}/form-fields', [ProgramController::class, 'formFields']);

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::middleware('can:manage-registrations')->prefix('admin')->group(function () {
            Route::get('/registrations', [AdminRegistrationController::class, 'index']);
            Route::patch('/registrations/{registration}', [AdminRegistrationController::class, 'update']);
            Route::post('/registrations/{registration}/setup-link', [AdminRegistrationController::class, 'createSetupLink']);
            Route::post('/bulk-registrations/preview', [BulkRegistrationController::class, 'preview']);
            Route::post('/bulk-registrations/import', [BulkRegistrationController::class, 'import']);
        });
    });
});
