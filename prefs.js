import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const MAX_NUMBER = 20;
const hotkeyHandles = []

export default class HappyAppyHotkeyPreferences extends ExtensionPreferences {

    fillPreferencesWindow(win) {
        const settings = this.getSettings('org.gnome.shell.extensions.happy-appy-hotkey');

        this.addAppHotkeyPage(win, settings);
        this.addMiscSettingPage(win, settings);
    }

    addMiscSettingPage(win, settings) {
        const page = new Adw.PreferencesPage();
        page.set_title('Misc');
        page.set_icon_name('dialog-information-symbolic');
        win.add(page);

        // Restrict to current workspace
        const [_, grid] = this.createGrid(page);
        const label1 = new Gtk.Label({
            halign: Gtk.Align.START,
            label: 'Restrict to current workspace'
        });
        const checkbox = new Gtk.CheckButton();
        settings.bind('restrict-to-current-workspace', checkbox, 'active', Gio.SettingsBindFlags.DEFAULT);
        grid.attach(label1, 0, 0, 1, 1);
        grid.attach(checkbox, 1, 0, 1, 1)

        // Unbound cycle
        const unboundCycle = this.makeHotkeyButton('unbound-cycle', settings, win);
        this.addToPage(page, 'Unbound cycle', unboundCycle, null, null, null, null, null, 'Cycle through apps that aren\'t bound to a hotkey in the other tab', null);
    }

    addAppHotkeyPage(win, settings) {
        const page = new Adw.PreferencesPage();
        page.set_title('Apps');
        page.set_icon_name('emblem-favorite-symbolic');
        win.add(page);

        this.makeAddButton(page, settings, win);

        const n = settings.get_int('number');
        for (let i = 0; i < n; i++) {
            this.makeAppHotkey(i, page, settings, win);
        }
    }

    makeAddButton(page, settings, parentWin) {
        const btn = new Gtk.Button({
            label: 'Add new hotkey'
        });
        btn.connect('clicked', () => {
            this.addHotkey(page, settings, parentWin);
        });

        const group = new Adw.PreferencesGroup();
        page.add(group);
        group.add(btn);
    }

    makeAppHotkey(i, page, settings, parentWin) {
        const hotkeyBtn = this.makeHotkeyButton(i, settings, parentWin);
        const [app, appBtn] = this.makeApp(i, settings, parentWin);

        const delBtn = new Gtk.Button({
            label: 'Remove hotkey'
        });
        delBtn.connect('clicked', () => {
            this.deleteHotkey(i, page, settings);
        })

        const handle = this.addToPage(page, 'Hotkey', hotkeyBtn, delBtn, 'App', app, appBtn, null, null);
        hotkeyHandles.push(handle);
    }

    makeHotkeyButton(i, settings, parentWin) {
        const hotkeyKey = `hotkey-${i}`;
        const btn = new Gtk.Button();
        btn.connect('clicked', () => {
            this.createShortcutDialog(hotkeyKey, settings, parentWin);
        })

        settings.connect(`changed::${hotkeyKey}`, () => {
            this.updateHotkeyButton(btn, hotkeyKey, settings);
        });

        this.updateHotkeyButton(btn, hotkeyKey, settings);

        return btn;
    }

    updateHotkeyButton(btn, hotkeyKey, settings) {
        const text = settings.get_strv(hotkeyKey)[0];
        if (text) {
            btn.set_label(text);
        }
        else {
            btn.set_label('Click to assign hotkey');
        }
    }

    makeApp(i, settings, parentWin) {
        const appKey = `app-${i}`;

        const app = new Gtk.Entry({
            hexpand: true
        });
        const appBtn = new Gtk.Button({
            label: 'Pick app'
        });
        appBtn.connect('clicked', () => {
            this.createAppChooserDialog(app, parentWin);
        })

        settings.bind(appKey, app, 'text', Gio.SettingsBindFlags.DEFAULT);

        return [app, appBtn];
    }

    addHotkey(page, settings, parentWin) {
        const n = settings.get_int('number');

        if (n < MAX_NUMBER) {
            this.makeAppHotkey(n, page, settings, parentWin);

            settings.set_int('number', n + 1);
        }
    }

    deleteHotkey(index, page, settings) {
        const n = settings.get_int('number') - 1;

        for (let i = index; i < n; i++) {
            settings.set_strv(`hotkey-${i}`, settings.get_strv(`hotkey-${i + 1}`));
            settings.set_string(`app-${i}`, settings.get_string(`app-${i + 1}`));
        }
        settings.reset(`hotkey-${n}`);
        settings.reset(`app-${n}`);

        page.remove(hotkeyHandles[n]);
        hotkeyHandles.pop();

        settings.set_int('number', n);
    }

    createShortcutDialog(hotkeyKey, settings, parentWin) {
        const dialog = new Gtk.Dialog({
            title: 'Set hotkey',
            use_header_bar: 1,
            modal: true,
            resizable: false
        });
        dialog.set_transient_for(parentWin);
        dialog.set_size_request(440, 200);

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 2,
            marginStart: 16,
            marginEnd: 16,
            marginTop: 16,
            marginBottom: 16
        });
        dialog.get_content_area().append(box);

        const label = new Gtk.Label({
            vexpand: true,
            label: 'Press keyboard shortcut, or Escape to cancel, or BackSpace to clear the hotkey.'
        });
        box.append(label);

        const eventController = new Gtk.EventControllerKey();
        dialog.add_controller(eventController);

        eventController.connect('key-pressed', (_widget, keyval, keycode, state) => {
            let mask = state & Gtk.accelerator_get_default_mod_mask();
            mask &= ~Gdk.ModifierType.LOCK_MASK;

            if (mask === 0 && keyval === Gdk.KEY_Escape) {
                dialog.visible = false;
                return Gdk.EVENT_STOP;
            }

            if (keyval === Gdk.KEY_BackSpace) {
                settings.set_strv(hotkeyKey, []);
                dialog.close();
                return Gdk.EVENT_STOP;
            }

            if (this.isBindingValid({ mask, keycode, keyval })) {
                const binding = Gtk.accelerator_name_with_keycode(
                    null,
                    keyval,
                    keycode,
                    mask
                );
                settings.set_strv(hotkeyKey, [binding]);
                dialog.close();
            }
            return Gdk.EVENT_STOP;

        })

        dialog.show();
    }

    isBindingValid({ mask, keycode, keyval }) {
        if ((mask === 0 || mask === Gdk.ModifierType.SHIFT_MASK) && keycode !== 0) {
            if (
                (keyval >= Gdk.KEY_a && keyval <= Gdk.KEY_z)
                || (keyval >= Gdk.KEY_A && keyval <= Gdk.KEY_Z)
                || (keyval >= Gdk.KEY_0 && keyval <= Gdk.KEY_9)
                || (keyval >= Gdk.KEY_kana_fullstop && keyval <= Gdk.KEY_semivoicedsound)
                || (keyval >= Gdk.KEY_Arabic_comma && keyval <= Gdk.KEY_Arabic_sukun)
                || (keyval >= Gdk.KEY_Serbian_dje && keyval <= Gdk.KEY_Cyrillic_HARDSIGN)
                || (keyval >= Gdk.KEY_Greek_ALPHAaccent && keyval <= Gdk.KEY_Greek_omega)
                || (keyval >= Gdk.KEY_hebrew_doublelowline && keyval <= Gdk.KEY_hebrew_taf)
                || (keyval >= Gdk.KEY_Thai_kokai && keyval <= Gdk.KEY_Thai_lekkao)
                || (keyval >= Gdk.KEY_Hangul_Kiyeog && keyval <= Gdk.KEY_Hangul_J_YeorinHieuh)
                || (keyval === Gdk.KEY_space && mask === 0)
            ) {
                return false;
            }
        }

        return Gtk.accelerator_valid(keyval, mask)
            || (keyval === Gdk.KEY_Tab && mask !== 0)
            || (keyval === Gdk.KEY_Scroll_Lock)
            || (keyval === Gdk.KEY_Break);
    }

    createAppChooserDialog(textbox, parentWin) {
        const dialog = new Gtk.Dialog({
            title: 'Choose an application',
            use_header_bar: true,
            modal: true,
            resizable: false
        });
        dialog.set_transient_for(parentWin);
        dialog.set_size_request(300, 700);
        dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
        dialog.add_button('Confirm', Gtk.ResponseType.OK);
        dialog.set_default_response(Gtk.ResponseType.OK);

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 10
        });
        dialog.get_content_area().append(box);

        const scrolledWindow = new Gtk.ScrolledWindow({ vexpand: true });
        scrolledWindow.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        box.append(scrolledWindow);

        const listStore = new Gtk.ListStore();
        listStore.set_column_types([GObject.TYPE_STRING]);
        listStore.set_sort_column_id(0, Gtk.SortType.ASCENDING);
        this.getInstalledApps().forEach(a => {
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
        scrolledWindow.set_child(treeView);

        const selection = treeView.get_selection();
        selection.set_mode(Gtk.SelectionMode.SINGLE);

        dialog.connect('response', (dialog, responseId) => {
            if (responseId === Gtk.ResponseType.OK) {
                const [success, model, iter] = selection.get_selected();
                if (success) {
                    const appName = model.get_value(iter, 0);
                    this.updateApp(textbox, appName);
                }
            }
            dialog.destroy();
        });
        dialog.show();
    }

    getInstalledApps() {
        return Gio.AppInfo.get_all()
            .filter(ai => ai.should_show())
            .map(ai => ai.get_name());
    }

    updateApp(textbox, appName) {
        textbox.set_text(appName);
    }

    addToPage(page, labelText1, widget1, button1, labelText2, widget2, button2, explanationText1, explanationText2) {
        const [handle, grid] = this.createGrid(page);

        const label1 = new Gtk.Label({
            halign: Gtk.Align.START,
            label: `${labelText1}:`
        });
        grid.attach(label1, 0, 0, 1, 1);
        grid.attach(widget1, 1, 0, 1, 1);

        if (button1) {
            grid.attach(button1, 2, 0, 1, 1);
        }

        if (button2) {
            const label2 = new Gtk.Label({
                halign: Gtk.Align.START,
                label: `${labelText2}:`
            });
            grid.attach(label2, 0, 1, 1, 1);
            grid.attach(widget2, 1, 1, 1, 1);
            grid.attach(button2, 2, 1, 1, 1);
        }

        if (explanationText1) {
            const explanation = new Gtk.Label({
                label: `<small>${explanationText1}</small>`,
                halign: Gtk.Align.END,
                use_markup: true
            });
            grid.attach(explanation, 0, 2, 3, 1);
        }
        if (explanationText2) {
            const explanation = new Gtk.Label({
                label: `<small>${explanationText2}</small>`,
                halign: Gtk.Align.END,
                use_markup: true
            });
            grid.attach(explanation, 0, 3, 3, 1);
        }

        return handle;
    }

    createGrid(page) {
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
}
