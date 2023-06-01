const ExtensionUtils = imports.misc.extensionUtils;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;

class Extension {

    constructor() {
        this.settingsId = null;
        this.tracker = null;
        this.app0 = null;
    }

    enable() {
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.happy-appy-hotkey');
        this.settingId = this.settings.connect('changed', () => { this.initSettings(); });
        this.initSettings();
        this.tracker = Shell.WindowTracker.get_default();

        Main.wm.addKeybinding(
            'shortcut-0',
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => { this.focusOrLaunch(this.app0); }
        );
    }

    disable() {
        Main.wm.removeKeybinding('shortcut-0');
        if (this.settingId) {
            this.settings.disconnect(this.settingId);
        }
    }

    initSettings() {
        const existingApps = Gio.AppInfo.get_all()
            .filter(ai => ai.should_show());

        this.app0 = existingApps.find(a => this.isMatchingApp(a, this.settings.get_string('app-0')));
    }

    isMatchingApp(app, name) {
        return app && app.get_name() && name && app.get_name().toLowerCase() === name.toLowerCase();
    }

    focusOrLaunch(definedApp) {
        if (!definedApp) {
            return;
        }

        global.get_window_actors().forEach(wa => {
            const win = wa.get_meta_window();
            const winApp = this.tracker.get_window_app(win);
            if (winApp.get_id() === definedApp.get_id()) {
                win.activate(global.get_current_time());
                return;
            }
        });
        definedApp.launch([], null);
    }
}

function init() {
    return new Extension();
}
