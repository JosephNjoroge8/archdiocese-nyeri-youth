<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->file(public_path('index.html')))
    ->name('spa.home');

Route::get('/{path}', fn () => response()->file(public_path('index.html')))
    ->where('path', '(?!(?:api(?:/|$)|up(?:/|$))).*')
    ->name('spa.fallback');
