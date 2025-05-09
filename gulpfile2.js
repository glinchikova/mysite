"use strict";

// Импорт модулей
const { src, dest, series, parallel, watch: gulpWatch } = require("gulp"); // Используем watch из gulp напрямую
const gulp = require("gulp"); // Может быть не нужен, если все берется из { src, dest, ... }
const autoprefixer = require("gulp-autoprefixer");
const cssbeautify = require("gulp-cssbeautify");
// const removeComments = require('gulp-strip-css-comments'); // Больше не нужен
const rename = require("gulp-rename");
const sass = require('gulp-sass')(require('sass')); // Dart Sass рекомендуется
const cssnano = require("gulp-cssnano");
const uglify = require("gulp-uglify");
const plumber = require("gulp-plumber");
const panini = require("panini");
const imagemin = require("gulp-imagemin");
const del = require("del");
const notify = require("gulp-notify");
const webpack = require('webpack'); // Сам webpack может быть не нужен напрямую, если используется только webpackStream
const webpackStream = require('webpack-stream');
const browserSync = require("browser-sync").create();
const cache = require('gulp-cache'); // Добавим использование кеша

/* Paths */
const srcPath = 'src/';
const distPath = 'docs/';

const specificJsFileToCopy = 'glinikovaru.js'; // Имя файла для копирования

const path = {
    build: {
        html:   distPath,
        js:     distPath + "assets/js/",
        css:    distPath + "assets/css/",
        images: distPath + "assets/images/",
        fonts:  distPath + "assets/fonts/"
    },
    src: {
        html:     srcPath + "pages/**/*.hbs", // Изменен путь для большей точности
        js:       srcPath + "assets/js/index.js", // Указываем только точку входа для Webpack
        js_copy:  srcPath + "assets/js/" + specificJsFileToCopy, // Путь к копируемому файлу
        css:      srcPath + "assets/scss/style.scss", // Обычно есть главный файл SCSS
        images:   srcPath + "assets/images/**/*.{jpg,png,svg,gif,ico,webp,webmanifest,xml,json}",
        fonts:    srcPath + "assets/fonts/**/*.{eot,woff,woff2,ttf,svg}"
    },
    watch: {
        html:     [srcPath + "pages/**/*.hbs", srcPath + "layouts/**/*.hbs", srcPath + "partials/**/*.hbs"], // Следим за всеми файлами, влияющими на HTML
        js:       srcPath + "assets/js/**/*.js", // Следим за всеми JS файлами (для перезапуска Webpack)
        js_copy:  srcPath + "assets/js/" + specificJsFileToCopy, // Следим за копируемым файлом
        css:      srcPath + "assets/scss/**/*.scss", // Следим за всеми SCSS файлами
        images:   srcPath + "assets/images/**/*.{jpg,png,svg,gif,ico,webp,webmanifest,xml,json}",
        fonts:    srcPath + "assets/fonts/**/*.{eot,woff,woff2,ttf,svg}"
    },
    clean: "./" + distPath
};

// Конфигурация Webpack (можно вынести для читаемости)
// Определяем режим в зависимости от переменной окружения (или ставим 'development' для watch)
// Для простоты пока оставим 'production' как в оригинальной задаче 'js'
const webpackConfig = {
  mode: 'production', // Используем 'production' для финальной сборки. Для разработки можно 'development'
  entry: path.src.js, // Используем путь из конфига
  output: {
    filename: 'index.js', // Имя выходного файла бандла
  },
  module: {
    rules: [
      {
        test: /\.m?js$/, // Обработка .js и .mjs файлов
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      },
      // Правила для CSS и шрифтов внутри JS (если нужно)
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource'
      }
    ]
  },
  // Добавляем source maps для отладки в режиме разработки
  // devtool: process.env.NODE_ENV === 'development' ? 'source-map' : false
};


/* Tasks */

// Запуск сервера BrowserSync
function serve() {
    browserSync.init({
        server: {
            baseDir: distPath // Можно проще
        },
        notify: false // Отключить уведомления BrowserSync в браузере
    });
}

// Обработка HTML с Panini
function html() {
  panini.refresh();
  // ИСПРАВЛЕНО: Используем правильный src путь
  return src(path.src.html, { base: srcPath + "pages/" })
      .pipe(plumber({
          errorHandler: notify.onError("HTML Error: <%= error.message %>")
      }))
      .pipe(panini({
          root:     srcPath + 'pages/',
          layouts:  srcPath + 'layouts/',
          partials: srcPath + 'partials/',
          helpers:  srcPath + 'helpers/',
          data:     srcPath + 'data/',
          fileExt: 'hbs' // Явно указываем расширение исходных файлов (хотя panini может определить сам)
      }))
       // ВАЖНО: Переименовываем выходные файлы в .html
      .pipe(rename({ extname: ".html" }))
      .pipe(dest(path.build.html))
      .pipe(browserSync.reload());
}

// Компиляция и обработка SCSS
function css() {
    return src(path.src.css, { base: srcPath + "assets/scss/", sourcemaps: true }) // Добавляем sourcemaps для отладки
        .pipe(plumber({
            errorHandler: notify.onError("SCSS Error: <%= error.message %>")
        }))
        .pipe(sass({
            includePaths: './node_modules/' // Пути для импорта из node_modules
        }))
        .pipe(autoprefixer({ // Префиксы для поддержки браузеров
            cascade: false, // Лучше false для чистоты кода
            grid: true,     // Включить префиксы для grid layout
            overrideBrowserslist: ["last 5 versions"] // Указать поддерживаемые браузеры
        }))
        .pipe(cssbeautify()) // Форматирование для читаемости (неминифицированная версия)
        .pipe(dest(path.build.css, { sourcemaps: '.' })) // Сохраняем неминифицированный CSS и карту кода
        .pipe(cssnano({ // Минификация CSS
            zindex: false,
            discardComments: {
                removeAll: true
            }
        }))
        // removeComments() // Больше не нужен
        .pipe(rename({
            suffix: ".min",
            extname: ".css"
        }))
        .pipe(dest(path.build.css)) // Сохраняем минифицированный CSS
        .pipe(browserSync.reload({ stream: true }));
}

// Сборка JavaScript с Webpack
function js() {
    return src(path.src.js) // Берем только точку входа для Webpack
        .pipe(plumber({
            errorHandler: notify.onError("JS Error: <%= error.message %>")
        }))
        .pipe(webpackStream(webpackConfig, webpack)) // Передаем конфигурацию
        .pipe(dest(path.build.js))
        .pipe(browserSync.reload({ stream: true }));
}

// Копирование отдельного JS файла (без обработки Webpack)
function copySpecificJs() {
  return src(path.src.js_copy)
    .pipe(plumber({
        errorHandler: notify.onError("JS Copy Error: <%= error.message %>")
    }))
    // Опционально: минифицировать копируемый файл (нужно раскомментировать uglify)
    // .pipe(uglify())
    // .pipe(rename({ suffix: ".min" }))
    .pipe(dest(path.build.js))
    .pipe(browserSync.reload({ stream: true }));
}


// Оптимизация изображений
function images() {
    return src(path.src.images)
        .pipe(cache(imagemin([ // Добавляем кеширование
            imagemin.gifsicle({ interlaced: true }),
            imagemin.mozjpeg({ quality: 85, progressive: true }), // Качество можно чуть снизить
            imagemin.optipng({ optimizationLevel: 5 }),
            imagemin.svgo({
                plugins: [
                    { removeViewBox: false }, // Часто viewBox нужен
                    { cleanupIDs: false }
                ]
            })
        ])))
        .pipe(dest(path.build.images))
        .pipe(browserSync.reload({ stream: true }));
}

// Копирование шрифтов
function fonts() {
    return src(path.src.fonts)
        .pipe(dest(path.build.fonts))
        .pipe(browserSync.reload({ stream: true }));
}

// Очистка директории сборки
function clean() {
    return del(path.clean); // del возвращает промис, cb не нужен
}

// Очистка кеша Gulp (полезно при проблемах с кешированием)
function clearCache(done) {
  return cache.clearAll(done);
}

// Наблюдение за изменениями файлов
function watchFiles() {
    gulpWatch(path.watch.html, html);
    gulpWatch(path.watch.css, css); // Используем основную задачу css
    gulpWatch(path.watch.js, js);   // Используем основную задачу js
    gulpWatch(path.watch.js_copy, copySpecificJs); // Следим за отдельным JS
    gulpWatch(path.watch.images, images);
    gulpWatch(path.watch.fonts, fonts);
}

// Сборка проекта (сначала очистка, потом параллельно остальные задачи)
const build = series(clean, parallel(html, css, js, images, copySpecificJs, fonts));

// Режим разработки (сборка, запуск сервера и наблюдения)
const watch = series(build, parallel(watchFiles, serve));

/* Exports Tasks */
exports.html = html;
exports.css = css;
exports.js = js;
exports.copyJs = copySpecificJs; // Переименовал экспорт для ясности
exports.images = images;
exports.fonts = fonts;
exports.clean = clean;
exports.clearCache = clearCache; // Экспортируем задачу очистки кеша
exports.build = build;
exports.watch = watch;
exports.default = watch; // Задача по умолчанию - режим разработки