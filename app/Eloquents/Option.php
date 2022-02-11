<?php

namespace App\Eloquents;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * @property int $id
 * @property int $question_id
 * @property string $name
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class Option extends Model
{
    use LogsActivity;

    protected static $logName = 'option';

    protected static $logAttributes = [
        'id',
        'question.id',
        'name'
    ];

    protected static $logOnlyDirty = true;

    protected $fillable = [
        'question_id',
        'name'
    ];

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
