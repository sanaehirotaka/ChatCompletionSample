using ChatCompletion.Lib.Model;

namespace ChatCompletion.Lib.Services;

public interface IMemoryService
{
    public IAsyncEnumerable<MemoryModel> ListAsync();

    public Task<MemoryModel?> GetAsync(string threadId);

    public Task WriteAsync(MemoryModel model);

    public Task Delete(string threadId);
}
