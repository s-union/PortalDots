<?php

namespace Database\Factories;

/** @var Factory $factory */

use App\Eloquents\Document;
use Illuminate\Database\Eloquent\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Eloquents\Document>
 */
class DocumentFactory extends \Illuminate\Database\Eloquent\Factories\Factory
{
    protected $model = Document::class;

    public function definition()
    {
        return [
            'name' => fake()->name,
            'description' => fake()->text,
            'path' => 'documents/foobar.pdf',
            'size' => 1,
            'extension' => 'pdf',
            'is_public' => true,
            'is_important' => false,
            'notes' => fake()->text,
        ];
    }
}
