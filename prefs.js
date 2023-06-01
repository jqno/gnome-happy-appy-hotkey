const { Adw, Gio, Gtk } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

function init() { }

function fillPreferencesWindow(win) {
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.happy-appy-hotkey');

    const page = new Adw.PreferencesPage();
    win.add(page);

    makeShortcut(page, settings);
}

function makeShortcut(page, settings) {
    const key = 'shortcut-0';

    const shortcut = new Gtk.Entry({
        text: settings.get_strv(key)[0],
        hexpand: true
    });

    shortcut.connect('changed', () => {
        settings.set_strv(key, [shortcut.text]);
    });
    settings.connect('changed::' + key, () => {
        const cursor = shortcut.get_position();
        shortcut.text = settings.get_strv(key)[0];
        shortcut.set_position(cursor);
    });

    addToPage(page, shortcut, 'Shortcut', 'The cool shortcut', null);
}

function addToPage(page, widget, labelText, explanationText1, explanationText2) {
    const grid = createGrid(page);

    const label = new Gtk.Label({ label: labelText + ':' });
    grid.attach(label, 0, 0, 1, 1);

    grid.attach(widget, 1, 0, 1, 1);

    if (explanationText1) {
        const explanation = new Gtk.Label({
            label: '<small>' + explanationText1 + '</small>',
            halign: Gtk.Align.END,
            use_markup: true
        });
        grid.attach(explanation, 0, 1, 2, 1);
    }
    if (explanationText2) {
        const explanation = new Gtk.Label({
            label: '<small>' + explanationText2 + '</small>',
            halign: Gtk.Align.END,
            use_markup: true
        });
        grid.attach(explanation, 0, 2, 2, 1);
    }
}

function createGrid(page) {
    const group = new Adw.PreferencesGroup();
    page.add(group);

    const row = new Adw.ActionRow();
    group.add(row);

    const grid = new Gtk.Grid({
        row_spacing: 6,
        column_spacing: 12,
        margin_start: 12,
        margin_end: 12,
        margin_top: 12,
        margin_bottom: 12,
        column_homogeneous: false
    });
    row.set_child(grid);

    return grid;
}
