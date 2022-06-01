@if (!$group->circleHasSubmitted() && $group->circle()->canSubmit() && Auth::user()->isLeaderInGroup($group))
    <list-view-item href="{{ route('groups.circles.confirm', ['group' => $group]) }}">
        <template v-slot:title>
            <span class="text-primary">
                📮
                ここをクリックして「{{ $group->group_name }}」の企画参加登録を提出しましょう！
            </span>
        </template>
        <template v-slot:meta>
            理大祭係(副責任者)の招待が完了しました。ここをクリックして登録内容に不備がないかどうかを確認し、企画参加登録を提出しましょう。
        </template>
    </list-view-item>
@elseif ($group->circleIsPending())
    <list-view-item href="{{ route('groups.circles.show', ['group' => $group]) }}">
        <template v-slot:title>
            💭
            「{{ $group->group_name }}」の企画参加登録費のお支払いをお待ちしております
        </template>
        <template v-slot:meta>
            ただいま企画参加登録費のお支払いをお待ちしております。<br>
            企画参加登録費は、6月13日(月)〜6月17日(金)の18:15〜19:15に、部室棟E-209にてお支払いください。<br>
            また、内容確認のためご連絡を差し上げる場合がございます。<br>
            <strong class="text-primary">ここをクリックすると、企画情報の詳細を閲覧できます。</strong>
        </template>
    </list-view-item>
@elseif (!Auth::user()->isLeaderInGroup($group))
    <list-view-item href="{{ route('groups.circles.show', ['group' => $group]) }}">
        <template v-slot:title>
            <span class="text-primary">
                📄
                ここをクリックすると「{{ $group->group_name }}」の企画参加登録の内容を確認できます
            </span>
        </template>
    </list-view-item>
@endif
