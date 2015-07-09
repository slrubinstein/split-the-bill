var gulp = require('gulp');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var autoprefixer = require('gulp-autoprefixer');
var uglify = require('gulp-uglify');
var ngAnnotate = require('gulp-ng-annotate');
var templateCache = require('gulp-angular-templatecache');
var replace = require('gulp-replace');
var args = require('yargs').argv;
var fs = require('fs');
var runSequence = require('run-sequence');
var mainBowerFiles = require('main-bower-files');
var gulpFilter = require('gulp-filter');
var karma = require('karma').server;
var protractor = require('gulp-protractor').protractor;
var gutil = require('gulp-util');
var clean = require('gulp-clean');

var paths = {
  sass: ['src/**/*.scss'],
  js: ['src/**/*.js'],
  html: ['src/**/*.html']
};
/**
 * Remember to call with environment i.e. gulp --env desktopTest (defaults to desktopLocal)
 * replace task runs before everything else
 */
gulp.task('default', function() {
  runSequence('replaceEnvApiUrl', ['replaceDevHtml', 'cssApp', 'cssLib', 'jsApp', 'jsLib']);
});

/**
 * Call before pushing a new version for testing, app store
 */
gulp.task('build', function() {
  runSequence(['replaceProdApiUrl'], ['replaceProdHtml', 'cssApp', 'cssLib', 'jsApp', 'jsLib'], ['cleanJs', 'cleanCss']);
});

gulp.task('watch', function() {
  gulp.watch(paths.sass, ['cssApp']);
  gulp.watch(paths.js, ['jsApp']);
  gulp.watch(paths.html, ['jsApp']);
});

gulp.task('cssApp', function() {
  return gulp.src('./src/scss/app.scss')
    .pipe(sass({
      errLogToConsole: true
    }))
    .pipe(autoprefixer())
    .pipe(gulp.dest('./www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/css/'));
});

gulp.task('cssLib', function() {
  var libFiles = [
    '!./src/lib/ionic/**/*',
    './src/lib/manual/**/*.css'
  ];

  return gulp.src(mainBowerFiles().concat(libFiles))
    .pipe(gulpFilter('**/*.css'))
    .pipe(concat('lib.css'))
    .pipe(gulp.dest('./www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/css/'));
});

gulp.task('jsApp', ['templates'], function() {
  return gulp.src([
      '!./src/lib/**/*',
      '!./src/**/*.spec.js',
      './src/**/*.js'
    ])
    .pipe(concat('app.js'))
    .pipe(ngAnnotate())
    .pipe(gulp.dest('./www/js/'))
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest('./www/js/'));
});

/**
 * This task loads all the bower files and their dependencies, concatenates them, and puts them in /www/js/lib.js. We do not want to include ionic and angular (regular, animate, sanitize, ui-router) in that file (they are already present in ionic.bundle), so this task ignores those directories.
 * This task also ignores the minified leaflet and only takes leaflet-src because leafelt 0.7.3 (most recent stable) doesn't follow Bower guidelines of only including the unminified scripts.
 */
gulp.task('jsLib', function() {
  var libFiles = [

    // ignore ionic and angular which are in www/lib/ionic.bundle
    '!./src/lib/bower/ionic/**/*',
    '!./src/lib/bower/angular/**/*',
    '!./src/lib/bower/angular-animate/**/*',
    '!./src/lib/bower/angular-sanitize/**/*',
    '!./src/lib/bower/angular-ui-router/**/*',

    // ignore leaflet minified js
    '!./src/lib/bower/leaflet/dist/leaflet.js',

    // include any manually installed front end libraries
    './src/lib/manual/**/*.js'
  ];

  return gulp.src(mainBowerFiles().concat(libFiles))
    .pipe(gulpFilter('**/*.js'))
    .pipe(concat('lib.js'))
    .pipe(gulp.dest('./www/js/'))
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest('./www/js/'));
});

/**
 * Concatenate html and put into $templateCache in standalone module 'templates'
 * The js for templates module lives in src/templates
 * This task runs before our js concatenate/minify so templates module is added to app.js
 */
gulp.task('templates', function () {
  return gulp.src('src/**/*.html')
    .pipe(templateCache({
      standalone: true
    }))
    .pipe(gulp.dest('src/templates'));
});

/**
 * Set up api endpoints based on command line arguments:
 * See src/config.json and client/ionic.project for options
 * Usage: gulp replace --env mobileProd
 * Defaults to desktopLocal if no argument is given
 */
gulp.task('replaceEnvApiUrl', function() {
  var env = args.env || 'desktopLocal';
  var config = JSON.parse(fs.readFileSync('./src/config.json', 'utf8'));
  console.log('environment: ', env);

  return gulp.src('./src/app.js')
    .pipe(replace(/\/\*gulp-replace-apiUrl\*\/(.*?)\/\*end\*\//g, '/*gulp-replace-apiUrl*/' + config.apiUrl[env] + '/*end*/'))
    .pipe(gulp.dest('./src/'));
});

gulp.task('karma', function(done) {
  karma.start({
    configFile: __dirname + '/karma.conf.js'
  }, done);
});

gulp.task('protractor', function() {
  gulp.src(['./e2e/**/*.spec.js'])
    .pipe(protractor({
      configFile: './protractor.conf.js',
      args: ['--baseUrl', 'http://localhost:8100']
    }))
    .on('error', function(e) { throw e });
});

/**
 * Repalce apiUrl for production
 * Same as calling replaceEnvApiUrl --env mobileProd
 */
gulp.task('replaceProdApiUrl', function() {
  var config = JSON.parse(fs.readFileSync('./src/config.json', 'utf8'));
  return gulp.src('./src/app.js')
    .pipe(replace(/\/\*gulp-replace-apiUrl\*\/(.*?)\/\*gulp-replace-apiUrl\*\//g, '/*gulp-replace-apiUrl*/' + config.apiUrl['mobileProd'] + '/*gulp-replace-apiUrl*/'))
    .pipe(gulp.dest('./src/'));
});

/**
 * Use unminified css and js files
 */
gulp.task('replaceDevHtml', function() {
  return gulp.src('./www/index.html')
    .pipe(replace(/<!-- gulp-replace-app\.css -->(.*?)<!-- end -->/g, 
      '<!-- gulp-replace-app.css --><link href="css/app.css" rel="stylesheet"><!-- end -->'))
    .pipe(replace(/<!-- gulp-replace-lib\.css -->(.*?)<!-- end -->/g, 
      '<!-- gulp-replace-lib.css --><link href="css/lib.css" rel="stylesheet"><!-- end -->'))
    .pipe(replace(/<!-- gulp-replace-app\.js -->(.*?)<!-- end -->/g, 
      '<!-- gulp-replace-app.js --><script src="js/app.js"></script><!-- end -->'))
    .pipe(replace(/<!-- gulp-replace-lib\.js -->(.*?)<!-- end -->/g, 
      '<!-- gulp-replace-lib.js --><script src="js/lib.js"></script><!-- end -->'))
    .pipe(gulp.dest('./www/'));
});

/**
 * Use minified css and js files
 */
gulp.task('replaceProdHtml', function() {
  return gulp.src('./www/index.html')
    .pipe(replace(/<!-- gulp-replace-app\.css -->(.*?)<!-- end -->/g, 
      '<!-- gulp-replace-app.css --><link href="css/app.min.css" rel="stylesheet"><!-- end -->'))
    .pipe(replace(/<!-- gulp-replace-lib\.css -->(.*?)<!-- end -->/g, 
      '<!-- gulp-replace-lib.css --><link href="css/lib.min.css" rel="stylesheet"><!-- end -->'))
    .pipe(replace(/<!-- gulp-replace-app\.js -->(.*?)<!-- end -->/g, 
      '<!-- gulp-replace-app.js --><script src="js/app.min.js"></script><!-- end -->'))
    .pipe(replace(/<!-- gulp-replace-lib\.js -->(.*?)<!-- end -->/g, 
      '<!-- gulp-replace-lib.js --><script src="js/lib.min.js"></script><!-- end -->'))
    .pipe(gulp.dest('./www/'));
});

/**
 * Remove non-minified js files for production
 */
gulp.task('cleanJs', function() {
  return gulp.src([
      '!./www/js/**/*.min.js',
      './www/js/**/*.js'
    ])
    .pipe(clean());
});

/**
 * Remove non-minified css files for productoin
 */
gulp.task('cleanCss', function() {
  return gulp.src([
      '!./www/css/**/*.min.css',
      './www/css/**/*.css'
    ])
    .pipe(clean());
});