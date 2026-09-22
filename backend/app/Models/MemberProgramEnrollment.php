<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberProgramEnrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'program_id',
        'extra_data',
        'registration_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'extra_data' => 'array',
            'registration_date' => 'date',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }
}
