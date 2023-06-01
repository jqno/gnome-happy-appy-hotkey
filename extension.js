const ExtensionUtils = imports.misc.extensionUtils;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;

class Extension {

    constructor() {
    }

    enable() {
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.happy-appy-hotkey');
        this.initSettings();

        Main.wm.addKeybinding(
            'shortcut-0',
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            function() {
                global.log('HAH', 'Keybinding was pressed!');
            }
        );
    }

    disable() {
        Main.wm.removeKeybinding('shortcut-0');
    }

    initSettings() {
    }
}

function init() {
    return new Extension();
}
