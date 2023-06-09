const ExtensionUtils = imports.misc.extensionUtils;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;

const MAX_NUMBER = 20;

class Extension {

    constructor() {
        this.settingsId = null;
        this.tracker = null;
        this.apps = [];
    }

    enable() {
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.happy-appy-hotkey');
        this.settingId = this.settings.connect('changed', () => { this.initSettings(); });
        this.initSettings();
        this.tracker = Shell.WindowTracker.get_default();

        for (let i = 0; i < MAX_NUMBER; i++) {
            Main.wm.addKeybinding(
                `shortcut-${i}`,
                this.settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                () => { this.focusOrLaunch(this.apps[i]); }
            );
        }
    }

    disable() {
        for (let i = 0; i < MAX_NUMBER; i++) {
            Main.wm.removeKeybinding(`shortcut-${i}`);
        }
        if (this.settingId) {
            this.settings.disconnect(this.settingId);
        }
    }

    initSettings() {
        const existingApps = Gio.AppInfo.get_all()
            .filter(ai => ai.should_show());

        for (let i = 0; i < MAX_NUMBER; i++) {
            this.apps[i] = existingApps.find(a => this.isMatchingApp(a, this.settings.get_string(`app-${i}`)));
        }
    }

    isMatchingApp(app, name) {
        return app && app.get_name() && name && app.get_name().toLowerCase() === name.toLowerCase();
    }

    focusOrLaunch(definedApp) {
        if (!definedApp) {
            return;
        }

        for (const wa of global.get_window_actors()) {
            const win = wa.get_meta_window();
            const winApp = this.tracker.get_window_app(win);
            if (winApp.get_id() === definedApp.get_id()) {
                win.activate(global.get_current_time());
                return;
            }
        }
        definedApp.launch([], null);
    }
}

function init() {
    return new Extension();
}
