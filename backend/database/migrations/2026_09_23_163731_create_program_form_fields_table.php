<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('program_form_fields', function (Blueprint $table) {
            $table->id();

            $table->foreignId('program_id')
                ->constrained('programs')
                ->cascadeOnDelete();

            $table->string('field_key', 100);
            $table->string('label', 255);
            $table->string('field_type', 50);

            $table->boolean('is_required')->default(false);
            $table->boolean('is_active')->default(true);

            $table->json('options')->nullable();
            $table->json('validation_rules')->nullable();

            $table->unsignedInteger('display_order')->default(0);

            $table->timestamps();

            $table->unique(['program_id', 'field_key']);
            $table->index(['program_id', 'is_active']);
            $table->index(['program_id', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program_form_fields');
    }
};
