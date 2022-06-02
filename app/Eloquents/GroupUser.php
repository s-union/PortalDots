<?php

namespace App\Eloquents;

use Illuminate\Database\Eloquent\Relations\Pivot;

class GroupUser extends Pivot
{
    public $incrementing = true;

    protected $casts = [
        'is_leader' => 'bool'
    ];

    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
