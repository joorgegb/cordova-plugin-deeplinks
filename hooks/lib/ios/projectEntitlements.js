/*
Script creates entitlements file with the list of hosts, specified in config.xml.
File name is: ProjectName.entitlements
Location: ProjectName/
Script only generates content. File it self is included in the xcode project in another hook: xcodePreferences.js.
*/

var path = require('path');
var fs = require('fs');
var plist = require('plist');
var mkpath = require('mkpath');
var context;

module.exports = {
  generateAssociatedDomainsEntitlements: generateEntitlements
};

// region Public API

/**
 * Generate entitlements file content.
 *
 * @param {Object} context - cordova context object
 * @param {Object} pluginPreferences - plugin preferences from config.xml; already parsed
 */
function generateEntitlements(context, pluginPreferences) {
    var iosPlatform = path.join(context.opts.projectRoot, 'platforms/ios/');
    var iosFolder = fs.existsSync(iosPlatform) ? iosPlatform : context.opts.projectRoot;

    var data = fs.readdirSync(iosFolder);
    var projFolder = null;
    var projName = null;
    if (data && data.length) {
        data.forEach(function (folder) {
            if (folder.match(/\.xcodeproj$/)) {
                projName = path.basename(folder, '.xcodeproj');
                projFolder = path.join(iosFolder, projName);
            }
        });
    }

    if (!projFolder || !projName) {
        throw new Error("Could not find an .xcodeproj folder in: " + iosFolder);
    }

    if (directoryExists(iosFolder)) {
      ['Debug', 'Release'].forEach(function(target) {
          var pathToFile = path.join(projFolder, 'Entitlements-' + target + '.plist');
          var entitlements;

          try {
              entitlements = plist.parse(fs.readFileSync(pathToFile, 'utf8'));
          } catch (err) {
              entitlements = {};
          }

          var domainsList = [];
          pluginPreferences.hosts.forEach(function(host) {
              var link = 'applinks:' + host.name;
              if (domainsList.indexOf(link) === -1) {
                  domainsList.push(link);
              }
          });

          entitlements['com.apple.developer.associated-domains'] = domainsList;

          // save it's content
          fs.writeFileSync(pathToFile, plist.build(entitlements), 'utf8');
      });
    }
}

// endregion

// region Path helper methods

function directoryExists(path) {
    try  {
        return fs.statSync(path).isDirectory();
    } catch (e) {
        logMe("directoryExists error: " + e);
        return false;
    }
}

// endregion