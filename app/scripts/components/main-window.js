'use strict';


/**
 * Modules
 * Node
 * @global
 * @constant
 */
const path = require('path');

/**
 * Modules
 * Electron
 * @global
 * @constant
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');

/**
 * Modules
 * External
 * @global
 * @constant
 */
const appRootPath = require('app-root-path').path;
const electronConnect = require('electron-connect');

/**
 * Modules
 * Internal
 * @global
 * @constant
 */
const packageJson = require(path.join(appRootPath, 'package.json'));
const platformHelper = require(path.join(appRootPath, 'lib', 'platform-helper'));
const logger = require(path.join(appRootPath, 'lib', 'logger'))({ writeToFile: true });
const isDebug = require(path.join(appRootPath, 'lib', 'is-debug'));
const isLivereload = require(path.join(appRootPath, 'lib', 'is-livereload'));
const settings = require(path.join(appRootPath, 'app', 'scripts', 'configuration', 'settings'));


/**
 * App
 * @global
 */
let appProductName = packageJson.productName || packageJson.name;
let appUrl = 'file://' + path.join(appRootPath, 'app', 'html', 'main.html');

/**
 * Paths
 * @global
 */
let appIcon = path.join(appRootPath, 'icons', platformHelper.type, 'icon-app' + platformHelper.iconImageExtension(platformHelper.type));

/**
 * @global
 */
let mainWindow;
let mainPage;


/**
 *  Create the Application's main window
 */
let createMainWindow = () => {
    mainWindow = new BrowserWindow({
        acceptFirstMouse: true,
        autoHideMenuBar: true,
        transparent: true,
        frame: !platformHelper.isMacOS,
        fullscreenable: true,
        icon: appIcon,
        minWidth: 300,
        minHeight: 200,
        show: false,
        title: appProductName,
        titleBarStyle: platformHelper.isMacOS ? 'hidden-inset' : 'default',
        webPreferences: {
            allowDisplayingInsecureContent: true,
            allowRunningInsecureContent: true,
            experimentalFeatures: true,
            nodeIntegration: true,
            partition: 'persist:app',
            webaudio: true,
            webSecurity: false
        }
    });

    // and load the index.html of the app.
    mainWindow.loadURL(appUrl);

    /** @listens mainWindow:close */
    mainWindow.on('close', ev => {
        if (!app.isQuitting) {
            ev.preventDefault();
            mainWindow.hide();
        }
    });

    /** @listens mainWindow:show */
    mainWindow.on('show', () => {
        settings.settings.set('internal.isVisible', true).then(() => {});
    });

    /** @listens mainWindow:hide */
    mainWindow.on('hide', () => {
        settings.settings.set('internal.isVisible', false).then(() => {});
    });

    /** @listens mainWindow:move */
    mainWindow.on('move', () => {
        settings.settings.setSync('internal.windowBounds', BrowserWindow.getAllWindows()[0].getBounds());
    });

    /** @listens mainWindow:resize */
    mainWindow.on('resize', () => {
        settings.settings.setSync('internal.windowBounds', BrowserWindow.getAllWindows()[0].getBounds());
    });

    // Web Contents
    mainPage = mainWindow.webContents;

    /** @listens mainPage:will-navigate */
    mainPage.on('will-navigate', (event, url) => {
        event.preventDefault();
        if (url) {
            //noinspection JSCheckFunctionSignatures
            shell.openExternal(url);
        }
    });

    /** @listens mainPage:dom-ready */
    mainPage.on('dom-ready', () => {
        if (settings.settings.getSync('internal.isVisible')) {
            BrowserWindow.getAllWindows()[0].show();
        } else {
            BrowserWindow.getAllWindows()[0].hide();
        }

        // DEBUG
        if (isDebug) {
            mainPage.webContents.openDevTools({ mode: 'detach' });
        }
        if (isLivereload) {
            mainPage.webContents.openDevTools({ mode: 'detach' });
            const electronConnectClient = electronConnect.client;
            electronConnectClient.create();
        }

        // DEBUG
        logger.debug('main-window', 'dom-ready');
    });

    // DEBUG
    logger.debug('main-window', 'createMainWindow()');

    return mainWindow;
};


/** @listens ipcMain:window-minimize */
ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
});

/** @listens ipcMain:window-unmaximize */
ipcMain.on('window-unmaximize', () => {
    mainWindow.unmaximize();
});

/** @listens ipcMain:window-maximize */
ipcMain.on('window-maximize', () => {
    mainWindow.maximize();
});

/** @listens ipcMain:window-close */
ipcMain.on('window-close', () => {
    mainWindow.close();
});


/**
 * @listens app#activate
 */
app.on('activate', () => {
    mainWindow.show();
});

/**
 * @listens app#ready
 */
app.on('ready', () => {
    createMainWindow();
});


/**
 * @exports
 */
module.exports = {
    create: createMainWindow
};
