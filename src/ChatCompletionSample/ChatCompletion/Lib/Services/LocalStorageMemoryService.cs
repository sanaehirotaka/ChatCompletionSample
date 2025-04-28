using ChatCompletion.Lib.Injection;
using ChatCompletion.Lib.Model;
using ChatCompletion.Lib.Options;
using System.IO.Compression;

namespace ChatCompletion.Lib.Services;

[Singleton]
public class LocalStorageMemoryService : IMemoryService
{
    private readonly LocalStorageOptions storageOptions;

    public LocalStorageMemoryService(LocalStorageOptions storageOptions)
    {
        this.storageOptions = storageOptions;
    }

    public async IAsyncEnumerable<MemoryModel> ListAsync()
    {
        var directory = new DirectoryInfo(storageOptions.MemoryDirectory);
        if (!directory.Exists)
        {
            yield break;
        }
        foreach (var file in directory.EnumerateFiles("*.json.gz"))
        {
            using var stream = new GZipStream(file.OpenRead(), CompressionMode.Decompress);
            var model = await MemoryModel.DeserializeAsync(stream);
            if (model != null)
            {
                yield return model;
            }
        }
    }

    public async Task<MemoryModel?> GetAsync(string threadId)
    {
        var file = GetLocation(threadId);
        if (!file.Exists)
        {
            return null;
        }
        using var stream = new GZipStream(file.OpenRead(), CompressionMode.Decompress);
        return await MemoryModel.DeserializeAsync(stream);
    }

    public async Task WriteAsync(MemoryModel model)
    {
        var file = GetLocation(model.ThreadId);
        if (!(file.Directory?.Exists ?? true))
        {
            file.Directory.Create();
        }
        using var stream = new GZipStream(file.OpenWrite(), CompressionMode.Compress);
        await MemoryModel.Serialize(model, stream);
    }

    public async Task Delete(string threadId)
    {
        await Task.Run(() =>
        {
            var file = GetLocation(threadId);
            file.Delete();
        });
    }

    private FileInfo GetLocation(string threadId)
    {
        return new FileInfo(Path.Combine(storageOptions.MemoryDirectory, threadId + ".json.gz"));
    }
}
