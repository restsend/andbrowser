Android in web browser
=======
Using Android phone in web browsers.  ([Apache License 2.0](https://github.com/Genymobile/scrcpy/blob/master/LICENSE))


Based:
  Vue3 + Vite + TailwindCSS + ya-webadb + scrcpy


[Online Demo](https://browserlify.com/?from=github)

Also availabled in [chrome webstore](https://chrome.google.com/webstore/detail/phone-on-web-browserlifyc/gaibhhiogjpncmcehohlmcikfgbcacbl)


## Features
* Screen mirroring and controling device
* File Management
* Screen Capture


## Enabled USB Debugging in first
* Enabled android phone developer mode
* Enabled USB Debugging mode

## How to start
```shell
# Install depends
npm install --force

# run local test
npm run dev

# Bulid for release
npm run build
```

## Roadmap
* Keyboard mapping
* Screen sharing
* Multi screen in one tab

## Credits
* Android Debug Bridge (ADB) for Web Browsers [ya-webadb](https://github.com/yume-chan/ya-webadb)   
* Google for [ADB](https://android.googlesource.com/platform/packages/modules/adb) ([Apache License 2.0](./adb.NOTICE))
* Romain Vimont for [Scrcpy](https://github.com/Genymobile/scrcpy) ([Apache License 2.0](https://github.com/Genymobile/scrcpy/blob/master/LICENSE))