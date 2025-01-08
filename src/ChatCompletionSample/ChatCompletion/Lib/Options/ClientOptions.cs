using ChatCompletion.Lib.Injection;
using static ChatCompletion.Lib.Options.ClientOptions;

namespace ChatCompletion.Lib.Options;

[Singleton]
public class ClientOptions : List<ClientOption>
{
    public ClientOptions(IConfiguration configuration)
    {
        AddRange(configuration.GetSection(nameof(ClientOptions)).Get<List<ClientOption>>()!);
    }

    public record ClientOption(string KernelType, string SafetyThreshold, string[] Models, string Credential);
}
