#!/usr/bin/env node

var os = require('os')
var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var proc = require('child_process')
var minimist = require('minimist')

var argv = minimist(process.argv.slice(2), {
  alias: {
    b: 'build-tools',
    o: 'out'
  },
  default: {
    o: 'app.apk'
  }
})

if (!argv.b) {
  console.error('--build-tools=[path/to/android/build/tools] is required')
  process.exit(1)
}

var cwd = path.resolve(argv._[0] || process.cwd())
var app = path.resolve(cwd, argv.o || 'app.apk')
var buildTools = argv.b
var base = path.join(__dirname, 'base.apk')
var tmp = path.join(os.tmpdir(), 'node-on-android-' + Date.now())
var node = path.join(tmp, 'base', 'assets', 'node')
var keystore = path.join(__dirname, 'whatever.keystore')

// Load config file if it exists
var config = {}
var configPath = path.join(cwd, 'node-on-android.config.js')
if (fs.existsSync(configPath)) {
  config = require(configPath)
}

// Default excludes
var defaultExcludes = ['node_modules', 'node-on-android', '*.apk', '*.idsig']
var excludes = config.excludes || defaultExcludes

mkdirp.sync(tmp)

run('rm', ['-f', app])
run('apktool', ['d', base, '-f', '-o', path.join(tmp, 'base')])
run('rm', ['-rf', node])
run('mkdir', ['-p', node])

// Build rsync args with configurable excludes
var rsyncArgs = ['-a']
excludes.forEach(function(pattern) {
  rsyncArgs.push('--exclude', pattern)
})
rsyncArgs.push(cwd + '/', node + '/')

run('rsync', rsyncArgs)

// Inject branding if configured
if (config.branding) {
  injectBranding(config.branding, path.join(tmp, 'base'), cwd)
}

run('apktool', ['b', 'base', '-o', app])
run(path.join(buildTools, 'zipalign'), ['-v', '-p', '4', app, app + '.aligned'])
run('mv', [app + '.aligned', app])
run(path.join(buildTools, 'apksigner'), ['sign', '--ks-pass', 'pass:whatever', '--ks', keystore, '--out', app, app])
run('rm', ['-rf', tmp])

console.log('Done! apk file is stored in:')
console.log(app)

function injectBranding (branding, baseDir, projectDir) {
  var resDir = path.join(baseDir, 'res')

  console.log('Injecting branding customizations...')

  // 1. Update app name in strings.xml
  if (branding.appName) {
    var stringsPath = path.join(resDir, 'values', 'strings.xml')
    var stringsXml = fs.readFileSync(stringsPath, 'utf8')
    stringsXml = stringsXml.replace(
      /<string name="app_name">.*<\/string>/,
      '<string name="app_name">' + branding.appName + '</string>'
    )
    fs.writeFileSync(stringsPath, stringsXml)
    console.log('  ✓ App name: ' + branding.appName)
  }

  // 2. Update colors if provided
  if (branding.splashBackground || branding.colors) {
    var colorsPath = path.join(resDir, 'values', 'colors.xml')
    var colorsXml = fs.readFileSync(colorsPath, 'utf8')

    if (branding.splashBackground) {
      colorsXml = colorsXml.replace(
        /<color name="splash_background">.*<\/color>/,
        '<color name="splash_background">' + branding.splashBackground + '</color>'
      )
    }

    if (branding.colors) {
      if (branding.colors.primary) {
        colorsXml = colorsXml.replace(
          /<color name="colorPrimary">.*<\/color>/,
          '<color name="colorPrimary">' + branding.colors.primary + '</color>'
        )
      }
      if (branding.colors.primaryDark) {
        colorsXml = colorsXml.replace(
          /<color name="colorPrimaryDark">.*<\/color>/,
          '<color name="colorPrimaryDark">' + branding.colors.primaryDark + '</color>'
        )
      }
      if (branding.colors.accent) {
        colorsXml = colorsXml.replace(
          /<color name="colorAccent">.*<\/color>/,
          '<color name="colorAccent">' + branding.colors.accent + '</color>'
        )
      }
    }

    fs.writeFileSync(colorsPath, colorsXml)
    console.log('  ✓ Colors updated')
  }

  // 3. Copy and resize app icons
  if (branding.appIcon && fs.existsSync(path.join(projectDir, branding.appIcon))) {
    var iconPath = path.join(projectDir, branding.appIcon)
    var densities = {
      'mdpi': 48,
      'hdpi': 72,
      'xhdpi': 96,
      'xxhdpi': 144,
      'xxxhdpi': 192
    }

    for (var density in densities) {
      var size = densities[density]
      var outPath = path.join(resDir, 'mipmap-' + density, 'ic_launcher.png')
      run('magick', [iconPath, '-resize', size + 'x' + size, outPath])
    }
    console.log('  ✓ App icons generated')
  }

  // 4. Copy splash logo
  if (branding.splashLogo && fs.existsSync(path.join(projectDir, branding.splashLogo))) {
    var logoPath = path.join(projectDir, branding.splashLogo)
    var splashLogoPath = path.join(resDir, 'drawable', 'splash_logo.png')
    run('cp', [logoPath, splashLogoPath])
    console.log('  ✓ Splash logo copied')
  }

  // 5. Update splash screen insets if provided
  if (branding.splashInsets) {
    var splashPath = path.join(resDir, 'drawable', 'splash_screen.xml')
    var splashXml = fs.readFileSync(splashPath, 'utf8')

    if (branding.splashInsets.top) {
      splashXml = splashXml.replace(/android:top="[^"]*"/, 'android:top="' + branding.splashInsets.top + '"')
    }
    if (branding.splashInsets.bottom) {
      splashXml = splashXml.replace(/android:bottom="[^"]*"/, 'android:bottom="' + branding.splashInsets.bottom + '"')
    }
    if (branding.splashInsets.left) {
      splashXml = splashXml.replace(/android:left="[^"]*"/, 'android:left="' + branding.splashInsets.left + '"')
    }
    if (branding.splashInsets.right) {
      splashXml = splashXml.replace(/android:right="[^"]*"/, 'android:right="' + branding.splashInsets.right + '"')
    }

    fs.writeFileSync(splashPath, splashXml)
    console.log('  ✓ Splash screen layout updated')
  }

  console.log('Branding injection complete!')
}

function run (cmd, args) {
  proc.spawnSync(cmd, args, {
    cwd: tmp,
    stdio: 'inherit'
  })
}
