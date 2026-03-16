<?php

namespace Tests\Feature\GridMakers\Filter;

use App\GridMakers\Filter\FilterableKeyBelongsToManyOptions;
use Tests\TestCase;

class FilterableKeyBelongsToManyOptionsTest extends TestCase
{
    public function instantiate()
    {
        return new FilterableKeyBelongsToManyOptions(
            'circle_user',
            'circle_id',
            'user_id',
            [
                'id' => 1, 'name' => 'Aさん',
                'id' => 2, 'name' => 'Bさん',
                'id' => 3, 'name' => 'Cさん',
            ],
            'name'
        );
    }

    /**
     * @test
     */
    public function constructor()
    {
        $obj = $this->instantiate();
        $this->assertInstanceOf(FilterableKeyBelongsToManyOptions::class, $obj);
    }

    /**
     * @test
     */
    public function get_pivot()
    {
        $obj = $this->instantiate();
        $this->assertEquals('circle_user', $obj->getPivot());
    }

    /**
     * @test
     */
    public function get_foreign_key()
    {
        $obj = $this->instantiate();
        $this->assertEquals('circle_id', $obj->getForeignKey());
    }

    /**
     * @test
     */
    public function get_related_key()
    {
        $obj = $this->instantiate();
        $this->assertEquals('user_id', $obj->getRelatedKey());
    }

    /**
     * @test
     */
    public function get_choices()
    {
        $obj = $this->instantiate();
        $this->assertEquals([
            'id' => 1, 'name' => 'Aさん',
            'id' => 2, 'name' => 'Bさん',
            'id' => 3, 'name' => 'Cさん',
        ], $obj->getChoices());
    }

    /**
     * @test
     */
    public function get_choices_name()
    {
        $obj = $this->instantiate();
        $this->assertEquals('name', $obj->getChoicesName());
    }

    /**
     * @test
     */
    public function json_serialize()
    {
        $obj = $this->instantiate();
        $expected = json_encode([
            'pivot' => 'circle_user',
            'foreign_key' => 'circle_id',
            'related_key' => 'user_id',
            'choices' => [
                'id' => 1, 'name' => 'Aさん',
                'id' => 2, 'name' => 'Bさん',
                'id' => 3, 'name' => 'Cさん',
            ],
            'choices_name' => 'name',
        ]);

        $this->assertJsonStringEqualsJsonString($expected, json_encode($obj));
    }
}
