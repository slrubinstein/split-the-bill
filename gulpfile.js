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

var paths = {
  sass: ['./scss/**/*.scss'],
  js: ['./src/**/*.js'],
  html: ['./src/**/*.html']
};

gulp.task('default', ['sass', 'templates', 'scripts-app', 'scripts-lib']);

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

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + gutil.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});

gulp.task('scripts-app', function() {
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
  var lib = gulp.src([
      '!./src/lib/**/*.min.js',
      './src/lib/**/*.js'
    ])
    .pipe(concat('lib.js'))
    .pipe(gulp.dest('./www/js/'));

  var libMin = gulp.src('./src/lib/**/*.min.js')
    .pipe(concat('lib.min.js'))
    .pipe(gulp.dest('./www/js/'));

  return [lib, libMin];
});

gulp.task('templates', function () {
  gulp.src('src/**/*.html')
    .pipe(templateCache({
      module: 'starter'
    }))
    .pipe(gulp.dest('src/public'));
});