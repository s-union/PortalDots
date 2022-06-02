<?php

declare(strict_types=1);

namespace App\Services\Utils;

use Jackiedo\DotenvEditor\DotenvEditor;
use Jackiedo\DotenvEditor\Exceptions\KeyNotFoundException;

class DotenvService
{
    /**
     * @var DotenvEditor
     */
    private $editor;

    public function __construct(DotenvEditor $editor)
    {
        $this->editor = $editor;
    }

    /**
     * .env ファイルから値を取得する
     *
     * @param mixed $key
     * @param mixed $default
     * @return mixed
     */
    public function getValue($key, $default = null)
    {
        try {
            return $this->editor->getValue($key);
        } catch (KeyNotFoundException $e) {
            // .env ファイルにキーが存在しない場合はデフォルト値を返す
            return $default;
        }
    }

    /**
     * .env ファイルに値を保存する
     *
     * @param array $keys
     * @return void
     */
    public function saveKeys(array $keys)
    {
        foreach ($keys as $key => $value) {
            $this->editor->setKey($key, $value);
        }
        $this->editor->save();
    }

    public function shouldRegisterGroup(): bool
    {
        return $this->getValue('PORTAL_GROUP_REGISTER_BEFORE_SUBMITTING_CIRCLE', 'false') === 'true';
    }
}
