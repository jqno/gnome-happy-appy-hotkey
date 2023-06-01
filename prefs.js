const { Adw, Gio, Gtk, GObject } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

function init() { }

function fillPreferencesWindow(win) {
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.happy-appy-hotkey');

    const page = new Adw.PreferencesPage();
    win.add(page);

    makeShortcut(page, settings);
}

function makeShortcut(page, settings) {
    const shortcutKey = 'shortcut-0';
    const appKey = 'app-0';

    const shortcut = new Gtk.Entry({
        text: settings.get_strv(shortcutKey)[0],
        hexpand: true
    });
    shortcut.connect('changed', () => {
        settings.set_strv(shortcutKey, [shortcut.text]);
    });
    settings.connect('changed::' + shortcutKey, () => {
        const cursor = shortcut.get_position();
        shortcut.text = settings.get_strv(shortcutKey)[0];
        shortcut.set_position(cursor);
    });

    const app = new Gtk.Entry({
        hexpand: true
    });
    const btn = new Gtk.Button({
        label: 'App'
    });
    btn.connect('clicked', () => {
        createAppChooserDialog(app);
    })
    settings.bind(appKey, app, 'text', Gio.SettingsBindFlags.DEFAULT);

    addToPage(page, 'Shortcut', shortcut, 'App', app, btn, 'The cool shortcut', null);
}

function createAppChooserDialog(textbox) {
    const dialog = new Gtk.Dialog({
        title: 'Choose an application',
        use_header_bar: 1,
        modal: true,
        resizable: false
    });
    dialog.set_size_request(300, 700);
    dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
    dialog.add_button('Confirm', Gtk.ResponseType.OK);
    dialog.set_default_response(Gtk.ResponseType.OK);

    const listStore = new Gtk.ListStore();
    listStore.set_column_types([GObject.TYPE_STRING]);
    listStore.set_sort_column_id(0, Gtk.SortType.ASCENDING);
    getInstalledApps().forEach(a => {
        const iter = listStore.append();
        listStore.set(iter, [0], [a]);
    })

    const appNameColumn = new Gtk.TreeViewColumn({ title: 'Application name' });
    const cellRenderer = new Gtk.CellRendererText();
    appNameColumn.pack_start(cellRenderer, true);
    appNameColumn.add_attribute(cellRenderer, 'text', 0);

    const treeView = new Gtk.TreeView({ model: listStore });
    treeView.append_column(appNameColumn);
    treeView.connect('row-activated', () => {
        dialog.response(Gtk.ResponseType.OK);
    });

    const selection = treeView.get_selection();
    selection.set_mode(Gtk.SelectionMode.SINGLE);

    const scrolledWindow = new Gtk.ScrolledWindow({ vexpand: true });
    scrolledWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
    scrolledWindow.set_child(treeView);

    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 10
    });
    box.append(scrolledWindow);

    dialog.connect('response', (dialog, responseId) => {
        if (responseId === Gtk.ResponseType.OK) {
            const [success, model, iter] = selection.get_selected();
            if (success) {
                const appName = model.get_value(iter, 0);
                updateApp(textbox, appName);
            }
        }
        dialog.destroy();
    });
    dialog.get_content_area().append(box);
    dialog.show();
}

function getInstalledApps() {
    return Gio.AppInfo.get_all()
        .filter(ai => ai.should_show())
        .map(ai => ai.get_name());
}

function updateApp(textbox, appName) {
    textbox.set_text(appName);
}

function addToPage(page, labelText1, widget1, labelText2, widget2, button2, explanationText1, explanationText2) {
    const grid = createGrid(page);

    const label1 = new Gtk.Label({ label: labelText1 + ':' });
    grid.attach(label1, 0, 0, 1, 1);
    grid.attach(widget1, 1, 0, 2, 1);

    const label2 = new Gtk.Label({ label: labelText2 + ':' });
    grid.attach(label2, 0, 1, 1, 1);
    grid.attach(widget2, 1, 1, 1, 1);
    if (button2) {
        grid.attach(button2, 2, 1, 1, 1);
    }


    if (explanationText1) {
        const explanation = new Gtk.Label({
            label: '<small>' + explanationText1 + '</small>',
            halign: Gtk.Align.END,
            use_markup: true
        });
        grid.attach(explanation, 0, 2, 3, 1);
    }
    if (explanationText2) {
        const explanation = new Gtk.Label({
            label: '<small>' + explanationText2 + '</small>',
            halign: Gtk.Align.END,
            use_markup: true
        });
        grid.attach(explanation, 0, 3, 3, 1);
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
