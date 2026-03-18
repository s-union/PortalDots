<?php

namespace App\Eloquents;

use Database\Factories\ParticipationTypeFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ParticipationType extends Model
{
    use HasFactory;
    use LogsActivity;

    protected static function newFactory()
    {
        return ParticipationTypeFactory::new();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('participation_type')
            ->logOnly([
                'id',
                'name',
                'description',
                'users_count_min',
                'users_count_max',
                'form_id',
            ])
            ->logOnlyDirty();
    }

    protected $fillable = [
        'name',
        'description',
        'users_count_min',
        'users_count_max',
        'form_id',
    ];

    protected $appends = ['form_name'];

    protected function formName(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(get: fn() => '企画参加登録');
    }

    public function form()
    {
        return $this->belongsTo(Form::class);
    }

    public function circles()
    {
        return $this->hasMany(Circle::class);
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class);
    }

    public function scopeOpen(Builder $query)
    {
        return $query->whereHas('form', function (Builder $query) {
            $query->where('open_at', '<=', now())
                ->where('close_at', '>=', now());
        });
    }

    public function scopePublic(Builder $query)
    {
        return $query->whereHas('form', function (Builder $query) {
            $query->where('is_public', true);
        });
    }
}
