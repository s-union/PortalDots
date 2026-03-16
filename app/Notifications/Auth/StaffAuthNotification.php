<?php

namespace App\Notifications\Auth;

use App\Eloquents\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;

class StaffAuthNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     *
     * @param  User  $user  受信者
     * @param  string  $verify_code  認証コード
     * @return void
     */
    public function __construct(
        /**
         * 受信者
         */
        private User $user,
        /**
         * スタッフ認証コード
         */
        private string $verify_code
    )
    {
    }

    /**
     * Get the notification's delivery channels.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function via($notifiable)
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return MailMessage
     */
    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject('スタッフ認証 (認証コード : '.$this->verify_code.')')
            ->greeting('スタッフ認証')
            ->line($this->user->name.' 様')
            ->line('スタッフモードにアクセスするには、以下の「認証コード」をスタッフ認証ページで入力してください。')
            ->line(new HtmlString("<div style='text-align: center; font-weight: bold;'>認証コード<br />
<div style='font-size: 2em;'>{$this->verify_code}</div></div>"));
    }

    /**
     * Get the array representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function toArray($notifiable)
    {
        return [
            //
        ];
    }
}
