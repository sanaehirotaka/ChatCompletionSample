using ChatCompletion.Lib.Extensions;
using Microsoft.Extensions.DependencyInjection;

namespace ChatCompletion.SemanticKernelLib.Extensions;

public static class RegistorServicesExtensions
{
    public static IServiceCollection RegistorServices(this IServiceCollection services)
    {
        return services.AutoConfig(typeof(RegistorServicesExtensions).Assembly);
    }
}
