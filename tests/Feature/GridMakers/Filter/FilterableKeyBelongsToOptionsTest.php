<?php

declare(strict_types=1);

namespace Tests\Feature\GridMakers\Filter;

use App\GridMakers\Filter\FilterableKey;
use App\GridMakers\Filter\FilterableKeyBelongsToOptions;
use App\GridMakers\Filter\FilterableKeysDict;
use Tests\TestCase;

final class FilterableKeyBelongsToOptionsTest extends TestCase
{
    public function instantiate()
    {
        return new FilterableKeyBelongsToOptions(
            'users',
            new FilterableKeysDict([
                'id' => FilterableKey::number(),
                'name' => FilterableKey::string(),
                'created_at' => FilterableKey::datetime(),
            ]),
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function constructor()
    {
        $obj = $this->instantiate();
        $this->assertInstanceOf(FilterableKeyBelongsToOptions::class, $obj);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function get_to()
    {
        $obj = $this->instantiate();
        $this->assertEquals('users', $obj->getTo());
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function get_keys()
    {
        $obj = $this->instantiate();
        $this->assertEquals(
            new FilterableKeysDict([
                'id' => FilterableKey::number(),
                'name' => FilterableKey::string(),
                'created_at' => FilterableKey::datetime(),
            ]),
            $obj->getKeys()
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function json_serialize()
    {
        $obj = $this->instantiate();
        $expected = json_encode([
            'to' => 'users',
            'keys' => [
                'id' => ['type' => 'number'],
                'name' => ['type' => 'string'],
                'created_at' => ['type' => 'datetime'],
            ],
        ]);

        $this->assertJsonStringEqualsJsonString($expected, json_encode($obj));
    }
}
