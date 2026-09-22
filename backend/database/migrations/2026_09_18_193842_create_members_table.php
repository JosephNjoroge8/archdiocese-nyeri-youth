<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('members', function (Blueprint $table) {
            $table->id();

            // Stable public identifier
            $table->uuid('uuid')->unique();

            // Authentication account
            $table->foreignId('user_id')
                ->unique()
                ->constrained('users')
                ->cascadeOnDelete();

            // Personal information
            $table->string('full_name');
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('gender', 30)->nullable();
            $table->date('dob')->nullable();

            // Church hierarchy
            $table->foreignId('local_church_id')
                ->constrained('local_churches')
                ->restrictOnDelete();

            // System-generated membership number
            $table->string('membership_no', 50)->unique();

            // Account/member status
            $table->string('status', 30)->default('active');

            // Profile photo
            $table->string('photo_path')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Frequently used query indexes
            $table->index('phone');
            $table->index('email');
            $table->index('full_name');
            $table->index(['local_church_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('members');
    }
};
