<?php

namespace App\Eloquents;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;

class Group extends Model
{
    use LogsActivity;

    protected static $logName = 'group';

    protected static $logAttributes = [
        'id',
        'group_name',
        'group_name_yomi',
        'submitted_at',
        'food_booth',
        'seller_booth',
        'exh_seller_booth',
        'exh_booth'
    ];

    protected static $logOnlyDirty = true;

    protected $fillable = [
        'id',
        'group_name',
        'group_name_yomi',
        'invitation_token',
        'submitted_at',
        'food_booth',
        'seller_booth',
        'exh_seller_booth',
        'exh_booth'
    ];

    /**
     * バリデーションルール
     */
    public const GROUP_NAME_RULES = ['required', 'string', 'max:255'];
    public const GROUP_NAME_YOMI_RULES = ['required', 'string', 'max:255', 'regex:/^([ぁ-んァ-ヶー]+)$/u'];

    public function users()
    {
        return $this->belongsToMany(User::class)->using(GroupUser::class)->withPivot('is_leader');
    }

    public function leader()
    {
        return $this->users()->wherePivot('is_leader', true);
    }

    public function members()
    {
        return $this->users()->wherePivot('is_leader', false);
    }

    public function circle()
    {
        return $this->leader()
            ->first()
            ->circles()
            ->first();
    }

    public function scopeSubmitted($query)
    {
        return $query->whereNotNull('submitted_at');
    }

    public function circleHasApproved()
    {
        return $this->circle()->hasApproved();
    }

    public function circleHasSubmitted()
    {
        return $this->circle()->hasSubmitted();
    }

    public function circleIsPending()
    {
        return $this->circle()->isPending();
    }

    public function hasSubmitted()
    {
        return isset($this->submitted_at);
    }

    public function canSubmit()
    {
        // TODO: とりあえずは仮で企画参加登録の人数を採用することにする.
        return count($this->users) >= config('portal.users_number_to_submit_circle');
    }

    /**
     * 団体名(よみ)をひらがなにして保存する
     *
     * @param string $value
     */
    public function setGroupNameYomiAttribute($value)
    {
        // 半角カタカナ・全角カタカナを，全角ひらがなに変換する
        $this->attributes['group_name_yomi'] = mb_convert_kana($value, 'HVc');
    }
}
