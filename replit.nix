{ pkgs }: {
  deps = [
    pkgs.gdbm
    pkgs.nspr
    pkgs.nodejs_20
    pkgs.nodePackages.typescript-language-server
    pkgs.nodePackages.tsx
    pkgs.nodePackages.npm
    pkgs.gdb

    # Required for Playwright
    pkgs.nss
    pkgs.alsa-lib
    pkgs.libxss
    pkgs.libxkbcommon
    pkgs.xorg.libxcomposite
    pkgs.xorg.libxfixes
    pkgs.xorg.libxrandr
    pkgs.xorg.libxdamage
    pkgs.xorg.libxext
    pkgs.xorg.libxshmfence
    pkgs.at-spi2-core
    pkgs.at-spi2-atk
    pkgs.atk
    pkgs.cairo
    pkgs.cups
    pkgs.dbus
    pkgs.expat
    pkgs.fontconfig
    pkgs.freetype
    pkgs.gdk-pixbuf
    pkgs.glib
    pkgs.harfbuzz
    pkgs.pango
    pkgs.udev
    pkgs.gtk3
    pkgs.xorg.libX11
  ];
}