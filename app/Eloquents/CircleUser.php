<?php

namespace App\Eloquents;

use Illuminate\Database\Eloquent\Factories\HasFactory;

use Illuminate\Database\Eloquent\Relations\Pivot;

class CircleUser extends Pivot
{
    use HasFactory;

    public $incrementing = true;

    protected $casts = [
        'is_leader' => 'bool',
    ];

    /**
     * All of the relationships to be touched.
     *
     * @var array
     */
    protected $touches = ['circle'];

    public function circle()
    {
        return $this->belongsTo(Circle::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
