<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The column may already exist because an earlier attempt
        // partially completed this migration.
        if (! Schema::hasColumn('users', 'username')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('username', 100)
                    ->nullable()
                    ->after('name');
            });
        }

        // Give every existing user a unique username.
        // Handle both NULL and empty-string values.
        DB::table('users')
            ->orderBy('id')
            ->each(function ($user) {
                if ($user->username === null || $user->username === '') {
                    DB::table('users')
                        ->where('id', $user->id)
                        ->update([
                            'username' => 'user_' . $user->id,
                        ]);
                }
            });

        // Add the unique constraint only if it does not already exist.
        $indexes = Schema::getIndexes('users');

        $hasUsernameUnique = collect($indexes)
            ->contains(fn (array $index) =>
                $index['name'] === 'users_username_unique'
            );

        if (! $hasUsernameUnique) {
            Schema::table('users', function (Blueprint $table) {
                $table->unique('username');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'username')) {
            return;
        }

        $indexes = Schema::getIndexes('users');

        $hasUsernameUnique = collect($indexes)
            ->contains(fn (array $index) =>
                $index['name'] === 'users_username_unique'
            );

        if ($hasUsernameUnique) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropUnique('users_username_unique');
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('username');
        });
    }
};
