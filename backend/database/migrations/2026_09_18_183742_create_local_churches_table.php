<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('local_churches', function (Blueprint $table) {
            $table->id();

            $table->foreignId('parish_id')
                ->constrained('parishes')
                ->restrictOnDelete();

            $table->string('name');
            $table->string('code', 50);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['parish_id', 'name']);
            $table->unique(['parish_id', 'code']);

            $table->index(['parish_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('local_churches');
    }
};
