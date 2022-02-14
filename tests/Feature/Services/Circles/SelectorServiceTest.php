<?php

namespace Tests\Feature\Services\Circles;

use App\Eloquents\Circle;
use App\Services\Circles\SelectorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use ReflectionClass;
use Tests\TestCase;

class SelectorServiceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var SelectorService
     */
    private $selectorService;

    public function setUp(): void
    {
        parent::setUp();
        $this->selectorService = App::make(SelectorService::class);
    }

    /** @test */
    public function setCircle_企画が与えられない場合はIDがセッションに保存されない()
    {
        $this->selectorService->setCircle();

        $this->assertNull(session(SelectorService::SESSION_KEY_CIRCLE_ID));
    }

    /** @test */
    public function setCircle_企画が与えられた場合はIDがセッションに保存される()
    {
        /** @var Circle $circle */
        $circle = factory(Circle::class)->create();
        $this->selectorService->setCircle($circle);

        $this->assertEquals($circle->id, session(SelectorService::SESSION_KEY_CIRCLE_ID));
    }

    /** @test */
    public function getCircle_セッションに企画IDが保存されていないならばキャッシュが削除されnullが返される()
    {
        $reflection = new ReflectionClass($this->selectorService);
        $property = $reflection->getProperty('circle');
        $property->setAccessible(true);

        $this->assertNull($property->getValue($this->selectorService));
        $this->assertNull($this->selectorService->getCircle());
    }

    /** @test */
    public function getCircle_セッションに存在しない企画のIDが保存されていてキャッシュが存在しないならばロードされる()
    {
        /** @var Circle $expected_circle */
        $expected_circle = factory(Circle::class)->create();
        session([SelectorService::SESSION_KEY_CIRCLE_ID => $expected_circle->id]);

        $reflection = new ReflectionClass($this->selectorService);
        $property = $reflection->getProperty('circle');
        $property->setAccessible(true);

        $actual_circle = $this->selectorService->getCircle();

        $this->assertEquals($expected_circle->all(), $property->getValue($this->selectorService)->all());
        $this->assertEquals($expected_circle->all(), $actual_circle->all());
    }

    // TODO: テストを書く
}
