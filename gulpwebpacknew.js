// Внутри gulpfile.js

const MiniCssExtractPlugin = require("mini-css-extract-plugin"); // Нужно установить: npm i -D mini-css-extract-plugin

const isDev = process.env.NODE_ENV === 'development'; // Определяем режим
const isProd = !isDev;

const webpackConfig = {
  mode: isProd ? 'production' : 'development',
  entry: path.src.js,
  output: {
    filename: 'index.js',
    path: path.build.js, // Указываем полный путь вывода
    assetModuleFilename: '../fonts/[name][ext]' // Куда складывать шрифты (относительно output.path)
  },
  // Добавляем плагин для извлечения CSS в отдельный файл
  plugins: [
    new MiniCssExtractPlugin({
        filename: '../css/style.webpack.css', // Куда складывать CSS (относительно output.path)
    }),
  ].filter(Boolean),
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      },
      {
        test: /\.(sa|sc|c)ss$/, // Обработка sass/scss/css
        use: [
          // Вместо style-loader используем MiniCssExtractPlugin.loader
          MiniCssExtractPlugin.loader,
          'css-loader', // Обрабатывает url() и @import
          // 'postcss-loader', // Можно добавить PostCSS для autoprefixer и т.д.
          'sass-loader', // Компилирует Sass/SCSS в CSS
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource', // Webpack 5+ для копирования файлов
        // Генератор пути можно настроить здесь или в output.assetModuleFilename
        // generator: {
        //   filename: '../fonts/[hash][ext][query]'
        // }
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico|webp)$/i, // Можно и картинки через Webpack обрабатывать
        type: 'asset/resource',
        generator: {
          filename: '../images/[hash][ext][query]'
        }
      }
    ]
  },
  devtool: isDev ? 'source-map' : false,
};

// Задачу js нужно будет немного изменить, чтобы она не делала dest(), т.к. output.path уже задан
function js() {
    return src(path.src.js)
        .pipe(plumber({
            errorHandler: notify.onError("JS Error: <%= error.message %>")
        }))
        .pipe(webpackStream(webpackConfig, webpack)) // Передаем конфигурацию
        // .pipe(dest(path.build.js)) // dest не нужен, output.path справится
        .pipe(browserSync.reload());
}