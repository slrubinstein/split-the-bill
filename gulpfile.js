var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var autoprefixer = require('gulp-autoprefixer');
var uglify = require('gulp-uglify');
var ngAnnotate = require('gulp-ng-annotate');
var templateCache = require('gulp-angular-templatecache');
var fs = require('fs');
var args = require('yargs').argv;
var replace = require('gulp-replace');
var runSequence = require('run-sequence');
var mainBowerFiles = require('main-bower-files');
var gulpFilter = require('gulp-filter');

var paths = {
  sass: ['./scss/**/*.scss'],
  js: ['./src/**/*.js'],
  html: ['./src/**/*.html']
};

gulp.task('default', function() {
  runSequence('replace-api', ['sass', 'scripts-app', 'scripts-lib', 'css-lib']);
});

gulp.task('sass', function(done) {
  gulp.src('./scss/populate.scss')
    .pipe(sass({
      errLogToConsole: true
    }))
    .pipe(gulp.dest('./www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/css/'))
    .on('end', done);
});

gulp.task('watch', function() {
  gulp.watch(paths.sass, ['sass']);
  gulp.watch(paths.js, ['scripts-app']);
  gulp.watch(paths.html, ['templates', 'scripts-app']);
});

gulp.task('scripts-app', ['templates'], function() {
  return gulp.src([
      '!./src/lib/*',
      './src/**/*.js'
    ])
    .pipe(concat('app.js'))
    .pipe(gulp.dest('./www/js/'))
    .pipe(ngAnnotate())
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js'}))
    .pipe(gulp.dest('./www/js/'));
});

gulp.task('scripts-lib', function() {
  var libFiles = [

    // ignore ionic and angular which are in www/lib/ionic.bundle
    '!./src/lib/bower/ionic/**/*',
    '!./src/lib/bower/angular/**/*',
    '!./src/lib/bower/angular-animate/**/*',
    '!./src/lib/bower/angular-sanitize/**/*',
    '!./src/lib/bower/angular-ui-router/**/*',

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

gulp.task('css-lib', function() {
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

gulp.task('templates', function () {
  return gulp.src('src/**/*.html')
    .pipe(templateCache({
      module: 'ionic-app'
    }))
    .pipe(gulp.dest('src/public'));
});

/**
 * Remember to call with environment i.e. gulp --env desktop-test (defaults to desktop-local)
 * replace task runs before everything else
 */
gulp.task('replace-api', function() {
  var env = args.env || 'desktop-local';
  var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  console.log('environment: ', env);

  return gulp.src('./src/app.js')
    .pipe(replace(/\/\*gulp-replace-apiUrl\*\/(.*?)\/\*end\*\//g, '/*gulp-replace-apiUrl*/' + config.apiUrl[env] + '/*end*/'))
    .pipe(gulp.dest('./src/'));
})