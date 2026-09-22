<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parishes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('deanery_id')
                ->constrained('deaneries')
                ->restrictOnDelete();

            $table->string('name');
            $table->string('code', 50);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['deanery_id', 'name']);
            $table->unique(['deanery_id', 'code']);

            $table->index(['deanery_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parishes');
    }
};
