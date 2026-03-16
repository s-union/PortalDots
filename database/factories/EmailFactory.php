<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Email;
use Illuminate\Database\Eloquent\Factory;

class EmailFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Email::class;

    public function definition()
    {
        return [
            'subject' => $this->faker->text,
            'body' => $this->faker->text,
            'email_to' => $this->faker->email,
            'email_to_name' => $this->faker->name,
            'locked_at' => null,
            'sent_at' => null,
            'count_failed' => 0,
        ];
    }
}
