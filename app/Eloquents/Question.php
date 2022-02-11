<?php

namespace App\Eloquents;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
 * @property string $options
 * @property-read Option[] $eloquentOptions
 * @property-read Carbon $created_at
 * @property-read Carbon $updated_at
 */
class Question extends Model
{
    use LogsActivity;

    protected static $logName = 'question';

    protected static $logAttributes = [
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
    ];

    protected static $logOnlyDirty = true;

    /**
     * 選択肢`Option`を保存すべき質問タイプ`Question->type`
     * @var string[]
     */
    public static $should_save_options_question_types = [
        'radio',
        'select',
        'checkbox'
    ];

    /**
     * 選択肢`Option`を保存すべきでない質問タイプ`Question->type`
     * @var string[]
     */
    public static $should_not_save_options_question_types = [
        'heading',
        'text',
        'number',
        'textarea',
        'upload'
    ];

    /**
     * 質問タイプ`Question->type`
     * @var string[]
     */
    public static $question_types = [];

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

    protected $casts = [
        'is_required' => 'bool',
        'number_min' => 'int',
        'number_max' => 'int',
        'priority' => 'int',
    ];

    protected static function boot()
    {
        parent::boot();

        static::$question_types = array_merge(
            static::$should_save_options_question_types,
            static::$should_not_save_options_question_types
        );

        static::addGlobalScope('priority', function (Builder $builder) {
            $builder->orderBy('priority', 'asc');
        });
    }

    public function form()
    {
        return $this->belongsTo(Form::class);
    }

    public function eloquentOptions(): HasMany
    {
        return $this->hasMany(Option::class);
    }

    public function getAllowedTypesArrayAttribute()
    {
        return explode('|', $this->allowed_types);
    }

    public function setAllowedTypesArrayAttribute(array $value)
    {
        $this->attributes['allowed_types'] = implode('|', $value);
    }

    public function getOptionsArrayAttribute()
    {
        if (!empty($this->options)) {
            $options = explode("\n", $this->options);
            $options = array_map('trim', $options);
            $options = array_filter($options, 'strlen');
            return array_values($options);
        }
        return null;
    }
}
