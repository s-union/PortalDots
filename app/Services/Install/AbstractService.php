<?php

declare(strict_types=1);

namespace App\Services\Install;

use App\Services\Utils\DotenvService;

abstract class AbstractService
{
    abstract protected function getEnvKeys(): array;

    abstract public function getValidationRules(): array;

    abstract public function getFormLabels(): array;

    public function __construct(private readonly DotenvService $dotenvService)
    {
    }

    public function getInfo()
    {
        $result = [];

        foreach ($this->getEnvKeys() as $key) {
            // $key に PASSWORD という文字列が含まれている場合は、
            // セキュリティのため値を取得しない
            if (str_contains((string) $key, 'PASSWORD')) {
                $result[$key] = '';

                continue;
            }
            $result[$key] = $this->dotenvService->getValue($key);
        }

        return $result;
    }

    public function updateInfo(array $info)
    {
        $save_keys = [];
        foreach ($this->getEnvKeys() as $key) {
            if (! isset($info[$key])) {
                $save_keys[$key] = '';

                continue;
            }
            $save_keys[$key] = $info[$key];
        }

        $this->dotenvService->saveKeys($save_keys);
    }
}
