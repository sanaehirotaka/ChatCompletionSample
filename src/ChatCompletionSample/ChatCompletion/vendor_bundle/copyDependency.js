const fs = require('fs-extra');
const config = require('./copyDependency.config.json');

// 定数: 開発モードを表す文字列
const MODE_DEVELOPMENT = 'development';

/**
 * 出力先ディレクトリを削除して、出力元ディレクトリの内容を出力先ディレクトリへ同期する
 * @param {string} srcPath - コピー元のパス
 * @param {string} distPath - コピー先のパス
 */
const synchronizeDirectory = (srcPath, distPath) => {
    // 既存の出力先ディレクトリを削除
    fs.removeSync(distPath);
    // 出力元ディレクトリの内容を出力先ディレクトリへコピー
    fs.copySync(srcPath, distPath);
};

/**
 * パッケージ名から、パッケージのソースディレクトリのパスを取得する
 * @param {string} pkgName - パッケージ名
 * @returns {string} パッケージのソースディレクトリのパス
 */
const getPackageSourcePath = (pkgName) => {
    // config.fixed にパッケージ名が登録されている場合、そのパスを優先して使用
    if (config.fixed[pkgName]) {
        return `${config.srcDir}${config.fixed[pkgName].from}`;
    }

    // node_modules 内のパッケージディレクトリに "dist" ディレクトリが存在するか確認
    const distPath = `${config.srcDir}${pkgName}/dist/`;
    if (fs.pathExistsSync(distPath)) {
        return distPath;
    }

    // "dist" ディレクトリがない場合、"build" ディレクトリが存在するか確認
    const buildPath = `${config.srcDir}${pkgName}/build/`;
    if (fs.pathExistsSync(buildPath)) {
        return buildPath;
    }

    // "dist" も "build" もない場合、パッケージのルートディレクトリを返す
    return `${config.srcDir}${pkgName}`;
};

/**
 * パッケージを同期する
 * @param {string} pkgName - パッケージ名
 */
const synchronizePackage = (pkgName) => {
    // パッケージのソースディレクトリのパスを取得
    const srcPath = getPackageSourcePath(pkgName);
    // 出力先ディレクトリのパスを設定
    const distPath = config.fixed[pkgName]
        ? `${config.distDir}${config.fixed[pkgName].to}`
        : `${config.distDir}${pkgName}`;

    // 出力元ディレクトリが存在する場合、同期処理を実行
    if (fs.pathExistsSync(srcPath)) {
        synchronizeDirectory(srcPath, distPath);
    }
};

/**
 * スクリプト参照用の <script> タグを生成する
 * @param {string} filePath - ファイルパス
 * @returns {string} 生成された <script> タグ
 */
const createScriptTag = (filePath) => {
    return `<script src="/${config.libPath}${filePath}" defer></script>\r\n`;
};

/**
 * スタイルシート参照用の <link> タグを生成する
 * @param {string} filePath - ファイルパス
 * @returns {string} 生成された <link> タグ
 */
const createStyleTag = (filePath) => {
    return `<link rel="stylesheet" type="text/css" href="/${config.libPath}${filePath}">\r\n`;
};

/**
 * ファイルが指定された拡張子に一致するかどうかを判定する
 * @param {string} file - ファイル名
 * @param {string} extName - 拡張子 (例: '.js')
 * @param {boolean} isDev - 開発モードかどうか
 * @returns {boolean} 一致する場合は true、そうでない場合は false
 */
const matchesExtension = (file, extName, isDev) => {
    // 拡張子を正規表現用にエスケープ
    const ext = extName.replace('.', '\\.');
    // 縮小版ファイルの拡張子パターン
    const extWithMin = `\\.min${ext}`;

    // ファイルが指定された拡張子で終わるかどうかの正規表現
    const isMatchExt = new RegExp(`${ext}$`).test(file);
    // ファイルが縮小版ファイルの拡張子で終わるかどうかの正規表現
    const isMatchExtWithMin = new RegExp(`${extWithMin}$`).test(file);

    // 指定された拡張子で終わらない場合は false を返す
    if (!isMatchExt) {
        return false;
    }

    // 開発モードの場合は縮小版でないファイルを、本番モードの場合は縮小版のファイルを対象とする
    return isDev ? !isMatchExtWithMin : isMatchExtWithMin;
};

/**
 * 指定されたディレクトリ内のファイルを拡張子でフィルタリングする
 * @param {string} dirPath - ディレクトリパス
 * @param {string} extName - 拡張子 (例: '.js')
 * @param {boolean} isDev - 開発モードかどうか
 * @returns {string[]} フィルタリングされたファイル名の配列
 */
const filterFilesByExtension = (dirPath, extName, isDev) => {
    return fs.readdirSync(dirPath)
        // ファイルのみを対象とし、指定された拡張子に一致するファイルのみを抽出
        .filter(file => fs.statSync(`${dirPath}/${file}`).isFile() && matchesExtension(file, extName, isDev))
        .map(file => file);
};

/**
 * パッケージフォルダ内の対象となる js/css ファイル一覧を取得する
 * @param {string} pkgName - パッケージ名
 * @param {string} mode - 出力モード ('development' または 'production')
 * @returns {{js: string[], css: string[]}} 取得されたファイル一覧 (js と css の配列)
 */
const collectAssetFiles = (pkgName, mode) => {
    // 開発モードかどうかの判定
    const isDev = mode === MODE_DEVELOPMENT;
    // パッケージの出力先ディレクトリのパス
    const dirPathDir = `${config.distDir}${pkgName}/`;

    // 読み込むファイルのリストを初期化
    let loadFiles = {
        js: [],
        css: []
    };

    // config.fixed にパッケージ名が登録されている場合、その設定に従って処理
    if (config.fixed[pkgName]) {
        // 再帰的に処理して、fixed で指定されたパスのファイルを収集
        return collectAssetFiles(config.fixed[pkgName].to, mode);
    }

    // config.const にパッケージ名が登録されている場合、その設定に従って処理
    if (config.const[pkgName]) {
        const constFiles = config.const[pkgName];
        // 開発モードか本番モードかによって、読み込むファイルを切り替える
        const targetFiles = isDev ? 'development' : 'other';
        // const で指定された js ファイルを収集
        loadFiles.js = constFiles.js?.[targetFiles]?.map(file => `${pkgName}/${file}`) || [];
        // const で指定された css ファイルを収集
        loadFiles.css = constFiles.css?.[targetFiles]?.map(file => `${pkgName}/${file}`) || [];
        return loadFiles;
    }

    // 出力先ディレクトリが存在する場合、その中のファイルを処理
    if (fs.pathExistsSync(dirPathDir)) {
        const files = fs.readdirSync(dirPathDir);

        // "js" フォルダがある場合、その中の js ファイルを処理
        if (files.includes('js')) {
            const jsFiles = filterFilesByExtension(`${dirPathDir}js`, '.js', isDev);
            loadFiles.js.push(...jsFiles.map(file => `${pkgName}/js/${file}`));
        }

        // "css" フォルダがある場合、その中の css ファイルを処理
        if (files.includes('css')) {
            const cssFiles = filterFilesByExtension(`${dirPathDir}css`, '.css', isDev);
            loadFiles.css.push(...cssFiles.map(file => `${pkgName}/css/${file}`));
        }

        // フォルダ直下の js ファイルを処理
        const rootJsFiles = filterFilesByExtension(dirPathDir, '.js', isDev);
        loadFiles.js.push(...rootJsFiles.map(file => `${pkgName}/${file}`));

        // フォルダ直下の css ファイルを処理
        const rootCssFiles = filterFilesByExtension(dirPathDir, '.css', isDev);
        loadFiles.css.push(...rootCssFiles.map(file => `${pkgName}/${file}`));
    }
    return loadFiles;
};

/**
 * package.json を元に対象となるパッケージの一覧を取得する
 * @returns {string[]} 対象となるパッケージ名の配列
 */
const extractTargetVendors = () => {
    // ルートディレクトリの package.json を読み込む
    const pkgJson = require('../package.json');
    // 設定ファイルから dependencies, priorityPkg, ignorePkg を取得
    const { dependencies, priorityPkg, ignorePkg } = config;
    // package.json に記載されている全てのパッケージ名を取得
    const pkgAll = Object.keys(pkgJson.dependencies);
    // 優先度の低いパッケージのリストを抽出（priorityPkg と ignorePkg に含まれないパッケージ）
    const notFirstPkgs = pkgAll.filter(pkg => !priorityPkg.includes(pkg) && !ignorePkg.includes(pkg));
    // 優先度の高いパッケージと低いパッケージを結合して返す
    return [...priorityPkg, ...notFirstPkgs];
};

/**
 * メイン処理
 */
const main = () => {
    // 最終的に読み込むファイルのリストを初期化
    const allLoadFiles = {
        js: [],
        css: [],
    };

    // 対象となるパッケージのリストを取得
    const targetPkg = extractTargetVendors();

    // 各パッケージの同期処理を実行
    targetPkg.forEach(synchronizePackage);

    // 各パッケージから読み込む js/css ファイルを収集
    targetPkg.forEach(pkg => {
        const files = collectAssetFiles(pkg, config.mode);
        allLoadFiles.js.push(...files.js);
        allLoadFiles.css.push(...files.css);
    });


    // .cshtml ファイルを新規作成（既存の内容は削除）
    fs.writeFileSync(config.loadCshtmlFileNm, '');
    // 収集された css ファイルを元に <link> タグを生成して .cshtml ファイルに書き込む
    allLoadFiles.css.forEach(f => fs.appendFileSync(config.loadCshtmlFileNm, createStyleTag(f)));
    // 収集された js ファイルを元に <script> タグを生成して .cshtml ファイルに書き込む
    allLoadFiles.js.forEach(f => fs.appendFileSync(config.loadCshtmlFileNm, createScriptTag(f)));

};

// メイン処理を実行
main();
