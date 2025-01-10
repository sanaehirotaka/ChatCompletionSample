using ChatCompletion.Lib.Injection;

namespace ChatCompletion.Lib.Options;

[Singleton]
public class GCSOptions
{
    public string? CredentialPath { get; init; } = default!;

    public string Bucket { get; init; } = default!;

    public string? Prefix { get; init; }

    public GCSOptions(IConfiguration configuration)
    {
        configuration.Bind(nameof(GCSOptions), this);
    }
}
