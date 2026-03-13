<?php

namespace App\Eloquents;

use Illuminate\Database\Eloquent\Factories\HasFactory;

use Illuminate\Database\Eloquent\Relations\Pivot;

class Read extends Pivot
{
    use HasFactory;

    protected $table = 'reads';
    public $incrementing = true;
}
