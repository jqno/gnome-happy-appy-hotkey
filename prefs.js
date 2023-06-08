const { Adw, Gio, Gtk, GObject } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

const MAX_NUMBER = 20;
const hotkeyHandles = []

function init() { }

function fillPreferencesWindow(win) {
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.happy-appy-hotkey');

    const page = new Adw.PreferencesPage();
    win.add(page);

    makeAddButton(page, settings);

    const n = settings.get_int('number');
    for (let i = 0; i < n; i++) {
        makeShortcut(i, page, settings);
    }
}

function makeAddButton(page, settings) {
    const btn = new Gtk.Button({
        label: 'Add new hotkey'
    });
    btn.connect('clicked', () => {
        addHotkey(page, settings);
    });

    const group = new Adw.PreferencesGroup();
    page.add(group);
    group.add(btn);
}

function makeShortcut(i, page, settings) {
    const shortcutKey = `shortcut-${i}`;
    const appKey = `app-${i}`;

    const shortcut = new Gtk.Entry({
        text: settings.get_strv(shortcutKey)[0],
        hexpand: true
    });
    shortcut.connect('changed', () => {
        settings.set_strv(shortcutKey, [shortcut.text]);
    });
    settings.connect(`changed::${shortcutKey}`, () => {
        const cursor = shortcut.get_position();
        shortcut.text = settings.get_strv(shortcutKey)[0];
        shortcut.set_position(cursor);
    });

    const app = new Gtk.Entry({
        hexpand: true
    });
    const appBtn = new Gtk.Button({
        label: 'App'
    });
    appBtn.connect('clicked', () => {
        createAppChooserDialog(app);
    })

    const delBtn = new Gtk.Button({
        label: 'Remove'
    });
    delBtn.connect('clicked', () => {
        deleteHotkey(i, page, settings);
    })

    settings.bind(appKey, app, 'text', Gio.SettingsBindFlags.DEFAULT);
    const handle = addToPage(page, 'Shortcut', shortcut, 'App', app, appBtn, delBtn, null, null);

    hotkeyHandles.push(handle);
}

function addHotkey(page, settings) {
    const n = settings.get_int('number');

    if (n < MAX_NUMBER) {
        makeShortcut(n, page, settings);

        settings.set_int('number', n + 1);
    }
}

function deleteHotkey(index, page, settings) {
    let n = settings.get_int('number') - 1;

    for (let i = index; i < n; i++) {
        settings.set_strv(`shortcut-${i}`, settings.get_strv(`shortcut-${i + 1}`));
        settings.set_string(`app-${i}`, settings.get_string(`app-${i + 1}`));
    }
    settings.reset(`shortcut-${n}`);
    settings.reset(`app-${n}`);

    page.remove(hotkeyHandles[n]);
    hotkeyHandles.pop();

    settings.set_int('number', n);
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

function addToPage(page, labelText1, widget1, labelText2, widget2, button2, button3, explanationText1, explanationText2) {
    const [handle, grid] = createGrid(page);

    const label1 = new Gtk.Label({ label: labelText1 + ':' });
    grid.attach(label1, 0, 0, 1, 1);
    grid.attach(widget1, 1, 0, 2, 1);

    const label2 = new Gtk.Label({ label: labelText2 + ':' });
    grid.attach(label2, 0, 1, 1, 1);
    grid.attach(widget2, 1, 1, 1, 1);
    if (button2) {
        grid.attach(button2, 2, 1, 1, 1);
    }

    if (button3) {
        grid.attach(button3, 2, 2, 1, 1);
    }

    if (explanationText1) {
        const explanation = new Gtk.Label({
            label: '<small>' + explanationText1 + '</small>',
            halign: Gtk.Align.END,
            use_markup: true
        });
        grid.attach(explanation, 0, 3, 3, 1);
    }
    if (explanationText2) {
        const explanation = new Gtk.Label({
            label: '<small>' + explanationText2 + '</small>',
            halign: Gtk.Align.END,
            use_markup: true
        });
        grid.attach(explanation, 0, 4, 3, 1);
    }

    return handle;
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

    return [group, grid];
}
