<?php

namespace App\Eloquents;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * @property int $id
 * @property int $form_id
 * @property-read Form $form
 * @property string $name
 * @property string $description
 * @property string $type
 * @property bool $is_required
 * @property int $number_min
 * @property int $number_max
 * @property string $allowed_types
 * @property array $allowed_types_array
 * @property int $priority
 * @property-read Carbon $created_at
 * @property-read Carbon $updated_at
 */
class Question extends Model
{
    use HasFactory;
    use LogsActivity;

    public const QUESTION_TYPES = [
        'heading',
        'text',
        'number',
        'textarea',
        'markdown',
        'radio',
        'checkbox',
        'select',
        'upload',
    ];

    protected $fillable = [
        'name',
        'description',
        'type',
        'is_required',
        'number_min',
        'number_max',
        'allowed_types',
        'options',
        'priority',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('question')
            ->logOnly([
                'id',
                'form.id',
                'form.name',
                'name',
                'description',
                'type',
                'is_required',
                'number_min',
                'number_max',
                'allowed_types',
                'options',
                'priority',
            ])
            ->logOnlyDirty();
    }

    protected static function boot()
    {
        parent::boot();

        static::addGlobalScope('priority', function (Builder $builder) {
            $builder->orderBy('priority', 'asc');
        });
    }

    public function form()
    {
        return $this->belongsTo(Form::class);
    }

    protected function allowedTypesArray(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(get: fn() => explode('|', (string) $this->allowed_types), set: fn(array $value) => ['allowed_types' => implode('|', $value)]);
    }

    protected function optionsArray(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(get: function () {
            $options = explode("\n", (string) $this->options);
            $options = array_map(trim(...), $options);
            $options = array_filter($options, strlen(...));
            $options = array_values($options);
            return $options;
        });
    }

    protected function casts(): array
    {
        return [
            'is_required' => 'bool',
            'number_min' => 'int',
            'number_max' => 'int',
            'priority' => 'int',
        ];
    }
}
