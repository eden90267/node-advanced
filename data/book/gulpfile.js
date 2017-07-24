var gulp = require('gulp');
var babel = require('gulp-babel');
gulp.task('test', function () {
    return gulp.src('./ES6/*.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('./'));
});

gulp.task('watch', function() {
    gulp.watch('./ES6/*.js', ['test']);
});
gulp.task('default', ['test']);