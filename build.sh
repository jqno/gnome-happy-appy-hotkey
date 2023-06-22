#!/usr/bin/env sh

case "$1" in

    "local")
        glib-compile-schemas schemas
        gnome-extensions pack --force --extra-source="LICENSE.md"
        gnome-extensions install --force happy-appy-hotkey@jqno.nl.shell-extension.zip
        echo "Press Alt+F2 and type 'restart'!"
        ;;

    "package")
        gnome-extensions pack --force --extra-source="LICENSE.md"
        ;;

    *)
        echo "Usage: ./build.sh <command>"
        echo ""
        echo "<command>:"
        echo "- local   Install the extension locally in \`~/.local/share/gnome-shell/extensions\`"
        echo "- package Package the extension for distribution"
        ;;

esac
