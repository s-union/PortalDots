<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Page;
use App\Eloquents\Read;
use App\Eloquents\User;
use Illuminate\Database\Eloquent\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Eloquents\Read>
 */
class ReadFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Read::class;

    public function definition()
    {
        return [
            'page_id' => fn() => Page::factory()->create()->id,
            'user_id' => fn() => User::factory()->create()->id,
        ];
    }
}
