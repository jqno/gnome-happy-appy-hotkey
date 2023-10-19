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
        this.settings = null;
    }

    initSettings() {
        const existingApps = Gio.AppInfo.get_all()
            .filter(ai => ai.should_show());

        for (let i = 0; i < MAX_NUMBER; i++) {
            this.apps[i] = existingApps.find(a => this.isMatchingApp(a, this.settings.get_string(`app-${i}`)));
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

    focusOrLaunch(definedApp) {
        if (!definedApp) {
            return;
        }

        const wins = global.get_window_actors();
        for (let i = 0; i <= wins.length; i++) {
            const win = wins[i] && wins[i].get_meta_window();
            if (win) {
                const winApp = this.tracker.get_window_app(win);
                if (winApp.get_id() === definedApp.get_id()) {
                    this.activate(win);
                    return;
                }
            }
        }
        definedApp.launch([], null);
    }

    unboundCycle() {
        const activeWin = this.getActiveWindow();
        const wins = global.get_window_actors();
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

    getActiveWindow() {
        const win = global.display.focus_window;

        if (win && win.get_window_type() !== Meta.WindowType.DESKTOP) {
            return win;
        }

        return null;
    }

    appIsBound(app) {
        for (const a of this.apps) {
            if (a && app.get_id() === a.get_id()) {
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
