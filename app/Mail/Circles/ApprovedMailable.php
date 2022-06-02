<?php

namespace App\Mail\Circles;

use App\Eloquents\Circle;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ApprovedMailable extends Mailable
{
    use Queueable;
    use SerializesModels;

    public $circle;

    public $should_register_group;

    /**
     * Create a new message instance.
     *
     * @return void
     */
    public function __construct(Circle $circle, bool $should_register_group = false)
    {
        $this->circle = $circle;
        $this->should_register_group = $should_register_group;
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        return $this->markdown('emails.circles.approve');
    }
}
