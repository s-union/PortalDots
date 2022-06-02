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
</dl>
