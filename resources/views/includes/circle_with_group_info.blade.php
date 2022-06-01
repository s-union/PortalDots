<dl>
    @php
        $attendance_fee = 0;
    @endphp
    @foreach([
        'food_booth' => '飲食販売',
        'seller_booth' => '物品販売',
        'exh_seller_booth' => '展示・実演(収入あり)',
        'exh_booth' => '展示・実演(収入なし)'
    ] as $column_name => $name)
        @if(empty($group->$column_name))
            <dt>{{ $name }}に参加するか</dt>
            <dd>いいえ</dd>
        @else
            <dt>{{ $name }}に参加するか</dt>
            <dd>はい (ブース数 : {{ $group->$column_name }}個)</dd>
            @php
                if ($column_name === 'food_booth' || $column_name === 'seller_booth') {
                    $attendance_fee += $group->$column_name * 12000;
                } elseif ($column_name === 'exh_seller_booth') {
                    $attendance_fee += $group->$column_name * 10000;
                } elseif ($column_name === 'exh_booth') {
                    $attendance_fee += $group->$column_name * 7000;
                }
            @endphp
        @endif
    @endforeach
    @if ($group->circleIsPending())
        <dt>企画参加登録費の合計</dt>
        <dd>{{ number_format($attendance_fee) }} 円</dd>
    @endif
</dl>
