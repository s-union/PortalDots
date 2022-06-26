<dl>
    @foreach([
        'group_name' => '団体名',
        'group_name_yomi' => '団体名(よみ)'
    ] as $field_name => $display_name)
        <dt>{{ $display_name }}
            @if(Auth::user()->isLeaderInGroup($group) && Gate::allows('group.update', $group))
                - <a href="{{ route('groups.edit', ['group' => $group]) }}">変更</a>
            @endif
        </dt>
        <dd>{{ $group->$field_name }}</dd>
    @endforeach
    <dt>メンバー
        @if(Auth::user()->isLeaderInGroup($group) && Gate::allows('group.update', $group))
            - <a href="{{ route('groups.users.index', ['group' => $group]) }}">変更</a>
        @endif
    </dt>
    <dd>
        <ul>
            @foreach($group->users as $user)
                <li>
                    {{ $user->name }}
                    ({{ $user->student_id }})
                    @if ($user->pivot->is_leader)
                        <app-badge primary>責任者</app-badge>
                    @else
                        <app-badge muted>理大祭係(副責任者)</app-badge>
                    @endif
                </li>
            @endforeach
        </ul>
    </dd>
    @isset($attendance_fee)
        <dt>未払いの企画参加登録費の合計（「実行委員会企画」の参加費を除く）</dt>
        <dd>{{ number_format($attendance_fee) }} 円</dd>
    @endif
    @if(count($circles) > 0)
        <dt>企画一覧</dt>
        <dd>
            <ul>
                @foreach($circles as $circle)
                    <li>
                        {{ $circle->name }}
                        @if ($circle->isPending())
                            <app-badge muted>確認中</app-badge>
                        @elseif ($circle->hasApproved())
                            <app-badge success>受理済</app-badge>
                        @endif
                    </li>
                    <ul>
                        <li>参加形態 : {{ $circle->attendance_type }}</li>
                    </ul>
                @endforeach
            </ul>
        </dd>
    @endif
</dl>
