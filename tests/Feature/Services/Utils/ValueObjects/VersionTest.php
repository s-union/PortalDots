<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Utils\ValueObjects;

use App\Services\Utils\ValueObjects\Version;
use Tests\TestCase;

final class VersionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
    }

    public static function versionProvider(): \Iterator
    {
        yield ['1.0.0', new Version(1, 0, 0)];
        yield ['0.1.2', new Version(0, 1, 2)];
        yield ['v2.2.4', new Version(2, 2, 4)];
        yield ['1.0', null];
        yield ['.0.', null];
        yield ['..', null];
        yield ['.', null];
        yield ['12345', null];
        yield ['4.0.0-beta.1', new Version(4, 0, 0, 'beta.1')];
        yield ['v4.0.2-alpha.4', new Version(4, 0, 2, 'alpha.4')];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('versionProvider')]
    #[\PHPUnit\Framework\Attributes\Test]
    public function parse(string $input, ?Version $expected)
    {
        if ($expected === null) {
            $this->assertNotInstanceOf(\App\Services\Utils\ValueObjects\Version::class, Version::parse($input));
        } else {
            $this->assertTrue(
                $expected->equals(Version::parse($input)),
                "expected: {$expected->getFullversion()}, actual: $input"
            );
        }
    }
}
