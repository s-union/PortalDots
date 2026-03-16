<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Page;
use App\Eloquents\Read;
use App\Eloquents\User;
use Illuminate\Database\Eloquent\Factory;

class ReadFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Read::class;

    public function definition()
    {
        return [
            'page_id' => function () {
                return Page::factory()->create()->id;
            },
            'user_id' => function () {
                return User::factory()->create()->id;
            },
        ];
    }
}
