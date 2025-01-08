using ChatCompletion.Lib.Injection;
using Microsoft.Extensions.Configuration;
using static ChatCompletion.SemanticKernelLib.Options.ClientOptions;

namespace ChatCompletion.SemanticKernelLib.Options;

[Singleton]
public class ClientOptions : List<ClientOption>
{
    public ClientOptions(IConfiguration configuration)
    {
        AddRange(configuration.GetSection(nameof(ClientOptions)).Get<List<ClientOption>>()!);
    }

    public record ClientOption(string KernelType, string SafetyThreshold, string[] Models, string Credential);
}
