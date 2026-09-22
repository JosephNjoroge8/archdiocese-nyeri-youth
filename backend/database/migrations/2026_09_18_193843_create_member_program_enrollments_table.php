<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_program_enrollments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('member_id')
                ->constrained('members')
                ->cascadeOnDelete();

            $table->foreignId('program_id')
                ->constrained('programs')
                ->restrictOnDelete();

            // Program-specific registration data
            $table->json('extra_data')->nullable();

            $table->date('registration_date');

            $table->string('status', 30)->default('active');

            $table->timestamps();

            // A member can only enroll once in a particular program
            $table->unique(['member_id', 'program_id']);

            $table->index(['program_id', 'status']);
            $table->index(['member_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_program_enrollments');
    }
};
