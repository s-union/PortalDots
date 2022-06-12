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

    public const ATTENDANCE_FEE_V1 =
        [
            '飲食販売' => 12000,
            '物品販売' => 12000,
            '展示・実演(収入あり)' => 10000,
            '展示・実演(収入なし)' => 7000
        ];
}
