<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Member extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'user_id',
        'full_name',
        'phone',
        'email',
        'gender',
        'dob',
        'local_church_id',
        'membership_no',
        'status',
        'photo_path',
    ];

    protected function casts(): array
    {
        return [
            'dob' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function localChurch(): BelongsTo
    {
        return $this->belongsTo(LocalChurch::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(MemberProgramEnrollment::class);
    }

    public function programs(): BelongsToMany
    {
        return $this->belongsToMany(
            Program::class,
            'member_program_enrollments'
        )->withPivot([
            'extra_data',
            'registration_date',
            'status',
        ])->withTimestamps();
    }
}
