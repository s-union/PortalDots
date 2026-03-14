<?php

namespace App\Eloquents;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Spatie\Activitylog\Traits\LogsActivity;

class FormAnswerableTag extends Pivot
{
    use HasFactory;

    public $incrementing = true;

    public function form()
    {
        return $this->belongsTo(Form::class);
    }

    public function tag()
    {
        return $this->belongsTo(Tag::class);
    }
}
