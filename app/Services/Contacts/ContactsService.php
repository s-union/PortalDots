<?php

declare(strict_types=1);

namespace App\Services\Contacts;

use App\Eloquents\Circle;
use App\Eloquents\ContactCategory;
use App\Eloquents\User;
use App\Mail\Contacts\ContactMailable;
use Illuminate\Support\Facades\Mail;

class ContactsService
{
    /**
     * お問い合わせを作成する
     *
     * @param  Circle|null  $circle  お問い合わせ対象の企画
     * @param  User  $sender  お問い合わせを作成したユーザー
     * @param  string  $contactBody  お問い合わせ本文
     * @param  ContactCategory  $category  お問い合わせ項目
     * @return bool
     */
    public function create(
        ?Circle $circle,
        User $sender,
        string $contactBody,
        ContactCategory $category,
        bool $ccSubleader
    )
    {
        if (isset($circle)) {
            $recipients = $circle->leader()->get();

            if ($ccSubleader) {
                // 共有ONの場合のみ副責任者を追加する
                $recipients = $recipients->concat($circle->users()->wherePivot('is_leader', false)->get());
            }

            // leader() と users() の結果が重なる可能性があるため user id で重複除外
            $recipients = $recipients->unique('id');

            if ($recipients->isEmpty()) {
                $recipients = collect([$sender]);
            }

            foreach ($recipients as $user) {
                $this->send($user, $circle, $sender, $contactBody, $category);
            }
        } else {
            // 企画に所属していないユーザーの場合
            $this->send($sender, null, $sender, $contactBody, $category);
        }

        $this->sendToStaff($circle, $sender, $contactBody, $category, $ccSubleader);
    }

    /**
     * メールを送信する
     *
     * @param  User  $recipient  メールを送信する宛先
     * @param  Circle|null  $circle  お問い合わせ対象の企画
     * @param  User  $sender  お問い合わせを作成したユーザー
     * @param  string  $contactBody  お問い合わせ本文
     * @return void
     */
    private function send(
        User $recipient,
        ?Circle $circle,
        User $sender,
        string $contactBody,
        ContactCategory $category
    ) {
        Mail::to($recipient)
            ->send(
                (new ContactMailable($circle, $sender, $contactBody, $category))
                    ->replyTo($category->email, config('portal.admin_name'))
                    ->subject('お問い合わせを承りました')
            );
    }

    /**
     * スタッフ用控えをスタッフに送信する
     *
     * @param  Circle|null  $circle  お問い合わせ対象の企画
     * @param  User  $sender  お問い合わせを作成したユーザー
     * @param  string  $contactBody  お問い合わせ本文
     * @param  ContactCategory  $category  お問い合わせ項目
     * @return void
     */
    private function sendToStaff(
        ?Circle $circle,
        User $sender,
        string $contactBody,
        ContactCategory $category,
        bool $ccSubleader
    )
    {
        $senderText = isset($circle) ? $circle->name : $sender->name;

        $mailable = (new ContactMailable($circle, $sender, $contactBody, $category))
            ->subject("お問い合わせ({$senderText} 様)");

        $replyToUsers = collect([$sender]);

        if (isset($circle) && $ccSubleader) {
            // スタッフ宛メールの返信先に副責任者も含める
            $replyToUsers = $replyToUsers->concat(
                $circle->users()->wherePivot('is_leader', false)->get()
            );
        }

        // 送信者と副責任者のメールアドレス重複を防ぐ
        foreach ($replyToUsers->unique('email') as $replyToUser) {
            $mailable->replyTo($replyToUser->email, $replyToUser->name);
        }

        Mail::to($category->email, $category->name)
            ->send($mailable);
    }
}
