<?php

namespace App\Notifications\Auth\Password;

use App\Eloquents\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetStartNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     *
     * @param  User  $user  受信者
     * @return void
     */
    public function __construct(
        /**
         * 受信者
         */
        private User $user,
        /**
         * パスワード再設定手続きを進めるための URL
         */
        private string $reset_url
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
            ->subject('パスワードの再設定')
            ->greeting('パスワードの再設定')
            ->line($this->user->name.' 様')
            ->line(config('app.name').'のパスワードを再設定するには、以下のボタンを選んでください。')
            ->action('パスワードを再設定する', $this->reset_url)
            ->line('このメールに心当たりがない場合、このメールはそのまま破棄してください。');
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
