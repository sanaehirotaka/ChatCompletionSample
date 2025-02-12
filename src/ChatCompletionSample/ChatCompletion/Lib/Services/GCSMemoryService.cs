using ChatCompletion.Lib.Injection;
using ChatCompletion.Lib.Model;
using ChatCompletion.Lib.Options;
using Google.Api.Gax;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Storage.V1;
using System.IO.Compression;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;

namespace ChatCompletion.Lib.Services;

/// <summary>
/// Google Cloud Storage をストレージバックエンドとして使用するメモリサービスの実装。
/// </summary>
[Singleton]
public class GCSMemoryService : IMemoryService
{
    // ファイル拡張子とヘッダーファイル名を定数として定義
    private const string JsonGzExtension = ".json.gz";
    private const string HeaderFileName = "_head";

    // JSON シリアライズ/デシリアライズオプション
    private static readonly JsonSerializerOptions JsonSerializerOptions = new()
    {
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All) // すべての Unicode 文字を扱えるように設定
    };

    private readonly GCSOptions _options; // GCS の設定オプション
    private readonly StorageClient _client; // GCS クライアント
    private Dictionary<string, MemoryModel>? _headerCache; // メモリモデルのヘッダー情報をキャッシュする辞書

    private Dictionary<string, MemoryModel> Header
    {
        get
        {
            return _headerCache ??= LoadOrCreateHeader().Result;
        }
    }

    // ヘッダーファイルのパスを取得するプロパティ
    private string HeaderFile => GetObjectPath(HeaderFileName);

    /// <summary>
    /// コンストラクタ。GCSクライアントを初期化する。
    /// </summary>
    /// <param name="options">GCS設定オプション</param>
    public GCSMemoryService(GCSOptions options)
    {
        _options = options;
        if (string.IsNullOrEmpty(options.CredentialPath))
        {
            _client = StorageClient.Create(GoogleCredential.GetApplicationDefault());
        }
        else
        {
            _client = StorageClient.Create(GoogleCredential.FromFile(options.CredentialPath));
        }
    }

    /// <summary>
    /// 指定された threadId に対応するメモリオブジェクトをGCSから削除する。
    /// </summary>
    /// <param name="threadId">削除するメモリオブジェクトの threadId</param>
    public async Task Delete(string threadId)
    {
        await _client.DeleteObjectAsync(_options.Bucket, GetObjectPath(threadId));
        await RemoveHeaderEntry(threadId); // ヘッダーからもエントリを削除
    }

    /// <summary>
    /// 指定された threadId のヘッダーエントリを削除する。
    /// </summary>
    /// <param name="threadId"></param>
    private async Task RemoveHeaderEntry(string threadId)
    {
        Header.Remove(threadId); // ヘッダーからエントリを削除
        await WriteHeaderAsync(); // ヘッダーを書き込む
    }

    /// <summary>
    /// 指定された threadId に対応するメモリオブジェクトをGCSから取得する。
    /// </summary>
    /// <param name="threadId">取得するメモリオブジェクトの threadId</param>
    /// <returns>取得した MemoryModel オブジェクト。見つからない場合は null。</returns>
    public async Task<MemoryModel?> GetAsync(string threadId)
    {
        var stream = await DownloadAsStreamAsync(_options.Bucket, GetObjectPath(threadId));
        if (stream == null) // ストリームが null の場合はオブジェクトが見つからなかったことを示す
        {
            return null;
        }
        using var gzStream = new GZipStream(stream, CompressionMode.Decompress); // gzip ストリームで解凍
        return await MemoryModel.DeserializeAsync(gzStream); // デシリアライズ
    }

    /// <summary>
    /// GCSに格納されているすべてのメモリオブジェクトのヘッダー情報を非同期的に列挙する。
    /// </summary>
    /// <returns>MemoryModel オブジェクトの非同期列挙子</returns>
    public async IAsyncEnumerable<MemoryModel> ListAsync()
    {
        foreach (var model in Header!.Values.OrderByDescending(v => v.ThreadId)) // ヘッダーに含まれるすべてのメモリモデルを返す
        {
            yield return model;
        }
    }

    /// <summary>
    /// GCSバケット内のファイルオブジェクトを非同期的に列挙する。
    /// </summary>
    /// <returns>Google.Apis.Storage.v1.Data.Object オブジェクトの非同期列挙子</returns>
    private async IAsyncEnumerable<Google.Apis.Storage.v1.Data.Object> FileListAsync()
    {
        await foreach (var obj in _client.ListObjectsAsync(_options.Bucket, _options.Prefix)) // バケット内のオブジェクトを列挙
        {
            if (obj.Name != HeaderFile && IsValidMemoryObject(obj.Name)) // ヘッダーファイルと無効なファイル名は除外
            {
                yield return obj;
            }
        }
    }

    /// <summary>
    /// ファイル名がメモリオブジェクトとして有効かどうかを検証する。
    /// </summary>
    /// <param name="fileName">検証するファイル名</param>
    /// <returns>有効な場合は true、それ以外は false</returns>
    private bool IsValidMemoryObject(string fileName)
    {
        var nameWithoutExtension = fileName.Replace(JsonGzExtension, ""); // 拡張子を取り除く
        return nameWithoutExtension.All(char.IsAsciiLetterOrDigit); // ASCII文字と数字のみで構成されているかチェック
    }

    /// <summary>
    /// ヘッダー情報をロードまたは作成する。
    /// </summary>
    /// <returns>ヘッダー情報の辞書</returns>
    private async Task<Dictionary<string, MemoryModel>> LoadOrCreateHeader()
    {
        return await LoadHeaderAsync() ?? await CreateHeaderAsync();
    }

    /// <summary>
    /// GCSからヘッダー情報をロードする。
    /// </summary>
    /// <returns>ヘッダー情報の辞書。ロードに失敗した場合は null。</returns>
    private async Task<Dictionary<string, MemoryModel>?> LoadHeaderAsync()
    {
        var stream = await DownloadAsStreamAsync(_options.Bucket, HeaderFile);
        if (stream == null) // ストリームが null の場合はヘッダーファイルが存在しない
        {
            return null;
        }

        using var gzStream = new GZipStream(stream, CompressionMode.Decompress); // gzip ストリームで解凍
        var list = (await JsonSerializer.DeserializeAsync<List<MemoryModel>>(gzStream, JsonSerializerOptions)) ?? []; // デシリアライズ
        return list.ToDictionary(model => model.ThreadId, model => model); // 辞書に変換
    }

    /// <summary>
    /// GCSからメモリオブジェクトをスキャンしてヘッダーを作成する。
    /// </summary>
    /// <returns>作成されたヘッダー情報の辞書</returns>
    private async Task<Dictionary<string, MemoryModel>> CreateHeaderAsync()
    {
        var header = new Dictionary<string, MemoryModel>();
        await foreach (var obj in FileListAsync())
        {
            var stream = await DownloadAsStreamAsync(obj);
            if (stream == null) // ストリームが null の場合は読み込みをスキップ
            {
                continue;
            }

            using var gzStream = new GZipStream(stream, CompressionMode.Decompress); // gzip ストリームで解凍
            var model = await MemoryModel.DeserializeAsync(gzStream); // デシリアライズ
            if (model != null)
            {
                header[model.ThreadId] = new() // ヘッダーにエントリを追加
                {
                    ThreadId = model.ThreadId,
                    Title = model.Title,
                };
            }
        }

        await WriteHeaderAsync(header); // ヘッダーをGCSに書き込む
        return header;
    }

    /// <summary>
    /// 指定された MemoryModel に基づいてヘッダー情報を更新する。
    /// </summary>
    /// <param name="model">更新に使用する MemoryModel オブジェクト</param>
    private async Task UpdateHeaderAsync(MemoryModel model)
    {
        if (!Header!.TryGetValue(model.ThreadId, out var existingModel) || existingModel.Title != model.Title)
        {
            Header[model.ThreadId] = new()
            {
                ThreadId = model.ThreadId,
                Title = model.Title,
            };
            await WriteHeaderAsync();
        }
    }

    /// <summary>
    /// ヘッダー情報をGCSに書き込む。
    /// </summary>
    /// <param name="header">書き込むヘッダー情報の辞書。省略した場合は、現在のキャッシュされたヘッダーが書き込まれる</param>
    private async Task WriteHeaderAsync(IDictionary<string, MemoryModel>? header = null)
    {
        header ??= Header; // 引数が null の場合は、キャッシュされたヘッダーを使用
        using var stream = new MemoryStream();
        using (var gzStream = new GZipStream(stream, CompressionMode.Compress, true))
        {
            await JsonSerializer.SerializeAsync(gzStream, header.Values.ToList(), JsonSerializerOptions); // シリアライズとgzip圧縮
        }
        stream.Position = 0;
        await _client.UploadObjectAsync(_options.Bucket, HeaderFile, "application/gzip", stream); // GCSにアップロード
    }

    /// <summary>
    /// 指定された MemoryModel をGCSに書き込む。
    /// </summary>
    /// <param name="model">書き込む MemoryModel オブジェクト</param>
    public async Task WriteAsync(MemoryModel model)
    {
        using var stream = new MemoryStream();
        using (var gzStream = new GZipStream(stream, CompressionMode.Compress, true))
        {
            await MemoryModel.Serialize(model, gzStream); // シリアライズとgzip圧縮
        }
        stream.Position = 0;
        await _client.UploadObjectAsync(_options.Bucket, GetObjectPath(model.ThreadId), "application/gzip", stream); // GCSにアップロード
        await UpdateHeaderAsync(model); // ヘッダーを更新
    }

    /// <summary>
    /// 指定された名前から GCS オブジェクトのパスを生成する。
    /// </summary>
    /// <param name="name">GCSオブジェクトの名前</param>
    /// <returns>GCS オブジェクトのパス</returns>
    private string GetObjectPath(string name)
    {
        return $"{_options.Prefix ?? ""}{name}{JsonGzExtension}";
    }

    /// <summary>
    /// 指定されたバケットとオブジェクト名からストリームをダウンロードする。
    /// </summary>
    /// <param name="bucket">GCSバケット名</param>
    /// <param name="objectName">GCSオブジェクト名</param>
    /// <returns>ダウンロードしたデータのストリーム。失敗した場合は null。</returns>
    private async Task<Stream?> DownloadAsStreamAsync(string bucket, string objectName)
    {
        try
        {
            var obj = await _client.GetObjectAsync(bucket, objectName); // オブジェクトをGCSから取得
            return await DownloadAsStreamAsync(obj); // ストリームをダウンロード
        }
        catch
        {
            return null;
        }
    }


    /// <summary>
    /// 指定されたGCSオブジェクトからストリームをダウンロードする。
    /// </summary>
    /// <param name="object">GCSオブジェクト</param>
    /// <returns>ダウンロードしたデータのストリーム。失敗した場合は null。</returns>
    private async Task<Stream?> DownloadAsStreamAsync(Google.Apis.Storage.v1.Data.Object? @object)
    {
        if (@object == null)
        {
            return null;
        }
        Exception? exception = null;
        for (var i = 0; i < 3; i++)
        {
            try
            {
                var memoryStream = new MemoryStream();
                await _client.DownloadObjectAsync(@object, memoryStream); // GCSからストリームをダウンロード
                memoryStream.Position = 0; // ストリームの位置を先頭に戻す
                return memoryStream;
            }
            catch (Exception ex)
            {
                exception = ex;
            }
        }
        throw exception!;
    }
}
