<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Email;
use Illuminate\Database\Eloquent\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Eloquents\Email>
 */
class EmailFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Email::class;

    public function definition()
    {
        return [
            'subject' => fake()->text,
            'body' => fake()->text,
            'email_to' => fake()->email,
            'email_to_name' => fake()->name,
            'locked_at' => null,
            'sent_at' => null,
            'count_failed' => 0,
        ];
    }
}
