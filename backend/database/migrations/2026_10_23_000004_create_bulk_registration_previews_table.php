<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bulk_registration_previews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('admin_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('program_id')->constrained('programs')->cascadeOnDelete();
            $table->string('file_hash', 64);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();

            $table->index(['admin_user_id', 'expires_at', 'consumed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bulk_registration_previews');
    }
};
