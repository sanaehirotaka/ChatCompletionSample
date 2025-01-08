using ChatCompletion.Lib.Injection;
using Microsoft.Extensions.Configuration;

namespace ChatCompletion.SemanticKernelLib.Options;

[Singleton]
public class StorageOptions
{
    public string MemoryDirectory { get; init; } = default!;

    public StorageOptions(IConfiguration configuration)
    {
        configuration.Bind(nameof(StorageOptions), this);
    }

}