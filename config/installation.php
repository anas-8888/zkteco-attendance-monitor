<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Browser Setup Fallback
    |--------------------------------------------------------------------------
    |
    | Local development can still use the web setup screen when the desktop
    | installer is not part of the flow. Packaged Electron builds disable this
    | and require installation-time initialization instead.
    |
    */
    'allow_browser_setup' => filter_var(
        env('APP_ALLOW_BROWSER_SETUP', true),
        FILTER_VALIDATE_BOOL,
        FILTER_NULL_ON_FAILURE,
    ) ?? true,
];
