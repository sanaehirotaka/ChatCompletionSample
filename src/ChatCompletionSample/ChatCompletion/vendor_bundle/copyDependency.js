const fs = require('fs-extra');
const config = require('./copyDependency.config.json');

// �萔: �J�����[�h��\��������
const MODE_DEVELOPMENT = 'development';

/**
 * �o�͐�f�B���N�g�����폜���āA�o�͌��f�B���N�g���̓��e���o�͐�f�B���N�g���֓�������
 * @param {string} srcPath - �R�s�[���̃p�X
 * @param {string} distPath - �R�s�[��̃p�X
 */
const synchronizeDirectory = (srcPath, distPath) => {
    // �����̏o�͐�f�B���N�g�����폜
    fs.removeSync(distPath);
    // �o�͌��f�B���N�g���̓��e���o�͐�f�B���N�g���փR�s�[
    fs.copySync(srcPath, distPath);
};

/**
 * �p�b�P�[�W������A�p�b�P�[�W�̃\�[�X�f�B���N�g���̃p�X���擾����
 * @param {string} pkgName - �p�b�P�[�W��
 * @returns {string} �p�b�P�[�W�̃\�[�X�f�B���N�g���̃p�X
 */
const getPackageSourcePath = (pkgName) => {
    // config.fixed �Ƀp�b�P�[�W�����o�^����Ă���ꍇ�A���̃p�X��D�悵�Ďg�p
    if (config.fixed[pkgName]) {
        return `${config.srcDir}${config.fixed[pkgName].from}`;
    }

    // node_modules ���̃p�b�P�[�W�f�B���N�g���� "dist" �f�B���N�g�������݂��邩�m�F
    const distPath = `${config.srcDir}${pkgName}/dist/`;
    if (fs.pathExistsSync(distPath)) {
        return distPath;
    }

    // "dist" �f�B���N�g�����Ȃ��ꍇ�A"build" �f�B���N�g�������݂��邩�m�F
    const buildPath = `${config.srcDir}${pkgName}/build/`;
    if (fs.pathExistsSync(buildPath)) {
        return buildPath;
    }

    // "dist" �� "build" ���Ȃ��ꍇ�A�p�b�P�[�W�̃��[�g�f�B���N�g����Ԃ�
    return `${config.srcDir}${pkgName}`;
};

/**
 * �p�b�P�[�W�𓯊�����
 * @param {string} pkgName - �p�b�P�[�W��
 */
const synchronizePackage = (pkgName) => {
    // �p�b�P�[�W�̃\�[�X�f�B���N�g���̃p�X���擾
    const srcPath = getPackageSourcePath(pkgName);
    // �o�͐�f�B���N�g���̃p�X��ݒ�
    const distPath = config.fixed[pkgName]
        ? `${config.distDir}${config.fixed[pkgName].to}`
        : `${config.distDir}${pkgName}`;

    // �o�͌��f�B���N�g�������݂���ꍇ�A�������������s
    if (fs.pathExistsSync(srcPath)) {
        synchronizeDirectory(srcPath, distPath);
    }
};

/**
 * �X�N���v�g�Q�Ɨp�� <script> �^�O�𐶐�����
 * @param {string} filePath - �t�@�C���p�X
 * @returns {string} �������ꂽ <script> �^�O
 */
const createScriptTag = (filePath) => {
    return `<script src="/${config.libPath}${filePath}" defer></script>\r\n`;
};

/**
 * �X�^�C���V�[�g�Q�Ɨp�� <link> �^�O�𐶐�����
 * @param {string} filePath - �t�@�C���p�X
 * @returns {string} �������ꂽ <link> �^�O
 */
const createStyleTag = (filePath) => {
    return `<link rel="stylesheet" type="text/css" href="/${config.libPath}${filePath}">\r\n`;
};

/**
 * �t�@�C�����w�肳�ꂽ�g���q�Ɉ�v���邩�ǂ����𔻒肷��
 * @param {string} file - �t�@�C����
 * @param {string} extName - �g���q (��: '.js')
 * @param {boolean} isDev - �J�����[�h���ǂ���
 * @returns {boolean} ��v����ꍇ�� true�A�����łȂ��ꍇ�� false
 */
const matchesExtension = (file, extName, isDev) => {
    // �g���q�𐳋K�\���p�ɃG�X�P�[�v
    const ext = extName.replace('.', '\\.');
    // �k���Ńt�@�C���̊g���q�p�^�[��
    const extWithMin = `\\.min${ext}`;

    // �t�@�C�����w�肳�ꂽ�g���q�ŏI��邩�ǂ����̐��K�\��
    const isMatchExt = new RegExp(`${ext}$`).test(file);
    // �t�@�C�����k���Ńt�@�C���̊g���q�ŏI��邩�ǂ����̐��K�\��
    const isMatchExtWithMin = new RegExp(`${extWithMin}$`).test(file);

    // �w�肳�ꂽ�g���q�ŏI���Ȃ��ꍇ�� false ��Ԃ�
    if (!isMatchExt) {
        return false;
    }

    // �J�����[�h�̏ꍇ�͏k���łłȂ��t�@�C�����A�{�ԃ��[�h�̏ꍇ�͏k���ł̃t�@�C����ΏۂƂ���
    return isDev ? !isMatchExtWithMin : isMatchExtWithMin;
};

/**
 * �w�肳�ꂽ�f�B���N�g�����̃t�@�C�����g���q�Ńt�B���^�����O����
 * @param {string} dirPath - �f�B���N�g���p�X
 * @param {string} extName - �g���q (��: '.js')
 * @param {boolean} isDev - �J�����[�h���ǂ���
 * @returns {string[]} �t�B���^�����O���ꂽ�t�@�C�����̔z��
 */
const filterFilesByExtension = (dirPath, extName, isDev) => {
    return fs.readdirSync(dirPath)
        // �t�@�C���݂̂�ΏۂƂ��A�w�肳�ꂽ�g���q�Ɉ�v����t�@�C���݂̂𒊏o
        .filter(file => fs.statSync(`${dirPath}/${file}`).isFile() && matchesExtension(file, extName, isDev))
        .map(file => file);
};

/**
 * �p�b�P�[�W�t�H���_���̑ΏۂƂȂ� js/css �t�@�C���ꗗ���擾����
 * @param {string} pkgName - �p�b�P�[�W��
 * @param {string} mode - �o�̓��[�h ('development' �܂��� 'production')
 * @returns {{js: string[], css: string[]}} �擾���ꂽ�t�@�C���ꗗ (js �� css �̔z��)
 */
const collectAssetFiles = (pkgName, mode) => {
    // �J�����[�h���ǂ����̔���
    const isDev = mode === MODE_DEVELOPMENT;
    // �p�b�P�[�W�̏o�͐�f�B���N�g���̃p�X
    const dirPathDir = `${config.distDir}${pkgName}/`;

    // �ǂݍ��ރt�@�C���̃��X�g��������
    let loadFiles = {
        js: [],
        css: []
    };

    // config.fixed �Ƀp�b�P�[�W�����o�^����Ă���ꍇ�A���̐ݒ�ɏ]���ď���
    if (config.fixed[pkgName]) {
        // �ċA�I�ɏ������āAfixed �Ŏw�肳�ꂽ�p�X�̃t�@�C�������W
        return collectAssetFiles(config.fixed[pkgName].to, mode);
    }

    // config.const �Ƀp�b�P�[�W�����o�^����Ă���ꍇ�A���̐ݒ�ɏ]���ď���
    if (config.const[pkgName]) {
        const constFiles = config.const[pkgName];
        // �J�����[�h���{�ԃ��[�h���ɂ���āA�ǂݍ��ރt�@�C����؂�ւ���
        const targetFiles = isDev ? 'development' : 'other';
        // const �Ŏw�肳�ꂽ js �t�@�C�������W
        loadFiles.js = constFiles.js?.[targetFiles]?.map(file => `${pkgName}/${file}`) || [];
        // const �Ŏw�肳�ꂽ css �t�@�C�������W
        loadFiles.css = constFiles.css?.[targetFiles]?.map(file => `${pkgName}/${file}`) || [];
        return loadFiles;
    }

    // �o�͐�f�B���N�g�������݂���ꍇ�A���̒��̃t�@�C��������
    if (fs.pathExistsSync(dirPathDir)) {
        const files = fs.readdirSync(dirPathDir);

        // "js" �t�H���_������ꍇ�A���̒��� js �t�@�C��������
        if (files.includes('js')) {
            const jsFiles = filterFilesByExtension(`${dirPathDir}js`, '.js', isDev);
            loadFiles.js.push(...jsFiles.map(file => `${pkgName}/js/${file}`));
        }

        // "css" �t�H���_������ꍇ�A���̒��� css �t�@�C��������
        if (files.includes('css')) {
            const cssFiles = filterFilesByExtension(`${dirPathDir}css`, '.css', isDev);
            loadFiles.css.push(...cssFiles.map(file => `${pkgName}/css/${file}`));
        }

        // �t�H���_������ js �t�@�C��������
        const rootJsFiles = filterFilesByExtension(dirPathDir, '.js', isDev);
        loadFiles.js.push(...rootJsFiles.map(file => `${pkgName}/${file}`));

        // �t�H���_������ css �t�@�C��������
        const rootCssFiles = filterFilesByExtension(dirPathDir, '.css', isDev);
        loadFiles.css.push(...rootCssFiles.map(file => `${pkgName}/${file}`));
    }
    return loadFiles;
};

/**
 * package.json �����ɑΏۂƂȂ�p�b�P�[�W�̈ꗗ���擾����
 * @returns {string[]} �ΏۂƂȂ�p�b�P�[�W���̔z��
 */
const extractTargetVendors = () => {
    // ���[�g�f�B���N�g���� package.json ��ǂݍ���
    const pkgJson = require('../package.json');
    // �ݒ�t�@�C������ dependencies, priorityPkg, ignorePkg ���擾
    const { dependencies, priorityPkg, ignorePkg } = config;
    // package.json �ɋL�ڂ���Ă���S�Ẵp�b�P�[�W�����擾
    const pkgAll = Object.keys(pkgJson.dependencies);
    // �D��x�̒Ⴂ�p�b�P�[�W�̃��X�g�𒊏o�ipriorityPkg �� ignorePkg �Ɋ܂܂�Ȃ��p�b�P�[�W�j
    const notFirstPkgs = pkgAll.filter(pkg => !priorityPkg.includes(pkg) && !ignorePkg.includes(pkg));
    // �D��x�̍����p�b�P�[�W�ƒႢ�p�b�P�[�W���������ĕԂ�
    return [...priorityPkg, ...notFirstPkgs];
};

/**
 * ���C������
 */
const main = () => {
    // �ŏI�I�ɓǂݍ��ރt�@�C���̃��X�g��������
    const allLoadFiles = {
        js: [],
        css: [],
    };

    // �ΏۂƂȂ�p�b�P�[�W�̃��X�g���擾
    const targetPkg = extractTargetVendors();

    // �e�p�b�P�[�W�̓������������s
    targetPkg.forEach(synchronizePackage);

    // �e�p�b�P�[�W����ǂݍ��� js/css �t�@�C�������W
    targetPkg.forEach(pkg => {
        const files = collectAssetFiles(pkg, config.mode);
        allLoadFiles.js.push(...files.js);
        allLoadFiles.css.push(...files.css);
    });


    // .cshtml �t�@�C����V�K�쐬�i�����̓��e�͍폜�j
    fs.writeFileSync(config.loadCshtmlFileNm, '');
    // ���W���ꂽ css �t�@�C�������� <link> �^�O�𐶐����� .cshtml �t�@�C���ɏ�������
    allLoadFiles.css.forEach(f => fs.appendFileSync(config.loadCshtmlFileNm, createStyleTag(f)));
    // ���W���ꂽ js �t�@�C�������� <script> �^�O�𐶐����� .cshtml �t�@�C���ɏ�������
    allLoadFiles.js.forEach(f => fs.appendFileSync(config.loadCshtmlFileNm, createScriptTag(f)));

};

// ���C�����������s
main();
