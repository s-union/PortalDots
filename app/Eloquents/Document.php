<?php

namespace App\Eloquents;

use App\Eloquents\Concerns\IsNewTrait;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Document extends Model
{
    use HasFactory;
    use IsNewTrait;
    use LogsActivity;

    protected $fillable = [
        'name',
        'description',
        'path',
        'size',
        'extension',
        'is_public',
        'is_important',
        'notes',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('document')
            ->logOnly([
                'id',
                'name',
                'description',
                'path',
                'size',
                'extension',
                'is_public',
                'is_important',
                'notes',
            ])
            ->logOnlyDirty();
    }

    /**
     * モデルの「初期起動」メソッド
     *
     * @return void
     */
    protected static function boot()
    {
        parent::boot();

        static::addGlobalScope('updated_at', function (Builder $builder) {
            $builder->latest('updated_at');
        });
    }

    public function pages()
    {
        return $this->belongsToMany(Page::class);
    }

    /**
     * 公開されている配布資料に限定するクエリスコープ
     *
     * @param  Builder  $query
     * @return Builder
     */
    protected function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    protected function casts(): array
    {
        return [
            'is_public' => 'bool',
            'is_important' => 'bool',
        ];
    }
}
