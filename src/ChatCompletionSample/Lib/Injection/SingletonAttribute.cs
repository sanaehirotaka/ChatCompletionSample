using Microsoft.Extensions.DependencyInjection;

namespace ChatCompletion.Lib.Injection;

public class SingletonAttribute : InjectionTargetsAttribute
{
    public SingletonAttribute() : base(ServiceLifetime.Singleton)
    {
    }
}
