import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const MAX_NUMBER = 20;

export default class HappyAppyHotkeyExtension extends Extension {

    enable() {
        this.apps = [];
        this.settings = this.getSettings('org.gnome.shell.extensions.happy-appy-hotkey');
        this.settingId = this.settings.connect('changed', () => this.initSettings());
        this.initSettings();
        this.tracker = Shell.WindowTracker.get_default();

        for (let i = 0; i < MAX_NUMBER; i++) {
            this.addKeyBinding(i, () => this.focusOrLaunch(this.apps[i]));
        }
        this.addKeyBinding('unbound-cycle', () => this.unboundCycle());
    }

    disable() {
        this.removeKeyBinding('unbound-cycle');
        for (let i = 0; i < MAX_NUMBER; i++) {
            this.removeKeyBinding(i);
        }
        if (this.settingId) {
            this.settings.disconnect(this.settingId);
        }
        this.tracker = null;
        this.settings = null;
        this.apps = null;
    }

    initSettings() {
        const existingApps = Gio.AppInfo.get_all()
            .filter(ai => ai.should_show());

        for (let i = 0; i < MAX_NUMBER; i++) {
            this.apps[i] = [
                existingApps.find(a => this.isMatchingApp(a, this.settings.get_string(`app-${i}`))),
                this.settings.get_boolean(`start-${i}`)
            ];
        }
    }

    addKeyBinding(hotkey, callback) {
        Main.wm.addKeybinding(
            `hotkey-${hotkey}`,
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            callback
        );
    }

    removeKeyBinding(hotkey) {
        Main.wm.removeKeybinding(`hotkey-${hotkey}`);
    }

    isMatchingApp(app, name) {
        return app && app.get_name() && name && app.get_name().toLowerCase() === name.toLowerCase();
    }

    focusOrLaunch(tuple) {
        if (!tuple) {
            return;
        }

        const definedApp = tuple[0];
        const shouldLaunch = tuple[1];
        if (!definedApp) {
            return;
        }

        const appWindows = [];
        let activeAppWindow = null;
        let topmostAppWindow = null;
        let mostRecentTime = 0;

        const wins = this.getAllWindows();
        for (let i = 0; i <= wins.length; i++) {
            const win = wins[i] && wins[i].get_meta_window();
            if (win) {
                const winApp = this.tracker.get_window_app(win);
                if (winApp.get_id() === definedApp.get_id()) {
                    appWindows.push(win);

                    // The app is already active; prepare for cycling
                    if (win.has_focus()) {
                        activeAppWindow = win;
                    }

                    // Determine which window was used last
                    const userTime = win.get_user_time();
                    if (userTime > mostRecentTime) {
                        mostRecentTime = userTime;
                        topmostAppWindow = win;
                    }
                }
            }
        }

        if (appWindows.length > 0) {
            if (activeAppWindow) {
                // App was already active; cycle through its windows
                const currentIndex = appWindows.indexOf(activeAppWindow);
                const nextIndex = (currentIndex + 1) % appWindows.length;
                this.activate(appWindows[nextIndex]);
            }
            else {
                // App wasn't active already; activate most recently used
                this.activate(topmostAppWindow);
            }
            return;
        }

        if (shouldLaunch) {
            definedApp.launch([], null);
        }
    }

    unboundCycle() {
        const activeWin = this.getActiveWindow();
        const wins = this.getAllWindows();
        let position = -1;

        if (activeWin) {
            for (let i = 0; i <= wins.length; i++) {
                const win = wins[i] && wins[i].get_meta_window();
                if (win === activeWin) {
                    position = i;
                }
            }
        }

        for (let i = 0; i < wins.length; i++) {
            const x = (i + position + 1) % wins.length;
            const win = wins[x].get_meta_window();
            if (win) {
                const winApp = this.tracker.get_window_app(win);
                if (!this.appIsBound(winApp)) {
                    this.activate(win);
                    break;
                }
            }
        }
    }

    getAllWindows() {
        const wins = global.get_window_actors()
            .filter(wa => !wa.get_meta_window().is_override_redirect());

        if (this.settings.get_boolean('restrict-to-current-workspace')) {
            const workspace = global.get_workspace_manager().get_active_workspace().index();
            return wins.filter(wa => wa.get_meta_window().get_workspace().index() == workspace);
        }
        else {
            return wins;
        }
    }

    getActiveWindow() {
        const win = global.display.focus_window;

        if (win && win.get_window_type() !== Meta.WindowType.DESKTOP) {
            return win;
        }

        return null;
    }

    appIsBound(app) {
        for (const a of this.apps) {
            if (a[0] && app.get_id() === a[0].get_id()) {
                return true;
            }
        }
        return false;
    }

    activate(win) {
        const now = global.get_current_time();
        win.activate(now);
        win.focus(now);
    }
}
