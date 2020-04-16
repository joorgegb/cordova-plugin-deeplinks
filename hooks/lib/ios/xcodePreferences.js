/*
 Script activates support for Universal Links in the application by setting proper preferences in the xcode project file.
 Which is:
 - deployment target set to iOS 9.0
 - .entitlements file added to project PBXGroup and PBXFileReferences section
 - path to .entitlements file added to Code Sign Entitlements preference
 */

var fs = require('fs');
var path = require('path');
var compare = require('node-version-compare');
var IOS_DEPLOYMENT_TARGET = '8.0';
var COMMENT_KEY = /_comment$/;
var context;

module.exports = {
    enableAssociativeDomainsCapability: enableAssociativeDomainsCapability
};

// region Public API

/**
 * Activate associated domains capability for the application.
 *
 * @param {Object} context - cordova context object
 */
function enableAssociativeDomainsCapability(context) {
    var iosPlatform = path.join(context.opts.projectRoot, 'platforms/ios/');
    var iosFolder = fs.existsSync(iosPlatform) ? iosPlatform : context.opts.projectRoot;

    var data = fs.readdirSync(iosFolder);
    var projFolder = null;
    var projName = null;
    if (data && data.length) {
        data.forEach(function (folder) {
            if (folder.match(/\.xcodeproj$/)) {
                projFolder = path.join(iosFolder, folder);
                projName = path.basename(folder, '.xcodeproj');
            }
        });
    }

    if (!projFolder || !projName) {
        throw new Error("Could not find an .xcodeproj folder in: " + iosFolder);
    }

    if (directoryExists(iosFolder)) {
        activateAssociativeDomains(context, projFolder);
    }
}

// endregion

// region Alter project file preferences

/**
 * Activate associated domains support in the xcode project file:
 * - set deployment target to ios 9;
 * - add .entitlements file to Code Sign Entitlements preference.
 */
function activateAssociativeDomains(context, projFolder) {
    var xcode = require('xcode');

    var projectPath = path.join(projFolder, 'project.pbxproj');
    var pbxProject;
    if (context.opts.cordova.project) {
        pbxProject = context.opts.cordova.project.parseProjectFile(context.opts.projectRoot).xcode;
    } else {
        pbxProject = xcode.project(projectPath);
        pbxProject.parseSync();
    }

    var configurations = nonComments(pbxProject.pbxXCBuildConfigurationSection());
    var deploymentTargetIsUpdated;

    for (var config in configurations) {
        var buildSettings = configurations[config].buildSettings;
        // if deployment target is less then the required one - increase it
        if (buildSettings['IPHONEOS_DEPLOYMENT_TARGET']) {
            if (compare(buildSettings['IPHONEOS_DEPLOYMENT_TARGET'], IOS_DEPLOYMENT_TARGET) === -1) {
                buildSettings['IPHONEOS_DEPLOYMENT_TARGET'] = IOS_DEPLOYMENT_TARGET;
                deploymentTargetIsUpdated = true;
            }
        } else {
            buildSettings['IPHONEOS_DEPLOYMENT_TARGET'] = IOS_DEPLOYMENT_TARGET;
            deploymentTargetIsUpdated = true;
        }
    }

    if (deploymentTargetIsUpdated) {
        console.log('IOS project now has deployment target set as: ' + IOS_DEPLOYMENT_TARGET);
    }

    fs.writeFileSync(projectPath, pbxProject.writeSync());
}

// endregion

// region Xcode project file helpers

/**
 * Remove comments from the file.
 *
 * @param {Object} obj - file object
 * @return {Object} file object without comments
 */
function nonComments(obj) {
    var keys = Object.keys(obj);
    var newObj = {};

    for (var i = 0, len = keys.length; i < len; i++) {
        if (!COMMENT_KEY.test(keys[i])) {
            newObj[keys[i]] = obj[keys[i]];
        }
    }

    return newObj;
}

// endregion

// region Path helpers

function directoryExists(path) {
    try {
        return fs.statSync(path).isDirectory();
    } catch (e) {
        logMe("directoryExists error: " + e);
        return false;
    }
}

// endregion