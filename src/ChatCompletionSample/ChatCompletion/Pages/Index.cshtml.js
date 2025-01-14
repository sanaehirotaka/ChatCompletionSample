/**
 * チャットの読み込み
 * @param {String} id
 * @returns
 */
async function callResume(id) {
    try {
        return await fetchAsJson(`/api/chat/resumetextonlychat/${id}`);
    } catch (ex) {
        showErrorMessage(ex);
        throw ex;
    }
}
/**
 * チャット内容の保存
 * @param {String} id
 * @param {any} data
 * @returns
 */
async function callSave(id, data) {
    try {
        return await postJsonAndFetchAsJson(`/api/chat/savetextonlychat/${id}`, data);
    } catch (ex) {
        showErrorMessage(ex);
        throw ex;
    }
}
/**
 * AIからの応答を得る
 * @param {any} data
 * @returns
 */
async function callCompletion(data) {
    try {
        return await postJsonAndFetchAsJson(`/api/chat/textonlycompletion`, data);
    } catch (ex) {
        showErrorMessage(ex);
        throw ex;
    }
}
/**
 * AIにタイトルを考えてもらう
 * @param {any} data
 * @returns
 */
async function callGenerateTitle(data) {
    try {
        return await postJsonAndFetchAsJson(`/api/chat/generatetitle`, data);
    } catch (ex) {
        showErrorMessage(ex);
        throw ex;
    }
}

/**
 * スレッドを削除する
 * @param {String} id
 * @returns
 */
async function callDelete(id) {
    try {
        return await fetch(`/api/chat/deletetextonlychat/${id}`, {
            "method": "POST",
            "headers": {
                'RequestVerificationToken': requestToken
            }
        });
    } catch (ex) {
        showErrorMessage(ex);
        throw ex;
    }
}

function showErrorMessage(ex) {
    document.querySelector("#errorDialog").showModal();
    document.querySelector("#errorMessage").value = ex.message;
}

/**
 * API呼び出し中のエフェクト
 * @param {Boolean} isLoading
 */
function loading(isLoading) {
    if (isLoading) {
        document.querySelector("#loading").removeAttribute("hidden");
        document.querySelector("#send").setAttribute("disabled", "");
    } else {
        document.querySelector("#loading").setAttribute("hidden", "");
        document.querySelector("#send").removeAttribute("disabled");
    }
}

/**
 * タイトルの変更
 * @param {String} title
 */
function setTitle(title) {
    if (!title) {
        title = "無題のチャット";
    }
    document.title = title;
    document.querySelector("#title").textContent = title;
    document.querySelector(".chat-title").textContent = title;
}

/**
 * 初期化処理
 */
async function initChatPage() {
    ai.chat = await callResume(ai.id);
    layout(ai.chat);
    loading(false);
}

/**
 * 読み込まれたチャットデータを描画する
 * @param {any} data
 * @param {any} showLatestUserPrompt
 */
function layout(data, showLatestUserPrompt = false) {
    setTitle(data.title);
    const messages = data.messages;
    // 最後がユーザープロンプトならテキストボックスに設定
    if (!showLatestUserPrompt && messages.length > 0 && messages[messages.length - 1].type == MessageType.user) {
        const newPrompt = messages.pop();
        document.querySelector("#newPrompt").textContent = newPrompt.message;
    }
    const elements = [...document.querySelector("#messages").children];
    const elementVersion = elements.map(e => `${e.getAttribute("id")}${e.getAttribute("data-ver")}`);
    const messageVersion = messages.map(m => `${m.id}${m.ver}`);
    // 編集された箇所以降を削除
    for (let i = 0; i < elementVersion.length; i++) {
        if (messageVersion.length <= i || elementVersion[i] != messageVersion[i]) {
            for (let j = i; j < elements.length; j++) {
                elements[j].remove();
            }
            break;
        }
    }
    // メッセージを追加
    for (const message of messages) {
        let node = document.querySelector(`#${message.id}`);
        if (node) {
            if (node.getAttribute("data-ver") == `${message.ver}`) {
                continue;
            }
        } else {
            let templateId;
            switch (message.type) {
                case MessageType.system:
                    templateId = "#templateSystem";
                    break;
                case MessageType.assistant:
                    templateId = "#templateAssistant";
                    break;
                case MessageType.user:
                    templateId = "#templateUser";
                    break;
            }
            node = document.querySelector(templateId).content.firstElementChild.cloneNode(true);
            document.querySelector("#messages").append(node);
        }
        node.setAttribute("id", message.id);
        node.setAttribute("data-ver", message.ver);
        if (message.model && node.querySelector(".model")) {
            node.querySelector(".model").textContent = "@" + message.model;
        }
        if (message.responseTimeMills && node.querySelector(".responseTime")) {
            node.querySelector(".responseTime").textContent = "(" + message.responseTimeMills + "ms)";
        }
        node.querySelector(".message-body").replaceChildren(createMarkdownDocument(message.message));

        if (message.inlineData) {
            node.querySelector(".message-images")?.replaceChildren(...message.inlineData.filter(data => data.type == InlineDataType.image).map(data => {
                const img = new Image();
                img.src = data.uri;
                return img;
            }));
        }

    }
}

/**
 * スレッドタイトルを考えてもらう
 * @returns
 */
async function generateChatTitle() {
    if (!ai.chat) {
        return;
    }
    const data = structuredClone(ai.chat);
    for (let i = 0; i < 3; i++) {
        const res = await callGenerateTitle(data);
        const title = res[0] ?? res[1];
        if (title) {
            setTitle(title);
            ai.chat.title = title;
            ai.chat = await callSave(ai.id, ai.chat);
            break;
        }
    }
}
/**
 * タイトル編集ボタンクリックイベント
 */
$("#editTitle").click(async e => {
    const title = document.querySelector("#title");
    if (!title.hasAttribute("contenteditable")) {
        title.setAttribute("contenteditable", "plaintext-only");
        title.classList.add("form-control");
        title.focus();
    } else {
        title.removeAttribute("contenteditable");
        title.classList.remove("form-control");

        ai.chat.title = title.textContent.trim();
        layout(ai.chat);
        ai.chat = await callSave(ai.id, ai.chat);
    }
});
/**
 * AIにタイトルを考えてもらう
 */
$("#generateTitle").click(async e => {
    await generateChatTitle();
});
/**
 * スレッドの削除ボタンクリックイベント
 */
$("#deleteThread").click(async e => {
    document.querySelector("#deleteThreadDialog").showModal();
});
document.querySelector("#deleteThreadDialog").addEventListener("submit", async e => {
    if (e.submitter.value == "yes") {
        await callDelete(ai.id);
        location.href = "/";
    }
});
/**
 * システムプロンプトの追加ボタンクリックイベント
 */
$("#addSystemPrompt").click(e => {
    document.querySelector("#addSystemPromptDialog").showModal();
});
document.querySelector("#addSystemPromptDialog").addEventListener("submit", async e => {
    if (e.submitter.value == "yes") {
        const promptId = newId("system-");
        ai.chat.messages.unshift({
            "id": promptId,
            "ver": random(),
            "type": MessageType.system,
            "message": document.querySelector("#systemPrompt").value.trim()
        });
        layout(ai.chat, true);
        ai.chat = await callSave(ai.id, ai.chat);
        // 追加したプロンプトをハイライト
        document.location.hash = promptId;
    }
});
/**
 * ユーザープロンプトの追加ボタンクリックイベント
 */
$("#send").click(async e => {
    loading(true);
    try {
        // 選択モデル
        ai.chat.model = document.querySelector("#selectModel").value;
        // プロンプトを準備
        const newPrompts = [
            // テキスト入力
            document.querySelector("#newPrompt").textContent.trim(),
            // ファイル
            ...[...document.querySelectorAll("#addedFiles > li")].map(e => {
                return `
${e.querySelector(".file-name").textContent}
${e.querySelector(".file-body").getAttribute("data-md")}
`;
            })
        ];
        const newPrompt = newPrompts.join("\n").trim();
        const inlineData = [...document.querySelectorAll("#addedImages > img")].map(e => {
            return { "type": InlineDataType.image, "uri": e.src }
        });

        if (!newPrompt) {
            return;
        }
        // プロンプトを削除
        document.querySelector("#newPrompt").textContent = "";
        // ファイルを削除
        document.querySelector("#addedFiles").replaceChildren();
        document.querySelector("#addedImages").replaceChildren();

        const promptId = newId("user-");

        ai.chat.messages.push({
            "id": promptId,
            "ver": random(),
            "type": MessageType.user,
            "message": newPrompt,
            "inlineData": inlineData
        });
        layout(ai.chat, true);

        // 自分のプロンプトをハイライト
        document.location.hash = promptId;

        ai.chat = await callCompletion(ai.chat);
        layout(ai.chat);

        // 返信をハイライト
        document.location.hash = ai.chat.messages[ai.chat.messages.length - 1].id;

        loading(false);

        ai.chat = await callSave(ai.id, ai.chat);

        // タイトル未設定ならタイトルを考えてもらう
        if (!ai.chat.title && ai.chat.messages.some(m => m.type == MessageType.assistant)) {
            await generateChatTitle();
        }
        // 内容を保存
        ai.chat = await callSave(ai.id, ai.chat);

        document.querySelector("#newPrompt").focus();
    } finally {
        loading(false);
    }
});
/**
 * モデルの変更
 */
$("#selectModel").change(async e => {
    ai.chat.model = document.querySelector("#selectModel").value;
    ai.chat = await callSave(ai.id, ai.chat);
});
/**
 * プロンプトの編集ボタンクリックイベント
 */
$("#messages").on("click", ".message-edit", async e => {
    /**
     * @type {Element}
     */
    const container = e.target.closest(".message-container");
    const body = container.querySelector(".message-body");
    const message = ai.chat.messages.find(m => m.id == container.getAttribute("id"));
    if (!body.hasAttribute("contenteditable")) {
        // 編集モードにする
        body.setAttribute("contenteditable", "plaintext-only");
        body.classList.add("form-control");
        body.textContent = message.message;
        body.focus();
    } else {
        // 編集が終わった
        message.message = body.textContent;
        message.ver = random();
        // 再描画
        layout(ai.chat);
        // 内容を保存
        ai.chat = await callSave(ai.id, ai.chat);
    }
});
/**
 * プロンプトの再生成ボタンクリックイベント
 */
$("#messages").on("click", ".message-regenerate", async e => {
    loading(true);
    try {
        /**
         * @type {Element}
         */
        const container = e.target.closest(".message-container");
        const index = ai.chat.messages.findIndex(m => m.id == container.getAttribute("id"));

        container.querySelector(".message-body").classList.add("placeholder-glow");

        container.querySelector(".message-body").textContent = "";
        for (let i = 0; i < 3; i++) {
            container.querySelector(".message-body").append(...$(`<span class="placeholder m-1 col-12"></span>`));
        }

        const data = structuredClone(ai.chat);
        data.messages = data.messages.slice(0, index);
        const ret = await callCompletion(data);

        if (ret.messages.length > index) {
            ai.chat.messages[index] = ret.messages[index];
            layout(ai.chat);
            // 内容を保存
            ai.chat = await callSave(ai.id, ai.chat);
            // 返信をハイライト
            document.location.hash = ret.messages[index].id;
        }
    } finally {
        loading(false);
    }
});
/**
 * プロンプトの削除ボタンクリックイベント
 */
$("#messages").on("click", ".message-trash", async e => {
    /**
     * @type {Element}
     */
    const target = e.target;
    const container = target.closest(".message-container");
    ai.chat.messages = ai.chat.messages.filter(m => m.id != container.getAttribute("id"));
    // 再描画
    layout(ai.chat);
    // 内容を保存
    ai.chat = await callSave(ai.id, ai.chat);
});
/**
 * ファイルの追加ボタンクリックイベント
 */
$("#addCodeBlockButton").click(e => {
    document.querySelector("#addCodeBlock").click();
});

function loadImage(src) {
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (error) => reject(error);
    });
}
async function addFile(file) {
    if (!file) {
        return;
    }
    const textReader = new TextReader();
    const binaryReader = new FileReaderAsync();
    const code = await textReader.decode(file);
    if (code) {
        const fragment = document.createDocumentFragment();
        const addedNode = document.querySelector("#addedFile").content.firstElementChild.cloneNode(true);
        const ext = file.name.substring(file.name.lastIndexOf(".") + 1);
        const blockId = "accordion-" + random();
        addedNode.querySelectorAll("button[data-bs-target]").forEach(e => {
            e.setAttribute("data-bs-target", "#" + blockId);
        });
        addedNode.querySelector(".collapse").setAttribute("id", blockId);
        // markdownのコードブロック形式にする
        const md = "\n```" + ext + "\n" + code.trim() + "\n```";
        addedNode.querySelector(".file-name").textContent = file.name;
        addedNode.querySelector(".file-body").setAttribute("data-md", md);
        addedNode.querySelector(".file-body").replaceChildren(createMarkdownDocument(md));
        document.querySelector("#addedFiles").append(addedNode);
        fragment.appendChild(addedNode);
        document.querySelector("#addedFiles").append(fragment);
    } else {
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        const img = await loadImage(await binaryReader.readAsDataURL(file));
        const width = img.width;
        const height = img.height;
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            // アスペクト比を維持したままリサイズ
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            img.src = canvas.toDataURL('image/jpeg');
        } else if (width > 16 && height > 16) {
            document.querySelector("#addedImages").appendChild(img);
        }
    }
}
/**
 * ファイルの追加イベント
 */
$("#addCodeBlock").change(async e => {
    /**
     * @type {HTMLInputElement}
     */
    const target = e.target;
    // 選択されたファイルを読み込む
    for (const file of target?.files ?? []) {
        await addFile(file);
    }
    target.value = "";
});
const postArea = document.querySelector("#postArea");
postArea.addEventListener("dragover", ev => {
    ev.preventDefault();
    postArea.classList.add("dragover");
    document.querySelector("#drop-message").removeAttribute("hidden");
}, { capture: true });
postArea.addEventListener("dragleave", ev => {
    ev.preventDefault();
    postArea.classList.remove("dragover");
    document.querySelector("#drop-message").setAttribute("hidden", "");
}, { capture: true });
postArea.addEventListener('drop', async ev => {
    ev.preventDefault();
    postArea.classList.remove("dragover");
    document.querySelector("#drop-message").setAttribute("hidden", "");
    // 選択されたファイルを読み込む
    for (const file of ev.dataTransfer?.files ?? []) {
        await addFile(file);
    }
    // 選択されたファイルを読み込む
    for (const item of ev.dataTransfer?.items ?? []) {
        if (item.kind == "file") {
            await addFile(item.getAsFile());
        }
        if (item.kind == "string" && item.type == "text/plain") {
            item.getAsString(str => {
                document.querySelector("#newPrompt").textContent += str;
                document.querySelector("#newPrompt").focus();
            });
        }
    }
});
/**
 * ファイルの削除ボタンクリックイベント
 */
$("#addedFiles").on("click", ".file-trash", async e => {
    e.target.closest(".added-file").remove();
});
/**
 * 画像ファイルの削除ボタンクリックイベント
 */
$("#deleteImages").click(async e => {
    document.querySelectorAll("#addedImages img").forEach(img => img.remove());
});



initChatPage();
