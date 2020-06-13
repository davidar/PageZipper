"use strict";

const gulp = require("gulp");
const del = require('del');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const gulpIf = require('gulp-if');
const babel = require('gulp-babel');

const src = "src"
const dest = "dist";
const ffext_dir = `ffextension`;
const chrome_dir = `chrome_ext`;
const bookmarklet_name = "pagezipper_10.js";
const ext_name = "pagezipper.js"
const node_name = "index.js";

var isProd = false

const srcs = {
              headers: ["header.js"],
              libs: [
                  "lib/jquery.js",
                  "lib/jstoolkit.js",
                  "lib/levenshtein.js",
              ],
              pgzp_srcs: [
                "pagezipper.js",
                "compat.js",
                "image.js",
                "menu.js",
                "nextlink.js",
                "next_url_trials.js",
                "next_url.js",
                "page_loader_ajax.js",
                "page_loader_iframe.js",
                "page_loader.js",
                "util.js",
              ]
};

function build_pgzp(output_name, loader_file, destLoc, isProd=false, skipJq=false, skipLibs=false) {

  // prepend 'src/' to filepaths
  ['headers', 'libs', 'pgzp_srcs'].forEach( jsFileArray => {
    global[`curr_${jsFileArray}`] = srcs[jsFileArray].map( f => { return `${src}/${f}` });
  });

  curr_pgzp_srcs.push(loader_file);

  if (skipJq) curr_libs.splice(0, 1);
  if (skipLibs) curr_libs = [];
  var allJsFiles = curr_headers.concat(curr_libs).concat([`${destLoc}/${output_name}`]);

  //compile pgzp src files
  gulp.src(curr_pgzp_srcs)
    .pipe(concat(output_name, {newLine: '\n\n'}))
    .pipe(babel())
    .pipe(gulpIf(isProd, uglify()))
    .pipe(gulp.dest(destLoc))
    .on('end', function() {

        // combine headers, libs, and compiled srcs
        gulp.src(allJsFiles)
          .pipe(concat(output_name, {newLine: '\n\n'}))
          .pipe(gulp.dest(destLoc));
    });
}

function copy_ext_files(ext_dir) {
  gulp.src(`${src}/${ext_dir}/*`)
    .pipe(gulp.dest(`${dest}/${ext_dir}`));
  gulp.src(`${src}/extension_*/**`)
    .pipe(gulp.dest(`${dest}/${ext_dir}`));
}

gulp.task('clean', cb => {
  var deleted = del.sync([`${dest}/*`, node_name]);
  console.log(`deleted ${deleted.join(', ')}`);
  cb();
});

gulp.task('make_node', cb => {
  var loader_file = `${src}/loader_node.js`;
  build_pgzp(node_name, loader_file, '.', false, true, true);
  cb();
});

gulp.task('make_bookmarklet', cb => {
  var loader_file = `${src}/loader_bookmarklet.js`;
  build_pgzp(bookmarklet_name, loader_file, dest, isProd);
  cb();
});

gulp.task('make_chrome_ext', cb => {
  copy_ext_files(chrome_dir);
  build_pgzp(ext_name, `${src}/loader_chrome.js`, `${dest}/${chrome_dir}`, isProd);
  cb();
});

gulp.task('make_ff_ext', cb => {
  // jQuery must be included separately for the FF reviewers
  // also the FF reviewers don't want the source to be compressed
  // :(

  // copy over assets, common files
  copy_ext_files(ffext_dir)

  // copy jQuery over
  var jq = srcs.libs[0];
  gulp.src(`${src}/${jq}`).pipe(gulp.dest(`${dest}/${ffext_dir}/`));

  // no compression for FF, remove jQuery
  build_pgzp(ext_name, `${src}/loader_firefox.js`, `${dest}/${ffext_dir}`, false, true);
  cb();
});

gulp.task('build', gulp.series('clean', 'make_node', 'make_bookmarklet', 'make_chrome_ext', 'make_ff_ext'));

gulp.task('watch', cb => {
  gulp.watch(['src/**.js', 'src/**.html', 'src/**.css'], ['build']);
  cb();
});

// Deploy to prod
gulp.task('prod', cb => {
  isProd = true;
  gulp.start('build');
  console.log("Built Pgzp in production mode");
  cb();
});

gulp.task('default', cb => {
  gulp.start('build');
  console.log("Built Pgzp in development mode");
  cb();
});
