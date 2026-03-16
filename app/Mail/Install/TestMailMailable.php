<?php

namespace App\Mail\Install;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TestMailMailable extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(private string $from_address, private string $from_name)
    {
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this
            ->from($this->from_address, $this->from_name)
            ->markdown('emails.install.test_mail');
    }
}
