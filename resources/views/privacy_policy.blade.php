@extends('layouts.app')

@section('no_circle_selector', true)

@section('title', 'プライバシーポリシー')

@section('content')
    <app-container>
        <list-view>
            <list-view-card>
                @php
                    $html = file_get_contents(resource_path('md/privacy_policy.md'))
                @endphp
                @markdown($html)
            </list-view-card>
        </list-view>
    </app-container>
@endsection
