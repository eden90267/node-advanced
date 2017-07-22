var gulp = require("gulp");
var ts = require('gulp-typescript');

gulp.task('ts', function () {
    return gulp.src('./ts/**/*.ts')
        .pipe(ts({
            noImplicitAny: true,
            target: 'ES6'
        }))
        .pipe(gulp.dest('./'));
});
gulp.task('default', ['ts']);