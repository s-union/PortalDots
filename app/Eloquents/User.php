<?php

namespace App\Eloquents;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Validation\Rule;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property string $id
 * @property string $student_id
 * @property string $name
 * @property string $name_yomi
 * @property string $name_family
 * @property string $name_family_yomi
 * @property string $name_given
 * @property string $name_given_yomi
 * @property string $email
 * @property Carbon $email_verified_at
 * @property string $univemail_local_part
 * @property string $univemail_domain_part
 * @property-read string $univemail
 * @property Carbon $univemail_verified_at
 * @property string $tel
 * @property string $password
 * @property bool $is_staff
 */
class User extends Authenticatable
{
    use HasFactory;
    use HasRoles;
    use LogsActivity;
    use Notifiable;

    /**
     * バリデーションルール
     */
    public const STUDENT_ID_RULES = ['required', 'string'];

    // ↓姓と名の間であれば，何個でもスペースを入れてもよしとする
    public const NAME_RULES = [
        'required',
        'string',
        'max:255',
        'regex:/^([^\s　]+)([\s　]+)([^\s　]+)$/u',
    ];

    // ↓姓と名の間であれば，何個でもスペースを入れてもよしとする
    public const NAME_YOMI_RULES = [
        'required',
        'string',
        'max:255',
        'regex:/^([ぁ-んァ-ヶー]+)([\s　]+)([ぁ-んァ-ヶー]+)$/u',
    ];

    public const EMAIL_RULES = ['required', 'string', 'email', 'max:255'];

    public const TEL_RULES = ['required', 'string', 'max:255'];

    public const PASSWORD_RULES = ['required', 'string', 'min:8'];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('user')
            // 電話番号などの情報はログに残さない
            ->logOnly([
                'id',
                'student_id',
                'name_family',
                'name_family_yomi',
                'name_given',
                'name_given_yomi',
                'is_staff',
                'is_admin',
                'is_verified_by_staff',
                'notes',
            ])
            ->dontLogIfAttributesChangedOnly([
                'email',
                'univemail_local_part',
                'univemail_domain_part',
                'tel',
                'email_verified_at',
                'univemail_verified_at',
                'password',
                'remember_token',
                'last_accessed_at',
                'updated_at',
            ])
            ->logOnlyDirty();
    }

    /**
     * `_RULES` で終わる定数ではなくこの関数を使ってバリデーションルールを取得すること
     */
    public static function getValidationRules()
    {
        return [
            'student_id' => self::STUDENT_ID_RULES,
            'name' => self::NAME_RULES,
            'name_yomi' => self::NAME_YOMI_RULES,
            'email' => self::EMAIL_RULES,
            'univemail_local_part' => config('portal.univemail_local_part') === 'student_id'
                ? ['required', 'string', 'same:student_id']
                : ['required', 'string'],
            'univemail_domain_part' => [
                'required',
                Rule::in(config('portal.univemail_domain_part')),
            ],
            'tel' => self::TEL_RULES,
            'password' => self::PASSWORD_RULES,
        ];
    }

    public static function isValidUnivemailByLocalPartAndDomainPart(?string $localPart = '', ?string $domainPart = '')
    {
        $univemail = $localPart . '@' . $domainPart;

        return (bool) filter_var($univemail, FILTER_VALIDATE_EMAIL);
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'student_id',
        'name',
        'name_yomi',
        'email',
        'univemail_local_part',
        'univemail_domain_part',
        'tel',
        'password',
        'is_staff',
        'is_admin',
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = ['password', 'remember_token'];

    public function circles()
    {
        return $this->belongsToMany(Circle::class)
            ->using(CircleUser::class)
            ->withPivot('is_leader');
    }

    /**
     * このユーザーが読んだお知らせ
     */
    public function pagesRead()
    {
        return $this->belongsToMany(Page::class, 'reads')->using(Read::class);
    }

    /**
     * 指定したタグ（複数可）を持つ企画に所属するユーザーだけに限定するクエリスコープ
     *
     * @param  Builder  $query
     * @return Builder
     */
    protected function scopeByTags($query, ?Collection $tags = null)
    {
        if (empty($tags) || $tags->isEmpty()) {
            return $query;
        }

        return self::select('users.*')
            ->leftJoin('circle_user', 'users.id', '=', 'circle_user.user_id')
            ->leftJoin('circles', 'circle_user.circle_id', '=', 'circles.id')
            ->leftJoin('circle_tag', 'circles.id', '=', 'circle_tag.circle_id')
            ->whereIn('circle_tag.tag_id', $tags->pluck('id')->all())
            ->groupBy('users.id');
    }

    /**
     * メール認証が完了しているユーザーだけに限定するクエリスコープ
     *
     * @param  Builder  $query
     * @return Builder
     */
    protected function scopeVerified($query)
    {
        return $query
            ->whereNotNull('email_verified_at')
            ->whereNotNull('univemail_verified_at');
    }

    /**
     * スタッフユーザーだけに限定するクエリスコープ
     *
     * @param  Builder  $query
     * @return Builder
     */
    protected function scopeStaff($query)
    {
        return $query->where('is_staff', true);
    }

    /**
     * ログイン ID から該当ユーザーを取得する
     *
     * @return User
     */
    public function firstByLoginId(string $login_id)
    {
        return $this->where('email', $login_id)
            ->orWhere('student_id', $login_id)
            ->first();
    }

    public function firstByStudentId($student_id)
    {
        return $this->where('student_id', $student_id)->first();
    }

    public function getByStudentIdIn(array $student_ids)
    {
        return $this->whereIn('student_id', $student_ids)->get();
    }

    /**
     * student_idのアルファベットを大文字に変換してセットする(セッター)
     *
     * @param  string  $value
     */
    protected function studentId(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(set: fn($value) => ['student_id' => mb_strtoupper((string) $value)]);
    }

    /**
     * フルネームを取得する
     *
     * @return string
     */
    protected function name(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(get: fn() => "{$this->name_family} {$this->name_given}", set: function ($value) {
            // 姓と名を分割する
            $name_array = preg_split('/[\s　]+/u', $value);
            return ['name_family' => $name_array[0], 'name_given' => $name_array[1]];
        });
    }

    /**
     * フルネーム(よみ)を取得する
     *
     * @return string
     */
    protected function nameYomi(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(get: fn() => "{$this->name_family_yomi} {$this->name_given_yomi}", set: function ($value) {
            // 半角カタカナ・全角カタカナを，全角ひらがなに変換する
            $value = mb_convert_kana($value, 'HVc');
            // 姓と名(よみ)を分割する
            $name_array = preg_split('/[\s　]+/u', $value);
            return ['name_family_yomi' => $name_array[0], 'name_given_yomi' => $name_array[1]];
        });
    }

    /**
     * 大学提供メールアドレスを取得する
     *
     * @return string
     */
    protected function univemail(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(get: fn() => mb_strtolower($this->univemail_local_part) .
            '@' .
            mb_strtolower($this->univemail_domain_part));
    }

    /**
     * email と univemail の両方でメール認証が完了しているかどうか
     *
     * @return bool
     */
    public function areBothEmailsVerified()
    {
        return $this->hasVerifiedEmail() && $this->hasVerifiedUnivemail();
    }

    /**
     * 連絡先メールアドレスのメール認証が完了しているかどうか
     */
    public function hasVerifiedEmail(): bool
    {
        return ! empty($this->email_verified_at);
    }

    /**
     * 大学提供メールアドレスのメール認証が完了しているかどうか
     */
    public function hasVerifiedUnivemail(): bool
    {
        return ! empty($this->univemail_verified_at);
    }

    /**
     * 連絡先メールアドレスのメール認証を完了としてマークする
     *
     * @return bool
     */
    public function markEmailAsVerified()
    {
        return $this->forceFill([
            'email_verified_at' => $this->freshTimestamp(),
        ])->save();
    }

    /**
     * 大学提供メールアドレスのメール認証を完了としてマークする
     *
     * @return bool
     */
    public function markUnivemailAsVerified()
    {
        return $this->forceFill([
            'univemail_verified_at' => $this->freshTimestamp(),
        ])->save();
    }

    public function setSignedUpAt()
    {
        $this->signed_up_at = now();

        return $this->save();
    }

    protected function isSignedUp(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(get: fn() => ! empty($this->signed_up_at));
    }

    public function isLeaderInCircle(Circle $circle)
    {
        return $circle->leader->first()->id === $this->id;
    }

    /**
     * 最終アクセスをいい感じに返す
     *
     * @return string
     */
    public function formatLastAccessedAt()
    {
        $last_accessed_at = $this->last_accessed_at;
        if (empty($last_accessed_at)) {
            return '-';
        }
        if (
            now()
                ->subHour()
                ->lte($last_accessed_at)
        ) {
            return '1時間以内';
        }
        if (
            now()
                ->subDay()
                ->lte($last_accessed_at)
        ) {
            return ((int) $last_accessed_at->diffInHours(now())) . '時間前';
        }
        if (
            now()
                ->subMonth()
                ->lte($last_accessed_at)
        ) {
            return ((int) $last_accessed_at->diffInDays(now())) . '日前';
        }
        if (
            now()
                ->subYear()
                ->lte($last_accessed_at)
        ) {
            return ((int) $last_accessed_at->diffInMonths(now())) . 'ヶ月前';
        }

        return '1年以上前';
    }

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_staff' => 'bool',
            'is_admin' => 'bool',
            'is_verified_by_staff' => 'bool',
            'email_verified_at' => 'datetime',
            'univemail_verified_at' => 'datetime',
            'signed_up_at' => 'datetime',
            'last_accessed_at' => 'datetime',
        ];
    }
}
