## General
name = Open Bookmarks Slowly
menu = Open All Slowly

## Status page
error-open = Sorry, OBS couldn’t open this tab. ({ $message })
error-load = Loading this bookmark failed. ({ $message })
error-tab-closed = This tab was closed.
error-stopped = Loading this tab was stopped.
heading-working = Opening bookmarks
heading-done = Complete
button-pause = Stop
button-resume = Resume
notification-title = Loading bookmarks complete
notification-body = { name } finished opening ‘{ $folderName }’.

## Prefs
prefs-inflight-max = Maximum number of tabs to load at once:
prefs-notify = Notify you when loading is finished
prefs-tip-intro = <b>Tip:</b> If you turned off Firefox’s warning about opening
    too many tabs at once, you might want to turn it back on.
prefs-tip-expand = Show more »
-fx-prefs =
    { PLATFORM() ->
        [win] Options
       *[other] Preferences
    }
prefs-tip-text = Open Firefox { -fx-prefs } and look under the General section,
    Tabs subsection.  Enable “Warn you when opening multiple tabs might slow
    down Firefox”.  If the option is missing, it was already enabled.  When you
    get the warning, remember to use { name } instead.
