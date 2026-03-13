<?php

namespace App\Eloquents;

use Illuminate\Database\Eloquent\Factories\HasFactory;

use Illuminate\Database\Eloquent\Model;

class ContactCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
    ];
}
