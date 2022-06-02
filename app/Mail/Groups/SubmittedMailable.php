<?php

namespace App\Mail\Groups;

use App\Eloquents\Group;
use Illuminate\Mail\Mailable;

class SubmittedMailable extends Mailable
{
    /**
     * @var Group
     */
    private $group;

    public function __construct(Group $group)
    {
        $this->group = $group;
    }

    public function build()
    {
        return $this->markdown('emails.groups.submit')
            ->with('group', $this->group);
    }
}
