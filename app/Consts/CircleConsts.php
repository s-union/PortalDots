<?php

namespace App\Consts;

class CircleConsts
{
    public const CIRCLE_ATTENDANCE_TYPES_V1 =
        [
            '飲食販売',
            '物品販売',
            '展示・実演(収入あり)',
            '展示・実演(収入なし)'
        ];

    public const CIRCLE_ATTENDANCE_TYPES_V2 =
        [
            '控室',
            '公式YouTubeへの掲載'
        ];

    public const ATTENDANCE_FEE_V1 =
        [
            '飲食販売' => 12000,
            '物品販売' => 12000,
            '展示・実演(収入あり)' => 10000,
            '展示・実演(収入なし)' => 7000
        ];

    public static function attendanceFeeV2(bool $attend_with_other_type): array
    {
        if ($attend_with_other_type) {
            return [
                '控室' => 5000,
                '公式YouTubeへの掲載' => 0,
            ];
        } else {
            return [
                '控室' => 5000,
                '公式YouTubeへの掲載' => 1000,
            ];
        }
    }
}
