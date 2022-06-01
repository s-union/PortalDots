<?php

namespace App\Mail\Groups\Circles;

use App\Eloquents\Group;
use Illuminate\Mail\Mailable;

class SubmittedWithGroupMailable extends Mailable
{
    /**
     * @var Group
     */
    public $group;

    public function __construct(Group $group)
    {
        $this->group = $group;
    }

    public function build()
    {
        return $this->markdown('emails.groups.circles.submit');
    }
}
