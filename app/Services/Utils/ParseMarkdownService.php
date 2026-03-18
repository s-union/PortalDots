<?php

declare(strict_types=1);

namespace App\Services\Utils;

use cebe\markdown\GithubMarkdown as Parser;
use Illuminate\Support\Facades\App;

class ParseMarkdownService
{
    // Markdown のレンダリングは頻繁に呼ばれるため、Purifier は使い回す。
    private static ?\HTMLPurifier $purifier = null;

    public static function render(?string $markdown): string
    {
        if (empty($markdown)) {
            return '';
        }
        $parser = App::make(Parser::class);
        $parser->enableNewlines = true;
        $html = $parser->parse($markdown);

        return self::getPurifier()->purify($html);
    }

    private static function getPurifier(): \HTMLPurifier
    {
        // Markdown を描画しないリクエストでは初期化コストがかからないよう遅延生成する。
        if (self::$purifier === null) {
            self::$purifier = self::createPurifier();
        }

        return self::$purifier;
    }

    private static function createPurifier(): \HTMLPurifier
    {
        // render() では「Markdown を HTML に変換してサニタイズする」処理に集中できるよう、設定生成は分離する。
        $config = \HTMLPurifier_Config::createDefault();
        $config->set('Core.Encoding', 'UTF-8');
        $config->set('HTML.Doctype', 'HTML 4.01 Transitional');

        return new \HTMLPurifier($config);
    }
}
