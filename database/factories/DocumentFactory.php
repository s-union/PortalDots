<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Document;
use Illuminate\Database\Eloquent\Factory;

class DocumentFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Document::class;

    public function definition()
    {
        return [
            'name' => $this->faker->name,
            'description' => $this->faker->text,
            'path' => 'documents/foobar.pdf',
            'size' => 1,
            'extension' => 'pdf',
            'is_public' => true,
            'is_important' => false,
            'notes' => $this->faker->text,
        ];
    }
}
