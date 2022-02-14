@if (!$circle->hasSubmitted() && $circle->canSubmit() && Auth::user()->isLeaderInCircle($circle))
    <list-view-item href="{{ route('circles.confirm', ['circle' => $circle]) }}">
        <template v-slot:title>
            <span class="text-primary">
                📮
                ここをクリックして「{{ $circle->name }}」の参加登録を提出しましょう！
            </span>
        </template>
        <template v-slot:meta>
            新歓係(副責任者)の招待が完了しました。ここをクリックして登録内容に不備がないかどうかを確認し、参加登録を提出しましょう。
        </template>
    </list-view-item>
@elseif ($circle->isPending())
    <list-view-item href="{{ route('circles.show', ['circle' => $circle]) }}">
        <template v-slot:title>
            💭
            「{{ $circle->name }}」の企画参加登録費のお支払いをお願いします
        </template>
        <template v-slot:meta>
            ただいま企画参加登録費のお支払いをお待ちしております。配布資料をご確認の上、お支払いをお願いします。
        </template>
    </list-view-item>
@elseif (!$circle->hasSubmitted() && !$circle->canSubmit() && Auth::user()->isLeaderInCircle($circle))
    <list-view-item href="{{ route('circles.users.index', ['circle' => $circle]) }}">
        <template v-slot:title>
            <span class="text-primary">
                📩
                ここをクリックして「{{ $circle->name }}」の新歓係(副責任者)を招待しましょう！
            </span>
        </template>
        <template v-slot:meta>
            参加登録を提出するには、ここをクリックして新歓係(副責任者)を招待しましょう。
        </template>
    </list-view-item>
@elseif ($circle->hasApproved())
    <list-view-item href="{{ route('circles.show', ['circle' => $circle]) }}">
        <template v-slot:title>
            🎉
            「{{ $circle->name }}」の参加登録は受理されました
        </template>
    </list-view-item>
@elseif ($circle->hasRejected())
    <list-view-item href="{{ route('circles.show', ['circle' => $circle]) }}">
        <template v-slot:title>
            <span class="text-danger">
                ⚠️
                「{{ $circle->name }}」の参加登録は受理されませんでした
            </span>
        </template>
        @isset ($circle->status_reason)
            <template v-slot:meta>
                詳細はこちら
            </template>
        @endisset
    </list-view-item>
@elseif (!Auth::user()->isLeaderInCircle($circle))
    <list-view-item href="{{ route('circles.show', ['circle' => $circle]) }}">
        <template v-slot:title>
            <span class="text-primary">
                📄
                ここをクリックすると「{{ $circle->name }}」の参加登録の内容を確認できます
            </span>
        </template>
    </list-view-item>
@endif
