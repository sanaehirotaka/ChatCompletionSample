using ChatCompletion.Lib.Injection;

namespace ChatCompletion.Lib.Options;

[Singleton]
public class LocalStorageOptions
{
    public string MemoryDirectory { get; init; } = default!;

    public LocalStorageOptions(IConfiguration configuration)
    {
        configuration.Bind(nameof(LocalStorageOptions), this);
    }

}