<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Parish extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'deanery_id',
        'name',
        'code',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function deanery(): BelongsTo
    {
        return $this->belongsTo(Deanery::class);
    }

    public function localChurches(): HasMany
    {
        return $this->hasMany(LocalChurch::class);
    }
}
