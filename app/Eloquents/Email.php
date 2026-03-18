<?php

namespace App\Eloquents;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property bool $is_sent
 * @property bool $is_locked
 */
class Email extends Model
{
    use HasFactory;

    /**
     * メール送信済であれば true を返す動的プロパティを作る
     */
    protected function isSent(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(get: fn() => ! empty($this->sent_at));
    }

    /**
     * 排他ロック中であれば true を返す動的プロパティを作る
     */
    protected function isLocked(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(get: fn() => ! empty($this->locked_at));
    }
}
