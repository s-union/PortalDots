<?php

declare(strict_types=1);

namespace Tests\Feature\GridMakers\Filter;

use App\GridMakers\Filter\FilterQueryItem;
use InvalidArgumentException;
use Tests\TestCase;

final class FilterQueryItemTest extends TestCase
{
    public static function operatorsProvider(): \Iterator
    {
        yield ['=', '='];
        yield ['!=', '!='];
        yield ['<', '<'];
        yield ['>', '>'];
        yield ['<=', '<='];
        yield ['>=', '>='];
        yield ['like', 'like'];
        yield ['not like', 'not like'];
        yield ['LIKE', 'like'];
        yield ['NOT LIKE', 'not like'];
        yield ['LiKe', 'like'];
        yield ['NoT lIkE', 'not like'];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('operatorsProvider')]
    #[\PHPUnit\Framework\Attributes\Test]
    public function constructor_正常(string $operator)
    {
        $obj = new FilterQueryItem('this_is_key.sub', $operator, 'hogehoge');

        $this->assertInstanceOf(FilterQueryItem::class, $obj);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function constructor_必要な引数が空の場合は例外が発生する()
    {
        $this->expectException(InvalidArgumentException::class);

        new FilterQueryItem('', '', 'hogehoge');
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function constructor_存在しない演算子が指定されたら例外が発生する()
    {
        $this->expectException(InvalidArgumentException::class);

        new FilterQueryItem('this_is_key.sub', '<>', 'hogehoge');
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function get_full_key_name()
    {
        $obj = new FilterQueryItem('this_is_key.sub', '=', 'hogehoge');

        $this->assertSame('this_is_key.sub', $obj->getFullKeyName());
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function get_main_key_name()
    {
        $obj = new FilterQueryItem('this_is_key.sub', '=', 'hogehoge');

        $this->assertSame('this_is_key', $obj->getMainKeyName());
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function get_sub_key_name()
    {
        $obj = new FilterQueryItem('this_is_key.sub', '=', 'hogehoge');

        $this->assertSame('sub', $obj->getSubKeyName());
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('operatorsProvider')]
    #[\PHPUnit\Framework\Attributes\Test]
    public function get_operator(string $input, string $output)
    {
        $obj = new FilterQueryItem('this_is_key.sub', $input, 'hogehoge');

        $this->assertSame($output, $obj->getOperator());
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function get_value()
    {
        $obj = new FilterQueryItem('this_is_key.sub', '=', 'hogehoge');

        $this->assertEquals('hogehoge', $obj->getValue());
    }
}
