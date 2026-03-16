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
    public function getIsSentAttribute(): bool
    {
        return ! empty($this->sent_at);
    }

    /**
     * 排他ロック中であれば true を返す動的プロパティを作る
     */
    public function getIsLockedAttribute(): bool
    {
        return ! empty($this->locked_at);
    }
}
