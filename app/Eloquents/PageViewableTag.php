<?php

namespace App\Eloquents;

use Illuminate\Database\Eloquent\Factories\HasFactory;

use Illuminate\Database\Eloquent\Relations\Pivot;
use Spatie\Activitylog\Traits\LogsActivity;

class PageViewableTag extends Pivot
{
    use HasFactory;

    public function page()
    {
        return $this->belongsTo(Page::class);
    }

    public function tag()
    {
        return $this->belongsTo(Tag::class);
    }

    public $incrementing = true;
}
