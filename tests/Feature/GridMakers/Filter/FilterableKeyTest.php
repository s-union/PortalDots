<?php

declare(strict_types=1);

namespace Tests\Feature\GridMakers\Filter;

use App\GridMakers\Filter\FilterableKey;
use App\GridMakers\Filter\FilterableKeyBelongsToManyOptions;
use App\GridMakers\Filter\FilterableKeyBelongsToOptions;
use App\GridMakers\Filter\FilterableKeysDict;
use BadMethodCallException;
use Tests\TestCase;

final class FilterableKeyTest extends TestCase
{
    public static function typesWithNoOptionsProvider(): \Iterator
    {
        yield ['string'];
        yield ['number'];
        yield ['datetime'];
        yield ['bool'];
        yield ['isNull'];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('typesWithNoOptionsProvider')]
    #[\PHPUnit\Framework\Attributes\Test]
    public function オプションなしでインスタンス化できる(string $type)
    {
        $obj = FilterableKey::$type();

        $this->assertEquals($type, $obj->getType());
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('typesWithNoOptionsProvider')]
    #[\PHPUnit\Framework\Attributes\Test]
    public function json_serialize_オプションなしtypeのオブジェクトをシリアライズできる(string $type)
    {
        $expected = json_encode(['type' => $type]);
        $actual = json_encode(FilterableKey::$type());
        $this->assertJsonStringEqualsJsonString($expected, $actual);
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('typesWithNoOptionsProvider')]
    #[\PHPUnit\Framework\Attributes\Test]
    public function get_belongs_to_options_オプションなしtypeの場合は例外発生する(string $type)
    {
        $this->expectException(BadMethodCallException::class);
        FilterableKey::$type()->getBelongsToOptions();
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('typesWithNoOptionsProvider')]
    #[\PHPUnit\Framework\Attributes\Test]
    public function get_belongs_to_many_options_オプションなしtypeの場合は例外発生する(string $type)
    {
        $this->expectException(BadMethodCallException::class);
        FilterableKey::$type()->getBelongsToManyOptions();
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('typesWithNoOptionsProvider')]
    #[\PHPUnit\Framework\Attributes\Test]
    public function get_enum_choices_オプションなしtypeの場合は例外発生する(string $type)
    {
        $this->expectException(BadMethodCallException::class);
        FilterableKey::$type()->getEnumChoices();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function belongs_to_引数を渡せばインスタンス化できる()
    {
        $obj = FilterableKey::belongsTo('this_is_related_table_name', new FilterableKeysDict([
            'id' => FilterableKey::number(),
            'name' => FilterableKey::string(),
            'created_at' => FilterableKey::datetime(),
            'updated_at' => FilterableKey::datetime(),
        ]));

        $this->assertEquals('belongsTo', $obj->getType());
        $this->assertEquals('this_is_related_table_name', $obj->getBelongsToOptions()->getTo());

        $this->assertInstanceOf(FilterableKeyBelongsToOptions::class, $obj->getBelongsToOptions());

        $this->assertEquals('number', $obj->getBelongsToOptions()->getKeys()->getByKey('id')->getType());
        $this->assertEquals('string', $obj->getBelongsToOptions()->getKeys()->getByKey('name')->getType());
        $this->assertEquals('datetime', $obj->getBelongsToOptions()->getKeys()->getByKey('created_at')->getType());
        $this->assertEquals('datetime', $obj->getBelongsToOptions()->getKeys()->getByKey('updated_at')->getType());
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function json_serialize_typeがbelongs_toのオブジェクトをシリアライズできる()
    {
        $expected = json_encode([
            'type' => 'belongsTo',
            'to' => 'this_is_related_table_name',
            'keys' => [
                'id' => [
                    'type' => 'number',
                ],
                'name' => [
                    'type' => 'string',
                ],
                'created_at' => [
                    'type' => 'datetime',
                ],
                'updated_at' => [
                    'type' => 'datetime',
                ],
            ],
        ]);

        $obj = FilterableKey::belongsTo('this_is_related_table_name', new FilterableKeysDict([
            'id' => FilterableKey::number(),
            'name' => FilterableKey::string(),
            'created_at' => FilterableKey::datetime(),
            'updated_at' => FilterableKey::datetime(),
        ]));

        $this->assertJsonStringEqualsJsonString($expected, json_encode($obj));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function belongs_to_many_引数を渡せばインスタンス化できる()
    {
        // class_student は架空のテーブル名
        $obj = FilterableKey::belongsToMany('class_student', 'class_id', 'student_id', [
            ['id' => 1, 'name' => 'テスト太郎'],
            ['id' => 2, 'name' => 'テスト花子'],
        ], 'name');

        $this->assertInstanceOf(FilterableKeyBelongsToManyOptions::class, $obj->getBelongsToManyOptions());
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function json_serialize_typeがbelongs_to_manyのオブジェクトをシリアライズできる()
    {
        $expected = json_encode([
            'type' => 'belongsToMany',
            'pivot' => 'class_student',
            'foreign_key' => 'class_id',
            'related_key' => 'student_id',
            'choices' => [
                ['id' => 1, 'name' => 'テスト太郎'],
                ['id' => 2, 'name' => 'テスト花子'],
            ],
            'choices_name' => 'name',
        ]);

        // class_student は架空のテーブル名
        $obj = FilterableKey::belongsToMany('class_student', 'class_id', 'student_id', [
            ['id' => 1, 'name' => 'テスト太郎'],
            ['id' => 2, 'name' => 'テスト花子'],
        ], 'name');

        $this->assertJsonStringEqualsJsonString($expected, json_encode($obj));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function enum_引数を渡せばインスタンス化できる()
    {
        $obj = FilterableKey::enum(['rejected', 'approved', 'NULL']);

        $this->assertEquals('enum', $obj->getType());
        $this->assertEquals(['rejected', 'approved', 'NULL'], $obj->getEnumChoices());
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function json_serialize_typeがenumのオブジェクトをシリアライズできる()
    {
        $expected = json_encode([
            'type' => 'enum',
            'choices' => [
                'rejected',
                'approved',
                'NULL',
            ],
        ]);

        $obj = FilterableKey::enum(['rejected', 'approved', 'NULL']);

        $this->assertJsonStringEqualsJsonString($expected, json_encode($obj));
    }
}
